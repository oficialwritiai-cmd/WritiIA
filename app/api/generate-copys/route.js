import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const resObj = new NextResponse();
        try {
            const rlKey = buildRateLimitKey(ip, body?.userId);
            await limiter.check(resObj, 5, rlKey); // Max 5 requests per minute
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const { text, platform, goal, userId, projectId, sections } = body;

        if (!text || !platform || !userId) {
            return NextResponse.json({ error: 'Faltan campos requeridos (text, platform, userId).' }, { status: 400 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Credit Check & Charge (1 credit for copy generation)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_HOOKS_ONLY || 1, 'generate_copys', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = `
- negocio: ${brandBrain.biography || 'No especificada'}
- publico_objetivo: ${brandBrain.target_audience || 'No especificado'}
- tono: ${brandBrain.style_words || 'Profesional y cercano'}
`;
        }

        // Checklist filter
        const wantsTitulos = sections?.titulos !== false;
        const wantsGanchos = sections?.ganchos !== false;
        const wantsDescripciones = sections?.descripciones !== false;
        const wantsHashtags = sections?.hashtags !== false;
        const wantsYoutubeTags = sections?.youtubeTags === true;

        const systemPrompt = `PROMPT INTERNO – COPYS Y GANCHOS (NO MOSTRAR AL USUARIO)

Rol de la IA:
Eres un copywriter y estratega de marketing digital de nivel senior, especialista en contenido para redes sociales, lanzamientos digitales y creación de marca personal. Escribes textos claros, persuasivos, con foco en conversiones y engagement, adaptados a la plataforma y al público objetivo del proyecto.

Contexto:
${brandContextString}
- plataforma: ${platform}
- objetivo: ${goal || 'Engagement'}

Objetivo:
A partir de ese contexto y la entrada del usuario, debes crear los mejores títulos, copys/descripciones, ganchos y grupos de hashtags.

Reglas para la respuesta:
1) Respóndeme EXCLUSIVAMENTE en JSON válido, sin texto adicional, sin comentarios.
2) Mantén esta estructura EXACTA (omite los campos marcados como false):

{
  ${wantsTitulos ? '"titles": ["Título 1...", "Título 2...", "Título 3...", "Título 4...", "Título 5..."],' : ''}
  ${wantsDescripciones ? '"descriptions": ["Descripción/copy principal 1...", "Descripción/copy principal 2...", "Descripción/copy principal 3..."],' : ''}
  ${wantsGanchos ? '"hooks": ["Hook 1...", "Hook 2...", "Hook 3...", "Hook 4...", "Hook 5..."],' : ''}
  ${wantsHashtags ? '"hashtags_groups": [["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"], ["#tag6", "#tag7", "#tag8", "#tag9", "#tag10"]],' : ''}
  ${wantsYoutubeTags ? '"youtube_tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]' : ''}
}

Guías específicas:
- Títulos: Máx 60 chars, fórmulas probadas ("Cómo X sin Y", "X errores...").
- Descripciones: 2-4 frases, estructura (Gancho+Problema -> Promesa -> CTA).
- Hooks: 1 sola frase potente que genere curiosidad o tensión.
- Hashtags: Máx 5 por grupo, combina nicho con específicos.

REGLA CRÍTICA: Responde SOLO con el objeto JSON puro para que mi sistema pueda parsearlo directamente con JSON.parse().`;

        const userMessage = `
ENTRADA DEL USUARIO (IDEA/GUION):
"""
${text}
"""

Plataforma: ${platform}
Objetivo: ${goal || 'Engagement'}

Por favor, genera el JSON siguiendo las instrucciones del prompt interno.`;

        let result = null;
        let rawContent = '';
        try {
            const haikuRes = await generateIdeasWithHaiku({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt,
                userMessage,
            });
            rawContent = haikuRes.content || '';
            
            // --- NUCLEAR JSON EXTRACTION (v2.9.2) ---
            // We ignore the library's 'parsed' field because it forces a different schema.
            const extractJSON = (text) => {
                try {
                    // Try to find the LARGEST JSON object in the text
                    const firstBrace = text.indexOf('{');
                    const lastBrace = text.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        const jsonStr = text.substring(firstBrace, lastBrace + 1);
                        return JSON.parse(jsonStr);
                    }
                } catch (e) {
                    console.error('[Copys IA] Primary extraction failed:', e.message);
                }
                return null;
            };

            result = extractJSON(rawContent);

            // If primary failed, try to pick up the library's version but sanitize it
            if (!result && haikuRes.parsed) {
                result = Array.isArray(haikuRes.parsed) ? haikuRes.parsed[0] : haikuRes.parsed;
            }

        } catch (genErr) {
            console.error('[generate-copys] Gen Error:', genErr);
            return NextResponse.json({ error: 'La IA no pudo procesar la solicitud. Por favor intenta de nuevo.' }, { status: 500 });
        }

        if (!result) {
            return NextResponse.json({ error: 'La IA devolvió un formato vacío o ilegible. Reintenta por favor.' }, { status: 500 });
        }

        // --- DEEP NORMALIZATION ---
        // Some AI responses might be nested like { result: { titles: ... } } or { data: { ... } }
        const deepResult = result.result || result.data || result.content || result;

        const normalized = {
            titles: deepResult.titles || deepResult.titulos || (deepResult.titulo_angulo ? [deepResult.titulo_angulo] : []),
            hooks: deepResult.hooks || deepResult.ganchos || (deepResult.gancho ? [deepResult.gancho] : []),
            descriptions: deepResult.descriptions || deepResult.descripciones || (Array.isArray(deepResult.desarrollo) ? deepResult.desarrollo : (deepResult.desarrollo ? [deepResult.desarrollo] : [])),
            hashtags_groups: deepResult.hashtags_groups || deepResult.hashtags || [],
            youtube_tags: deepResult.youtube_tags || deepResult.youtubeTags || []
        };

        // SAFETY: If the AI puts all JSON as a string inside a field (happens with some library fallbacks)
        const isJsonString = (str) => typeof str === 'string' && (str.startsWith('{') || str.startsWith('['));
        
        if (normalized.descriptions.length === 1 && isJsonString(normalized.descriptions[0])) {
            console.log('[Copys IA] Detected JSON string inside description, re-parsing...');
            const nested = extractJSON(normalized.descriptions[0]);
            if (nested) {
                normalized.titles = nested.titles || nested.titulos || normalized.titles;
                normalized.hooks = nested.hooks || nested.ganchos || normalized.hooks;
                normalized.descriptions = nested.descriptions || nested.descripciones || (Array.isArray(nested.desarrollo) ? nested.desarrollo : []);
            }
        }

        // Final list cleaner
        const cleanList = (list) => {
            if (!Array.isArray(list)) return [];
            return list.map(item => {
                if (typeof item === 'string') return item.trim();
                if (Array.isArray(item)) return item.join(' ').trim();
                return String(item);
            }).filter(i => i && i.length > 3 && !i.startsWith('{'));
        };

        normalized.titles = cleanList(normalized.titles);
        normalized.hooks = cleanList(normalized.hooks);
        normalized.descriptions = cleanList(normalized.descriptions);
        normalized.youtube_tags = cleanList(normalized.youtube_tags);

        // Map hashtags specifically
        normalized.hashtags_groups = Array.isArray(normalized.hashtags_groups) 
            ? normalized.hashtags_groups.map(group => Array.isArray(group) ? group : [group])
            : [];

        // Check if we have at least SOME content
        const hasContent = normalized.titles.length > 0 || 
                          normalized.hooks.length > 0 || 
                          normalized.descriptions.length > 0;

        if (!hasContent) {
            console.error('[Copys IA] No valid content after normalization:', result);
            return NextResponse.json({ error: 'La IA devolvió un formato inválido. Por favor intenta de nuevo.' }, { status: 500 });
        }

        // Add to stats
        if (projectId) {
            await supabase.rpc('increment_project_stat', { p_project_id: projectId, p_column: 'hooks_generated', p_amount: 1 });
        }

        return NextResponse.json({ result: normalized });

    } catch (err) {
        console.error('[generate-copys] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

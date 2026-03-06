import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import rateLimit from '@/lib/rate-limit';

// Wrapper that uses higher max_tokens for idea generation
async function callAnthropicForIdeas({ apiKey, systemPrompt, userMessage }) {
    // Use the dedicated ideas function
    return await generateIdeasWithHaiku({ apiKey, systemPrompt, userMessage });
}

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 5, ip); // Max 5 strategy generations per minute
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' }, { status: 429, headers: resObj.headers });
        }

        const body = await request.json();
        const { objective, launch, objection, story, types, platforms, userId } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;

        // Fetch user profile and brand brain
        const { data: profile } = await supabase.from('users_profiles').select('*').eq('id', userId).single();
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = `
[CONTEXTO BASE - CEREBRO IA (Perfil General)]
- Bio/Historia: ${brandBrain.biography || 'No especificado'}
- Audiencia General: ${brandBrain.audience || 'No especificada'}
- Valores y Tono Base: ${brandBrain.values_tone || 'No especificado'}
- Nicho/Temas Base: ${brandBrain.niche_topics || 'No especificado'}
`;
        } else {
            brandContextString = `[CONTEXTO BASE - CEREBRO IA] No configurado. Usa solo el contexto específico a continuación.\n`;
        }

        const sessionContextString = `
[CONTEXTO ESPECÍFICO - FORMULARIO ACTUAL (Prioridad Alta)]
- Objetivo de este contenido: ${objective || 'No especificado'}
- Próximo lanzamiento/oferta: ${launch || 'Ninguno'}
- Objeción principal a derribar: ${objection || 'No especificada'}
- Historia personal a usar: ${story || 'Ninguna'}
- Tipos de contenido deseados: ${types.length > 0 ? types.join(', ') : 'Cualquiera'}
- Plataformas destino: ${platforms.length > 0 ? platforms.join(', ') : 'Reels, TikTok, etc.'}
`;

        const systemPrompt = `Eres un estratega de contenido de élite para redes sociales.

Usa SIEMPRE la combinación del perfil de marca (CEREBRO IA) y las respuestas del formulario actual (CONTEXTO ESPECÍFICO).
REGLA CRÍTICA: El formulario actual (CONTEXTO ESPECÍFICO) tiene ABSOLUTA PRIORIDAD sobre el perfil general. Si hay conflicto entre el Cerebro IA y el Formulario (ej. plataformas diferentes, o un objetivo distinto), siempre manda el Formulario.

${brandContextString}
${sessionContextString}

Tu objetivo es crear un Banco de Ideas Estratégicas altamente personalizado que refleje perfectamente la voz del creador y se alinee a su objetivo actual.

IMPORTANTE: Responde EXCLUSIVAMENTE con un array JSON válido. Nada de texto antes o después. Sin markdown, sin código, solo JSON puro.

Formato obligatorio (exactamente 10 ideas):
[
  {
    "id": "1",
    "plataforma": "Reels, TikTok, LinkedIn, X o YouTube",
    "tipo": "educativo, autoridad, historia personal, venta o viral",
    "titulo_idea": "Título corto y atractivo",
    "descripcion": "Descripción de la idea en 1-2 frases",
    "por_que_funciona": "Por qué esta idea funciona para el objetivo",
    "objetivo": "atraer leads, autoridad, ventas, engagement o comunidad",
    "potencial": "alto, medio o bajo"
  }
]

Ejemplo de respuesta válida:
[
  {
    "id": "1",
    "plataforma": "Reels",
    "tipo": "autoridad",
    "titulo_idea": "El error que comete el 90% al usar IA",
    "descripcion": "Análisis del error común y cómo evitarlo",
    "por_que_funciona": "Genera identificación inmediata",
    "objetivo": "autoridad",
    "potencial": "alto"
  }
]`;

        const userMessage = "Genera el Banco de Ideas Estratégicas con 10 ideas únicas basadas en mi perfil y objetivos. Responde SOLO con el JSON array, sin texto previo ni posterior.";

        const { parsed: ideas, usage } = await callAnthropicForIdeas({
            apiKey,
            systemPrompt,
            userMessage,
        });

        // Ensure ideas is always an array
        let ideasArray = [];
        if (Array.isArray(ideas)) {
            ideasArray = ideas;
        } else if (typeof ideas === 'string') {
            try {
                const parsed = JSON.parse(ideas);
                ideasArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                ideasArray = [];
            }
        } else if (ideas && typeof ideas === 'object') {
            ideasArray = [ideas];
        }

        if (ideasArray.length === 0) {
            return NextResponse.json({ error: 'No se pudieron generar ideas. Intenta de nuevo.' }, { status: 500 });
        }

        // Save session
        const { data: session } = await supabase.from('strategy_sessions').insert({
            user_id: userId,
            objetivo_mes: objective,
            lanzamiento: launch,
            objecion_cliente: objection,
            historia_personal: story,
            tipos_contenido: types,
            plataformas: platforms
        }).select().single();

        // Save ideas
        const ideasToInsert = ideasArray.map(idea => ({
            session_id: session.id,
            user_id: userId,
            plataforma: idea.plataforma,
            tipo: idea.tipo,
            titulo_idea: idea.titulo_idea,
            descripcion: idea.descripcion,
            por_que_funciona: idea.por_que_funciona,
            objetivo: idea.objetivo,
            potencial: idea.potencial
        }));

        await supabase.from('strategy_ideas').insert(ideasToInsert);

        // Ensure we send a proper array
        const ideasToSend = Array.isArray(ideasArray) ? ideasArray : [];
        console.log('[API] Sending ideas count:', ideasToSend.length);

        return NextResponse.json({ ideas: ideasToSend });

    } catch (err) {
        console.error('Error en estrategia generate-ideas:', err);
        const errorMsg = err?.message || 'Error interno';
        if (errorMsg.includes('sobrecargado') || errorMsg.includes('overloaded') || errorMsg.includes('intentos')) {
            return NextResponse.json({ error: 'El servicio de IA está muy saturado en este momento. Hemos reintentado 3 veces sin éxito. Por favor, espera un minuto e intenta de nuevo.', ideas: [] }, { status: 503 });
        }
        return NextResponse.json({ error: errorMsg, ideas: [] }, { status: 500 });
    }
}

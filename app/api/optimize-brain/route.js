import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-guard';
import { improveBlockWithHaiku } from '@/lib/anthropic';

/**
 * POST /api/optimize-brain
 * Body JSON:
 *   target:   'brain' | 'context' | 'suggestions'
 *   data?:    { bio, audience, style } | { pillars, faqs }
 *   brain?:   { biography, audience, style_words }
 *   type?:    'pillars' | 'faqs'
 *   existing?: string[]
 *   lang?:    'es' | 'en'
 */
export async function POST(req) {
    try {
        const { user, error: authErr } = await getServerSession(req);
        if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json();
        const { target, data = {}, brain = {}, type, existing = [], lang = 'es' } = body;

        const apiKey = process.env.ANTHROPIC_API_KEY;
        const systemPrompt = 'Eres un experto en copywriting y estrategia de contenido. Respondes siempre SOLO con JSON válido, sin texto extra antes ni después.';

        // ── Improve Brain ────────────────────────────────────────────────
        if (target === 'brain') {
            const { bio = '', audience = '', style = '' } = data;
            const userMessage = `Mejora estos textos del Cerebro IA de un creador de contenido.
Reglas: frases claras, sin relleno, sin clichés, máximo 3 frases por campo, mantén idioma (${lang}).

Bio actual: ${bio}
Audiencia actual: ${audience}
Estilo actual: ${style}

Responde SOLO con JSON: {"bio":"...","audience":"...","style":"..."}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt, userMessage });
            const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
            const improved = JSON.parse(jsonStr);
            return NextResponse.json({ improved });
        }

        // ── Improve Context ──────────────────────────────────────────────
        if (target === 'context') {
            const { pillars = '', faqs = '' } = data;
            const userMessage = `Mejora estos pilares y FAQs para un creador de contenido.
Pilares: específicos, 2-5 palabras cada uno, uno por línea.
FAQs: preguntas reales que la audiencia haría, directas, una por línea.
Idioma: ${lang}.

Pilares actuales:
${pillars}

FAQs actuales:
${faqs}

Responde SOLO con JSON: {"pillars":"pilar1\\npilar2\\n...","faqs":"pregunta1\\npregunta2\\n..."}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt, userMessage });
            const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
            const improved = JSON.parse(jsonStr);
            return NextResponse.json({ improved });
        }

        // ── Generate Suggestions ─────────────────────────────────────────
        if (target === 'suggestions') {
            const brainCtx = `Negocio: ${brain.biography || brain.bio || ''}. Audiencia: ${brain.audience || ''}. Estilo: ${brain.style_words || brain.style || ''}.`;
            const existingStr = existing.join(', ');
            const isPillars = type === 'pillars';

            const userMessage = isPillars
                ? `Genera 7 pilares de contenido para este creador. Un pilar por línea, 2-5 palabras, específicos y distintos.
Contexto: ${brainCtx}
Ya tiene (no repetir): ${existingStr || 'ninguno'}
Idioma: ${lang}.
Responde SOLO con JSON: {"suggestions":["pilar1","pilar2","pilar3","pilar4","pilar5","pilar6","pilar7"]}`
                : `Genera 8 preguntas frecuentes reales que la audiencia haría a este creador.
Contexto: ${brainCtx}
Ya tiene (no repetir): ${existingStr || 'ninguna'}
Idioma: ${lang}.
Responde SOLO con JSON: {"suggestions":["pregunta1","pregunta2","pregunta3","pregunta4","pregunta5","pregunta6","pregunta7","pregunta8"]}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt, userMessage });
            const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
            const result = JSON.parse(jsonStr);
            return NextResponse.json({ suggestions: result.suggestions || [] });
        }

        return NextResponse.json({ error: 'target no válido' }, { status: 400 });
    } catch (err) {
        console.error('[optimize-brain]', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}

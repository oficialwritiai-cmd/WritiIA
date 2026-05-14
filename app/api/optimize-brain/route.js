import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-guard';
import Anthropic from '@anthropic-ai/sdk';

/**
 * POST /api/optimize-brain
 * Body JSON:
 *   target:  'brain' | 'context' | 'suggestions'
 *   data?:   { bio, audience, style } | { pillars, faqs }   (for brain/context)
 *   brain?:  { biography, audience, style_words }            (for suggestions)
 *   type?:   'pillars' | 'faqs'                              (for suggestions)
 *   existing?: string[]                                       (for suggestions)
 *   lang?:   'es' | 'en'                                     (default 'es')
 *
 * Returns (brain/context):
 *   { improved: { bio?, audience?, style?, pillars?, faqs? } }
 *
 * Returns (suggestions):
 *   { suggestions: string[] }
 */
export async function POST(req) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────
        const { user, error: authErr } = await getServerSession(req);
        if (authErr || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { target, data = {}, brain = {}, type, existing = [], lang = 'es' } = body;

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // ── Improve Brain ─────────────────────────────────────────────────
        if (target === 'brain') {
            const { bio = '', audience = '', style = '' } = data;

            const prompt = `Eres un experto en copywriting para redes sociales. Mejora estos textos de Cerebro IA para un creador de contenido.
Reglas:
- Mantén el idioma original (${lang === 'es' ? 'español' : 'inglés'})
- Frases claras, sin relleno, sin clichés
- Máximo 3 frases por campo
- Conserva la esencia y hechos del original

Bio actual: ${bio}
Audiencia actual: ${audience}
Estilo actual: ${style}

Responde SOLO con JSON válido:
{"bio":"...","audience":"...","style":"..."}`;

            const msg = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 600,
                messages: [{ role: 'user', content: prompt }],
            });

            let improved;
            try {
                const raw = msg.content[0].text.trim();
                const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
                improved = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA.' }, { status: 500 });
            }

            return NextResponse.json({ improved });
        }

        // ── Improve Context ───────────────────────────────────────────────
        if (target === 'context') {
            const { pillars = '', faqs = '' } = data;

            const prompt = `Eres un experto en estrategia de contenido. Mejora estos pilares y FAQs para un creador.
Reglas:
- Pilares: específicos, temáticos, 2-5 palabras cada uno
- FAQs: preguntas reales que la audiencia haría, directas y concretas
- Mantén formato "uno por línea"
- Idioma: ${lang === 'es' ? 'español' : 'inglés'}

Pilares actuales:
${pillars}

FAQs actuales:
${faqs}

Responde SOLO con JSON válido:
{"pillars":"pilar1\\npilar2\\n...","faqs":"pregunta1\\npregunta2\\n..."}`;

            const msg = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 600,
                messages: [{ role: 'user', content: prompt }],
            });

            let improved;
            try {
                const raw = msg.content[0].text.trim();
                const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
                improved = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA.' }, { status: 500 });
            }

            return NextResponse.json({ improved });
        }

        // ── Generate Suggestions ──────────────────────────────────────────
        if (target === 'suggestions') {
            const brainCtx = `Negocio: ${brain.biography || brain.bio || ''}. Audiencia: ${brain.audience || ''}. Estilo: ${brain.style_words || brain.style || ''}.`;
            const existingStr = existing.join(', ');

            const isPillars = type === 'pillars';
            const prompt = isPillars
                ? `Genera 7 pilares de contenido para este creador. Un pilar por línea, 2-5 palabras, específicos y distintos.
Contexto del negocio: ${brainCtx}
Ya tiene estos pilares (no repetir): ${existingStr || 'ninguno'}
Idioma: ${lang === 'es' ? 'español' : 'inglés'}
Responde SOLO con JSON: {"suggestions":["pilar1","pilar2","pilar3","pilar4","pilar5","pilar6","pilar7"]}`
                : `Genera 8 preguntas frecuentes reales que la audiencia de este creador haría.
Contexto del negocio: ${brainCtx}
Ya tiene estas preguntas (no repetir): ${existingStr || 'ninguna'}
Idioma: ${lang === 'es' ? 'español' : 'inglés'}
Responde SOLO con JSON: {"suggestions":["pregunta1","pregunta2","pregunta3","pregunta4","pregunta5","pregunta6","pregunta7","pregunta8"]}`;

            const msg = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                messages: [{ role: 'user', content: prompt }],
            });

            let result;
            try {
                const raw = msg.content[0].text.trim();
                const jsonStr = raw.startsWith('{') ? raw : raw.match(/\{[\s\S]*\}/)?.[0];
                result = JSON.parse(jsonStr);
            } catch {
                return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA.' }, { status: 500 });
            }

            return NextResponse.json({ suggestions: result.suggestions || [] });
        }

        return NextResponse.json({ error: 'target no válido' }, { status: 400 });
    } catch (err) {
        console.error('[optimize-brain]', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}

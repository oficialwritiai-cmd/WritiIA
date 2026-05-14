import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

/** lib/anthropic.js already tries to parse JSON — handle both string and object */
function parseClaudeResponse(raw) {
    // Already parsed by lib/anthropic.js processResponse
    if (raw !== null && typeof raw === 'object') return raw;
    // Raw string — clean markdown blocks then parse
    const str = String(raw ?? '').replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const jsonStr = str.startsWith('{') || str.startsWith('[')
        ? str
        : str.match(/[\[{][\s\S]*[\]}]/)?.[0];
    if (!jsonStr) throw new Error('No JSON found in Claude response');
    return JSON.parse(jsonStr);
}

export async function POST(req) {
    try {
        // ── Auth via cookies ──────────────────────────────────────────
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (name) => cookieStore.get(name)?.value } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json();
        const { target, data = {}, brain = {}, type, existing = [], lang = 'es', projectId } = body;

        // ── Cobrar 1 crédito ──────────────────────────────────────────
        const creditResult = await chargeCredits(
            supabase, user.id,
            CREDIT_COSTS.OPTIMIZE_BRAIN,
            'optimize_brain',
            projectId || null
        );
        if (!creditResult.success) {
            return NextResponse.json(
                { error: creditResult.error || 'Sin créditos suficientes.' },
                { status: creditResult.insufficientCredits ? 402 : 400 }
            );
        }

        const apiKey      = process.env.ANTHROPIC_API_KEY;
        const systemPrompt = 'Respondes siempre SOLO con JSON válido, sin texto extra antes ni después.';

        // ── Improve Brain ─────────────────────────────────────────────
        if (target === 'brain') {
            const { bio = '', audience = '', style = '' } = data;
            const userMessage = `Mejora estos textos del Cerebro IA. Frases claras, sin relleno, máximo 3 frases por campo, mantén idioma (${lang}).

Bio: ${bio}
Audiencia: ${audience}
Estilo: ${style}

JSON: {"bio":"...","audience":"...","style":"..."}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt, userMessage });
            const improved = parseClaudeResponse(raw);
            return NextResponse.json({ improved });
        }

        // ── Improve Context ───────────────────────────────────────────
        if (target === 'context') {
            const { pillars = '', faqs = '' } = data;
            const userMessage = `Mejora estos pilares y FAQs. Uno por línea. Idioma: ${lang}.

Pilares:\n${pillars}
FAQs:\n${faqs}

JSON: {"pillars":"pilar1\\npilar2\\n...","faqs":"pregunta1\\npregunta2\\n..."}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt, userMessage });
            const improved = parseClaudeResponse(raw);
            return NextResponse.json({ improved });
        }

        // ── Generate Suggestions ──────────────────────────────────────
        if (target === 'suggestions') {
            const brainCtx = `Negocio: ${brain.biography || brain.bio || ''}. Audiencia: ${brain.audience || ''}. Estilo: ${brain.style_words || brain.style || ''}.`;
            const existingStr = existing.join(', ') || 'ninguno';
            const isPillars = type === 'pillars';

            const userMessage = isPillars
                ? `Genera 7 pilares de contenido (2-5 palabras c/u, uno por línea). Contexto: ${brainCtx}. No repetir: ${existingStr}. Idioma: ${lang}.
JSON: {"suggestions":["pilar1","pilar2","pilar3","pilar4","pilar5","pilar6","pilar7"]}`
                : `Genera 8 preguntas frecuentes reales. Contexto: ${brainCtx}. No repetir: ${existingStr}. Idioma: ${lang}.
JSON: {"suggestions":["pregunta1","pregunta2","pregunta3","pregunta4","pregunta5","pregunta6","pregunta7","pregunta8"]}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt, userMessage });
            const result = parseClaudeResponse(raw);
            return NextResponse.json({ suggestions: result.suggestions || [] });
        }

        return NextResponse.json({ error: 'target no válido' }, { status: 400 });
    } catch (err) {
        console.error('[optimize-brain]', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

function parseClaudeResponse(raw) {
    if (raw !== null && typeof raw === 'object') return raw;
    const str = String(raw ?? '').replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const jsonStr = str.startsWith('{') || str.startsWith('[')
        ? str : str.match(/[\[{][\s\S]*[\]}]/)?.[0];
    if (!jsonStr) throw new Error('No JSON en respuesta de Claude');
    return JSON.parse(jsonStr);
}

function extractText(raw) {
    if (typeof raw === 'string') return raw.replace(/```\n?/g, '').trim();
    if (raw?.text) return String(raw.text);
    try { return JSON.stringify(raw); } catch { return String(raw); }
}

export async function POST(req) {
    try {
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json();
        const { target, data = {}, brain = {}, type, existing = [], lang = 'es', projectId } = body;

        // ── Cobrar 1 crédito ──────────────────────────────────────────
        const credit = await chargeCredits(supabase, user.id, CREDIT_COSTS.OPTIMIZE_BRAIN, 'optimize_brain', projectId || null);
        if (!credit.success) {
            return NextResponse.json({ error: credit.error || 'Sin créditos.' }, { status: credit.insufficientCredits ? 402 : 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        const sys    = 'Respondes siempre SOLO con JSON válido, sin texto extra.';

        // ── Mejorar campo individual ──────────────────────────────────
        if (target === 'field') {
            const { fieldKey, fieldLabel, value = '' } = data;
            if (!value.trim()) return NextResponse.json({ improved: { [fieldKey]: value } });

            // Detect if input looks like raw voice transcription (long + many filler words)
            const isVoiceTranscript = value.length > 200 &&
                /\b(eh|mmm|bueno|o sea|entonces|sabes|pues)\b/i.test(value);

            const prompt = isVoiceTranscript
                ? `Transcripción de voz sobre "${fieldLabel}": "${value.slice(0, 700)}"

Escribe un resumen profesional de 2-3 frases en ${lang} que capture la esencia sin muletillas ni repeticiones. Responde SOLO con JSON: {"${fieldKey}":"resumen profesional aquí"}`
                : `Texto a mejorar para "${fieldLabel}": "${value.slice(0, 500)}"

Reescríbelo más claro y profesional en máximo 3 frases en ${lang}. Responde SOLO con JSON: {"${fieldKey}":"texto mejorado aquí"}`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt: sys, userMessage: prompt });
            const improved = parseClaudeResponse(raw);
            if (!improved[fieldKey]) improved[fieldKey] = value;
            return NextResponse.json({ improved });
        }

        // ── Mejorar Cerebro IA completo (bio+audience+style) ─────────
        if (target === 'brain') {
            const { bio = '', audience = '', style = '' } = data;
            const prompt = `Mejora estos textos del Cerebro IA. Frases claras, sin relleno, máximo 3 frases por campo, idioma (${lang}).
Bio: ${bio}
Audiencia: ${audience}
Estilo: ${style}
JSON: {"bio":"...","audience":"...","style":"..."}`;
            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt: sys, userMessage: prompt });
            return NextResponse.json({ improved: parseClaudeResponse(raw) });
        }

        // ── Mejorar contexto (pilares + FAQs) ────────────────────────
        if (target === 'context') {
            const { pillars = '', faqs = '' } = data;
            const prompt = `Mejora pilares y FAQs. Uno por línea. Idioma: ${lang}.
Pilares:\n${pillars}\nFAQs:\n${faqs}
JSON: {"pillars":"pilar1\\npilar2\\n...","faqs":"pregunta1\\npregunta2\\n..."}`;
            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt: sys, userMessage: prompt });
            return NextResponse.json({ improved: parseClaudeResponse(raw) });
        }

        // ── Generar sugerencias ───────────────────────────────────────
        if (target === 'suggestions') {
            const ctx = `Negocio: ${brain.biography||brain.bio||''}. Audiencia: ${brain.audience||''}. Estilo: ${brain.style_words||brain.style||''}.`;
            const skip = existing.join(', ') || 'ninguno';
            const prompt = type === 'pillars'
                ? `Genera 7 pilares de contenido (2-5 palabras, uno por línea). Contexto: ${ctx}. No repetir: ${skip}. Idioma: ${lang}.\nJSON: {"suggestions":["p1","p2","p3","p4","p5","p6","p7"]}`
                : `Genera 8 FAQs reales de la audiencia. Contexto: ${ctx}. No repetir: ${skip}. Idioma: ${lang}.\nJSON: {"suggestions":["q1","q2","q3","q4","q5","q6","q7","q8"]}`;
            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt: sys, userMessage: prompt });
            const result = parseClaudeResponse(raw);
            return NextResponse.json({ suggestions: result.suggestions || [] });
        }

        // ── Auditoría de marca ────────────────────────────────────────
        if (target === 'brand_audit') {
            const { bio='', audience='', offer='', style='', pillars='', faqs='' } = data;
            const prompt = `Eres un consultor experto en marketing de contenidos. Analiza este Cerebro IA y genera una auditoría de marca concisa.

Datos del creador:
- Bio: ${bio}
- Audiencia: ${audience}
- Oferta: ${offer}
- Estilo: ${style}
- Pilares: ${pillars}
- FAQs frecuentes: ${faqs}

Genera un análisis en JSON con esta estructura exacta:
{
  "positioning": "1-2 frases sobre el posicionamiento único de esta marca",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "opportunities": ["oportunidad de contenido 1", "oportunidad 2", "oportunidad 3"],
  "contentAngles": ["ángulo de contenido 1", "ángulo 2", "ángulo 3", "ángulo 4"],
  "audienceInsight": "1 insight clave sobre la audiencia que pocos creadores aprovechan",
  "quickWin": "1 acción concreta que puede implementar esta semana para destacar"
}

Idioma: ${lang}. Sé específico, no genérico.`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt: sys, userMessage: prompt });
            const audit = parseClaudeResponse(raw);
            return NextResponse.json({ audit });
        }

        return NextResponse.json({ error: 'target no válido' }, { status: 400 });
    } catch (err) {
        console.error('[optimize-brain]', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}

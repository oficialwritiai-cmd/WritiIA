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

            // Strip markdown artifacts first (lib/anthropic may return raw string)
            const rawStr = typeof raw === 'string'
                ? raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
                : null;

            let improvedText = '';
            try {
                const parsed = parseClaudeResponse(raw);
                if (parsed && typeof parsed === 'object') {
                    improvedText = parsed[fieldKey]
                        || Object.values(parsed).find(v => typeof v === 'string' && v.trim().length > 10)
                        || '';
                }
            } catch (_) {}

            // Fallback: try parsing the cleaned raw string
            if (!improvedText && rawStr) {
                try {
                    const p2 = JSON.parse(rawStr);
                    improvedText = p2[fieldKey]
                        || Object.values(p2).find(v => typeof v === 'string' && v.trim().length > 10)
                        || '';
                } catch (_) {
                    // If it's a plain text answer (not JSON), use it directly
                    if (rawStr.length > 20 && !rawStr.startsWith('{')) improvedText = rawStr;
                }
            }

            // Final cleanup — remove any residual JSON/markdown from the text itself
            if (improvedText) {
                improvedText = improvedText
                    .replace(/```json\n?/gi, '').replace(/```\n?/g, '')
                    .replace(/^\s*\{[\s\S]*\}\s*$/, m => { try { return JSON.parse(m)[fieldKey] || m; } catch { return m; } })
                    .trim();
            }

            if (!improvedText) {
                return NextResponse.json({ error: 'La IA no pudo generar una versión mejorada. Inténtalo de nuevo.' }, { status: 422 });
            }

            return NextResponse.json({ improved: { [fieldKey]: improvedText } });
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

        // ── Generar sugerencias (texto plano, sin JSON) ──────────────
        if (target === 'suggestions') {
            const bio = brain.biography || brain.bio || '';
            const aud = brain.audience  || '';
            const sty = brain.style_words || brain.style || '';
            const off = brain.products_services || brain.offer || '';
            const ctx = [bio, aud, sty, off].filter(Boolean).join('. ') || 'Creador de contenido.';

            const count = type === 'pillars' ? 7 : 8;
            const what  = type === 'pillars'
                ? `${count} pilares de contenido (2-5 palabras cada uno)`
                : `${count} preguntas frecuentes reales de la audiencia`;

            // Plain text prompt — no JSON, no parsing issues
            const prompt = `Genera ${what} para este creador.
Contexto: ${ctx.slice(0, 400)}
${existing.length ? `Ya tiene estos (no repetir): ${existing.slice(0,5).join(', ')}` : ''}
Idioma: ${lang}

Escribe exactamente ${count} líneas, una por línea, sin números ni viñetas:`;

            const raw = await improveBlockWithHaiku({ apiKey, systemPrompt: 'Respondes solo con la lista solicitada, sin explicaciones ni formato extra.', userMessage: prompt });

            // Parse: raw can be object, array, or string
            let suggestions = [];

            if (Array.isArray(raw)) {
                suggestions = raw.filter(s => typeof s === 'string' && s.trim().length > 3);
            } else {
                const text = typeof raw === 'string' ? raw
                    : typeof raw === 'object' && raw !== null
                        ? (Array.isArray(raw) ? raw.join('\n') : Object.values(raw).find(v => typeof v === 'string') || JSON.stringify(raw))
                        : String(raw);

                suggestions = text
                    .replace(/```[\s\S]*?```/g, '')   // strip code blocks
                    .split('\n')
                    .map(l => l.replace(/^[\d\-\*\.\•]+\s*/, '').replace(/^["']|["']$/g, '').trim())
                    .filter(l => l.length > 3 && l.length < 120 && !l.includes('{') && !l.includes('```'));
            }

            // Trim to expected count
            suggestions = suggestions.slice(0, count);

            console.log(`[suggestions] type=${type} count=${suggestions.length}`, suggestions);
            return NextResponse.json({ suggestions });
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

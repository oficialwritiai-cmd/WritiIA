import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { GenerateIdeasSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { verifyProjectAccess, forbidden } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

export const maxDuration = 60; // Vercel function timeout

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(req) {
    try {
        const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try { body = await req.json(); }
        catch { return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 }); }

        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 15, buildRateLimitKey(ip, body?.userId));
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = GenerateIdeasSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { context, platforms, goal, count, projectId, contentPillars = [], sessionFAQs = [] } = validation.data;

        // ── Auth via cookies ──────────────────────────────────────────
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        // ── Credits ───────────────────────────────────────────────────
        const creditResult = await chargeCredits(supabase, user.id, CREDIT_COSTS.GENERATE_IDEAS, 'generate_ideas', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // ── Fetch Brain ───────────────────────────────────────────────
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', user.id).single();
            brandBrain = data;
        }

        // ── Build rich brain context ──────────────────────────────────
        const brainCtx = [
            brandBrain?.biography         && `Quién es: ${brandBrain.biography}`,
            brandBrain?.audience          && `Audiencia: ${brandBrain.audience}`,
            brandBrain?.products_services && `Oferta: ${brandBrain.products_services}`,
            brandBrain?.style_words       && `Estilo: ${brandBrain.style_words}`,
            brandBrain?.niche             && `Nicho: ${brandBrain.niche}`,
            brandBrain?.learning_notes    && `Auditoría de marca: ${brandBrain.learning_notes}`,
            contentPillars.length         && `Pilares de contenido: ${contentPillars.join(' · ')}`,
            sessionFAQs.length            && `FAQs reales de la audiencia: ${sessionFAQs.slice(0, 10).join(' | ')}`,
        ].filter(Boolean).join('\n');

        // ── Prompts virales ───────────────────────────────────────────
        const currentYear = new Date().getFullYear(); // 2026
        const systemPrompt = `Eres un estratega de contenido VIRAL experto en Reels, TikTok y YouTube Shorts para coaches, consultores y creadores educativos en español.
Fecha actual: ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}. Año: ${currentYear}. Toda referencia temporal debe usar ${currentYear} como año actual.

CEREBRO IA DEL CREADOR:
${brainCtx || context}

TU MISIÓN: generar ideas que PAREN EL SCROLL. Cada idea debe:
- Tener un hook que genere curiosidad, controversia o emoción en los primeros 3 segundos
- Resolver un problema REAL y específico de esta audiencia concreta
- Estar adaptada a video corto (60-90 segundos)
- Variar los formatos: educativo directo, storytelling personal, lista de errores, opinión polémica, "yo antes vs ahora", revelación sorpresa, pregunta incómoda

RESPONDE ÚNICAMENTE CON UN ARRAY JSON VÁLIDO, sin texto extra antes ni después:
[
  {
    "titulo": "Título del video (máx 65 chars, que genere clic)",
    "hook": "Las primeras 10-12 palabras del video que paran el scroll — directo, sin intro",
    "descripcion": "De qué trata el video y por qué le importa a la audiencia (2-3 frases)",
    "tipo": "Educativo|Storytelling|Lista|Opinión polémica|Antes vs Ahora|Error común|Revelación|Pregunta",
    "pilar": "Pilar de contenido al que pertenece",
    "cta": "Llamado a la acción específico (qué hacer al terminar el video)"
  }
]`;

        const userPrompt = `Genera exactamente ${count} ideas VIRALES y ESPECÍFICAS para esta audiencia.
Contexto: ${context.slice(0, 400)}
Plataformas: ${platforms.join(', ')}. Objetivo: ${goal}.
CLAVE: Usa las FAQs reales y los pilares del Cerebro IA. CERO ideas genéricas. Cada idea debe sentirse escrita para esta persona concreta.`;

        let ideasData = null;
        let lastErr = null;

        // Up to 2 attempts in case of transient Anthropic error
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                ideasData = await generateIdeasWithHaiku({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    systemPrompt,
                    userMessage: userPrompt,
                });
                break;
            } catch (e) {
                lastErr = e;
                if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (!ideasData) throw lastErr || new Error('No se pudo conectar con la IA');

        const ideas = ideasData?.parsed || [];
        if (ideas.length === 0) throw new Error('La IA no devolvió ideas válidas. Reintenta.');

        return NextResponse.json({ ideas });

    } catch (err) {
        console.error('[generate-ideas] Error completo:', err?.message, err?.stack);
        const msg = err?.message || 'Error interno del servidor.';
        // Expose safe error detail for debugging (not stack traces)
        const safeMsg = msg.includes('credit') || msg.includes('crédito') ? msg :
                        msg.includes('rate') || msg.includes('limit') ? 'Límite de peticiones alcanzado. Espera 1 minuto.' :
                        msg.includes('timeout') || msg.includes('Timeout') ? 'La IA tardó demasiado. Reintenta.' :
                        msg.includes('invalid') || msg.includes('Invalid') ? 'Datos de entrada inválidos.' :
                        'Error interno del servidor. Reintenta en unos segundos.';
        return NextResponse.json({ error: safeMsg }, { status: 500 });
    }
}

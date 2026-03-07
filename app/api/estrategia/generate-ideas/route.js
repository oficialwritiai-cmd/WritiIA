import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { EstrategiaIdeasSchema } from '@/lib/validations';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        // 1. Rate limiting with compound IP:userId key
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        // Parse body early to get userId for compound rate-limit key
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const resObj = new NextResponse();
        try {
            const rlKey = buildRateLimitKey(ip, body?.userId);
            await limiter.check(resObj, 5, rlKey); // 5 strategy sessions per min per user
        } catch {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes.' },
                { status: 429, headers: resObj.headers }
            );
        }

        // 2. Validate with Zod schema (was raw destructuring — no validation)
        const validation = EstrategiaIdeasSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { objective, launch, objection, story, types, platforms, userId } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 3. Charge Credits (1 credit)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_IDEAS, 'strategy_ideas');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // 4. Fetch Brand Brain
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = `Bio: ${brandBrain.biography || ''}. Audiencia: ${brandBrain.audience || ''}. Estilo: ${brandBrain.style_words || ''}.`;
        }

        const systemPrompt = `Eres un estratega de contenido de élite.
${brandContextString}
Analiza el objetivo: ${objective}.
Genera 10 ideas estratégicas.
RESPONDE ÚNICAMENTE CON UN ARRAY JSON VÁLIDO. Este es el formato EXACTO que debes usar:
[
  {
    "titulo_idea": "Título atractivo de la idea",
    "descripcion": "Descripción detallada de la idea y cómo ejecutarla",
    "plataforma": "Plataforma sugerida (ej: Reels, TikTok, YouTube)",
    "tipo": "Tipo de contenido (ej: Tutorial, Storytelling, Viral)",
    "por_que_funciona": "Explicación psicológica de por qué esta idea funcionará",
    "objetivo": "engagement, leads, ventas, etc.",
    "potencial": "Alto / Medio / Viral",
    "cta": "Llamado a la acción del post"
  }
]`;

        const userMessage = 'Genera el Banco de Ideas Estratégicas.';

        const { parsed: ideas } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        // Save session & ideas
        const { data: session, error: sessionErr } = await supabase.from('strategy_sessions').insert({
            user_id: userId, objetivo_mes: objective, lanzamiento: launch,
            objecion_cliente: objection, historia_personal: story,
            tipos_contenido: types, plataformas: platforms
        }).select().single();

        if (session && !sessionErr) {
            const ideasArray = Array.isArray(ideas) ? ideas : [ideas];
            const ideasToInsert = ideasArray.map(idea => ({
                session_id: session.id, user_id: userId, plataforma: idea.plataforma,
                tipo: idea.tipo, titulo_idea: idea.titulo_idea, descripcion: idea.descripcion,
                por_que_funciona: idea.por_que_funciona, objetivo: idea.objetivo, potencial: idea.potencial
            }));
            await supabase.from('strategy_ideas').insert(ideasToInsert);
        }

        return NextResponse.json({ ideas: Array.isArray(ideas) ? ideas : [ideas] });

    } catch (err) {
        // SECURITY: Log full error server-side, never send to client
        console.error('[estrategia/generate-ideas] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { IdeasExtraSchema } from '@/lib/validations';

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
            await limiter.check(resObj, 10, rlKey);
        } catch {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes.' },
                { status: 429, headers: resObj.headers }
            );
        }

        // Validate with Zod
        const validation = IdeasExtraSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { context, experienceLevel, productTicket, objections, examples, userId, projectId, proactive } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Fetch project brain if proactive or if metadata is missing
        let brainContext = '';
        if (projectId) {
            const { data: brain } = await supabase
                .from('project_brains')
                .select('*')
                .eq('project_id', projectId)
                .single();

            if (brain) {
                brainContext = `BIO: ${brain.biography || ''}. PRODUCTOS: ${brain.products_services || ''}. AUDIENCIA: ${brain.audience || ''}. ESTILO: ${brain.style_words || ''}.`;
            }
        }

        // Charge Credits (1 credit)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.IDEAS_EXTRA, 'ideas_extra', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `Eres el mejor estratega de contenido viral del mundo.
Tu tarea es generar ideas de contenido altamente específicas, disruptivas y con alto potencial viral.
Debes basarte profundamente en el perfil (BIO) y productos del usuario para que las ideas sean coherentes.
Las ideas deben dividirse en 3 categorías: Autoridad (educar), Viral (entretenimiento/curiosidad) e Historia (conexión).

IMPORTANTE: 
1. La "descripcion" debe ser detallada (mínimo 2-3 frases) explicando por qué la idea es buena y qué ángulo usar. NO la dejes vacía.
2. El "titulo_idea" debe ser corto y llamativo.

Responde ÚNICAMENTE con un array JSON válido de objetos con este formato:
[{ "titulo_idea": "...", "descripcion": "...", "categoria": "..." }]`;

        let userMessage = proactive ? `Genera una estrategia MASIVA de 30-40 ideas virales y específicas basadas en este perfil:\n${brainContext}\n` : `CONTEXTO: ${context}.`;
        
        if (!proactive) {
            if (experienceLevel) userMessage += ` NIVEL: ${experienceLevel}.`;
            if (productTicket) userMessage += ` TICKET: ${productTicket}.`;
            if (objections) userMessage += ` OBJECIONES: ${objections}.`;
            if (examples) userMessage += ` EJEMPLOS: ${examples}.`;
            if (brainContext) userMessage += `\nUSA ESTE PERFIL COMO BASE: ${brainContext}`;
            userMessage += '\nGenera 30-35 ideas originales, variadas y virales.';
        }

        const { parsed: ideas } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const validIdeas = Array.isArray(ideas) ? ideas.filter(i => i.titulo_idea && i.descripcion) : [];
        return NextResponse.json({ ideas: validIdeas });

    } catch (err) {
        console.error('[ideas-extra] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

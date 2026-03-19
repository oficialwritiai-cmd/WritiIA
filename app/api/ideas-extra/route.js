import { NextResponse } from 'next/server';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { IdeasExtraSchema } from '@/lib/validations';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { createClient } from '@supabase/supabase-js';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) return unauthorized();
        const verifiedUserId = session.userId;

        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const resObj = new NextResponse();
        try {
            const rlKey = buildRateLimitKey(ip, verifiedUserId);
            await limiter.check(resObj, 15, rlKey);
        } catch {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes.' },
                { status: 429, headers: resObj.headers }
            );
        }

        // Validate with Zod
        const validation = IdeasExtraSchema.safeParse(body);
        if (!validation.success) {
            console.error('[ideas-extra] Validation error:', validation.error.format());
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { context, experienceLevel, productTicket, objections, examples, projectId, proactive, businessOffer, targetAudience, mainPainPoint } = validation.data;

        // Verify project access
        if (projectId) {
            const hasAccess = await verifyProjectAccess(verifiedUserId, projectId);
            if (!hasAccess) return forbidden();
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Fetch project brain for deep personalization
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
        const creditResult = await chargeCredits(supabase, verifiedUserId, CREDIT_COSTS.IDEAS_EXTRA, 'ideas_extra', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `Eres un ANALIZADOR DE VIRALIDAD y estratega SEO de élite. 
Tu misión es generar ideas de contenido que no solo atraigan clics, sino que posicionen al usuario como una autoridad.

REGLAS DE ORO:
1. TÍTULOS MAGNÉTICOS (HOOKS): Cada título debe ser un "gancho" directo. No uses títulos genéricos como "Cómo vender más". Usa: "El error de $10,000 que el 90% de los emprendedores comete".
2. VARIEDAD ESTRATÉGICA: Alterna entre formatos:
   - Storytime (Historias personales/casos reales)
   - Listas / Tutoriales rápidos (3 pasos para...)
   - Antes vs Después (Transformaciones)
   - Romper Mitos (Verdades incómodas del nicho)
   - Detrás de cámaras / Curiosidad
3. OPTIMIZACIÓN SEO: Incluye palabras clave de alto volumen de búsqueda de forma natural.
4. DESCRIPCIÓN DETALLADA: Explica exactamente de qué tratará el video/post, qué gancho visual usar al inicio y cuál es el valor diferencial.

Responde ÚNICAMENTE con un array JSON válido:
[{ "titulo_idea": "GANCHO MAGNÉTICO", "descripcion": "EXPLICACIÓN DETALLADA DE LA NARRATIVA Y FORMATO", "categoria": "Autoridad|Viral|Historia|Venta" }]`;

        let userMessage = `GENERACIÓN DINÁMICA DE IDEAS PERSONALIZADAS.
PERFIL DEL NEGOCIO:
${brainContext}

CONTEXTO ADICIONAL DEL PROYECTO:
- Oferta Principal: ${businessOffer || 'Basada en perfil'}
- Audiencia Objetivo: ${targetAudience || 'Basada en perfil'}
- Dolor Principal (Pain Point): ${mainPainPoint || 'Basada en perfil'}

${proactive ? 'Genera una selección MASIVA de 35-40 ideas disruptivas y ultrasegmentadas.' : `Contexto específico: ${context}. Genera 30 ideas sobre este nicho.`}`;
        
        if (!proactive) {
            if (experienceLevel) userMessage += ` NIVEL: ${experienceLevel}.`;
            if (productTicket) userMessage += ` TICKET: ${productTicket}.`;
            if (objections) userMessage += ` OBJECIONES: ${objections}.`;
            if (examples) userMessage += ` EJEMPLOS: ${examples}.`;
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

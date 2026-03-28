import { NextResponse } from 'next/server';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { EstrategiaIdeasSchema } from '@/lib/validations';

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
            await limiter.check(resObj, 5, rlKey);
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = EstrategiaIdeasSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { objective, launch, objection, story, types, platforms, projectId } = validation.data;

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify Session & Project Ownership (v4.9.0)
        // ─────────────────────────────────────────────────────────────
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        const verifiedUserId = user.id;

        // Charge Credits (1 credit)
        const creditResult = await chargeCredits(supabase, verifiedUserId, CREDIT_COSTS.GENERATE_IDEAS, 'strategy_ideas', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }

        let brandContextString = brandBrain ? `Bio: ${brandBrain.biography || ''}. Estilo: ${brandBrain.style_words || ''}.` : '';

        const systemPrompt = `Eres el estratega de contenido viral más exitoso de la actualidad, experto en algoritmos de Reels, TikTok, LinkedIn y YouTube Shorts. 
${brandContextString}
Objetivo estratégico: ${objective}.
Contexto adicional: Lanzamiento: ${launch || 'N/A'}. Objeción a derribar: ${objection || 'N/A'}.

Tu misión es generar un Banco de 40 IDEAS de contenido de ALTO IMPACTO y POTENCIAL VIRAL. 

REGLAS DE ORO PARA LAS IDEAS:
1. GANCHOS DISRUPTIVOS: Cada idea debe empezar con un gancho "scroll-stopper" (curiosidad extrema, contradicción, resultado impactante, o dolor agudo).
2. CONTENIDO 'TOP-TIER': Evita consejos obvios. Provee ángulos específicos, tácticas poco conocidas, o historias que generen debate.
3. VARIEDAD ESTRATÉGICA: Distribuye las 40 ideas entre:
   - VIRALIDAD (Curiosidad, tendencias, errores comunes).
   - AUTORIDAD (Tutoriales avanzados, estudios de caso, "detrás de escena" experto).
   - CONEXIÓN/VENTA (Historias de transformación, derribar la objeción "${objection || 'del cliente'}", vulnerabilidad).

FORMATO DE RESPUESTA (JSON Array Estricto):
[
  {
    "titulo_idea": "Gancho Magnético + Concepto",
    "descripcion": "Estructura del contenido: Inicio (gancho), Desarrollo (3 puntos clave) y Cierre.",
    "plataforma": "...",
    "tipo": "Viral | Autoridad | Conexión",
    "por_que_funciona": "Disparador psicológico (ej: Curiosidad, FOMO, Contraste)",
    "objetivo": "...",
    "potencial": "Viral | Alto | Medio",
    "cta": "Llamada a la acción estratégica"
  }
]

IMPORTANTE: Las 40 ideas deben ser ÚNICAS y variadas. No generes variaciones de la misma idea.`;

        const { parsed: ideas } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: 'Genera el Banco de Ideas Estratégicas.',
        });

        const { data: session } = await supabase.from('strategy_sessions').insert({
            user_id: verifiedUserId, 
            project_id: projectId,
            objetivo_mes: objective, 
            lanzamiento: launch,
            objecion_cliente: objection, 
            historia_personal: story,
            tipos_contenido: types, 
            plataformas: platforms
        }).select().single();

        if (session) {
            const ideasArray = Array.isArray(ideas) ? ideas : [ideas];
            const ideasToInsert = ideasArray.map(idea => ({
                session_id: session.id, 
                user_id: verifiedUserId, 
                plataforma: idea.plataforma,
                tipo: idea.tipo, 
                titulo_idea: idea.titulo_idea, 
                descripcion: idea.descripcion,
                por_que_funciona: idea.por_que_funciona, 
                objetivo: idea.objetivo, 
                potencial: idea.potencial
            }));
            await supabase.from('strategy_ideas').insert(ideasToInsert);
        }

        return NextResponse.json({ ideas: Array.isArray(ideas) ? ideas : [ideas] });

    } catch (err) {
        console.error('[estrategia/generate-ideas] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

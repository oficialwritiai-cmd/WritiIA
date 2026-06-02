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

        // ── Platform-specific guides ─────────────────────────────────
        function getPlatformIdeasGuide(plats) {
            const guides = {
                'Reels': 'INSTAGRAM REELS: ideas de 60-90s con hooks visuales brutales. Gancho en frame 1. Usa trending sounds.',
                'TikTok': 'TIKTOK: ideas que abusen del algoritmo, trending music, trending formats. Viral es el objetivo.',
                'LinkedIn': 'LINKEDIN: ideas que posicionen, case studies reales, datos que sorprendan. Autoridad, no entretenimiento.',
                'YouTube Shorts': 'YOUTUBE SHORTS: ideas con descubrimiento, thumbnails intrigantes, keywords trending.',
                'YouTube': 'YOUTUBE: ideas para contenido largo, tutoriales profundos, case studies extensos, análisis detallados.'
            };
            return plats.map(p => guides[p] || '').filter(Boolean).join('\n');
        }

        // ── Prompts virales ───────────────────────────────────────────
        const currentYear = new Date().getFullYear();
        const systemPrompt = `Eres el estratega de contenido más agudo del mundo hispanohablante.

No generas ideas. Generas OPORTUNIDADES de conexión real entre un creador y su audiencia.

Sabes exactamente qué hace que alguien pare el scroll a las 2am. Conoces los miedos no dichos, los deseos secretos y las frustraciones diarias de cada nicho.

FECHA HOY: ${new Date().toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}

CEREBRO IA DEL CREADOR:
${brainCtx || context}

PLATAFORMA: ${platforms.join(', ')}
CANTIDAD: ${count} ideas

════════════════════
ESTRATEGIA POR PLATAFORMA
════════════════════
${getPlatformIdeasGuide(platforms)}

════════════════════
LO QUE HACE VIRAL UNA IDEA
════════════════════

Una idea es viral cuando toca UNO de estos:
🔥 DOLOR ESPECÍFICO — el que no se dice en voz alta
🤯 CREENCIA ROTA — algo que creían y resulta falso
💡 INSIGHT ROBADO — lo que solo saben los expertos
😤 INJUSTICIA — algo que no es justo y todos sienten
🎯 ATAJO REAL — el camino corto que nadie enseña
⚡ URGENCIA — algo que cambia y hay que saber ya
🪞 ESPEJO — se ven reflejados perfectamente

════════════════════
FÓRMULAS DE IDEAS VIRALES
════════════════════

Usa una fórmula diferente por idea:

F01: "El error silencioso que comete el 90% de [nicho] y que les cuesta [resultado negativo]"
F02: "Por qué [acción común] en realidad está saboteando tu [resultado deseado]"
F03: "Lo que [autoridad/experto] hace diferente y que nadie en [nicho] está contando"
F04: "De [situación mala específica] a [resultado concreto] en [tiempo real]: el proceso exacto"
F05: "La conversación que tuve con [perfil cliente] que me hizo repensar todo sobre [tema]"
F06: "Por qué fracasas en [tema] (y no es lo que crees)"
F07: "[Número] señales de que estás [problema] sin darte cuenta"
F08: "La pregunta que [perfil cliente] nunca se hace y que lo cambia todo"
F09: "Lo que nadie te dice sobre [tema] porque les conviene que no lo sepas"
F10: "El momento exacto en que [transformación] y por qué ocurre antes de lo que imaginas"
F11: "Por qué los [nicho] que más venden hacen exactamente lo contrario de [creencia común]"
F12: "Esto que todos hacen en [nicho] y que en realidad no funciona"
F13: "[Número] cosas que cambiarían inmediatamente si [acción específica]"
F14: "La diferencia real entre [resultado malo] y [resultado bueno] no es lo que crees"
F15: "Por qué [tiempo específico] es el momento más importante para [nicho]"

════════════════════
FORMATO DE CADA IDEA
════════════════════

💡 TÍTULO
[Título específico usando la fórmula]

🎯 EMOCIÓN DOMINANTE
[curiosidad / dolor / urgencia / inspiración / indignación]

🔥 POR QUÉ PARA EL SCROLL
[Una frase explicando el gancho emocional]

📱 FORMATO IDEAL
[reel 60s / reel 90s / carrusel / directo]

⚡ GANCHO DE APERTURA SUGERIDO
[Primera frase del video — lista para grabar]

════════════════════
ESTÁNDAR DE CALIDAD
════════════════════

ANTES DE ENTREGAR cada idea pregúntate:
¿Alguien con este perfil pararía el scroll?
¿Es específica para ESTE nicho o vale para cualquiera?
¿Conecta con algo que sienten ahora mismo?

Si alguna respuesta es no — reemplázala.

NUNCA entregues ideas que:
- Podrían ser de cualquier coach genérico
- Suenen a contenido de hace 2 años
- No tengan gancho emocional claro
- Sean demasiado obvias o esperadas

RESPONDE ÚNICAMENTE CON UN ARRAY JSON VÁLIDO, sin texto extra antes ni después:
[
  {
    "titulo": "Título específico y potente (máx 65 chars)",
    "hook": "Las primeras 10-12 palabras que paran el scroll — directo, sin intro",
    "descripcion": "De qué trata el video y por qué importa (2-3 frases)",
    "emocion": "curiosidad|dolor|urgencia|inspiración|indignacion",
    "formato": "reel 60s|reel 90s|carrusel|directo",
    "gancho_apertura": "Primera frase del video lista para grabar",
    "cta": "Llamado a la acción específico"
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

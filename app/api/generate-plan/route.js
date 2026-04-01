import { NextResponse } from 'next/server';
import { GeneratePlanSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

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

        const validation = GeneratePlanSchema.safeParse(body);
        if (!validation.success) {
            console.error('[generate-plan] Zod validation failed:', JSON.stringify(validation.error.flatten(), null, 2));
            console.error('[generate-plan] Body received:', JSON.stringify(body, null, 2));
            return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const { 
            description, platforms, frequency, focus, projectId, postCount,
            businessOffer, targetAudience, targetAudienceType, mainPainPoint,
            monthlyGoals, successMetric, keyThemes, contentStyles,
            howNotToSound, brandMantra, ticketPrice
        } = validation.data;

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

        // Credit Check & Charge (3 credits)
        const creditResult = await chargeCredits(supabase, verifiedUserId, CREDIT_COSTS.GENERATE_PLAN, 'generate_plan', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain: project-scoped first, fallback to global
        let brandBrain = null;
        let projectData = null;

        if (projectId) {
            const [brainRes, projectRes] = await Promise.all([
                supabase.from('project_brains').select('*').eq('project_id', projectId).single(),
                supabase.from('projects').select('*').eq('id', projectId).single()
            ]);
            brandBrain = brainRes.data;
            projectData = projectRes.data;
        }

        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }

        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const projectLanguage = projectData?.language || 'es';

        let brandContextString = `\n--- IDENTIDAD DE MARCA (CEREBRO IA) ---
Biografía/Identidad: ${brandBrain.biography || 'No especificada'}
Nicho/Sub-nicho: ${brandBrain.niche || ''} / ${brandBrain.sub_niche || ''}
Palabras y Estilo: ${brandBrain.style_words || 'No especificado'}
APRENDIZAJE / FEEDBACK ACUMULADO: ${brandBrain.learning_notes || ''}
---------------------------------------\n\nMUY IMPORTANTE: Todo el plan, ideas, títulos y enfoques DEBEN estar 100% alineados y ADAPTADOS a esta Identidad de Marca (Cerebro IA). Eres la voz de esta marca.
IDIOMA OBLIGATORIO: Debes responder COMPLETAMENTE en idoma: ${projectLanguage === 'en' ? 'INGLÉS' : 'ESPAÑOL'}.`;

        const systemPrompt = `Eres el Director Creativo de una Agencia de Marketing Web Premium.
${brandContextString}

Tu objetivo es diseñar un ESTRATEGIA DE CONTENIDO MENSUAL de alto impacto para ${postCount || 30} publicaciones.
No generes ideas genéricas. Usa el briefing para crear ángulos de venta, autoridad y comunidad que se sientan humanos y profesionales.

CADA OBJETO DEL JSON DEBE TENER ESTAS CLAVES:
- "day_number": número del 1 al 30.
- "platform": string (TikTok, Reels, Instagram, LinkedIn, etc).
- "content_type": string (educativo, venta, autoridad, comunidad, historia, etc).
- "idea_title": UN TÍTULO MAGNÉTICO Y ESPECÍFICO (Máximo 10 palabras). Evita títulos genéricos como "Idea de contenido". Sé creativo y directo.
- "descripcion_idea": una descripción detallada (2-3 frases) del ángulo y contenido sugerido (OBLIGATORIO).
- "goal": el objetivo específico del post (alcance, leads, venta, autoridad).

REGLA DE ORO: No repitas títulos. Cada día debe ser un ángulo diferente basado en el briefing.
Responde ÚNICAMENTE en formato JSON (un array de objetos). NO incluyas texto antes o después del bloque JSON.`;

        const userMessage = `
--- BRIEFING DE CAMPAÑA ---
Oferta Principal: ${businessOffer || description}
Precio/Ticket: ${ticketPrice || 'No especificado'}
Público Objetivo: ${targetAudienceType} (${targetAudience || 'General'})
Problema/Dolor Nº1: ${mainPainPoint}
Objetivos del Mes: ${Array.isArray(monthlyGoals) ? monthlyGoals.join(', ') : monthlyGoals}
Métrica de Éxito: ${successMetric}
Temas a Empujar: ${keyThemes}
Estilos de Contenido: ${Array.isArray(contentStyles) ? contentStyles.join(', ') : contentStyles}
FILTRO "LO QUE NO QUEREMOS": ${howNotToSound}
MANTRA/IDEA REPETIDA: ${brandMantra}

PLATAFORMAS: ${platforms.join(', ')}
FRECUENCIA TOTAL: ${frequency}
POSTS A GENERAR: ${postCount || 30}

${body.selectedIdeas && body.selectedIdeas.length > 0 ? `IDEAS ESPECÍFICAS PARA INCLUIR: \n- ${body.selectedIdeas.join('\n- ')}` : ''}

IMPORTANTE: 
1. Distribuye el contenido para cumplir con el mix de objetivos (Ventas vs Autoridad vs Educativo).
2. Si la oferta es de ticket alto, prioriza contenido de Autoridad y Casos de Estudio.
3. El tono debe respetar el filtro "Lo que no queremos".
`;

        const { parsed: results } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const { data: planData, error: planErr } = await supabase.from('content_plans').insert({
            user_id: verifiedUserId,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            frequency,
            platforms,
            focus,
            project_id: projectId
        }).select().single();

        if (planErr) throw planErr;

        const slotsToInsert = results.map((r, index) => {
            const day = Number(r.day_number || (index + 1));
            const type = r.content_type || 'educativo';
            const platform = r.platform || platforms[0] || 'General';
            const goalStr = r.goal || focus || 'engagement';
            const title = r.idea_title || `${type.charAt(0).toUpperCase() + type.slice(1)} para ${platform}`;

            return {
                plan_id: planData.id,
                user_id: verifiedUserId,
                project_id: projectId,
                day_number: day,
                platform: platform,
                content_type: type,
                idea_title: title,
                idea_description: r.descripcion_idea || r.descripcion || '',
                goal: goalStr
            };
        });

        const { data: slotData, error: slotErr } = await supabase.from('content_slots').insert(slotsToInsert).select();
        if (slotErr) throw slotErr;

        return NextResponse.json({ plan: planData, slots: slotData });

    } catch (err) {
        console.error('[generate-plan] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

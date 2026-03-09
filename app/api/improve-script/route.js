import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { improveScriptWithInstruction } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { z } from 'zod';

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

const ImproveScriptSchema = z.object({
    script: z.object({
        gancho: z.string().max(2000),
        desarrollo: z.array(z.string().max(3000)).max(20),
        cierre: z.string().max(2000).optional().nullable(),
        cta: z.string().max(1000),
        titulo_guion: z.string().max(300).optional().nullable(),
        video_duration: z.string().max(20).optional().nullable(),
    }),
    instruction: z.string().max(1000).default(''),
    topic: z.string().max(500).optional().default(''),
    platform: z.string().max(50).optional().default('Reels'),
    videoDuration: z.string().max(20).optional().default('60 seg'),
    userId: z.string().uuid('ID de usuario inválido'),
});

export async function POST(request) {
    try {
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try { body = await request.json(); }
        catch { return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 }); }

        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 20, buildRateLimitKey(ip, body?.userId));
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = ImproveScriptSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { script, instruction, topic, platform, videoDuration, userId, projectId } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Charge 1 credit per improvement
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.IMPROVE_SCRIPT, 'improve_script');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain: project-scoped first, fallback to global
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        const brandCtx = brandBrain
            ? `Contexto del creador:\n- Bio: ${brandBrain.biography || ''}\n- Estilo: ${brandBrain.style_words || ''}\n- Tono: ${brandBrain.values_tone || ''}\n- Audiencia: ${brandBrain.audience || ''}`
            : '';

        // Format current script as readable block for the model
        const scriptBlock = `GANCHO: ${script.gancho}

DESARROLLO:
${(script.desarrollo || []).map((p, i) => `  [${i + 1}] ${p}`).join('\n')}

CIERRE: ${script.cierre || '(ninguno)'}

CTA: ${script.cta}`;

        // Default improvement if no instruction
        const hasInstruction = instruction && instruction.trim().length > 0;
        const improvementGoal = hasInstruction
            ? `El usuario pide específicamente: "${instruction.trim()}"`
            : `Aplica estas mejoras por defecto:
- Hazlo más humano y cercano, elimina frases genéricas.
- Ajusta el contenido para que corresponda exactamente a la duración de ${videoDuration}.
- Mejora el CTA para que invite a una acción concreta (comentar, guardar, enviar DM, visitar link), NUNCA uses "sígueme" a secas.
- Enriquece el desarrollo con datos o ejemplos más específicos.`;

        const systemPrompt = `Eres un editor de guiones de video experto en contenido viral para redes sociales.
${brandCtx}

Tu tarea es MEJORAR el guion existente sin cambiar su idea principal ni su objetivo base.
Respeta exactamente la misma estructura: gancho, desarrollo (array), cierre, cta.
Duración objetivo: ${videoDuration} para ${platform} sobre "${topic}".

${improvementGoal}

REGLAS ESTRICTAS:
- NO cambies el tema ni la idea base.
- El CTA NUNCA puede estar vacío ni ser genérico como "sígueme" sin más.
- El gancho DEBE mantener impacto visual en los primeros 3 segundos.
- Devuelve SOLO JSON válido con este formato exacto (sin markdown):
{
  "titulo_guion": "...",
  "video_duration": "${videoDuration}",
  "gancho": "...",
  "desarrollo": ["...", "...", "..."],
  "cierre": "...",
  "cta": "...",
  "copy_post": {
    "titulo": "...",
    "descripcion_larga": "...",
    "hashtags": ["#tag1", "#tag2"]
  }
}`;

        const userMessage = `GUION ACTUAL A MEJORAR:\n\n${scriptBlock}`;

        const { parsed } = await improveScriptWithInstruction({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const improved = Array.isArray(parsed) ? parsed[0] : parsed;

        if (!improved || !improved.gancho || !improved.cta) {
            return NextResponse.json({
                error: 'La IA no pudo mejorar el guion. Intenta de nuevo.'
            }, { status: 422 });
        }

        return NextResponse.json({ script: improved });

    } catch (err) {
        console.error('[improve-script] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

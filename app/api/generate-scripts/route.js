import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateScriptsWithSonnet } from '@/lib/anthropic';
import { chargeCredits, getScriptCost } from '@/lib/credits';

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
            // Compound key: IP + userId prevents IP-rotation bypass
            const rlKey = buildRateLimitKey(ip, body?.userId);
            await limiter.check(resObj, 15, rlKey);
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = GenerateScriptSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { topic, platform, tone, userId, hookType, intensity, count, videoDuration } = validation.data;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Credit Check & Charge (Dynamic Cost)
        const totalCost = getScriptCost(videoDuration, count || 2);
        const creditResult = await chargeCredits(supabase, userId, totalCost, 'generate_scripts');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `
[CONTEXTO BASE]
- Bio: ${brandBrain.biography || ''}
- Estilo: ${brandBrain.style_words || ''}
- Tono: ${brandBrain.values_tone || ''}
`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega de contenido logrando retención masiva y copys virales.
Usa el contexto base para inyectar la personalidad del creador, responde en lenguaje humano, directo y muy natural. PROHIBIDO sonar genérico (nada de "es importante destacar", "en este video te enseñaré" o frases vacías). Quiero que suenes como una persona joven, directa y auténtica.

${brandContextString}

OBJETIVOS ESTRICTOS PARA CADA GUION:
1. Calidad y Estilo:
   - Hook (Gancho) ultra específico: Los primeros 3 segundos deben ser visuales, impactantes y prometer una transformación o curiosidad extrema. Mínimo 10-15 palabras.
   - Lenguaje Humano: Usa frases cortas, dinámicas, con ritmo. Evita el tono de "tutorial aburrido".
   - Desarrollo Real: No des consejos vagos. Da ejemplos, microhistorias o detalles concretos acordes a la duración.
   - Cierre Emocional: Conecta el tema con la identidad del seguidor antes del CTA.

2. Duración y Estructura (${videoDuration}):
   - Si es 30s - 60s: Un solo gancho potente, 3-5 frases de desarrollo clave, CTA rápido.
   - Si es 90s - 2 min: Gancho, desarrollo con 2-3 puntos detallados, cierre emocional, CTA.
   - Si es 3 min - 5 min (YouTube): Estructura completa con Introducción, Desarrollo profundo (secciones con ejemplos reales), Conclusión y CTA extendido.

3. CTA (Llamada a la Acción): 
   - SIEMPRE genera un CTA obligatorio al final.
   - Debe ser relevante al objetivo (leads, ventas, seguimiento, comentario).

Genera EXACTAMENTE ${count || 2} (NI UNO MÁS, NI UNO MENOS) guiones distintos para ${platform} con tono ${tone}, intensidad ${intensity}/5 y duración de ${videoDuration}.

RESPONDE ÚNICAMENTE CON UN ARRAY JSON VÁLIDO. Este es el formato EXACTO:
[
  {
    "titulo_guion": "Título interno",
    "video_duration": "${videoDuration}",
    "gancho": "El hook inicial impactante",
    "desarrollo": [
      "Punto 1 detallado",
      "Punto 2 detallado",
      "Punto 3 detallado (añadir más si la duración es larga)"
    ],
    "cierre": "Cierre emocional / conexión",
    "cta": "CTA claro y directo",
    "copy_post": {
      "titulo": "Título del post",
      "descripcion_larga": "Texto persuasivo para el pie de foto",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }
  }
]
`;

        const userMessage = `Tema central: ${topic}`;

        const { parsed: results } = await generateScriptsWithSonnet({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const scriptsArray = Array.isArray(results) ? results : [results];

        // Strict Validation
        const isValid = scriptsArray.every(s => {
            const hasHook = s.gancho && s.gancho.trim().split(' ').length >= 5; // Limite laxo pero previene estafa
            const hasDesarrollo = Array.isArray(s.desarrollo) && s.desarrollo.length >= 3;
            const hasCta = s.cta && s.cta.trim().length > 0;
            return hasHook && hasDesarrollo && hasCta;
        });

        if (!isValid) {
            console.error('[generate-scripts] La IA falló la validación estricta de CTA o Formato:', scriptsArray);
            return NextResponse.json({
                error: 'El modelo proporcionó guiones incompletos (falta CTA, hook débil o desarrollo corto). Por favor, intenta de nuevo.'
            }, { status: 422 });
        }

        return NextResponse.json({ scripts: scriptsArray });

    } catch (err) {
        console.error('[generate-scripts] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

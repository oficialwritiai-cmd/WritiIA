import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateScriptsWithSonnet } from '@/lib/anthropic';
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

        const { topic, platform, tone, userId, hookType, intensity, count } = validation.data;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Credit Check & Charge (2 credits)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_SCRIPTS, 'generate_scripts');
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
Usa el contexto base para inyectar la personalidad del creador, responde en lenguaje humano, directo y muy natural. PROHIBIDO sonar genérico (nada de "es importante destacar" o "en este video te enseñaré").
${brandContextString}

OBJETIVOS ESTRICTOS PARA CADA GUION:
1. Hook: Primeros 3 segundos. DEBE ser fuerte, visual y específico. (Mínimo 10 palabras).
2. Desarrollo: 3 a 5 frases con ejemplos, microhistorias o detalles específicos.
3. CTA: Call to action OBLIGATORIO al final, conectado emocionalmente con el objetivo del video (ej: leads, ventas, followers).

Genera EXACTAMENTE ${count || 2} guiones distintos para ${platform} con tono ${tone} e intensidad ${intensity}/5.

RESPONDE ÚNICAMENTE CON UN ARRAY JSON VÁLIDO. Este es el formato EXACTO que debes usar (todas las keys obligatorias):
[
  {
    "titulo_guion": "Título llamativo interno",
    "video_duration": "ej: 45-60 seg",
    "gancho": "El hook inicial. Al menos 10 palabras, muy visual.",
    "desarrollo": [
      "Punto 1 que desarrolla el hook (nada de frases vacías)",
      "Punto 2 con detalle o insight específico",
      "Punto 3 o conclusión clave"
    ],
    "cierre": "Cierre natural del tema",
    "cta": "Llamada a la acción clara, directa y NO VACÍA",
    "copy_post": {
      "titulo": "Título para el texto del post",
      "descripcion_larga": "Texto largo, persuasivo y con valor para la descripción del video",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }
  }
]`;

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

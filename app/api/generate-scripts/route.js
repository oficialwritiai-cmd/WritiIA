import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';
import { generateScriptsWithSonnet } from '@/lib/anthropic';
import { saveToLibrary } from '@/lib/library';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 15, ip); // Max 15 per minute
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' }, { status: 429, headers: resObj.headers });
        }

        const body = await request.json();
        const validation = GenerateScriptSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos de entrada inválidos', details: validation.error.errors },
                { status: 400 }
            );
        }

        const {
            topic, platform, tone, userId, count, goal, ideas,
            awareness, victory, opinion, story, hookType, intensity,
            sourceType, sourceReferenceId
        } = validation.data;
        const requestedCount = count || 1;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        // 1. Credit Check (5 credits)
        const { data: profile, error: creditError } = await supabase
            .from('users_profiles')
            .select('credits_balance')
            .eq('id', userId)
            .single();

        const cost = 5;
        if (!profile || profile.credits_balance < cost) {
            return NextResponse.json({ error: 'Créditos insuficientes.' }, { status: 402 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;

        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `
[CONTEXTO BASE - CEREBRO IA (Perfil General)]
- Bio/Quién es: ${brandBrain.biography || 'No especificado'}
- Qué vende/Productos: ${brandBrain.products_services || 'No especificado'}
- A quién ayuda: ${brandBrain.audience || 'No especificada'}
- Estilo: ${brandBrain.style_words || 'No especificado'}
- Tono general: ${brandBrain.values_tone || 'No especificado'}
`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const sessionContextString = `
[CONTEXTO ESPECÍFICO - FORMULARIO ACTUAL (Prioridad Alta)]
- Plataforma destino: ${platform}
- Nivel de awareness deseado: ${awareness}
- Tono específico deseado: ${tone}
- Tipo de gancho solicitado: ${hookType}
- Intensidad o agresividad: ${intensity}/5
`;

        const systemPrompt = `Eres un estratega de contenido premium especializado en guiones virales agresivos y persuasivos.
Tu misión es crear piezas que no parezcan escritas por una IA, sino por un experto en marketing de respuesta directa.

Usa SIEMPRE la combinación del perfil de marca (CEREBRO IA) y las respuestas del formulario actual (CONTEXTO ESPECÍFICO).
REGLA CRÍTICA: El formulario actual (CONTEXTO ESPECÍFICO) tiene ABSOLUTA PRIORIDAD sobre el perfil general. Adapta el contenido al nivel de awareness, tono e intensidad solicitados en esta pieza específica.

${brandContextString}
${sessionContextString}

REGLAS DE ORO PARA EL CONTENIDO:
1. GANCHOS (HOOKS) ULTRA-ESPECÍFICOS: Nada de frases genéricas como "¿Quieres saber cómo...?", "En este video te voy a contar...", "Hoy vamos a hablar de...". 
   - Empieza DIRECTO al grano con un dato, una provocación o una verdad contraintuitiva.
2. LENGUAJE CONCRETO: Usa números, detalles reales, comparaciones y evita adjetivos vacíos ("increíble", "asombroso").
3. CONEXIÓN TOTAL: El guion debe estar 100% conectado con la idea proporcionada.
4. COPY DEL POST: Debe estar optimizado para ${platform}, usando hooks visuales en el título y una descripción que invite a leer.

Genera ${requestedCount} guiones únicos.

IMPORTANTE: Devuelve ÚNICAMENTE un array JSON válido. Nada de texto extra.
Estructura obligatoria por cada objeto del array:
{
  "titulo_guion": "Título interno del guion",
  "video_duration": "Duración estimada (ej. 45-60 segundos)",
  "hook": "El gancho inicial (impactante y directo)",
  "desarrollo": [
    "Punto 1 con detalle real y accionable",
    "Punto 2 con detalle real y accionable",
    "Punto 3 con detalle real y accionable"
  ],
  "cierre": "Frase de cierre potente que conecte con el paso final",
  "cta": "Llamada a la acción clara y directa",
  "copy_post": {
    "titulo": "Título/Hook para el texto del post",
    "descripcion_larga": "Cuerpo del post con valor añadido (1-2 párrafos)",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
  }
} / 
IMPORTANTE: El campo 'video_duration' debe ser una estimación realista del tiempo que tardaría un humano en leer el guion.`;

        const userMessage = `Tema o idea principal para el guion: ${topic}
Contexto a aplicar:
${brandContextString}`;

        const { parsed: results, usage } = await generateScriptsWithSonnet({
            apiKey,
            systemPrompt,
            userMessage,
        });

        // Ensure results is always an array
        let scriptsArray = [];
        if (Array.isArray(results)) {
            scriptsArray = results;
        } else if (typeof results === 'string') {
            try {
                const parsed = JSON.parse(results);
                scriptsArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                scriptsArray = [];
            }
        }

        if (scriptsArray.length === 0) {
            return NextResponse.json({ error: 'No se pudieron generar guiones. Intenta de nuevo.' }, { status: 500 });
        }

        // 2. Credit accounting & Usage logs
        await Promise.all([
            supabase.rpc('decrement_credits_balance', { u_id: userId, amount: cost }),
            supabase.from('usage_logs').insert({
                user_id: userId,
                action: 'generate_scripts',
                model: 'claude-3-5-sonnet',
                cost_eur: 0.05 // Estimated cost per generation
            })
        ]);

        return NextResponse.json({ scripts: scriptsArray });

    } catch (err) {
        console.error('Error en generate-scripts:', err);
        const errorMsg = err.message || 'Error interno';
        if (errorMsg.includes('sobrecargado') || errorMsg.includes('overloaded')) {
            return NextResponse.json({ error: 'El servicio de IA está temporalmente ocupado. Por favor, espera unos segundos e intenta de nuevo.' }, { status: 503 });
        }
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

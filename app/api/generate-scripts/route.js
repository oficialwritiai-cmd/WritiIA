import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';
import { generateScriptsWithSonnet } from '@/lib/anthropic';

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
            awareness, victory, opinion, story, hookType, intensity
        } = validation.data;
        const requestedCount = count || 1;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        // 1. Credit Check (5 credits)
        const { data: credits, error: creditError } = await supabase
            .from('ai_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

        const cost = 5;
        if (credits && (credits.total_credits - credits.used_credits) < cost) {
            return NextResponse.json({ error: 'Créditos insuficientes.' }, { status: 402 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;

        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `
PERFIL DEL CREADOR (Cerebro IA):
- Bio/Quién es: ${brandBrain.biography || ''}
- Qué vende/Productos: ${brandBrain.products_services || ''}
- A quién ayuda: ${brandBrain.audience || ''}
- Estilo: ${brandBrain.style_words || ''}
- Tono general: ${brandBrain.values_tone || ''}
`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega de contenido premium especializado en guiones virales agresivos y persuasivos.
Tu misión es crear piezas que no parezcan escritas por una IA. 

REGLAS DE ORO:
1. GANCHOS (HOOKS): Deben ser ultra-específicos. Nada de "¿Quieres saber cómo...?". Usa la intensidad ${intensity}/5.
2. MARCA PERSONAL: Inyecta la voz del creador basándote en su Cerebro IA.
3. ESTRUCTURA: Los guiones deben ser rápidos, directos y con frases cortas.
4. CERO CLICHÉS: Prohibido "Hoy te traigo...", "Seguro que...", "En este vídeo...".

${brandContextString}

ESTILO DE RESPUESTA:
Debes generar un JSON array de objetos con esta estructura:
[
  {
    "titulo_angulo": "...",
    "hook_principal": "Hook principal muy potente basado en el tipo: ${hookType}",
    "hook_alternativo_1": "Variante extrema",
    "hook_alternativo_2": "Variante intrigante",
    "guion_detallado": "El cuerpo del guion con frases cortas y ritmo",
    "cta": "Llamada a la acción coherente con el objetivo"
  }
]`;

        const userMessage = `
CONTEXTO DEL CONTENIDO:
- Tema: ${topic}
- Objetivo: ${goal}
- Plataforma: ${platform}
- Nivel de awareness: ${awareness}
- Tono deseado: ${tone}
- Tipo de gancho: ${hookType}
- Intensidad de gancho: ${intensity}/5
- Victoria/Fracaso: ${victory || 'N/A'}
- Opinión impopular: ${opinion || 'N/A'}
- Caso real/Situación: ${story || 'N/A'}
- Notas extra: ${ideas || 'Ninguna'}

Genera ${requestedCount} guiones únicos.`;

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

        // 2. Save each to Library (new unified table)
        const { saveToLibrary } = await import('@/lib/library');
        for (const res of scriptsArray) {
            await saveToLibrary({
                userId,
                type: 'guion',
                platform,
                goal,
                content: res,
                metadata: {
                    awareness,
                    hookType,
                    intensity,
                    tone,
                    topic
                },
                tags: [platform, goal, tone].filter(Boolean)
            });
        }

        // Log usage & charge credits
        await supabase.rpc('increment_used_credits', { u_id: userId, amount: cost });

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

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateScriptsWithSonnet } from '@/lib/anthropic';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 5, ip); // Max 5 strategy generations per minute
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' }, { status: 429, headers: resObj.headers });
        }

        const body = await request.json();
        const { objective, launch, objection, story, types, platforms, userId } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;

        // Fetch user profile and brand brain
        const { data: profile } = await supabase.from('users_profiles').select('*').eq('id', userId).single();
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = `
CONTEXTO DE MARCA (Cerebro IA):
- Bio/Historia: ${brandBrain.biography || ''}
- Audiencia: ${brandBrain.audience || ''}
- Valores y Tono: ${brandBrain.values_tone || ''}
- Nicho: ${brandBrain.niche_topics || ''}
`;
        }

        const systemPrompt = `Eres un estratega de contenido de élite para redes sociales.
Tu objetivo es analizar los datos del usuario y crear un "Banco de Ideas Estratégicas" de 30 ideas únicas.

Deberás mezclar diferentes tipos de contenido:
- Educativo (Cómo hacer X, mitos, errores).
- Autoridad (Resultados, casos de éxito, "por qué escucharte").
- Conexión/Personal (Historias, vulnerabilidad, valores).
- Venta/Conversión (Objeciones, oferta directa, resultados de clientes).
- Viralidad (Tendencias, opiniones impopulares, entretenimiento de nicho).

${brandContextString}

Respuestas de la sesión de descubrimiento:
- Objetivo 30 días: ${objective}
- Lanzamiento/Oferta: ${launch}
- Objeción principal: ${objection}
- Historia personal: ${story}
- Tipos preferidos: ${types.join(', ')}
- Plataformas: ${platforms.join(', ')}

Reglas:
- Genera exactamente 30 ideas.
- Cada idea debe ser accionable y específica.
- Devuelve SOLO un array JSON de objetos con esta estructura:
[
  {
    "id": "uuid-generado",
    "plataforma": "...",
    "tipo": "...",
    "titulo_idea": "...",
    "descripcion": "...",
    "por_que_funciona": "...",
    "objetivo": "...",
    "potencial": "alto/medio"
  }
]`;

        const userMessage = "Genera el Banco de Ideas Estratégicas con 30 ideas únicas basadas en mi perfil y objetivos.";

        const { parsed: ideas, usage } = await generateScriptsWithSonnet({
            apiKey,
            systemPrompt,
            userMessage,
        });

        // Save session
        const { data: session } = await supabase.from('strategy_sessions').insert({
            user_id: userId,
            objetivo_mes: objective,
            lanzamiento: launch,
            objecion_cliente: objection,
            historia_personal: story,
            tipos_contenido: types,
            plataformas: platforms
        }).select().single();

        // Save ideas
        const ideasToInsert = ideas.map(idea => ({
            session_id: session.id,
            user_id: userId,
            plataforma: idea.plataforma,
            tipo: idea.tipo,
            titulo_idea: idea.titulo_idea,
            descripcion: idea.descripcion,
            por_que_funciona: idea.por_que_funciona,
            objetivo: idea.objetivo,
            potencial: idea.potencial
        }));

        await supabase.from('strategy_ideas').insert(ideasToInsert);

        return NextResponse.json({ ideas });

    } catch (err) {
        console.error('Error en estrategia generate-ideas:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

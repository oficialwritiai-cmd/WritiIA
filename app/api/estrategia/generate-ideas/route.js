import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import rateLimit from '@/lib/rate-limit';

// Wrapper that uses higher max_tokens for idea generation
async function callAnthropicForIdeas({ apiKey, systemPrompt, userMessage }) {
    // Use the dedicated ideas function
    return await generateIdeasWithHaiku({ apiKey, systemPrompt, userMessage });
}

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
${brandContextString}

Tu objetivo es crear un Banco de Ideas Estratégicas.

IMPORTANTE: Responde EXCLUSIVAMENTE con un array JSON válido. Nada de texto antes o después. Sin markdown, sin código, solo JSON puro.

Formato obligatorio (exactamente 15 ideas):
[
  {
    "id": "1",
    "plataforma": "Reels, TikTok, LinkedIn, X o YouTube",
    "tipo": "educativo, autoridad, historia personal, venta o viral",
    "titulo_idea": "Título corto y atractivo",
    "descripcion": "Descripción de la idea en 1-2 frases",
    "por_que_funciona": "Por qué esta idea funciona para el objetivo",
    "objetivo": "atraer leads, autoridad, ventas, engagement o comunidad",
    "potencial": "alto, medio o bajo"
  }
]

Ejemplo de respuesta válida:
[
  {
    "id": "1",
    "plataforma": "Reels",
    "tipo": "autoridad",
    "titulo_idea": "El error que comete el 90% al usar IA",
    "descripcion": "Análisis del error común y cómo evitarlo",
    "por_que_funciona": "Genera identificación inmediata",
    "objetivo": "autoridad",
    "potencial": "alto"
  }
]`;

        const userMessage = "Genera el Banco de Ideas Estratégicas con 15 ideas únicas basadas en mi perfil y objetivos. Responde SOLO con el JSON array, sin texto previo ni posterior.";

        const { parsed: ideas, usage } = await callAnthropicForIdeas({
            apiKey,
            systemPrompt,
            userMessage,
        });

        // Ensure ideas is always an array
        let ideasArray = [];
        if (Array.isArray(ideas)) {
            ideasArray = ideas;
        } else if (typeof ideas === 'string') {
            try {
                const parsed = JSON.parse(ideas);
                ideasArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                ideasArray = [];
            }
        } else if (ideas && typeof ideas === 'object') {
            ideasArray = [ideas];
        }

        if (ideasArray.length === 0) {
            return NextResponse.json({ error: 'No se pudieron generar ideas. Intenta de nuevo.' }, { status: 500 });
        }

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
        const ideasToInsert = ideasArray.map(idea => ({
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

        // ALSO save to main library (MANDATORY)
        try {
            const { saveToLibrary } = await import('@/lib/library');
            for (const idea of ideasArray) {
                await saveToLibrary({
                    userId,
                    type: 'idea',
                    platform: idea.plataforma,
                    goal: idea.objetivo,
                    content: {
                        titulo_idea: idea.titulo_idea,
                        descripcion: idea.descripcion,
                        tipo: idea.tipo,
                        por_que_funciona: idea.por_que_funciona,
                        potencial: idea.potencial
                    },
                    metadata: { session_id: session.id, tipo_contenido: idea.tipo },
                    tags: [idea.plataforma, idea.tipo, idea.objetivo].filter(Boolean)
                });
            }
        } catch (libraryErr) {
            console.error('[Estrategia] Library save error:', libraryErr);
            // Continue even if library save fails - we already saved to strategy_ideas
        }

        // Ensure we send a proper array
        const ideasToSend = Array.isArray(ideasArray) ? ideasArray : [];
        console.log('[API] Sending ideas count:', ideasToSend.length);

        return NextResponse.json({ ideas: ideasToSend });

    } catch (err) {
        console.error('Error en estrategia generate-ideas:', err);
        const errorMsg = err?.message || 'Error interno';
        if (errorMsg.includes('sobrecargado') || errorMsg.includes('overloaded')) {
            return NextResponse.json({ error: 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos segundos.', ideas: [] }, { status: 503 });
        }
        return NextResponse.json({ error: errorMsg, ideas: [] }, { status: 500 });
    }
}

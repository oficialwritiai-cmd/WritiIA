import { NextResponse } from 'next/server';
import { GenerateIdeasSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(req) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 15, ip);
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const body = await req.json();
        const validation = GenerateIdeasSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        const { context, platforms, useSEO, useTikTok, goal, count, userId } = validation.data;
        const apiKey = process.env.ANTHROPIC_API_KEY;

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
        if (brandBrain) {
            brandContextString = `Cerebro IA del creador: ${brandBrain.biography || ''}. Estilo: ${brandBrain.style_words || ''}.`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega virales experto. ${brandContextString}
Genera IDEAS DE CONTENIDO de alto impacto.
Responde ÚNICAMENTE en JSON array:
[
  {
    "plataforma": "...",
    "tipo_idea": "...",
    "titulo_idea": "...",
    "descripcion": "...",
    "objetivo": "..."
  }
]`;

        const userPrompt = `Genera ${count} ideas para: ${context}. 
Plataformas: ${platforms.join(', ')}. 
Objetivo: ${goal}. 
Tendencias SEO: ${useSEO ? 'Sí' : 'No'}. 
Tendencias TikTok: ${useTikTok ? 'Sí' : 'No'}.`;

        const { parsed: ideas } = await generateIdeasWithHaiku({
            apiKey,
            systemPrompt,
            userMessage: userPrompt,
        });

        // Save to library
        const { saveToLibrary } = await import('@/lib/library');
        for (const idea of ideas) {
            await saveToLibrary({
                userId,
                type: 'idea',
                platform: idea.plataforma,
                goal: idea.objetivo,
                content: idea,
                tags: ['idea', idea.plataforma]
            });
        }

        return NextResponse.json({ ideas });

    } catch (error) {
        console.error("Error en generate-ideas:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

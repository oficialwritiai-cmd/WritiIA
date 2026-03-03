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

        console.log('[generate-ideas] Calling Anthropic...');
        
        let ideasData;
        try {
            ideasData = await generateIdeasWithHaiku({
                apiKey,
                systemPrompt,
                userMessage: userPrompt,
            });
        } catch (apiError) {
            console.error('[generate-ideas] API Error:', apiError.message);
            if (apiError.message?.includes('sobrecargado') || apiError.message?.includes('overloaded')) {
                return NextResponse.json({ error: 'El servicio de IA está temporalmente ocupado. Por favor, espera unos segundos e intenta de nuevo.' }, { status: 503 });
            }
            throw apiError;
        }

        const ideas = ideasData?.parsed;
        console.log('[generate-ideas] Raw ideas:', typeof ideas, ideas ? 'has data' : 'null');

        // Ensure ideas is always an array
        let ideasArray = [];
        
        if (ideas && Array.isArray(ideas)) {
            ideasArray = ideas;
        } else if (ideas && typeof ideas === 'object') {
            // It's an object, wrap it in array
            ideasArray = [ideas];
        } else if (typeof ideas === 'string') {
            try {
                const parsed = JSON.parse(ideas);
                ideasArray = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                console.error('[generate-ideas] Parse error:', e);
                ideasArray = [];
            }
        }

        console.log('[generate-ideas] Processed ideas count:', ideasArray.length);

        if (!ideasArray || ideasArray.length === 0) {
            return NextResponse.json({ error: 'No se pudieron generar ideas. Intenta de nuevo con otros parámetros.' }, { status: 500 });
        }

        // Save to library (don't fail if this errors)
        try {
            const { saveToLibrary } = await import('@/lib/library');
            for (const idea of ideasArray) {
                if (idea && idea.titulo_idea) {
                    await saveToLibrary({
                        userId,
                        type: 'idea',
                        platform: idea.plataforma || 'General',
                        goal: idea.objetivo || goal,
                        content: idea,
                        tags: ['idea', idea.plataforma].filter(Boolean)
                    }).catch(err => console.error('[generate-ideas] Save error:', err));
                }
            }
        } catch (saveErr) {
            console.error('[generate-ideas] Library save error:', saveErr);
            // Continue even if save fails
        }

        return NextResponse.json({ ideas: ideasArray });

    } catch (error) {
        console.error("[Error en generate-ideas]:", error);
        const errorMsg = error?.message || 'Error interno';
        if (errorMsg.includes('sobrecargado') || errorMsg.includes('overloaded')) {
            return NextResponse.json({ error: 'El servicio de IA está temporalmente ocupado. Por favor, espera unos segundos e intenta de nuevo.' }, { status: 503 });
        }
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { improveBlockWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { fieldName, fieldValue, projectId, userId } = body;

        if (!fieldValue || !userId) {
            return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Fetch brand brain for context
        let brandContext = '';
        if (projectId) {
            const { data: brain } = await supabase
                .from('project_brains')
                .select('biography, sells, helps, niche, sub_niche, style_words')
                .eq('project_id', projectId)
                .single();

            if (brain) {
                brandContext = `Contexto de marca: ${brain.biography || ''} | Vende: ${brain.sells || ''} | Nicho: ${brain.niche || ''} | Estilo: ${brain.style_words || ''}`;
            }
        }

        const fieldLabels = {
            audience: 'descripción del público objetivo',
            painPoint: 'dolor/problema principal del público',
            differentiator: 'propuesta de valor diferencial',
            promise: 'promesa de transformación / resultado',
            offer: 'descripción de la oferta'
        };

        const label = fieldLabels[fieldName] || fieldName;

        const systemPrompt = `Eres un estratega de marketing experto en copywriting para anuncios.
El usuario ha escrito un borrador para "${label}" de su campaña de ads.
Tu trabajo es MEJORAR ese texto: hacerlo más claro, persuasivo, concreto y relevante.

${brandContext ? `\n${brandContext}\n` : ''}

REGLAS:
1. Mantén la ESENCIA del mensaje original. No inventes datos nuevos.
2. Hazlo más específico y menos genérico.
3. Usa lenguaje que conecte emocionalmente con el público.
4. Máximo 2-3 frases. Sé directo.
5. Responde SOLO con el texto mejorado, sin explicaciones.`;

        const result = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: `Texto original del usuario:\n"${fieldValue}"\n\nMejora este texto para que sea más persuasivo y claro.`
        });

        const improvedText = result.content?.trim() || fieldValue;

        return NextResponse.json({ improved: improvedText });

    } catch (err) {
        console.error('[analyze-ads-field] Error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

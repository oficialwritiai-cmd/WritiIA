import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chargeCredits } from '@/lib/credits';
import { verifyProjectAccess } from '@/lib/auth-guard';

export const maxDuration = 60;

const CONTENT_TYPES = [
    'Revelación', 'Storytelling', 'Antes vs Ahora', 'Tutorial rápido',
    'Opinión polémica', 'Caso real', 'Mito vs Realidad', 'Datos sorprendentes',
    'Detrás de cámaras', 'Respuesta a objeción', 'Transformación', 'Lista de errores',
];

function extractJson(text) {
    if (!text) return null;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
}

export async function POST(req) {
    try {
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

        const body = await req.json();
        const {
            description, platforms, frequency, tone, videoDuration, postCount,
            selectedIdeas = [], businessOffer, targetAudienceType, mainPainPoint,
            contentStyles = [], projectId
        } = body;

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 });
        }

        const creditResult = await chargeCredits(supabase, user.id, 3, 'generate_plan', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.' }, { status: 402 });
        }

        // Fetch brand brain for personalization
        let brain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brain = data;
        }
        if (!brain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', user.id).single();
            brain = data;
        }

        const topic = businessOffer || mainPainPoint || description || 'mi negocio';
        const platformList = platforms || ['Reels'];
        const count = Math.max(6, Math.min(postCount || 12, 28));

        // Build selected ideas context
        const selectedContext = selectedIdeas.length > 0
            ? `\nIDEAS YA SELECCIONADAS (inclúyelas adaptadas en el plan):\n${selectedIdeas.slice(0, 6).map((s, i) => `${i + 1}. ${s}`).join('\n')}`
            : '';

        const brainContext = brain
            ? `Creador: ${brain.biography || ''}. Audiencia: ${brain.audience || ''}. Tono: ${brain.values_tone || 'profesional y cercano'}.`
            : `Tono: ${tone || 'profesional y cercano'}.`;

        const systemPrompt = `Eres un estratega de contenido de élite. Generas planes de contenido variados, creativos y adaptados al negocio del creador.
Devuelves ÚNICAMENTE un array JSON válido con exactamente ${count} ideas. Sin texto extra.`;

        const userMessage = `Genera ${count} ideas de contenido para el mes para este negocio:
- Oferta/Negocio: ${topic}
- Audiencia: ${targetAudienceType || 'Emprendedores'}
- Plataformas: ${platformList.join(', ')}
- Frecuencia: ${frequency || '3 por semana'}
- ${brainContext}
${selectedContext}

REGLAS:
1. Exactamente ${count} ideas, variadas (no repetir el mismo formato/ángulo).
2. Títulos específicos y con gancho, NO genéricos. Que generen curiosidad o emoción.
3. Alterna entre estos tipos: Revelación, Storytelling, Tutorial, Opinión, Caso real, Datos, Antes/Después, Mito/Realidad.
4. Distribuye las plataformas: ${platformList.join(', ')}.
5. Cada idea debe estar alineada con el negocio: ${topic}.

Formato JSON (array de ${count} objetos):
[{
  "idea_title": "título con gancho específico y poderoso",
  "idea_description": "descripción de 1-2 frases del ángulo y valor del contenido",
  "content_type": "Revelación|Storytelling|Tutorial rápido|Opinión polémica|Caso real|Datos sorprendentes|Antes vs Ahora|Mito vs Realidad",
  "platform": "${platformList[0]}",
  "hook": "primera frase de apertura del vídeo que engancha"
}]`;

        // Call Claude Sonnet for quality idea generation
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 4096,
                temperature: 0.8,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
            }),
        });

        let aiIdeas = null;
        if (aiRes.ok) {
            const aiData = await aiRes.json();
            aiIdeas = extractJson(aiData.content?.[0]?.text || '');
        }

        // Build final slots (AI ideas or fallback templates)
        const today = new Date();
        const slots = [];

        for (let i = 0; i < count; i++) {
            const platform = platformList[i % platformList.length];
            const aiIdea = aiIdeas?.[i];
            const contentType = aiIdea?.content_type || CONTENT_TYPES[i % CONTENT_TYPES.length];

            // Smart title: use AI idea > selected idea title > fallback template
            let ideaTitle = aiIdea?.idea_title;
            if (!ideaTitle && selectedIdeas[i]) {
                // Extract title from "titulo: descripcion" format
                const colonIdx = selectedIdeas[i].indexOf(':');
                ideaTitle = colonIdx > 0 ? selectedIdeas[i].slice(0, colonIdx).trim() : selectedIdeas[i].slice(0, 80);
            }
            if (!ideaTitle) {
                ideaTitle = `${contentType}: ${topic.slice(0, 40)}`;
            }

            const ideaDesc = aiIdea?.idea_description
                || (selectedIdeas[i] ? selectedIdeas[i] : `Contenido de ${contentType} sobre ${topic}`);

            // Smart scheduling: calculate date based on frequency
            const freqNum = parseInt(frequency?.split(' ')[0]) || 3;
            const daysInterval = Math.round(7 / freqNum);
            const slotDate = new Date(today);
            slotDate.setDate(today.getDate() + Math.floor(i * daysInterval) + 1);

            slots.push({
                id: `slot-${Date.now()}-${i}`,
                idea_title: ideaTitle,
                idea_description: ideaDesc,
                platform: aiIdea?.platform || platform,
                content_type: contentType,
                day_number: i + 1,
                goal: businessOffer || mainPainPoint || 'engagement',
                hook: aiIdea?.hook || '',
                has_script: false,
                script_content: null,
                scheduled_date: slotDate.toISOString().split('T')[0],
                created_at: new Date().toISOString(),
            });
        }

        console.log(`[generate-plan] Generated ${slots.length} slots (AI: ${aiIdeas ? 'yes' : 'fallback'})`);
        return NextResponse.json({ success: true, slots, message: `Plan generado: ${slots.length} ideas` });

    } catch (err) {
        console.error('generate-plan error:', err);
        return NextResponse.json({ error: err.message || 'Error al generar el plan.' }, { status: 500 });
    }
}

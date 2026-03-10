import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const { selectedIdeas, userId, projectId, preferences } = await request.json();

        if (!selectedIdeas || !Array.isArray(selectedIdeas) || selectedIdeas.length === 0) {
            return NextResponse.json({ error: 'No hay ideas seleccionadas para analizar.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        const { data: existingEvents } = await supabase
            .from('calendar_events')
            .select('event_date, type, platform')
            .eq('user_id', userId)
            .gte('event_date', todayStr)
            .lte('event_date', endOfMonthStr);

        const eventsByDate = {};
        if (existingEvents) {
            existingEvents.forEach(ev => {
                if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
                eventsByDate[ev.event_date].push(ev);
            });
        }

        const defaultPreferences = {
            maxPostsPerDay: 2,
            postsPerWeek: 4,
            avoidWeekends: true,
            ...preferences
        };

        let ideasToPlan = [...selectedIdeas];
        let generatedIdeas = [];
        const MIN_IDEAS = 20;

        if (selectedIdeas.length < MIN_IDEAS) {
            const ideasNeeded = MIN_IDEAS - selectedIdeas.length;
            console.log(`[ANALYZE-PLAN] Generando ${ideasNeeded} ideas adicionales...`);

            const brainContext = brandBrain 
                ? `BIO: ${brandBrain.biography || ''}. PRODUCTOS: ${brandBrain.products_services || ''}. AUDIENCIA: ${brandBrain.audience || ''}. ESTILO: ${brandBrain.style_words || ''}.` 
                : '';

            const topicsFromSelected = selectedIdeas
                .map(i => i.titulo_idea || i.titulo || '')
                .filter(Boolean)
                .slice(0, 5);

            const platformsFromSelected = [...new Set(selectedIdeas.map(i => i.plataforma).filter(Boolean))];

            const generateSystemPrompt = `Eres el mejor estratega de contenido viral del mundo.
Tu tarea es generar ideas de contenido altamente específicas, disruptivas y con alto potencial viral.
Debes basarte en los temas y tono de las ideas existentes del usuario.
Las ideas deben dividirse en categorías: Autoridad (educar), Viral (entretenimiento/curiosidad), Historia (conexión).

IMPORTANTE: Las ideas generadas deben ser COMPLEMENTARIAS a las existentes, no repetirlas.
Responde ÚNICAMENTE con un array JSON válido de objetos con este formato:
[{ "titulo_idea": "...", "descripcion": "...", "categoria": "...", "plataforma": "...", "objetivo": "..." }]`;

            const generateUserMessage = `Genera ${ideasNeeded} ideas adicionales basadas en estos temas/ángulos:
${topicsFromSelected.map(t => `- ${t}`).join('\n')}

Plataformas objetivo: ${platformsFromSelected.join(', ') || 'Reels, TikTok'}
${brainContext ? `\nPERFIL: ${brainContext}` : ''}

Las ideas deben seguir el mismo tono y estilo de las existentes pero proponer nuevos ángulos.`;

            const { parsed: newIdeas } = await generateIdeasWithHaiku({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt: generateSystemPrompt,
                userMessage: generateUserMessage,
            });

            if (Array.isArray(newIdeas) && newIdeas.length > 0) {
                generatedIdeas = newIdeas.map(idea => ({
                    ...idea,
                    isGenerated: true,
                    source: 'Sugerida por IA'
                }));
                ideasToPlan = [...selectedIdeas, ...generatedIdeas];
            }
        }

        const planSystemPrompt = `Eres un experto en estrategia de contenido y calendarización inteligente.
Tu tarea es analizar las ideas recibidas y asignar a cada una la mejor fecha y plataforma óptima.

REGLAS DE PLANIFICACIÓN:
1. YouTube: 1-2 veces por semana (días laborales, preferiblemente martes-jueves)
2. Instagram/TikTok: más frecuencia, distribuir a lo largo de la semana (evitar fines de semana si es posible)
3. LinkedIn: días laborales, preferiblemente martes-miércoles-jueves
4. X (Twitter): cualquier día, más flexible

REGLAS DE DISTRIBUCIÓN:
- Máximo ${defaultPreferences.maxPostsPerDay} publicaciones por día
- Alternar tipos de contenido (no poner todo viral el mismo día)
- No poner muchas piezas largas seguidas (como 3 lives/YouTube largos)
- Respetar eventos ya existentes en el calendario
- Si una fecha está muy ocupada, buscar el día más cercano libre

CONOCIMIENTO DEL CALENDARIO EXISTENTE:
${Object.entries(eventsByDate).map(([date, events]) => 
    `${date}: ${events.length} eventos (${events.map(e => e.type).join(', ')})`
).join('\n') || 'No hay eventos programados este mes.'}

Responde ÚNICAMENTE con un array JSON válido con este formato exacto:
[{
    "index": 0,
    "titulo": "Título de la idea",
    "fecha_sugerida": "YYYY-MM-DD",
    "hora_sugerida": "HH:mm",
    "plataforma": "nombre de plataforma",
    "tipo": "viral|educativo|autoridad|tipo de la idea",
    "reason": "explicación breve de por qué esta fecha y plataforma"
}]`;

        const planUserMessage = `
FECHA ACTUAL (HOY): ${todayStr}
FIN DE MES: ${endOfMonthStr}

IDEAS A PLANIFICAR (${ideasToPlan.length} total):
${ideasToPlan.map((idea, idx) => {
    const titulo = idea.titulo_idea || idea.titulo || 'Sin título';
    const plataforma = idea.plataforma || 'Reels';
    const tipo = idea.tipo || idea.categoria || 'viral';
    const isGenerated = idea.isGenerated ? ' [GENERADA POR IA]' : '';
    return `${idx + 1}. [${plataforma}] ${titulo} (${tipo})${isGenerated}`;
}).join('\n')}

PREFERENCIAS:
- Máximo ${defaultPreferences.maxPostsPerDay} posts/día
- ${defaultPreferences.avoidWeekends ? 'Evitar fines de semana' : 'Fines de semana permitidos'}
- ${defaultPreferences.postsPerWeek} publicaciones por semana objetivo

Genera la planificación óptima distribuyendo las ideas a lo largo del mes de forma inteligente.`;

        console.log(`[ANALYZE-PLAN] Solicitando planificación para ${ideasToPlan.length} ideas`);

        const { parsed: schedule } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt: planSystemPrompt,
            userMessage: planUserMessage,
        });

        if (!Array.isArray(schedule) || schedule.length === 0) {
            return NextResponse.json({ error: 'No se pudo generar la planificación.' }, { status: 500 });
        }

        const planResult = schedule.map(item => {
            const idea = ideasToPlan[item.index] || ideasToPlan[0];
            return {
                ...idea,
                suggestedDate: item.fecha_sugerida,
                suggestedTime: item.hora_sugerida,
                suggestedPlatform: item.plataforma || idea?.plataforma,
                reason: item.reason || 'Fecha optimizada para engagement',
                isNew: idea?.isGenerated || false
            };
        });

        return NextResponse.json({
            plan: planResult,
            generatedIdeas: generatedIdeas,
            summary: {
                totalIdeas: ideasToPlan.length,
                originalIdeas: selectedIdeas.length,
                newIdeas: generatedIdeas.length,
                dateRange: { start: todayStr, end: endOfMonthStr }
            }
        });

    } catch (err) {
        console.error('[ANALYZE-PLAN] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

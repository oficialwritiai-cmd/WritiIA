import { NextResponse } from 'next/server';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';

export async function POST(request) {
    try {
        const { selectedIdeas, projectId, preferences } = await request.json();

        if (!selectedIdeas || !Array.isArray(selectedIdeas) || selectedIdeas.length === 0) {
            return NextResponse.json({ error: 'No hay ideas seleccionadas para analizar.' }, { status: 400 });
        }

        // SECURITY: verify JWT — never trust userId from the body
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();
        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }
        const userId = user.id;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Planning Window: 30 days from today (regardless of month boundary)
        const endOfWindow = new Date(today);
        endOfWindow.setDate(today.getDate() + 30);
        const endOfWindowStr = endOfWindow.toISOString().split('T')[0];

        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        let eventsQ = supabase
            .from('calendar_events')
            .select('event_date, type, platform')
            .eq('user_id', userId)
            .gte('event_date', todayStr)
            .lte('event_date', endOfWindowStr);
        if (projectId) eventsQ = eventsQ.eq('project_id', projectId);
        const { data: existingEvents } = await eventsQ;

        const eventsByDate = {};
        if (existingEvents) {
            existingEvents.forEach(ev => {
                if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
                eventsByDate[ev.event_date].push(ev);
            });
        }

        const defaultPreferences = {
            maxPostsPerDay: 10,
            postsPerWeek: 10,
            avoidWeekends: false,
            ...preferences
        };

        let ideasToPlan = [...selectedIdeas];
        let generatedIdeas = [];
        const MIN_IDEAS = 30;

        if (selectedIdeas.length < MIN_IDEAS) {
            const ideasNeeded = MIN_IDEAS - selectedIdeas.length;
            console.log(`[ANALYZE-PLAN] Generando ${ideasNeeded} ideas adicionales...`);

            const topicsFromSelected = selectedIdeas
                .map(i => i.titulo_idea || i.titulo || '')
                .filter(Boolean)
                .slice(0, 5);

            const platformsFromSelected = [...new Set(selectedIdeas.map(i => i.plataforma).filter(Boolean))];

            const generateSystemPrompt = `Eres una agencia de contenido de élite.
Tu trabajo es generar ideas complementarias que completen un plan mensual estratégico.

FECHA HOY: ${new Date().toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}

CEREBRO IA DEL CREADOR:
${brandBrain ? [
    brandBrain.biography         && `Quién es: ${brandBrain.biography}`,
    brandBrain.niche             && `Nicho: ${brandBrain.niche}`,
    brandBrain.sub_niche         && `Sub-nicho: ${brandBrain.sub_niche}`,
    brandBrain.audience          && `Audiencia: ${brandBrain.audience}`,
    brandBrain.products_services && `Oferta: ${brandBrain.products_services}`,
    brandBrain.style_words       && `Estilo: ${brandBrain.style_words}`,
    brandBrain.learning_notes    && `Aprendizaje: ${brandBrain.learning_notes}`,
].filter(Boolean).join('\n') : 'No disponible'}

TEMAS BASE (ideas ya seleccionadas por el usuario):
${topicsFromSelected.map(t => `- ${t}`).join('\n')}

REGLAS CRÍTICAS:
- Las ideas deben ser COMPLEMENTARIAS — no repitas ángulos ya cubiertos
- Cada idea debe ser específica para el nicho y audiencia del Cerebro IA
- NUNCA ideas genéricas que valgan para cualquier coach
- Usa una de estas estructuras por idea:
  · DOLOR ESPECÍFICO: nombra el problema exacto de la audiencia
  · CONTRAINTUITIVO: di lo opuesto a lo esperado en el nicho
  · CASO REAL: resultado concreto con números específicos
  · URGENCIA: algo que está cambiando ahora en el sector
- El titulo_idea debe parar el scroll — máximo 65 caracteres
- PROHIBIDO: "y la mayoría lo hace al revés", frases de plantilla genérica

Responde ÚNICAMENTE con un array JSON válido:
[{ "titulo_idea": "...", "descripcion": "...", "categoria": "...", "plataforma": "...", "objetivo": "..." }]`;

            const generateUserMessage = `Genera ${ideasNeeded} ideas adicionales basadas en estos temas/ángulos:
${topicsFromSelected.map(t => `- ${t}`).join('\n')}

Plataformas objetivo: ${platformsFromSelected.join(', ') || 'Reels, TikTok'}

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

        const planSystemPrompt = `Eres el director de estrategia de contenido más brillante del mundo.

Tu trabajo no es crear contenido.
Es diseñar sistemas de contenido que convierten seguidores en clientes.

Cada decisión que tomas tiene un propósito: que el negocio del coach crezca de forma medible.

FECHA HOY: ${new Date().toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}

CEREBRO IA COMPLETO:
${brandBrain ? [
    brandBrain.biography         && `Quién es: ${brandBrain.biography}`,
    brandBrain.niche             && `Nicho: ${brandBrain.niche}`,
    brandBrain.sub_niche         && `Sub-nicho: ${brandBrain.sub_niche}`,
    brandBrain.audience          && `Audiencia ideal: ${brandBrain.audience}`,
    brandBrain.products_services && `Oferta/Productos: ${brandBrain.products_services}`,
    brandBrain.style_words       && `Estilo de marca: ${brandBrain.style_words}`,
    brandBrain.values_tone       && `Valores y tono: ${brandBrain.values_tone}`,
    brandBrain.learning_notes    && `Aprendizaje acumulado: ${brandBrain.learning_notes}`,
].filter(Boolean).join('\n') : 'No definido'}

════════════════════
FILOSOFÍA DE LA SESIÓN MATRIX
════════════════════

Un mes de contenido no es una lista de temas. Es una CAMPAÑA estratégica.

Cada semana tiene un ARCO EMOCIONAL:
- Semana 1: PROBLEMA — hacer visible el dolor
- Semana 2: POSIBILIDAD — mostrar que hay salida
- Semana 3: PRUEBA — demostrar con evidencia
- Semana 4: ACCIÓN — mover hacia la decisión

════════════════════
PROCESO DE PLANIFICACIÓN
════════════════════

PASO 1 — ANÁLISIS DEL CEREBRO IA:
Identifica los 3 dolores más urgentes de la audiencia.
Identifica el deseo profundo detrás de cada dolor.
Identifica las objeciones que impiden la compra.

PASO 2 — DISEÑO DEL MES:
Cada idea debe servir a UNO de estos:
🎯 ATRACCIÓN — traer audiencia nueva
🔥 ACTIVACIÓN — conectar con los que ya siguen
💰 CONVERSIÓN — mover hacia la compra
❤️ RETENCIÓN — fidelizar a los que ya compraron

El balance ideal del mes:
40% Atracción / 30% Activación / 20% Conversión / 10% Retención

PASO 3 — ASIGNACIÓN INTELIGENTE:

YOUTUBE: 1-2 veces/semana → Contenido educativo profundo, posicionamiento de autoridad (8-15 min)
INSTAGRAM/TIKTOK: 3-5 veces/semana → Ideas virales de alto impacto, momentos de conexión real (60-90 seg)
LINKEDIN/X: 2-3 veces/semana → Opiniones de industria, casos y resultados, formato texto + imagen

PASO 4 — REGLAS DE DISTRIBUCIÓN:
- MÁXIMO POSTS: No exceder ${defaultPreferences.maxPostsPerDay || 10} publicaciones por día
- DISTRIBUCIÓN QUIRÚRGICA: Prioriza "Goteo Constante". Es mejor 1-2 ideas diarias que amontonar muchas un día
- VARIACIÓN DE HORARIOS: Usa franjas de alto engagement (08:30-10:00, 13:00-14:30, 18:00-19:30, 21:00-22:30)
- SIN SOLAPAMIENTOS: Si hay múltiples posts el mismo día, sepáralos por 3+ horas
- RELLENO DE HUECOS: Intenta que no haya días vacíos en la ventana de 30 días
- COBERTURA UNIFORME: Si hay 30 ideas → aprox 1/día. Si hay 60 → aprox 2/día
- Respetar eventos existentes y añadir nuevas ideas encima si es necesario

CONOCIMIENTO DEL CALENDARIO EXISTENTE:
${Object.entries(eventsByDate).map(([date, events]) =>
    `${date}: ${events.length} eventos (${events.map(e => e.type).join(', ')})`
).join('\n') || 'No hay eventos programados en este rango.'}

PASO 5 — FORMATO DE SALIDA:

Por cada idea del plan:

📅 SEMANA [X] · [FECHA] · [PLATAFORMA]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 IDEA: [título específico y potente]
🎯 OBJETIVO: [atracción/activación/conversión/retención]
😱 EMOCIÓN: [emoción dominante]
🎣 GANCHO: [primera frase del video]
📊 POR QUÉ AHORA: [por qué esta semana tiene sentido estratégico]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

════════════════════
ESTÁNDAR DE CALIDAD
════════════════════

ANTES DE ENTREGAR el plan pregúntate:
¿Este mes tiene un arco narrativo claro?
¿Cada idea tiene un propósito estratégico?
¿El balance atracción/conversión es correcto?
¿Las ideas de conversión llegan en semana 3-4?
¿Cada idea es específica para ESTE coach?

Si el plan fuera una serie de Netflix, ¿el espectador querría ver el siguiente episodio?

Ese es el estándar. Nada menos.

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
FIN DE LA VENTANA (30 DÍAS): ${endOfWindowStr}

IDEAS A PLANIFICAR (${ideasToPlan.length} total):
${ideasToPlan.map((idea, idx) => {
    const titulo = idea.titulo_idea || idea.titulo || 'Sin título';
    const plataforma = idea.plataforma || 'Reels';
    const tipo = idea.tipo || idea.categoria || 'viral';
    const isGenerated = idea.isGenerated ? ' [GENERADA POR IA]' : '';
    return `${idx + 1}. [${plataforma}] ${titulo} (${tipo})${isGenerated}`;
}).join('\n')}

PREFERENCIAS Y CONTEXTO:
- Objetivo Principal: ${preferences?.objective || 'Not specified'}
- Objeción a Derribar: ${preferences?.objection || 'Not specified'}
- Lanzamiento/Promo: ${preferences?.launch || 'Not specified'}
- Plataformas Objetivo: ${preferences?.platforms?.join(', ') || 'Not specified'}
- Máximo ${defaultPreferences.maxPostsPerDay} posts/día (Límite técnico)
- ${defaultPreferences.avoidWeekends ? 'IMPORTANTE: Evitar fines de semana' : 'Fines de semana permitidos'}

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
                dateRange: { start: todayStr, end: endOfWindowStr }
            }
        });

    } catch (err) {
        console.error('[ANALYZE-PLAN] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

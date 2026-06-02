import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chargeCredits } from '@/lib/credits';
import { verifyProjectAccess } from '@/lib/auth-guard';

export const maxDuration = 60;

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
            description, platforms, frequency, focus, tone, videoDuration, postCount,
            selectedIdeas = [], businessOffer, targetAudienceType, mainPainPoint,
            monthlyGoals = [], contentStyles = [], projectId
        } = body;

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 });
        }

        const creditResult = await chargeCredits(supabase, user.id, 3, 'generate_plan', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.' }, { status: 402 });
        }

        console.log(`[generate-plan] Generating ${postCount} slots for platforms: ${platforms?.join(', ')}`);

        const slots = generatePlanSlots(
            postCount,
            description,
            selectedIdeas,
            platforms,
            contentStyles,
            businessOffer,
            mainPainPoint
        );

        if (!slots || slots.length === 0) {
            console.error('[generate-plan] No slots generated');
            return NextResponse.json(
                { error: 'No se pudieron generar las ideas.' },
                { status: 400 }
            );
        }

        console.log(`[generate-plan] ✅ Generated ${slots.length} slots successfully`);
        console.log(`[generate-plan] First slot structure:`, slots[0]);

        return NextResponse.json({
            success: true,
            slots,
            message: `Plan generado: ${slots.length} ideas`
        });

    } catch (err) {
        console.error('generate-plan error:', err);
        return NextResponse.json(
            { error: err.message || 'Error al generar el plan.' },
            { status: 500 }
        );
    }
}

function generatePlanSlots(postCount, description, selectedIdeas, platforms, contentStyles, businessOffer, mainPainPoint) {
    const slots = [];
    const platformList = platforms || ['Reels'];

    // Plantillas de ideas basadas en el contexto
    const ideaTemplates = [
        `Cómo ${description} puede cambiar tu negocio`,
        `${description}: El error que comete el 90%`,
        `Por qué necesitas ${description} AHORA`,
        `${description} en 60 segundos`,
        `La verdad sobre ${description}`,
        `Mi opinión brutal sobre ${description}`,
        `Esto deberían enseñarte sobre ${description}`,
        `${description}: Antes y después real`,
        `Lo que nadie te dice de ${description}`,
        `${description}: La guía completa`,
        `Resultado real con ${description}`,
        `¿Cuánto vale ${description}?`,
    ];

    for (let i = 0; i < postCount; i++) {
        const platform = platformList[i % platformList.length];
        const templateIdx = i % ideaTemplates.length;
        const ideaTitle = ideaTemplates[templateIdx];

        // Usa selectedIdeas si existen, sino genera basado en descripción
        const ideaDesc = selectedIdeas && selectedIdeas[i]
            ? selectedIdeas[i]
            : `Contenido específico para ${platform}: ${ideaTitle}`;

        slots.push({
            id: `slot-${Date.now()}-${i}`,
            idea_title: ideaTitle,
            idea_description: ideaDesc,
            platform: platform,
            content_type: 'video',
            day_number: i + 1,
            goal: businessOffer || mainPainPoint || 'Generar engagement',
            estilo: contentStyles[i % contentStyles.length] || 'general',
            hook: generarHook(ideaTitle, platform),
            has_script: false,
            script_content: null,
            scheduled_date: null,
            created_at: new Date().toISOString()
        });
    }

    return slots;
}

function generarHook(titulo, platform) {
    const hooks = {
        'Reels': '¿Sabías que...?',
        'TikTok': '⚠️ Esto es importante',
        'LinkedIn': '📊 Dato importante:',
        'YouTube': '👀 Espera a ver esto',
        'YouTube Shorts': '🤔 Una pregunta rápida'
    };

    return hooks[platform] || '¿Sabías que...?';
}

import { NextResponse } from 'next/server';
import { GenerateAdsSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateScriptsWithSonnet, generateScriptsLong } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const resObj = new NextResponse();
        try {
            const rlKey = buildRateLimitKey(ip, body?.userId);
            await limiter.check(resObj, 5, rlKey);
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = GenerateAdsSchema.safeParse(body);
        if (!validation.success) {
            console.error('[generate-ads] Validation error:', validation.error.flatten());
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const {
            projectId, quantity,
            offer, offerType, objective,
            audience, painPoint,
            differentiator, promise,
            adStyles, tone,
            platforms
        } = validation.data;

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify Session & Project Ownership (v4.9.0)
        // ─────────────────────────────────────────────────────────────
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        const verifiedUserId = user.id;

        // Credit Check & Charge
        const creditResult = await chargeCredits(supabase, verifiedUserId, CREDIT_COSTS.GENERATE_ADS, 'generate_ads', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandBrain = null;
        let projectData = null;

        if (projectId) {
            const [brainRes, projectRes] = await Promise.all([
                supabase.from('project_brains').select('*').eq('project_id', projectId).single(),
                supabase.from('projects').select('*').eq('id', projectId).single()
            ]);
            brandBrain = brainRes.data;
            projectData = projectRes.data;
        }

        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }

        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const projectLanguage = projectData?.language || 'es';

        let brandContextString = `
--- IDENTIDAD DE MARCA (CEREBRO IA) ---
Biografía/Identidad: ${brandBrain.biography || 'No especificada'}
Nicho/Sub-nicho: ${brandBrain.niche || ''} / ${brandBrain.sub_niche || ''}
Palabras y Estilo: ${brandBrain.style_words || 'No especificado'}
APRENDIZAJE / FEEDBACK ACUMULADO: ${brandBrain.learning_notes || 'Sin feedback aún'}
---------------------------------------

MUY IMPORTANTE: Todos los anuncios DEBEN estar 100% alineados con esta Identidad de Marca.
IDIOMA OBLIGATORIO: Responde COMPLETAMENTE en idioma: ${projectLanguage === 'en' ? 'INGLÉS' : 'ESPAÑOL'}.`;

        const stylesText = (adStyles || []).join(', ') || 'Mixto';
        const platformsText = (platforms || []).join(', ') || 'Meta Ads';

        const systemPrompt = `Eres un director creativo de una agencia de publicidad premium especializada en anuncios de alto rendimiento para redes sociales.
Tu objetivo es crear ${quantity} guiones de anuncios que vendan de verdad: directos, emocionales, con hooks irresistibles y CTAs poderosos.

${brandContextString}

DATOS DEL BRIEFING:
- Oferta: ${offer}
- Tipo: ${offerType}
- Objetivo: ${objective}
- Público objetivo: ${audience}
- Dolor principal: ${painPoint}
- Diferenciador: ${differentiator}
- Promesa/Transformación: ${promise}
- Estilos preferidos: ${stylesText}
- Tono: ${tone}
- Plataformas: ${platformsText}

INSTRUCCIONES CRÍTICAS:
1. Genera EXACTAMENTE ${quantity} anuncios como un JSON array.
2. Cada anuncio DEBE ser diferente en ángulo y enfoque. NO repitas la misma estructura.
3. Los hooks deben ser BRUTALES: que paren el scroll en las primeras 2 segundas.
4. El desarrollo debe seguir una estructura persuasiva (dolor → agitación → solución → prueba → CTA).
5. El CTA debe ser claro y con urgencia real (no genérica).
6. Adapta el tono y la longitud a las plataformas elegidas.
7. Cada guion debe sentirse como escrito por un copywriter senior, NO como un chatbot genérico.

FORMATO JSON OBLIGATORIO (array de ${quantity} objetos):
[
  {
    "idea": "Concepto/ángulo del anuncio en 1 frase",
    "tipo_anuncio": "historia_personal | testimonial | directo | educativo",
    "plataforma": "La plataforma principal para este ad",
    "angulo": "Ángulo persuasivo (ej: miedo a perder, prueba social, contraintuitivo...)",
    "hook": "Frase de gancho de máximo 2 líneas (BRUTAL, para scroll)",
    "desarrollo": ["Punto 1 del desarrollo", "Punto 2", "Punto 3"],
    "cierre": "Frase de cierre emocional",
    "cta": "Llamada a la acción con urgencia",
    "copy_corto": "Copy corto para el texto del anuncio (2-3 líneas)",
    "copy_titulo": "Título/encabezado del anuncio",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
  }
]

Responde ÚNICAMENTE con el JSON válido. NO incluyas explicaciones ni markdown.`;

        const userMessage = `Genera ${quantity} guiones de anuncios profesionales para la oferta "${offer}" dirigidos a "${audience}". Plataformas: ${platformsText}. Estilos: ${stylesText}. Tono: ${tone}.`;

        const generateFn = quantity > 5 ? generateScriptsLong : generateScriptsWithSonnet;

        const result = await generateFn({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage
        });

        let ads = result.parsed || [];
        if (!Array.isArray(ads)) ads = [ads];

        ads = ads.map((ad, idx) => ({
            id: `ad-${Date.now()}-${idx}`,
            idea: ad.idea || `Anuncio ${idx + 1}`,
            tipo_anuncio: ad.tipo_anuncio || 'directo',
            plataforma: ad.plataforma || platforms[0] || 'Meta Ads',
            angulo: ad.angulo || '',
            hook: ad.hook || ad.gancho || '',
            desarrollo: Array.isArray(ad.desarrollo) ? ad.desarrollo : [ad.desarrollo || ''],
            cierre: ad.cierre || '',
            cta: ad.cta || '',
            copy_corto: ad.copy_corto || '',
            copy_titulo: ad.copy_titulo || ad.titulo || '',
            hashtags: Array.isArray(ad.hashtags) ? ad.hashtags : []
        }));

        return NextResponse.json({ ads, usage: result.usage });

    } catch (err) {
        console.error('[generate-ads] Error:', err);
        return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
    }
}

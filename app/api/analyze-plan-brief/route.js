import { NextResponse } from 'next/server';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { 
            businessOffer, 
            targetAudience, 
            targetAudienceType, 
            mainPainPoint, 
            monthlyGoals, 
            successMetric, 
            keyThemes, 
            contentStyles, 
            howNotToSound, 
            brandMantra,
            ticketPrice,
            platforms
        } = body;

        const systemPrompt = `Eres un Director de Agencia de Marketing Senior. 
Tu tarea es analizar un briefing de cliente y devolver un "Resumen Ejecutivo de Estrategia" de máximo 3 líneas.
El tono debe ser profesional, inspirador y directo.
Enfócate en cómo los temas y estilos elegidos van a atacar el "dolor" del público para vender la oferta principal.`;

        const userMessage = `
--- BRIEFING DE MARKETING ---
Oferta: ${businessOffer || 'No especificada'}
Precio: ${ticketPrice || 'No especificado'}
Público: ${targetAudienceType}${targetAudience ? ` (${targetAudience})` : ''}
Dolor principal: ${mainPainPoint}
Objetivos: ${Array.isArray(monthlyGoals) ? monthlyGoals.join(', ') : monthlyGoals}
Métrica de éxito: ${successMetric}
Temas clave: ${keyThemes}
Estilos preferidos: ${Array.isArray(contentStyles) ? contentStyles.join(', ') : contentStyles}
Qué evitar: ${howNotToSound}
Mantra: ${brandMantra}
Plataformas: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
-----------------------------

Genera un resumen ejecutivo de estrategia (2-3 líneas) que valide este enfoque.`;

        const { content: summary } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        return NextResponse.json({ summary });

    } catch (err) {
        console.error('[analyze-plan-brief] Error:', err?.message);
        return NextResponse.json({ error: 'Error al analizar el briefing.' }, { status: 500 });
    }
}

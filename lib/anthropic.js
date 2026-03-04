// lib/anthropic.js
// Centralised Anthropic API client.
// This file should ONLY be used in server-side components or API routes.

/**
 * Common fetch wrapper for Anthropic API.
 */
async function callAnthropic({ apiKey, model, systemPrompt, userMessage, maxTokens = 4096, temperature = 0.7 }) {
    if (typeof window !== 'undefined') {
        throw new Error('lib/anthropic.js can only be used on the server side.');
    }

    // SANITIZE API KEY: Remove all spaces, tabs, newlines, hidden characters, and potential quotes
    const cleanApiKey = (apiKey || '').toString().replace(/['"\s]/g, '').trim();

    // Debugging (masked)
    console.log(`[Anthropic-v2.2] [${new Date().toISOString()}] Model: ${model || 'claude-3-haiku-20240307'} | MaxTokens: ${maxTokens} | Key: ${cleanApiKey.substring(0, 15)}...`);

    if (!cleanApiKey || cleanApiKey === 'placeholder-anthropic-key') {
        throw new Error('La API Key de Anthropic no está configurada o es inválida.');
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('x-api-key', cleanApiKey);
    headers.set('anthropic-version', '2023-06-01');

    console.log(`[Anthropic] Sending request with max_tokens: ${maxTokens}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            model: model || 'claude-3-haiku-20240307',
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('Anthropic API error:', err);

        // Handle overloaded error with retry
        if (response.status === 529 || err.error?.type === 'overloaded_error') {
            throw new Error('El servicio de IA está temporalmente sobrecargado. Por favor, espera unos segundos e intenta de nuevo.');
        }

        throw new Error(err.error?.message || 'Error al conectar con Anthropic');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    console.log('[Anthropic] Raw content length:', content.length, 'First 500 chars:', content.substring(0, 500));

    // Extract JSON payload from the model's response if possible
    let parsed = null;
    try {
        // Try multiple parsing strategies
        let jsonMatch = content.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            // Try to find JSON array with different patterns
            const possibleStarts = ['[', '{'];
            for (const start of possibleStarts) {
                const idx = content.indexOf(start);
                if (idx !== -1) {
                    const potential = content.substring(idx);
                    try {
                        const parsedTry = JSON.parse(potential);
                        jsonMatch = [potential];
                        break;
                    } catch (e) {
                        // Continue searching
                    }
                }
            }
        }

        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
            console.log('[Anthropic] Parsed successfully, type:', Array.isArray(parsed) ? 'array' : typeof parsed, 'count:', Array.isArray(parsed) ? parsed.length : 1);
        } else {
            // JSON might be truncated — try to repair truncated array
            console.log('[Anthropic] No complete JSON found, attempting truncated repair...');
            parsed = repairTruncatedJSON(content);
        }
    } catch (e) {
        console.error('[Anthropic] Failed to parse JSON:', e.message);
        // Try truncated JSON repair as fallback
        parsed = repairTruncatedJSON(content);
    }

    // Final safety: ensure parsed is always an array and has required fields
    if (!parsed || (Array.isArray(parsed) && parsed.length === 0)) {
        parsed = [{
            titulo_angulo: 'Idea de Contenido',
            gancho: 'Contenido generado (falló el formato JSON)',
            desarrollo: [content.substring(0, 500) || 'Sin contenido extra'],
            cta: 'Sígueme para más info',
            plataforma: 'Reels',
            objetivo: 'engagement'
        }];
    } else if (!Array.isArray(parsed)) {
        // If it's a single object, wrap it and ensure fields
        parsed = [{
            titulo_angulo: parsed.titulo_angulo || 'Idea de Contenido',
            gancho: parsed.gancho || parsed.hook_principal || 'Contenido generado',
            desarrollo: Array.isArray(parsed.desarrollo) ? parsed.desarrollo :
                (parsed.guion_detallado ? [parsed.guion_detallado] : ['Sin desarrollo']),
            cta: parsed.cta || 'Sígueme para más',
            ...parsed
        }];
    }

    return { content, parsed, usage: data.usage };
}

/**
 * Attempt to repair truncated JSON arrays by closing them properly.
 * This handles cases where the API response was cut off mid-JSON.
 */
function repairTruncatedJSON(content) {
    const startIdx = content.indexOf('[');
    if (startIdx === -1) return null;

    let jsonStr = content.substring(startIdx);

    // Find the last complete object (ending with })
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace === -1) return null;

    // Cut at the last complete object and close the array
    jsonStr = jsonStr.substring(0, lastBrace + 1);

    // Remove any trailing comma
    jsonStr = jsonStr.replace(/,\s*$/, '');

    // Close the array
    jsonStr += ']';

    try {
        const parsed = JSON.parse(jsonStr);
        console.log('[Anthropic] Repaired truncated JSON, got', Array.isArray(parsed) ? parsed.length : 1, 'items');
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        console.error('[Anthropic] Repair failed:', e.message);
        return null;
    }
}

/**
 * Generate full scripts using Claude 3 Haiku (Fallback).
 */
export async function generateScriptsWithSonnet({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-haiku-20240307',
        systemPrompt,
        userMessage,
        temperature: 0.8
    });
}

/**
 * Generate content ideas using Claude 3 Haiku.
 * Uses higher max_tokens since idea banks produce larger JSON payloads.
 */
export async function generateIdeasWithHaiku({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-haiku-20240307',
        systemPrompt,
        userMessage,
        maxTokens: 4096,
        temperature: 0.8
    });
}

/**
 * Improve/Refine a single block using Claude 3 Haiku.
 */
export async function improveBlockWithHaiku({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-haiku-20240307',
        systemPrompt,
        userMessage,
        temperature: 0.7
    });
}

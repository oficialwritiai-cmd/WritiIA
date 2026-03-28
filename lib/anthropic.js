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

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[Anthropic] Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

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
                console.error(`[Anthropic] FULL RAW API ERROR JSON:`, JSON.stringify(err));

                // Handle overloaded error with retry
                if (response.status === 429 || response.status === 529 || err.error?.type === 'overloaded_error' || err.error?.type === 'rate_limit_error') {
                    lastError = new Error('El servicio de IA está temporalmente sobrecargado. Reintentando...');
                    continue; // Retry
                }

                // Fallback to Haiku if Sonnet is not allowed for this API Key (Tier restrictions)
                const errMsg = (err.error?.message || '').toLowerCase();
                const isModelError = errMsg.includes('model: claude-3-5-sonnet') || 
                                   errMsg.includes('not have access to the model') ||
                                   (response.status === 400 && errMsg.includes('model'));

                if (isModelError && model !== 'claude-3-haiku-20240307') {
                    console.warn(`[Anthropic] EMERGENCY FALLBACK TRIGGERED: Sonnet failed (${errMsg}). Switching to Haiku...`);
                    model = 'claude-3-haiku-20240307';
                    continue; // Retry with Haiku
                }

                if (err.error?.type === 'invalid_request_error' && err.error?.message?.includes('credit_balance_too_low')) {
                    throw new Error('La cuenta de Anthropic no tiene fondos suficientes.');
                }

                throw new Error(err.error?.message || 'Error al conectar con Anthropic');
            }

            const data = await response.json();
            return processResponse(data);

        } catch (err) {
            console.error(`[Anthropic] Catch error (Attempt ${attempt}):`, err.message);
            lastError = err;
            if (attempt === maxRetries) throw err;
        }
    }

    throw lastError || new Error('Error al conectar con Anthropic después de varios intentos');
}

/**
 * Process the valid response from Anthropic API.
 */
function processResponse(data) {
    const content = data.content?.[0]?.text || '';
    console.log(`[Anthropic] RAW AI RESPONSE (${content.length} chars):`, content);

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
            titulo_angulo: 'Idea Estratégica',
            idea_title: 'Idea Estratégica',
            gancho: 'Contenido generado (falló el formato JSON)',
            idea_description: 'La IA generó el contenido pero hubo un error de formato. El texto crudo está disponible en los detalles.',
            desarrollo: [content.substring(0, 500) || 'Sin contenido extra'],
            cta: 'Sígueme para más info',
            plataforma: 'Reels',
            objetivo: 'engagement'
        }];
    } else if (!Array.isArray(parsed)) {
        // If it's a single object, wrap it and ensure fields
        parsed = [{
            titulo_angulo: parsed.titulo_angulo || parsed.idea_title || parsed.titulo || 'Idea de Contenido',
            idea_title: parsed.idea_title || parsed.titulo_angulo || parsed.titulo || 'Idea de Contenido',
            gancho: parsed.gancho || parsed.hook_principal || 'Contenido generado',
            idea_description: parsed.idea_description || parsed.descripcion_idea || parsed.descripcion || 'Sin descripción disponible',
            desarrollo: Array.isArray(parsed.desarrollo) ? parsed.desarrollo :
                (parsed.guion_detallado ? [parsed.guion_detallado] : ['Sin desarrollo']),
            cta: parsed.cta || 'Sígueme para más',
            ...parsed
        }];
    } else {
        // Ensure every item in array has the required fields
        parsed = parsed.map(item => ({
            titulo_idea: item.titulo_idea || item.idea_title || item.titulo || item.titulo_angulo || 'Idea Estratégica',
            titulo: item.titulo || item.titulo_idea || item.idea_title || item.titulo_angulo || 'Idea Estratégica',
            idea_title: item.idea_title || item.titulo_idea || item.titulo || item.titulo_angulo || 'Idea Estratégica',
            descripcion: item.descripcion || item.idea_description || item.descripcion_idea || 'Sin contenido extra',
            idea_description: item.idea_description || item.descripcion || item.descripcion_idea || 'Sin contenido extra',
            ...item
        }));
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

export async function generateWithSonnet({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-5-sonnet-20240620',
        systemPrompt,
        userMessage,
        maxTokens: 4096,
        temperature: 0.8
    });
}

export const generateScriptsWithSonnet = generateWithSonnet;

/**
 * Generate long scripts (3-5 min) using Claude 3.5 Sonnet with extended token limit.
 * Long scripts need much more output capacity to produce proper word counts.
 */
export async function generateScriptsLong({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-5-sonnet-20240620',
        systemPrompt,
        userMessage,
        maxTokens: 4096,
        temperature: 0.8
    });
}

/**
 * Improve an existing script based on a user instruction (mini-chat).
 * If instruction is empty, applies a default improvement (more human, better CTA, correct duration).
 */
export async function improveScriptWithInstruction({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-haiku-20240307',
        systemPrompt,
        userMessage,
        maxTokens: 4096,
        temperature: 0.75
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

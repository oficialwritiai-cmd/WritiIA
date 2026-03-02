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

    // SANITIZE API KEY: Remove all spaces, tabs, newlines, and hidden characters
    const cleanApiKey = (apiKey || '').toString().replace(/\s/g, '').trim();

    if (!cleanApiKey || cleanApiKey === 'placeholder-anthropic-key') {
        throw new Error('La API Key de Anthropic no está configurada o es inválida.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': cleanApiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('Anthropic API error:', err);
        throw new Error(err.error?.message || 'Error al conectar con Anthropic');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Extract JSON payload from the model's response if possible
    let parsed = null;
    try {
        const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            parsed = content; // Return raw text if no JSON found
        }
    } catch (e) {
        console.error('Failed to parse Anthropic JSON:', content);
        parsed = content; // Fallback to raw content
    }

    return { content, parsed, usage: data.usage };
}

/**
 * Generate full scripts using Claude 3.5 Sonnet.
 */
export async function generateScriptsWithSonnet({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt,
        userMessage,
        temperature: 0.8
    });
}

/**
 * Generate content ideas using Claude 3 Haiku.
 */
export async function generateIdeasWithHaiku({ apiKey, systemPrompt, userMessage }) {
    return await callAnthropic({
        apiKey,
        model: 'claude-3-haiku-20240307',
        systemPrompt,
        userMessage,
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

// lib/anthropic.js
// Centralised Anthropic API client with two dedicated helpers.
// ------------------------------------------------------------
//   • generateScriptsWithSonnet – uses Claude 3.5 Sonnet for full script generation.
//   • improveBlockWithHaiku   – uses Claude 3 Haiku for improving a single block (hook, development, CTA).
// Both helpers accept the same parameters needed by the existing routes and return the parsed JSON result.
// ------------------------------------------------------------

/**
 * Common fetch wrapper for Anthropic API.
 * Throws an error if the response is not ok.
 */
async function callAnthropic({ apiKey, model, systemPrompt, userMessage }) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: 0.8,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('Anthropic API error response:', err); // Added for better debugging
        throw new Error(err.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    // Extract JSON payload from the model's response.
    let parsed = [];
    try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            const objMatch = content.match(/\{[\s\S]*\}/);
            if (objMatch) {
                const obj = JSON.parse(objMatch[0]);
                parsed = obj.scripts || (Array.isArray(obj) ? obj : [obj]);
            }
        }
    } catch (e) {
        console.error('Failed to parse Anthropic JSON:', content);
        throw new Error('Invalid JSON format returned by Anthropic');
    }

    return { parsed, usage: data.usage };
}

/**
 * Generate full scripts using Claude 3.5 Sonnet.
 * @param {Object} params – includes apiKey, systemPrompt, userMessage.
 * @returns {{parsed: any[], usage: Object}}
 */
export async function generateScriptsWithSonnet({ apiKey, systemPrompt, userMessage }) {
    // Model name for Sonnet (latest as of 2024‑10‑22)
    const model = 'claude-3-5-sonnet-20241022';
    // Comment for future maintainers – Sonnet is used for full script generation.
    return await callAnthropic({ apiKey, model, systemPrompt, userMessage });
}

/**
 * Improve a single block (hook, development, CTA) using Claude 3 Haiku.
 * @param {Object} params – includes apiKey, systemPrompt, userMessage.
 * @returns {{parsed: any[], usage: Object}}
 */
export async function improveBlockWithHaiku({ apiKey, systemPrompt, userMessage }) {
    // Model name for Haiku (2024‑10‑22 version)
    const model = 'claude-3-haiku-20241022';
    // Comment for future maintainers – Haiku is used for block‑level improvements.
    return await callAnthropic({ apiKey, model, systemPrompt, userMessage });
}

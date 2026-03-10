import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testBrain() {
    const systemMessage = `
Eres un Experto Estratega de Marketing y Copywriter de respuesta directa.
Tu tarea es tomar las respuestas de un usuario sobre su negocio y construir el "Cerebro IA" ("Knowledge Base") completo de su proyecto.

DEBES DEVOLVER ESTRICTAMENTE UN OBJETO JSON VÁLIDO CON LAS SIGUIENTES 7 CLAVES EXACTAS. Cada valor debe ser una sola cadena de texto (usa \\n para saltos de línea):
{
  "biography": "Su historia...",
  "audience": "Descripción clara de su cliente...",
  "products_services": "Lista clara de qué vende...",
  "niche_topics": "Nicho principal...",
  "values_tone": "El tono de voz...",
  "style_words": "Lista de palabras...",
  "knowledge_raw": "Base de conocimiento..."
}

REGLAS:
1. NO inventes cosas que no tengan relación.
2. Escribe en segunda o tercera persona.
3. DEVUELVE ÚNICAMENTE EL JSON. Nada de texto antes ni después.
    `;

    const userMessage = `
RESPUESTAS DEL USUARIO:
1. Negocio y Biografía: Soy Carlos, preparador físico con 5 años de experiencia.
2. Público Objetivo: Hombres de 30-40 años que quieren ganar masa muscular.
3. Productos y Nicho: Rutinas personalizadas, nicho fitness.
4. Estilo y Valores: Directo, motivador, disciplinado.
5. Oferta Irresistible: Gana 3 kilos de masa magra en 8 semanas.
    `;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                temperature: 0.7,
                system: systemMessage,
                messages: [{ role: 'user', content: userMessage }],
            }),
        });

        const data = await response.json();
        console.log("Status:", response.status);
        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        const content = data.content?.[0]?.text || '';
        console.log("----- RAW CONTENT DUMP -----");
        console.log(content);
        console.log("----------------------------");

        // Try parsing
        const startIdx = content.indexOf('{');
        const endIdx = content.lastIndexOf('}');

        console.log("Start:", startIdx, "End:", endIdx);
        if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
            const jsonStr = content.substring(startIdx, endIdx + 1);
            try {
                const parsed = JSON.parse(jsonStr);
                console.log("Parsed JSON successfully! Keys:", Object.keys(parsed));
            } catch (err) {
                console.error("JSON Parse failed on substring:");
                console.error(err);
                console.log("Substring was:");
                console.log(jsonStr);
            }
        }
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

testBrain();

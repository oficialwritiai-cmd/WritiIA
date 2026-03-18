import 'dotenv/config';
import { generateScriptsWithSonnet } from './lib/anthropic.js';

async function test() {
    try {
        const res = await generateScriptsWithSonnet({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt: "Contesta con: OK.",
            userMessage: "Hola",
        });
        console.log(res);
    } catch (err) {
        console.log("TEST CAUGHT ERROR:", err.stack);
    }
}
test();

const fs = require('fs');
const path = require('path');

// Try to read .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/ANTHROPIC_API_KEY=([^\s]+)/);
const apiKey = keyMatch ? keyMatch[1] : null;

if (!apiKey) {
    console.error('No se encontró ANTHROPIC_API_KEY en .env.local');
    process.exit(1);
}

const cleanKey = apiKey.trim().replace(/\s/g, '');
console.log(`Intentando llamar a Anthropic con la clave: ${cleanKey.substring(0, 10)}...${cleanKey.substring(cleanKey.length - 4)}`);

async function test() {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': cleanKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Say hi' }],
            }),
        });

        if (!response.ok) {
            console.log(`HTTP ERROR: ${response.status}`);
        }
        const data = await response.json();
        console.log('--- RESPUESTA COMPLETA ---');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error en el test:', err);
    }
}

test();

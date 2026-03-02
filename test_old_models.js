const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/ANTHROPIC_API_KEY=([^\s]+)/);
const apiKey = keyMatch ? keyMatch[1].replace(/['"\s]/g, '') : null;

async function testModel(modelName) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }],
            }),
        });
        const data = await response.json();
        return { status: response.status, data };
    } catch (err) {
        return { error: err.message };
    }
}

async function runAll() {
    const models = [
        'claude-3-sonnet-20240229', // Old Sonnet
        'claude-2.1',
        'claude-instant-1.2'
    ];

    for (const m of models) {
        const res = await testModel(m);
        console.log(`Model: ${m} | Status: ${res.status}`);
        if (res.status !== 200) {
            console.log(`Error: ${res.data?.error?.message || 'Unknown'}`);
        } else {
            console.log(`SUCCESS with ${m}!`);
        }
    }
}

runAll();

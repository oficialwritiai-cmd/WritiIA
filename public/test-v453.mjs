// No need for node-fetch in Node 24
async function test() {
    console.log("Testing API /api/generate-scripts (v4.5.3)...");
    try {
        const res = await fetch('http://localhost:3000/api/generate-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: "Cómo usar IA para ventas en 2026",
                platform: "Reels",
                tone: "Profesional",
                count: 1,
                videoDuration: "60 seg",
                userId: "9f7eccc1-4bdb-4e79-aadf-a3cc5982da7c", // Stiven's ID
                projectId: null
            })
        });
        
        const data = await res.json();
        console.log("Status:", res.status);
        if (data.scripts && data.scripts.length > 0) {
            console.log("SUCCESS: Script generated!");
            console.log("Hook:", data.scripts[0].gancho);
        } else {
            console.log("FAILED: No scripts returned", data);
        }
    } catch (e) {
        console.error("Test Error:", e.message);
    }
}

test();

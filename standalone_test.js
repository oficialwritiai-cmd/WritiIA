// Standalone script using standard fetch to avoid import issues
const RESEND_API_URL = 'https://api.resend.com/emails';

// Manually loading env if needed, but assuming process.env is populated by node if run with -r dotenv/config
const apiKey = 're_PLACEHOLDER'; // This should come from env

async function sendTest() {
    const to = 'stivengonzalezads@gmail.com';
    const name = 'Stiven';
    
    // We try to get it from process.env if available
    const key = process.env.RESEND_API_KEY;
    
    if (!key) {
        console.error('❌ Error: RESEND_API_KEY no encontrada en el entorno.');
        return;
    }

    console.log(`Enviando email de PRUEBA a: ${to}...`);

    try {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                from: 'Writi AI <hola@writi-ai.com>',
                to: [to],
                subject: '¡Bienvenido! Tu prueba de 7 días ha comenzado 🎁',
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                        <h1 style="text-align: center; color: #7ECECA;">Writi IA</h1>
                        <h2 style="font-size: 1.5rem; margin-bottom: 16px;">¡Hola ${name}! 👋</h2>
                        <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                            Esta es una prueba de tu nuevo sistema de registro automático.
                        </p>
                        <div style="text-align: center; margin-top: 32px;">
                            <a href="https://www.writi-ai.com/dashboard" 
                               style="display: inline-block; padding: 16px 40px; background: #7ECECA; color: black; font-weight: bold; text-decoration: none; border-radius: 12px;">
                                Explorar Dashboard →
                            </a>
                        </div>
                    </div>
                `
            }),
        });

        const data = await response.json();
        if (response.ok) {
            console.log('✅ Email enviado con éxito. ID:', data.id);
        } else {
            console.error('❌ Error de Resend:', data);
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

sendTest();

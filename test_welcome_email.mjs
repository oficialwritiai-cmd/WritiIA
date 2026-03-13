import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.warn('[Email] RESEND_API_KEY no configurada.');
        return { success: false, reason: 'API key not configured' };
    }

    try {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: 'Writi AI <hola@writi-ai.com>',
                to: [to],
                subject,
                html,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Email] Resend API error:', errorData);
            return { success: false, reason: errorData };
        }

        const data = await response.json();
        console.log('[Email] Enviado con éxito a:', to, 'ID:', data.id);
        return { success: true, id: data.id };
    } catch (error) {
        console.error('[Email] Error enviando email:', error.message);
        return { success: false, reason: error.message };
    }
}

async function testEmail() {
    const to = 'stivengonzalezads@gmail.com';
    const name = 'Stiven';
    
    console.log(`Enviando email de PRUEBA DE REGISTRO a: ${to}...`);

    const result = await sendEmail({
        to,
        subject: '¡Bienvenido! Tu prueba de 7 días ha comenzado 🎁',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span>
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">¡Hola ${name || ''}! 👋</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    ¡Enhorabuena! Has activado tu **Acceso Beta** de 7 días a Writi IA.
                </p>
                <p style="font-size: 0.95rem; color: #ccc; line-height: 1.6;">
                    Durante esta semana tienes acceso completo para probar cómo la IA puede transformar tu creación de contenido.
                </p>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Explorar Dashboard →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Tu prueba finalizará automáticamente en 7 días.
                </p>
            </div>
        `
    });

    if (result.success) {
        console.log('✅ PRUEBA COMPLETADA');
    } else {
        console.error('❌ PRUEBA FALLIDA');
    }
}

testEmail();

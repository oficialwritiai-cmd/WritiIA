/**
 * Email helper using Resend API.
 * Gracefully handles missing API key (logs warning, doesn't crash).
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey === 're_PLACEHOLDER') {
        console.warn('[Email] RESEND_API_KEY not configured. Skipping email to:', to, 'Subject:', subject);
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
                from: 'Writi IA <no-reply@writiai.com>',
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
        console.log('[Email] Sent successfully to:', to, 'ID:', data.id);
        return { success: true, id: data.id };
    } catch (error) {
        console.error('[Email] Error sending email:', error.message);
        return { success: false, reason: error.message };
    }
}

export async function sendPlanActivationEmail(to, name) {
    return sendEmail({
        to,
        subject: 'Tu Writi Plan Pro está activo 🚀',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span> 
                        Plan Pro
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">¡Hola${name ? `, ${name}` : ''}! 🎉</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    Tu <strong style="color: #7ECECA;">Writi Plan Pro</strong> ya está activo. Ahora tienes acceso completo a todas las funcionalidades:
                </p>
                <ul style="font-size: 0.95rem; color: #ccc; line-height: 2;">
                    <li>✅ 200 créditos IA incluidos cada mes</li>
                    <li>✅ Todas las plataformas: Reels, TikTok, Shorts, LinkedIn, X</li>
                    <li>✅ Cerebro IA — memoria de tu voz de marca</li>
                    <li>✅ Biblioteca + Calendario</li>
                </ul>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://writiai-v3.vercel.app/dashboard" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Abrir Writi IA →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Sin permanencias · Cancela cuando quieras
                </p>
            </div>
        `,
    });
}

export async function sendCreditsEmail(to, name, amount) {
    return sendEmail({
        to,
        subject: `Has añadido ${amount} créditos a tu cuenta 🪙`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span>
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">¡Créditos añadidos! 🪙</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    ${name ? `Hola ${name}, ` : ''}Se han añadido <strong style="color: #7ECECA; font-size: 1.2rem;">${amount} créditos</strong> a tu cuenta de Writi IA.
                </p>
                <p style="font-size: 0.95rem; color: #ccc; line-height: 1.6;">
                    Tus créditos están listos para usar. Cada crédito te permite generar guiones, ideas y planes de contenido con IA.
                </p>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://writiai-v3.vercel.app/dashboard" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Empezar a crear →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Los créditos no caducan · Pago único
                </p>
            </div>
        `,
    });
}

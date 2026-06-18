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
                    <li>✅ 250 créditos IA incluidos cada mes</li>
                    <li>✅ Todas las plataformas: Reels, TikTok, Shorts, LinkedIn, X</li>
                    <li>✅ Cerebro IA — memoria de tu voz de marca</li>
                    <li>✅ Biblioteca + Calendario</li>
                </ul>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard" 
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
                    <a href="https://www.writi-ai.com/dashboard" 
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

export async function sendTrialWelcomeEmail(to, name) {
    return sendEmail({
        to,
        subject: 'Tu acceso beta a Writi.AI está activo ⚡',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span>
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">¡Hola ${name || ''}! 👋</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    ¡Enhorabuena! Tu <strong style="color: #7ECECA;">acceso beta de 14 días</strong> a Writi.AI ya está activo.
                </p>
                <p style="font-size: 0.95rem; color: #ccc; line-height: 1.6;">
                    Durante estas dos semanas tienes acceso completo — las mismas funciones que el plan PRO — para probar cómo la IA puede transformar tu creación de contenido.
                </p>
                <div style="background: rgba(126,206,202,0.07); border: 1px solid rgba(126,206,202,0.2); border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
                    <p style="font-size: 0.85rem; color: #7ECECA; font-weight: 700; margin: 0 0 8px;">¿Por dónde empezar?</p>
                    <p style="font-size: 0.9rem; color: #ccc; line-height: 1.6; margin: 0;">
                        Configura tu <strong style="color: #fff;">Cerebro IA</strong> primero — es lo que enseña a la IA tu voz de marca, tu nicho y tu audiencia. Con eso listo, cada guion e idea saldrá hecho a tu medida.
                    </p>
                </div>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Ir al Dashboard →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Tu acceso finalizará automáticamente en 14 días. ¿Dudas? Escríbenos — estamos aquí para ayudarte.
                </p>
            </div>
        `,
    });
}

export async function sendTrialExpiringEmail(to, name, expiresAtDate) {
    const dateStr = expiresAtDate
        ? new Date(expiresAtDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'en 2 días';
    return sendEmail({
        to,
        subject: 'Tu acceso a Writi.AI termina en 2 días ⚡',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span>
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">Hola ${name || ''} ⏰</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    Tu prueba gratuita de Writi.AI termina el <strong style="color: #7ECECA;">${dateStr}</strong>.
                </p>
                <p style="font-size: 0.95rem; color: #ccc; line-height: 1.6;">
                    Todo lo que creaste está guardado. Para no perder el acceso, activa tu plan ahora.
                </p>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard/expired"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Activar plan PRO →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Sin permanencia · Cancela cuando quieras
                </p>
            </div>
        `,
    });
}

export async function sendTrialExpiredEmail(to, name) {
    return sendEmail({
        to,
        subject: 'Tu acceso a Writi.AI ha finalizado',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span>
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">Hola ${name || ''}</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    Tu prueba gratuita ha terminado. Gracias por darle una oportunidad a Writi.AI.
                </p>
                <p style="font-size: 0.95rem; color: #ccc; line-height: 1.6;">
                    Tu contenido sigue guardado y disponible. Cuando quieras continuar, está a un clic de distancia.
                </p>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard/expired"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Activar plan PRO →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Sin permanencia · Cancela cuando quieras
                </p>
            </div>
        `,
    });
}

export async function sendRenewalEmail(to, name, nextRenewalDate) {
    const dateStr = nextRenewalDate
        ? new Date(nextRenewalDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'próximo mes';
    return sendEmail({
        to,
        subject: 'Tu plan Writi PRO se ha renovado ✅',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span> Plan Pro
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">¡Renovación confirmada${name ? `, ${name}` : ''}! 🔄</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    Tu plan <strong style="color: #7ECECA;">Writi PRO</strong> se ha renovado correctamente y tus créditos han sido recargados.
                </p>
                <ul style="font-size: 0.95rem; color: #ccc; line-height: 2;">
                    <li>✅ 250 créditos IA recargados</li>
                    <li>📅 Próxima renovación: ${dateStr}</li>
                </ul>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Ir al Dashboard →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    Cancela cuando quieras desde Ajustes · Sin permanencias
                </p>
            </div>
        `,
    });
}

export async function sendCancellationEmail(to, name, accessUntil) {
    const dateStr = accessUntil
        ? new Date(accessUntil).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'fin del periodo actual';
    return sendEmail({
        to,
        subject: 'Tu plan Writi PRO ha sido cancelado',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: white; padding: 40px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin: 0;">
                        <span style="background: linear-gradient(135deg, #7ECECA, #5BB5B1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Writi</span>
                    </h1>
                </div>
                <h2 style="font-size: 1.5rem; margin-bottom: 16px;">Plan cancelado${name ? `, ${name}` : ''}</h2>
                <p style="font-size: 1rem; color: #ccc; line-height: 1.6;">
                    Tu suscripción ha sido cancelada. No se realizarán más cargos.
                </p>
                <p style="font-size: 0.95rem; color: #ccc; line-height: 1.6;">
                    Seguirás teniendo acceso completo a Writi IA hasta el <strong style="color: #7ECECA;">${dateStr}</strong>.
                </p>
                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://www.writi-ai.com/dashboard"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7ECECA, #5BB5B1); color: black; font-weight: 900; text-decoration: none; border-radius: 12px; font-size: 1rem;">
                        Usar Writi hasta el ${dateStr} →
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 32px;">
                    ¿Fue un error? Puedes reactivar tu plan desde Ajustes en cualquier momento.
                </p>
            </div>
        `,
    });
}

import { sendPlanActivationEmail, sendCreditsEmail } from './lib/email.js';

// No usamos dotenv aqui para evitar ERR_MODULE_NOT_FOUND si no esta instalado globalmente.
// Simplemente usaremos las variables de entorno que pases al ejecutar el comando.

async function runTest() {
    const testEmail = process.argv[2];
    const testName = 'Stiven (Test)';

    if (!testEmail) {
        console.error('Error: Debes pasar un email como argumento. Ejemplo: node test_emails.js tu@email.com');
        return;
    }

    if (!process.env.RESEND_API_KEY) {
        console.error('Error: RESEND_API_KEY no encontrada en las variables de entorno.');
        return;
    }

    console.log('--- TEST: Envio de Emails (Resend) ---');
    console.log('Enviando a:', testEmail);

    console.log('\n1. Probando email de Activación de Plan...');
    const planRes = await sendPlanActivationEmail(testEmail, testName);
    console.log('Resultado:', planRes.success ? 'Enviado ✅' : 'Error ❌', planRes.reason || '');

    console.log('\n2. Probando email de Compra de Créditos (100)...');
    const creditsRes = await sendCreditsEmail(testEmail, testName, 100);
    console.log('Resultado:', creditsRes.success ? 'Enviado ✅' : 'Error ❌', creditsRes.reason || '');

    console.log('\n--- Test Finalizado ---');
}

runTest();

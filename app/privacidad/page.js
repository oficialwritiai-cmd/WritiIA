import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import '../landing.css';

export const metadata = {
    title: 'Política de Privacidad | Writi.ai',
    description: 'Conoce cómo tratamos y protegemos tus datos en Writi.ai.',
};

export default function PrivacidadPage() {
    return (
        <div className="landing" style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 120px' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 40, fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>

                <h1 style={{ fontSize: '2.5rem', marginBottom: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Política de Privacidad</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 48 }}>Última actualización: 18 de Marzo de 2026</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: '1rem' }}>
                    
                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>1. Identidad del Responsable</h2>
                        <p>
                            El responsable del tratamiento de los datos recabados a través de esta plataforma es Writi IA, con domicilio en Barcelona, España y correo de contacto a efectos de privacidad: hi@writi-ai.com.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>2. Qué datos recogemos</h2>
                        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li><strong>Datos de registro:</strong> Nombre, email y contraseña encriptada (o autenticación vía proveedores externos).</li>
                            <li><strong>Datos de facturación:</strong> Procesados íntegramente de forma segura por servicios de terceros (ej. Stripe). Nosotros solo conservamos el historial de estado de la transacción.</li>
                            <li><strong>Datos de uso:</strong> Elementos del "Cerebro IA" (nicho, audiencias, tono de marca), inputs (prompts) introducidos para generar contenido, y metadatos analíticos de interacción con la plataforma.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>3. Finalidad del tratamiento</h2>
                        <p>
                            Tus datos personales se recaban con el único fin de proveer el servicio SaaS, mantener y optimizar el funcionamiento de tu "Cerebro IA", procesar tus pagos, gestionar tu cuenta y enviar notificaciones relativas al servicio (así como comunicaciones comerciales si nos has dado tu consentimiento explícito).
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>4. Base legal</h2>
                        <p>
                            Tratamos tus datos bajo la base legal de la ejecución de nuestro contrato de servicio SaaS (Términos de Servicio) y tu consentimiento expreso al registrarte en nuestra plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>5. Proveedores Tecnológicos y Encargados</h2>
                        <p>
                            Para poder ofrecerte nuestro servicio, compartimos datos estrictamente necesarios con proveedores tecnológicos bajo estrictos acuerdos de confidencialidad y estándares de seguridad. Esto incluye infraestructura de alojamiento (ej. Vercel, Supabase, Vercel), procesamiento de pagos (Stripe) y proveedores de inteligencia artificial (modelos LLM). 
                            <br/><br/>
                            <strong>Importante sobre la Inteligencia Artificial:</strong> Garantizamos que mediante el uso de nuestra plataforma, tus inputs y guiones generados NO se utilizan para entrenar los modelos públicos de empresas de IA de terceros.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>6. Tus Derechos como Usuario</h2>
                        <p>
                            Tienes el derecho a acceder a tus datos personales, rectificarlos, solicitar su portabilidad y exigir su eliminación completa de nuestros sistemas (Derecho al olvido). Tienes pleno control desde el panel de tu cuenta o pudiendo contactar directamente a hi@writi-ai.com.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

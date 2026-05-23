import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import '../landing.css';

export const metadata = {
    title: 'Política de Cookies | Writi.ai',
    description: 'Información sobre el uso de cookies en Writi.ai.',
};

export default function CookiesPage() {
    return (
        <div className="landing" style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 120px' }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', marginBottom: 40, fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>

                <h1 style={{ fontSize: '2.5rem', marginBottom: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Política de Cookies</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 48 }}>Última actualización: 18 de Marzo de 2026</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: '1rem' }}>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>1. ¿Qué son las cookies?</h2>
                        <p>
                            Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo cuando los visitas.
                            Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo para que no tengas
                            que volver a configurarlas cada vez que visitas la página o navegas de una página a otra.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>2. Cookies que utilizamos</h2>
                        <p style={{ marginBottom: 16 }}>Writi.AI utiliza los siguientes tipos de cookies:</p>
                        <ul style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <li>
                                <strong style={{ color: '#fff' }}>Cookies esenciales:</strong> Necesarias para el funcionamiento básico de la plataforma,
                                incluyendo la gestión de sesiones de usuario y autenticación segura. Sin estas cookies la app no puede funcionar.
                            </li>
                            <li>
                                <strong style={{ color: '#fff' }}>Cookies de preferencias:</strong> Almacenan tus configuraciones (idioma, proyecto activo)
                                para ofrecerte una experiencia personalizada en visitas posteriores.
                            </li>
                            <li>
                                <strong style={{ color: '#fff' }}>Cookies analíticas:</strong> Utilizamos PostHog para entender cómo se usa la plataforma
                                de forma agregada y anónima, con el objetivo de mejorar el servicio.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>3. Cookies de terceros</h2>
                        <p>
                            Algunos de nuestros proveedores de servicios pueden instalar cookies en tu dispositivo:
                        </p>
                        <ul style={{ paddingLeft: 24, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <li><strong style={{ color: '#fff' }}>Supabase</strong> — gestión de autenticación y sesiones.</li>
                            <li><strong style={{ color: '#fff' }}>Stripe</strong> — procesamiento seguro de pagos.</li>
                            <li><strong style={{ color: '#fff' }}>PostHog</strong> — analítica de producto (datos anonimizados).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>4. Cómo gestionar las cookies</h2>
                        <p>
                            Puedes controlar y eliminar las cookies desde la configuración de tu navegador. Ten en cuenta que
                            deshabilitar las cookies esenciales puede impedir el correcto funcionamiento de Writi.AI,
                            incluyendo el inicio de sesión y el acceso a tus proyectos.
                        </p>
                        <p style={{ marginTop: 12 }}>
                            Para más información sobre cómo gestionar cookies en los principales navegadores, consulta la
                            documentación oficial de Chrome, Firefox, Safari o Edge.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: 16 }}>5. Contacto</h2>
                        <p>
                            Si tienes dudas sobre nuestra política de cookies, puedes contactarnos en{' '}
                            <a href="mailto:hi@writi-ai.com" style={{ color: '#7ECECA', textDecoration: 'none' }}>hi@writi-ai.com</a>.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
}

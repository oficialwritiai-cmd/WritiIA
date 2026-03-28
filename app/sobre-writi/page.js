import Link from 'next/link';
import Logo from '@/app/components/Logo';

export const metadata = {
    title: 'Sobre WRITI.AI – El planificador de contenido con IA para creadores',
    description: 'WRITI.AI es el sistema todo-en-uno que genera ideas virales, escribe guiones completos para Reels y Shorts, y organiza tu mes de contenido en un calendario con IA. Diseñado para creadores en español.',
    alternates: { canonical: 'https://www.writi-ai.com/sobre-writi' },
    openGraph: {
        title: 'Sobre WRITI.AI – El planificador de contenido con IA para creadores',
        description: 'Qué es WRITI.AI, para quién es, qué problema resuelve y cómo funciona.',
        url: 'https://www.writi-ai.com/sobre-writi',
        type: 'website',
        siteName: 'WRITI.AI',
    },
};

const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WRITI.AI',
    url: 'https://www.writi-ai.com',
    description: 'WRITI.AI es un planificador de contenido con inteligencia artificial para creadores en español. Genera ideas virales, escribe guiones completos para Reels y Shorts, y organiza el mes de contenido en un calendario visual automático.',
    foundingDate: '2025',
    areaServed: ['Spain', 'Latin America'],
    serviceType: 'SaaS – Planificador de contenido con IA',
    offers: {
        '@type': 'Offer',
        price: '24.90',
        priceCurrency: 'EUR',
        description: 'Plan Pro mensual. Incluye ideas ilimitadas (dentro de créditos), guiones completos, calendario IA y Cerebro IA de marca.',
    },
};

export default function SobreWRITI() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
            color: '#fff',
            fontFamily: "'Inter', 'Outfit', sans-serif",
        }}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />

            {/* NAV */}
            <nav style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}><Logo size="1rem" /></Link>
                <Link href="/" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', textDecoration: 'none' }}>← Inicio</Link>
            </nav>

            <div style={{ maxWidth: 820, margin: '0 auto', padding: '72px 24px 100px' }}>
                <span style={{
                    display: 'inline-block',
                    background: 'rgba(157,0,255,0.12)', border: '1px solid rgba(157,0,255,0.3)',
                    color: '#c084fc', borderRadius: 20, padding: '6px 16px',
                    fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase', marginBottom: 24,
                }}>Sobre WRITI.AI</span>

                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                    fontWeight: 900,
                    fontFamily: "'Outfit', sans-serif",
                    lineHeight: 1.15,
                    letterSpacing: '-0.03em',
                    marginBottom: 28,
                }}>El sistema que convierte tu negocio en contenido publicado</h1>

                {/* SECTION: Qué es */}
                <Section title="¿Qué es WRITI.AI?">
                    <p>WRITI.AI es una plataforma SaaS de inteligencia artificial diseñada para creadores de contenido, coaches, infoproductores y pequeños negocios digitales en español. Su función principal es resolver el problema más común de cualquier creador: saber qué publicar, cuándo y cómo.</p>
                    <p>A diferencia de herramientas generalistas como ChatGPT o Notion AI, WRITI integra en un solo sitio todo el flujo de producción de contenido: generación de ideas estratégicas, redacción de guiones completos, y organización visual en un calendario mensual tipo Google Calendar.</p>
                    <p>El resultado: pasar de cero a 30 guiones listos para grabar, con su fecha en el calendario, en una sola tarde. Sin abrir ChatGPT, Notion ni hojas de cálculo.</p>
                </Section>

                {/* SECTION: Para quién es */}
                <Section title="¿Para quién es WRITI.AI?">
                    <p>WRITI.AI está diseñado para tres perfiles principales:</p>
                    <ul>
                        <li><strong>Creadores de contenido en solitario:</strong> que publican Reels, Shorts o posts en redes y quieren publicar 3-5 veces por semana sin quedarse en blanco ni invertir horas pensando qué decir.</li>
                        <li><strong>Coaches, consultores e infoproductores:</strong> que necesitan crear contenido educativo de autoridad de forma consistente para atraer clientes cualificados y vender sus servicios o programas.</li>
                        <li><strong>Agencias y community managers:</strong> que gestionan múltiples clientes y necesitan escalar la producción de contenido sin sacrificar la calidad ni la voz de marca de cada uno.</li>
                    </ul>
                    <p>El mercado principal es España y Latinoamérica: todos los prompts internos, estructuras de guion y estilos de contenido están optimizados para el mercado hispanohablante.</p>
                </Section>

                {/* SECTION: Qué problema resuelve */}
                <Section title="¿Qué problema resuelve?">
                    <p>El 80% de los creadores de contenido abandona en los primeros 3 meses, no por falta de talento sino por falta de sistema. Cada día que encienden el móvil para publicar, tienen que empezar desde cero: pensar el tema, estructurar el guion, decidir el formato y el día. Ese proceso, repetido semana a semana, agota.</p>
                    <p>WRITI resuelve exactamente ese punto de dolor: elimina la decisión de "¿qué publico hoy?" y la sustituye por un sistema que lo tiene todo preparado con antelación.</p>
                    <p>La propuesta de valor se resume en: <strong>idea + guion + fecha, en un solo clic, con tu voz de marca.</strong></p>
                </Section>

                {/* SECTION: Cómo funciona */}
                <Section title="¿Cómo funciona?">
                    <ol>
                        <li><strong>Activas tu Cerebro IA:</strong> defines tu nicho, audiencia ideal, tono de marca y objetivo del mes. El sistema lo recuerda en todas las sesiones futuras.</li>
                        <li><strong>Generas ideas en bloque:</strong> la IA propone 20-30 ideas adaptadas a ti y a tu plataforma (Instagram, YouTube, TikTok). Seleccionas las que más te gustan.</li>
                        <li><strong>La IA escribe los guiones:</strong> para cada idea, genera un guion completo con gancho (hook), desarrollo por puntos y llamada a la acción (CTA), todo en tu tono.</li>
                        <li><strong>Lo arrastras al calendario:</strong> con drag & drop, asignas cada guion a una fecha. El sistema distribuye los formatos visualmente a lo largo del mes.</li>
                        <li><strong>Grabas:</strong> con el calendario listo y los guiones escritos, solo queda encender la cámara.</li>
                    </ol>
                </Section>

                {/* SECTION: Precio */}
                <Section title="Precio y modelo de negocio">
                    <p>WRITI.AI es un SaaS con modelo de suscripción mensual. El plan principal cuesta <strong>24,90 €/mes</strong> (precio de lanzamiento; el precio definitivo será 39 €/mes) e incluye:</p>
                    <ul>
                        <li>Ideas estratégicas ilimitadas (dentro de créditos mensuales)</li>
                        <li>Guiones completos listos para grabar (hook, desarrollo, CTA)</li>
                        <li>Calendario IA mensual con drag & drop</li>
                        <li>"Cerebro IA" de marca persistente</li>
                        <li>Biblioteca de guiones con historial completo</li>
                        <li>Editor de guiones con IA (versiones virales, ajustes de tono...)</li>
                        <li>Exportación de guiones en 1 clic</li>
                    </ul>
                    <p>Cancelas cuando quieras. Pago seguro vía Stripe. Sin permanencias.</p>
                </Section>

                {/* CTA */}
                <div style={{
                    marginTop: 64,
                    padding: '40px',
                    background: 'rgba(157,0,255,0.07)',
                    border: '1px solid rgba(157,0,255,0.2)',
                    borderRadius: 20,
                    textAlign: 'center',
                }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>
                        ¿Quieres probar WRITI.AI?
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 28 }}>
                        Accede a la plataforma y genera tu primer mes de contenido hoy.
                    </p>
                    <Link href="/login?mode=register" style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #9D00FF, #6100FF)',
                        color: '#fff', padding: '16px 36px',
                        borderRadius: 12, fontWeight: 800,
                        fontSize: '1rem', textDecoration: 'none',
                    }}>
                        ⚡ Prueba WRITI.AI gratis 7 días →
                    </Link>
                    <p style={{ marginTop: 14, fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
                        Sin tarjeta de crédito · Acceso inmediato · Cancela cuando quieras
                    </p>
                </div>
            </div>

            <style>{`
                h2 { font-family: 'Outfit', sans-serif; }
                ul, ol { padding-left: 1.4rem; display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.2rem; }
                li { line-height: 1.7; color: rgba(255,255,255,0.75); }
                strong { color: #fff; }
                p { margin-bottom: 1.1rem; color: rgba(255,255,255,0.75); line-height: 1.75; }
            `}</style>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 52, paddingTop: 48, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                marginBottom: 20,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
            }}>{title}</h2>
            {children}
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/app/components/Logo';
import './landing.css';

/* ────────────────────────────────────────
   FAQ DATA
   ──────────────────────────────────────── */
const FAQ_DATA = [
    {
        q: '¿Necesito saber de marketing para usar WRITI.AI?',
        a: 'No. Solo escribe tu tema, elige el tono y listo. La IA hace el resto.',
    },
    {
        q: '¿Los guiones suenan naturales o como ChatGPT genérico?',
        a: 'WRITI.AI aprende tu voz de marca. Cuanto más la usas, más se adapta a tu estilo.',
    },
    {
        q: '¿Funciona para cualquier nicho?',
        a: 'Sí. Moda, fitness, negocios, gastronomía, educación, tecnología — cualquier nicho.',
    },
    {
        q: '¿Puedo cancelar cuando quiera?',
        a: 'Sí, sin permanencias ni penalizaciones. Cancelas en un clic desde tu configuración.',
    },
    {
        q: '¿Hay límite de guiones en el plan Pro?',
        a: 'No. Guiones ilimitados en Pro y Agency.',
    },
];

/* ────────────────────────────────────────
   LANDING PAGE COMPONENT
   ──────────────────────────────────────── */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const [billing, setBilling] = useState('monthly');
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState({ h: 71, m: 59, s: 59 });
    const [mounted, setMounted] = useState(false);
    const ctaRef = useRef(null);

    // Navbar scroll effect
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Countdown timer (72h from first visit, stored in localStorage)
    useEffect(() => {
        setMounted(true);
        let endTime;
        const stored = typeof window !== 'undefined' && localStorage.getItem('writi_offer_end');
        if (stored) {
            endTime = parseInt(stored, 10);
        } else {
            endTime = Date.now() + 72 * 60 * 60 * 1000;
            if (typeof window !== 'undefined') localStorage.setItem('writi_offer_end', endTime.toString());
        }

        const tick = () => {
            const diff = Math.max(0, endTime - Date.now());
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown({ h, m, s });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    function scrollToCta() {
        ctaRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function handleEmailSubmit(e) {
        e.preventDefault();
        if (!email.trim() || submitting) return;
        setSubmitting(true);
        try {
            await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            setSubmitted(true);
        } catch {
            setSubmitted(true); // Show success anyway for UX
        } finally {
            setSubmitting(false);
        }
    }

    const pad = (n) => String(n).padStart(2, '0');

    const prices = {
        monthly: { free: '€0', pro: '€29', agency: '€59', period: '/mes' },
        yearly: { free: '€0', pro: '€24', agency: '€49', period: '/mes' },
    };

    return (
        <div className="landing">
            {/* ═══ NAVBAR ═══ */}
            <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <Logo size="1.2rem" />
                </Link>
                <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: '0.2s' }}>Iniciar sesión</Link>
                    <Link href="/login?mode=register" style={{ textDecoration: 'none' }}>
                        <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>Probar gratis</button>
                    </Link>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="hero">
                <h1 className="hero-headline" style={{ lineHeight: '1.1' }}>
                    Planifica y escribe el contenido de todo el mes en una tarde.
                </h1>
                <p className="hero-sub">
                    WRITI.AI crea tu calendario de contenidos, genera guiones para Reels, TikTok y LinkedIn y adapta todo a tu voz de marca en minutos.
                </p>
                <p style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '40px', letterSpacing: '0.05em' }}>
                    Sin quedarte en blanco · Sin sonar a ChatGPT · Sin perder horas delante de la pantalla.
                </p>

                <div className="hero-ctas">
                    <Link href="/login?mode=register" style={{ textDecoration: 'none' }}>
                        <button className="btn-primary" style={{ padding: '20px 48px', fontSize: '1.2rem', borderRadius: '18px' }}>
                            Probar gratis 7 días →
                        </button>
                    </Link>
                    <button className="btn-secondary" style={{ padding: '20px 40px', fontSize: '1rem', borderRadius: '18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                        Ver cómo funciona
                    </button>
                </div>

                {/* Mockup simplificado */}
                <div className="hero-mockup" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(157, 0, 255, 0.1)' }}>
                    <div className="mockup-left" style={{ background: 'transparent' }}>
                        <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '20px' }}>
                            <div className="mockup-label">CALENDARIO MENSUAL</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '16px' }}>
                                {[...Array(14)].map((_, i) => (
                                    <div key={i} style={{ height: '40px', background: i % 3 === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.05)', borderRadius: '6px', opacity: 0.6 }}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mockup-right" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="mockup-label">EDITOR DE GUIONES</div>
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ height: '12px', width: '90%', background: 'white', opacity: 0.3, borderRadius: '4px', marginBottom: '12px' }}></div>
                            <div style={{ height: '12px', width: '70%', background: 'white', opacity: 0.3, borderRadius: '4px', marginBottom: '12px' }}></div>
                            <div style={{ height: '12px', width: '80%', background: 'white', opacity: 0.3, borderRadius: '4px', marginBottom: '32px' }}></div>
                            <div style={{ padding: '8px 16px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', fontSize: '0.8rem', display: 'inline-block', borderRadius: '6px', fontWeight: 700 }}>Mejorar con IA ✓</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ PAIN POINTS ═══ */}
            <section>
                <h2 className="section-title">¿Te suena familiar?</h2>
                <div className="pain-grid">
                    <div className="pain-card">
                        <span className="pain-icon">😩</span>
                        <h3>El bloqueo creativo</h3>
                        <p>Te sientas a crear contenido y la mente en blanco. Pasan 2 horas y no has publicado nada.</p>
                    </div>
                    <div className="pain-card">
                        <span className="pain-icon">🔁</span>
                        <h3>Siempre el mismo formato</h3>
                        <p>Tus posts se parecen demasiado. Pierdes engagement porque tu audiencia ya sabe lo que vas a decir.</p>
                    </div>
                    <div className="pain-card">
                        <span className="pain-icon">⏰</span>
                        <h3>El tiempo que no tienes</h3>
                        <p>Gestionas 5 clientes o cuentas. Crear contenido desde cero para todos es imposible. Algo siempre sale mal.</p>
                    </div>
                </div>
            </section>

            {/* ═══ CÓMO FUNCIONA basado en features reales ═══ */}
            <section id="how-it-works" style={{ borderTop: '1px solid var(--border)', paddingTop: '100px' }}>
                <h2 className="section-title">Cómo trabaja WRITI.AI contigo</h2>
                <div className="steps-grid" style={{ marginTop: '60px' }}>
                    <div className="step-item">
                        <div className="step-num">STEP 01</div>
                        <h3>1. Entrena tu Cerebro IA</h3>
                        <p>Completa tu biografía, tu público objetivo y tus valores. WRITI.AI aprende tu voz y tu historia para que cada guion suene a ti.</p>
                    </div>
                    <div className="step-item">
                        <div className="step-num">STEP 02</div>
                        <h3>2. Genera el plan de contenido del mes</h3>
                        <p>Describe tu marca y tu objetivo del mes. La app crea un calendario de ideas distribuidas por días, plataformas y objetivos (ventas, autoridad, seguidores).</p>
                    </div>
                    <div className="step-item">
                        <div className="step-num">STEP 03</div>
                        <h3>3. Convierte ideas en guiones listos</h3>
                        <p>Para cada idea, genera un guion con gancho, desarrollo y CTA. Ajusta cada parte a tu gusto y mándalo al calendario o descárgalo en un clic.</p>
                    </div>
                </div>
            </section>

            {/* ═══ LO QUE INCLUYE HOY ═══ */}
            <section style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '40px', margin: '80px auto', border: '1px solid var(--border)' }}>
                <h2 className="section-title">Lo que incluye WRITI.AI hoy</h2>
                <div className="pain-grid" style={{ marginTop: '48px' }}>
                    {[
                        { t: 'Generador de guiones', d: 'Guiones estructurados con gancho, desarrollo y CTA para cada plataforma.' },
                        { t: 'Cerebro IA', d: 'Memoria de tu marca personal: biografía, público, valores y temas.' },
                        { t: 'Plan mensual', d: 'Un mapa de contenidos para 30 días según tu frecuencia y objetivos.' },
                        { t: 'Editor con IA', d: 'Mejora el gancho, el desarrollo o la CTA de cada guion con un clic.' },
                        { t: 'Biblioteca y calendario', d: 'Guarda tus guiones, prográmalos por fechas y organízalos en un calendario visual.' },
                        { t: 'Créditos de IA controlados', d: 'Sistema de créditos que protege tu presupuesto y te muestra cuánto consumes.' }
                    ].map((item, i) => (
                        <div key={i} className="pain-card" style={{ background: 'transparent' }}>
                            <div style={{ color: 'var(--accent)', marginBottom: '16px', fontWeight: 900 }}>✓</div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{item.t}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.d}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ SOCIAL PROOF ═══ */}
            <section>
                <h2 className="section-title">Lo que dicen los que ya lo usan.</h2>
                <div className="testimonial-grid">
                    <div className="testimonial-card">
                        <div className="testimonial-header">
                            <div className="testimonial-avatar">M</div>
                            <span className="testimonial-name">María G. — Creadora de contenido</span>
                        </div>
                        <div className="testimonial-stars">★★★★★</div>
                        <p>Antes tardaba 4 horas en planificar la semana. Ahora lo hago en 20 minutos. WRITI.AI cambió completamente mi flujo de trabajo.</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-header">
                            <div className="testimonial-avatar">C</div>
                            <span className="testimonial-name">Carlos R. — Agencia de marketing</span>
                        </div>
                        <div className="testimonial-stars">★★★★★</div>
                        <p>Gestiono 8 clientes y el tiempo que me ahorra es brutal. Los guiones suenan naturales, no a robot.</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-header">
                            <div className="testimonial-avatar">L</div>
                            <span className="testimonial-name">Laura M. — Coach de negocios</span>
                        </div>
                        <div className="testimonial-stars">★★★★★</div>
                        <p>Mis Reels pasaron de 200 a 4.000 visualizaciones. El gancho que genera la IA es lo que marca la diferencia.</p>
                    </div>
                </div>
            </section>

            {/* ═══ PRICING (Un solo plan) ═══ */}
            <section id="pricing">
                <h2 className="section-title">Solo un plan. Todo desbloqueado.</h2>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
                    <div className="pricing-card featured" style={{ maxWidth: '500px', width: '100%', padding: '60px 40px', position: 'relative' }}>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em' }}>PLAN PRO</span>
                            <div style={{ fontSize: '4rem', fontWeight: 900, margin: '20px 0' }}>$39<span style={{ fontSize: '1.2rem', opacity: 0.6 }}>/mes</span></div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem' }}>Todo lo que necesitas para planear y escribir tu contenido del mes en minutos.</p>
                        </div>

                        <ul className="pricing-features" style={{ marginBottom: '40px' }}>
                            <li>Generador de guiones para Reels, TikTok, Shorts, LinkedIn y X</li>
                            <li>Cerebro IA: memoria de tu biografía, público, valores y nicho</li>
                            <li>Plan mensual de contenido con ideas para todo el mes</li>
                            <li>Editor avanzado de guiones con IA (gancho, desarrollo y CTA)</li>
                            <li>Biblioteca de guiones guardados</li>
                            <li>Calendario de contenido con asignación en 1 clic</li>
                            <li>Exportar/descargar guiones en texto</li>
                            <li>Métricas básicas de uso y créditos de IA</li>
                        </ul>

                        <Link href="/login" style={{ textDecoration: 'none' }}>
                            <button className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem' }}>Empezar con el Plan Pro →</button>
                        </Link>

                        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Prueba gratis 7 días. Luego $39/mes. <br /> Sin permanencias, cancelas cuando quieras.
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══ OFFER BANNER ═══ */}
            <section className="offer-banner">
                <div className="offer-wrapper">
                    <div className="offer-title">🎁 OFERTA DE LANZAMIENTO — Solo esta semana: 3 meses de Pro gratis si te registras hoy.</div>
                    <p className="offer-sub">Más de 340 personas ya aprovecharon esta oferta.</p>
                    <div className="offer-timer">
                        {mounted ? `${pad(countdown.h)}:${pad(countdown.m)}:${pad(countdown.s)}` : '71:59:59'}
                    </div>
                    <button className="btn-primary" style={{ background: 'white', color: 'black' }} onClick={scrollToCta}>Quiero mis 3 meses gratis →</button>
                </div>
            </section>

            {/* ═══ FAQ ═══ */}
            <section>
                <h2 className="section-title">Preguntas frecuentes.</h2>
                <div className="faq-list">
                    {FAQ_DATA.map((item, idx) => (
                        <div key={idx} className="faq-item">
                            <button className="faq-question" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                                {item.q}
                                <span className={`faq-arrow ${openFaq === idx ? 'open' : ''}`}>▼</span>
                            </button>
                            <div className={`faq-answer ${openFaq === idx ? 'open' : ''}`}>
                                <p>{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ FINAL CTA ═══ */}
            <section className="final-cta" ref={ctaRef}>
                <h2 className="section-title">Tu competencia ya está publicando<br />más rápido que tú.</h2>
                <p className="section-subtitle" style={{ marginBottom: '0' }}>Empieza hoy. Los primeros 10 guiones son completamente gratis.</p>

                {!submitted ? (
                    <>
                        <form className="email-form" onSubmit={handleEmailSubmit}>
                            <input
                                type="email"
                                placeholder="Tu email profesional"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn-primary" disabled={submitting}>
                                {submitting ? 'Enviando...' : 'Empezar gratis →'}
                            </button>
                        </form>
                        <p className="email-micro">
                            <span>✓</span> Sin tarjeta · <span>✓</span> Acceso en 30 segundos · <span>✓</span> Cancela cuando quieras
                        </p>
                    </>
                ) : (
                    <p className="success-msg">¡Listo! Te avisamos cuando abra el acceso anticipado. 🎉</p>
                )}
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="lp-footer" style={{ maxWidth: '100%' }}>
                <div className="footer-left">
                    <Logo size="0.9rem" />
                    <p>© 2026 WRITI.AI. Todos los derechos reservados.</p>
                </div>
                <div className="footer-links">
                    <a href="#">Privacidad</a>
                    <a href="#">Términos</a>
                    <a href="#">Contacto</a>
                </div>
            </footer>
        </div>
    );
}

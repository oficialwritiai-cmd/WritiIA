'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import Logo from '@/app/components/Logo';
import { Menu, X, CheckCircle, ShieldCheck, Zap } from 'lucide-react';
import '../landing.css';

/* ────────────────────────────────────────
   FAQ DATA
   ──────────────────────────────────────── */
const FAQ_DATA = [
    {
        q: '¿Cómo funciona este planificador de contenido con IA?',
        a: 'WRITI aprende tu voz de marca y objetivo. Luego, te sugiere temáticas, redacta los guiones completos y los sitúa en un calendario mensual automático listo para ejecutar.',
    },
    {
        q: '¿Es el mejor generador de guiones para YouTube y Reels?',
        a: 'Sí, porque no arroja texto genérico. Se enfoca en la retención: redacta "hooks" poderosos y estructuras probadas para mantener la atención del espectador en videos cortos.',
    },
    {
        q: '¿Puede sustituir a un Social Media Manager?',
        a: 'WRITI asume la carga pesada de la lluvia de ideas, redacción de los copys y planificación mensual. Es ideal para negocios que gestionan sus propias redes o creadores que quieren multiplicar su producción.',
    },
    {
        q: '¿Funciona para cualquier nicho?',
        a: 'Sí. Moda, fitness, negocios, gastronomía, educación, tecnología — cualquier nicho. El calendario y los guiones se adaptan al objetivo del mes.',
    },
    {
        q: '¿Puedo cancelar cuando quiera?',
        a: 'Sí, sin permanencias ni penalizaciones. Cancelas en un clic desde tu configuración.',
    }
];

/* ────────────────────────────────────────
   CALENDAR DATA — Rich visual mockup
   ──────────────────────────────────────── */
const CAL_DAYS_HEADER = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CAL_DATA = [
    { num: 1, type: null },
    { num: 2, type: 'reel', label: 'Reel' },
    { num: 3, type: null },
    { num: 4, type: 'post', label: 'Post' },
    { num: 5, type: 'reel', label: 'Reel' },
    { num: 6, type: null },
    { num: 7, type: 'story', label: 'Story' },
    { num: 8, type: null },
    { num: 9, type: 'reel', label: 'Reel' },
    { num: 10, type: 'post', label: 'Post' },
    { num: 11, type: null },
    { num: 12, type: 'reel', label: 'Reel' },
    { num: 13, type: null },
    { num: 14, type: 'post', label: 'Post' },
    { num: 15, type: 'launch', label: '🚀 Lanzamiento' },
    { num: 16, type: 'reel', label: 'Reel' },
    { num: 17, type: null },
    { num: 18, type: 'post', label: 'Post' },
    { num: 19, type: 'reel', label: 'Reel' },
    { num: 20, type: null },
    { num: 21, type: 'story', label: 'Story' },
    { num: 22, type: 'reel', label: 'Reel' },
    { num: 23, type: 'post', label: 'Post' },
    { num: 24, type: null },
    { num: 25, type: 'reel', label: 'Reel' },
    { num: 26, type: null },
    { num: 27, type: 'post', label: 'Post' },
    { num: 28, type: 'reel', label: 'Reel' },
];

/* ────────────────────────────────────────
   LANDING PAGE COMPONENT
   ──────────────────────────────────────── */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const [user, setUser] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const ctaRef = useRef(null);
    const router = useRouter();
    const supabase = createSupabaseClient();

    // Check session
    useEffect(() => {
        setMounted(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUser(session.user);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Navbar scroll effect
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    function scrollToCta() {
        ctaRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function handleStart() {
        if (!user) {
            router.push('/login?mode=register');
        } else {
            router.push('/dashboard');
        }
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
            setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    }

    const loginHref = '/login';
    const startHref = user ? '/dashboard' : '/login?mode=register';
    const startLabel = user ? 'Ir a mi Panel →' : 'Empieza tu mes con IA';

    return (
        <div className="landing">

            {/* ═══ HEADER WRAPPER ═══ */}
            <header className={`lp-header-wrap ${scrolled ? 'scrolled' : ''}`}>
                {/* ═══ TRUST BANNER ═══ */}
                <div className="lp-trust-banner">
                    <span className="lp-trust-item"><span style={{ color: '#9D00FF' }}>🛡️</span> Cancelación en 1 clic</span>
                    <span className="lp-trust-item"><span style={{ color: '#34d399' }}>🔒</span> Pago seguro vía Stripe</span>
                    <span className="lp-trust-item"><span style={{ color: '#fbbf24' }}>⚡</span> Acceso inmediato</span>
                    <span className="lp-trust-item"><span style={{ color: '#60a5fa' }}>👥</span> +100 creadores activos</span>
                </div>

                {/* ═══ NAVBAR ═══ */}
                <nav className="lp-nav">
                    <Link href="/" className="lp-nav-logo">
                        <Logo size="1.15rem" />
                    </Link>

                    <div className="lp-nav-links">
                        <a href="#how-it-works" className="lp-nav-link">Cómo funciona</a>
                        <a href="#features" className="lp-nav-link">Producto</a>
                        <a href="#pricing" className="lp-nav-link">Pricing</a>
                    </div>

                    <div className="lp-nav-right">
                        {!mounted ? (
                            <div style={{ width: '180px' }}></div>
                        ) : user ? (
                            <button onClick={handleStart} className="lp-btn-start" disabled={loading}>
                                {loading ? 'Cargando...' : 'Ir a mi Panel →'}
                            </button>
                        ) : (
                            <>
                                <Link href="/login" className="lp-btn-login">Iniciar sesión</Link>
                                <button onClick={() => router.push('/login?mode=register')} className="lp-btn-start">Registrarse</button>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* ═══ HERO ═══ */}
            <section className="lp-hero">
                {/* Background halos */}
                <div className="lp-hero-bg">
                    <div className="lp-halo lp-halo-1" />
                    <div className="lp-halo lp-halo-2" />
                    <div className="lp-halo lp-halo-3" />
                </div>

                {/* Floating tags */}
                <div className="lp-tags-container">
                    <div className="lp-tag lp-tag-1">
                        <span className="lp-tag-dot" style={{ background: '#9D00FF', boxShadow: '0 0 6px #9D00FF' }} />
                        Ideas virales
                    </div>
                    <div className="lp-tag lp-tag-2">
                        <span className="lp-tag-dot" style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                        Guiones listos para grabar
                    </div>
                    <div className="lp-tag lp-tag-3">
                        <span className="lp-tag-dot" style={{ background: '#60a5fa', boxShadow: '0 0 6px #60a5fa' }} />
                        Calendario mensual IA
                    </div>
                    <div className="lp-tag lp-tag-4">
                        <span className="lp-tag-dot" style={{ background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }} />
                        Ahorra 10+ horas al mes
                    </div>
                </div>

                {/* Hero content */}
                <div className="lp-hero-inner">
                    <div className="lp-badge">✦ Planificador de contenido con IA</div>

                    <h1 className="lp-h1" style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.8rem)' }}>
                        Generador de Guiones con IA Listos para Grabar en <span>Reels y TikTok</span>
                    </h1>

                    <p className="lp-hero-sub">
                        Crea guiones magnéticos en segundos. Nuestra IA formula ganchos virales (hooks), redacta el cuerpo e inyecta CTA perfectos para captar clientes en redes sociales.
                    </p>

                    <div className="lp-hero-ctas">
                        {!mounted ? (
                            <div style={{ height: '56px' }}></div>
                        ) : (
                            <>
                                <button onClick={handleStart} className="lp-cta-primary" disabled={loading}>
                                    ⚡ {loading ? 'Preparando...' : startLabel}
                                </button>
                                <button
                                    className="lp-cta-secondary"
                                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    ▷ Ver WRITI en acción
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Dashboard mockup */}
                <div className="lp-hero-mockup">
                    <div className="lp-mockup-window">
                        <div className="lp-mockup-titlebar">
                            <span className="lp-dot lp-dot-red" />
                            <span className="lp-dot lp-dot-yellow" />
                            <span className="lp-dot lp-dot-green" />
                            <span style={{ marginLeft: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                WRITI — Dashboard
                            </span>
                        </div>
                        <div className="lp-mockup-body">
                            {/* Left: Ideas list */}
                            <div className="lp-mock-left">
                                <div className="lp-mock-section-label">Ideas del mes ✦ 12 generadas</div>

                                {[
                                    { color: '#9D00FF', label: 'Reel · Fitness' },
                                    { color: '#34d399', label: 'Post · Negocio' },
                                    { color: '#60a5fa', label: 'Story · Lifestyle' },
                                    { color: '#fbbf24', label: 'Reel · Motivación' },
                                ].map((idea, i) => (
                                    <div className="lp-mock-idea" key={i}>
                                        <span className="lp-mock-idea-dot" style={{ background: idea.color }} />
                                        <div className="lp-mock-idea-lines">
                                            <div style={{ fontSize: '0.65rem', color: idea.color, fontWeight: 700, marginBottom: 5 }}>{idea.label}</div>
                                            <div className="lp-mock-line long" />
                                            <div className="lp-mock-line med" style={{ marginBottom: 0 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right: Calendar */}
                            <div className="lp-mock-right">
                                <div className="lp-mock-section-label">Calendario IA · Marzo 2026</div>
                                <div className="lp-mini-cal">
                                    {CAL_DAYS_HEADER.map(d => (
                                        <div className="lp-cal-header" key={d}>{d}</div>
                                    ))}
                                    {[...Array(4)].map((_, i) => (
                                        <div key={'e' + i} className="lp-cal-day" style={{ background: 'transparent', border: 'none' }} />
                                    ))}
                                    {Array.from({ length: 28 }, (_, i) => {
                                        const types = [null, 'reel', null, 'post', 'reel', null, 'story',
                                            null, 'reel', 'post', null, 'reel', null, 'post',
                                            'active', 'reel', null, 'post', 'reel', null, null,
                                            'reel', 'post', null, 'reel', null, 'post', 'reel'];
                                        const t = types[i];
                                        return (
                                            <div
                                                key={i}
                                                className={`lp-cal-day ${t === 'reel' ? 'reel' : t === 'post' ? 'post' : t === 'active' ? 'active' : ''}`}
                                            >
                                                {i + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="lp-scroll-indicator">
                    <div className="lp-scroll-arrow">↓</div>
                    Scroll
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ CÓMO WRITI ORGANIZA TU MES ═══ */}
            <section id="how-it-works" className="lp-section">
                <span className="lp-section-label">Proceso</span>
                <h2 className="lp-section-title">Cómo WRITI organiza tu mes</h2>
                <p className="lp-section-sub">
                    Tres pasos. Sin configuraciones complejas. Tu calendario mensual listo en una tarde.
                </p>

                <div className="lp-steps">
                    {/* STEP 1 */}
                    <div className="lp-step-card">
                        <div className="lp-step-num">01</div>
                        <span className="lp-step-icon">🧠</span>
                        <div className="lp-step-title">Activa tu Cerebro IA</div>
                        <p className="lp-step-desc">
                            Define tu marca, tu cliente ideal y el tono de tu contenido. La IA aprende quién eres y para qué crea.
                        </p>
                        <div className="lp-step-mini">
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 700 }}>Perfil de marca</div>
                            {['Nicho: Marketing digital', 'Audiencia: Emprendedores', 'Tono: Directo y práctico'].map((t, i) => (
                                <div className="lp-step-mini-row" key={i}>
                                    <span className="lp-step-mini-dot" style={{ background: '#9D00FF' }} />
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* STEP 2 */}
                    <div className="lp-step-card">
                        <div className="lp-step-num">02</div>
                        <span className="lp-step-icon">💡</span>
                        <div className="lp-step-title">Genera ideas y guiones en minutos</div>
                        <p className="lp-step-desc">
                            La IA crea ideas estratégicas alineadas con tu objetivo del mes. Cada idea tiene un guion completo: gancho, desarrollo y CTA.
                        </p>
                        <div className="lp-step-mini">
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 700 }}>Guion #3 · Reel</div>
                            {[{ w: '95%' }, { w: '80%' }, { w: '70%' }].map((l, i) => (
                                <div className="lp-step-mini-bar" key={i} style={{ width: l.w, background: 'rgba(157,0,255,0.2)', marginBottom: 6 }} />
                            ))}
                            <div style={{ marginTop: 8, display: 'inline-flex', gap: 6 }}>
                                <span style={{ fontSize: '0.62rem', background: 'rgba(157,0,255,0.2)', color: '#c084fc', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>Gancho ✓</span>
                                <span style={{ fontSize: '0.62rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>CTA ✓</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3 */}
                    <div className="lp-step-card">
                        <div className="lp-step-num">03</div>
                        <span className="lp-step-icon">📅</span>
                        <div className="lp-step-title">Llena tu calendario mensual automáticamente</div>
                        <p className="lp-step-desc">
                            Asigna ideas al calendario en 1 clic. WRITI reparte los formatos y plataformas a lo largo del mes sin que tengas que pensar.
                        </p>
                        <div className="lp-step-mini">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                                {Array.from({ length: 14 }, (_, i) => {
                                    const colored = [1, 4, 7, 9, 12].includes(i);
                                    return (
                                        <div key={i} style={{
                                            height: 22, borderRadius: 4,
                                            background: colored ? 'rgba(157,0,255,0.35)' : 'rgba(255,255,255,0.05)',
                                            border: colored ? '1px solid rgba(157,0,255,0.5)' : '1px solid rgba(255,255,255,0.05)',
                                        }} />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ LO QUE HACE DIFERENTE A WRITI ═══ */}
            <section id="features" className="lp-section">
                <span className="lp-section-label">Beneficios de crear guiones con IA</span>
                <h2 className="lp-section-title">La anatomía del guion viral perfecto</h2>
                <p className="lp-section-sub">
                    Nuestra IA está entrenada en miles de horas de contenido orgánico para replicar estructuras que retienen la atención.
                </p>

                <div className="lp-features">
                    <div className="lp-feature-card">
                        <div className="lp-feature-icon-wrap" style={{ background: 'rgba(157,0,255,0.1)', border: '1px solid rgba(157,0,255,0.2)' }}>
                            🪝
                        </div>
                        <h3 className="lp-feature-title">Ganchos (Hooks) que frenan el scroll</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Los primeros 3 segundos son todo. La IA redacta titulares contraintuitivos, promesas fuertes o preguntas polarizantes diseñadas específicamente para evitar que tu audiencia haga swipe up.
                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            🧠
                        </div>
                        <h3 className="lp-feature-title">No suenes a robot: Tu propia voz</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Olvídate del tono formal y aburrido de ChatGPT. Con Cerebro IA, el generador asimila tu cliente ideal, tu posicionamiento y tu tono de marca (directo, emocional, experto) para sonar 100% humano.
                        </p>
                    </div>

                    <div className="lp-feature-card">
                        <div className="lp-feature-icon-wrap" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                            🎬
                        </div>
                        <h3 className="lp-feature-title">Estructura por bloques para teleprompter</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Recibe el guion dividido visualmente en: Gancho, Desarrollo (cuerpo del video), Cierre y CTA. Léelo fácilmente y pásalo a grabar en 2 minutos.
                        </p>
                    </div>
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ CASOS DE USO ═══ */}
            <section className="lp-section">
                <span className="lp-section-label">Para quién es</span>
                <h2 className="lp-section-title">El asistente de marketing ideal para tu negocio digital</h2>
                
                <div className="lp-features" style={{ marginTop: '40px' }}>
                    <div className="lp-feature-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <h3 className="lp-feature-title" style={{ fontSize: '1.1rem' }}>Para Creadores de Contenido</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Aumenta tu frecuencia de publicación sin burnout. Genera 30 guiones de contenido orgánico en una tarde y dedícate solo a grabar.
                        </p>
                    </div>
                    <div className="lp-feature-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <h3 className="lp-feature-title" style={{ fontSize: '1.1rem' }}>Para Coaches y Consultores</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Demuestra tu autoridad. Crea contenido educativo profundo, hilado con inteligencia artificial, para captar leads cualificados y vender tus mentorías.
                        </p>
                    </div>
                    <div className="lp-feature-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <h3 className="lp-feature-title" style={{ fontSize: '1.1rem' }}>Para Agencias y Community Managers</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Gestiona el mes de 10 clientes distintos en tiempo récord. Cada perfil tiene su propio "Cerebro IA" para mantener la voz de marca perfecta.
                        </p>
                    </div>
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ VISTA PREVIA CALENDARIO IA ═══ */}
            {/* SECTION ELIMINATED */}

            <div className="lp-divider" />

            {/* ═══ SOCIAL PROOF ═══ */}
            <section className="lp-section">
                <span className="lp-section-label">Testimonios</span>
                <h2 className="lp-section-title">Lo que dicen los que ya planifican con WRITI</h2>

                <div className="lp-proof-header" style={{ marginBottom: 52 }}>
                    🌟 Creadores y agencias que ya planifican su mes con WRITI
                </div>

                <div className="lp-testimonials">
                    <div className="lp-testimonial-card">
                        <div className="lp-stars">★★★★★</div>
                        <p className="lp-testimonial-text">
                            "Antes tardaba 4 horas en planificar la semana. Ahora lo hago en 20 minutos. El calendario con IA es lo que más me ha cambiado el flujo de trabajo."
                        </p>
                        <div className="lp-testimonial-author">
                            <div className="lp-avatar" style={{ background: 'linear-gradient(135deg, #9D00FF, #6100FF)' }}>M</div>
                            <div>
                                <div className="lp-author-name">María G.</div>
                                <div className="lp-author-role">Creadora de contenido · Lifestyle</div>
                            </div>
                        </div>
                    </div>

                    <div className="lp-testimonial-card">
                        <div className="lp-stars">★★★★★</div>
                        <p className="lp-testimonial-text">
                            "Gestiono 8 clientes y el tiempo que me ahorra es brutal. Los guiones suenan naturales, no a robot. El gancho que genera para Reels es increíble."
                        </p>
                        <div className="lp-testimonial-author">
                            <div className="lp-avatar" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>C</div>
                            <div>
                                <div className="lp-author-name">Carlos R.</div>
                                <div className="lp-author-role">Director · Agencia de marketing</div>
                            </div>
                        </div>
                    </div>

                    <div className="lp-testimonial-card">
                        <div className="lp-stars">★★★★★</div>
                        <p className="lp-testimonial-text">
                            "Mis Reels pasaron de 200 a 4.000 visualizaciones. Las ideas que genera WRITI son específicas de mi nicho, no son genéricas. Eso marca la diferencia."
                        </p>
                        <div className="lp-testimonial-author">
                            <div className="lp-avatar" style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }}>L</div>
                            <div>
                                <div className="lp-author-name">Laura M.</div>
                                <div className="lp-author-role">Coach de negocios · Online</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ PRICING ═══ */}
            <section id="pricing" className="lp-section">
                <span className="lp-section-label">Pricing</span>
                <h2 className="lp-section-title">Un plan. Todo incluido.</h2>
                <p className="lp-section-sub">Sin sorpresas, sin planes confusos. Accede a todo lo que necesitas para planear tu mes de contenido.</p>

                <div className="lp-pricing-wrap">
                    <div className="lp-pricing-card">
                        <div className="lp-pricing-badge">PLAN PRO</div>
                        <div className="lp-pricing-price">$39</div>
                        <div className="lp-pricing-period">por mes · facturado mensualmente</div>
                        <div className="lp-pricing-trial">
                            <span style={{ color: '#34d399' }}>✓</span>
                            Prueba gratis 7 días con tu llave de acceso
                        </div>

                        <ul className="lp-pricing-features">
                            {[
                                'Ideas estratégicas ilimitadas (dentro de tus créditos)',
                                'Guiones completos listos para grabar',
                                'Calendario IA mensual automático',
                                'Cerebro IA: memoria de tu marca y audiencia',
                                'Editor de guiones con IA (gancho, desarrollo, CTA)',
                                'Biblioteca de guiones con historial completo',
                                'Drag & drop en el calendario para reorganizar',
                                'Exportar guiones en texto en 1 clic',
                                'Créditos IA mensual + compra de créditos extra',
                            ].map((feat, i) => (
                                <li key={i}>
                                    <span className="lp-pricing-check">✓</span>
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={handleStart}
                            className="lp-cta-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '18px 32px', fontSize: '1.05rem' }}
                        >
                            ⚡ {loading ? 'Conectando con Stripe...' : 'Empezar ahora'}
                        </button>

                        <p className="lp-pricing-note">
                            7 días gratis sin cargo. Cancela cuando quieras.<br />
                            Pago 100% seguro vía Stripe 🔒
                        </p>
                    </div>
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ FAQ ═══ */}
            <section className="lp-section">
                <span className="lp-section-label">FAQ</span>
                <h2 className="lp-section-title">Preguntas frecuentes</h2>
                <div style={{ maxWidth: 720, margin: '0 auto', marginTop: 48 }}>
                    {FAQ_DATA.map((item, idx) => (
                        <div key={idx} style={{
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            marginBottom: 4,
                        }}>
                            <button
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                style={{
                                    width: '100%', display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', padding: '22px 20px',
                                    background: openFaq === idx ? 'rgba(157,0,255,0.05)' : 'transparent',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 12, color: '#fff',
                                    fontSize: '1rem', fontWeight: 600, textAlign: 'left',
                                    cursor: 'pointer', transition: 'all 0.2s', marginBottom: 4,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {item.q}
                                <span style={{
                                    transform: openFaq === idx ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.3s',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.8rem',
                                    marginLeft: 16, flexShrink: 0,
                                }}>▼</span>
                            </button>
                            {openFaq === idx && (
                                <div style={{ padding: '0 20px 20px', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.65 }}>
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <div className="lp-divider" />

            {/* ═══ FINAL CTA ═══ */}
            <section className="lp-final-cta" ref={ctaRef}>
                <div className="lp-final-bg" />
                <div className="lp-final-cta-inner">
                    <span className="lp-section-label">Empieza hoy</span>
                    <h2 className="lp-final-title">
                        Ten tu mes de contenido<br />resuelto hoy.
                    </h2>
                    <p className="lp-final-sub">
                        Activa WRITI y deja que la IA piense tus ideas, guiones y calendario. Tú solo graba y publica.
                    </p>

                    {!submitted ? (
                        <>
                            <button onClick={handleStart} className="lp-final-cta-btn" disabled={loading}>
                                ✦ {loading ? 'Cargando...' : 'Crear mi mes con IA'}
                            </button>
                            <div className="lp-final-note">
                                <span><span className="lp-final-note-dot">✓</span> 7 días gratis</span>
                                <span><span className="lp-final-note-dot">✓</span> Sin tarjeta requerida</span>
                                <span><span className="lp-final-note-dot">✓</span> Acceso inmediato</span>
                            </div>
                        </>
                    ) : (
                        <p style={{ fontSize: '1.2rem', color: '#34d399', fontWeight: 700, marginTop: 24 }}>
                            ¡Listo! Te avisamos cuando abra el acceso anticipado. 🎉
                        </p>
                    )}
                </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="lp-footer">
                <div className="lp-footer-left">
                    <Logo size="0.9rem" />
                    <p>© 2026 WRITI. Todos los derechos reservados.</p>
                </div>
                <div className="lp-footer-links">
                    <Link href="/privacidad">Privacidad</Link>
                    <Link href="/terminos">Términos</Link>
                    <a href="mailto:hi@writi-ai.com">Contacto</a>
                </div>
            </footer>

        </div>
    );
}

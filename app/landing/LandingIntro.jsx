'use client';
import { useEffect, useState } from 'react';

const PALABRAS = [
    { texto: '20',         delay: 0,    gradient: false },
    { texto: 'minutos.',   delay: 200,  gradient: true  },
    { texto: 'Un',         delay: 800,  gradient: false },
    { texto: 'mes',        delay: 950,  gradient: false },
    { texto: 'de',         delay: 1100, gradient: false },
    { texto: 'contenido',  delay: 1250, gradient: false },
    { texto: 'listo.',     delay: 1450, gradient: false, glow: true },
];

const ULTIMA_PALABRA_DELAY = 1450;
const PAUSA_TRAS_ULTIMA    = 1200;
const DURACION_FADEOUT     = 900;

export default function LandingIntro({ onDone }) {
    const [show,         setShow]         = useState(false);
    const [visibleWords, setVisibleWords] = useState([]);
    const [fadingOut,    setFadingOut]    = useState(false);
    const [bannerSlide,  setBannerSlide]  = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (sessionStorage.getItem('intro_seen')) {
            onDone?.();
            return;
        }
        sessionStorage.setItem('intro_seen', 'true');
        setShow(true);

        // Slide del banner
        setTimeout(() => setBannerSlide(true), 100);

        // Animar palabras
        PALABRAS.forEach((p, i) => {
            setTimeout(() => {
                setVisibleWords(prev => [...prev, i]);
            }, p.delay + 300); // +300 para dar tiempo al fade-in de la pantalla
        });

        // Fade out
        const totalDelay = 300 + ULTIMA_PALABRA_DELAY + PAUSA_TRAS_ULTIMA;
        const fadeTimer = setTimeout(() => {
            setFadingOut(true);
            setTimeout(() => {
                setShow(false);
                onDone?.();
            }, DURACION_FADEOUT);
        }, totalDelay);

        return () => clearTimeout(fadeTimer);
    }, []);

    const skip = () => {
        setFadingOut(true);
        setTimeout(() => {
            setShow(false);
            onDone?.();
        }, 300);
    };

    if (!show) return null;

    return (
        <>
            <style>{`
                @keyframes introFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes introBannerDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to   { transform: translateY(0);     opacity: 1; }
                }
                @keyframes introWordIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes introFadeOut {
                    from { opacity: 1; }
                    to   { opacity: 0; }
                }
                @keyframes glowPulse {
                    0%, 100% { text-shadow: 0 0 0px transparent; }
                    50%      { text-shadow: 0 0 32px rgba(124,58,237,0.6), 0 0 64px rgba(6,182,212,0.3); }
                }
            `}</style>

            {/* Overlay */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000000',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                animation: fadingOut
                    ? `introFadeOut ${DURACION_FADEOUT}ms ease forwards`
                    : 'introFadeIn 0.4s ease forwards',
            }}>

                {/* Banner superior */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    background: 'linear-gradient(90deg, #7C3AED, #6D28D9)',
                    padding: '10px 24px',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#fff',
                    letterSpacing: '0.01em',
                    animation: bannerSlide ? 'introBannerDown 0.5s ease forwards' : 'none',
                    transform: bannerSlide ? 'translateY(0)' : 'translateY(-100%)',
                    opacity: bannerSlide ? 1 : 0,
                    transition: 'transform 0.5s ease, opacity 0.5s ease',
                }}>
                    ⚡ Primeros 20 accesos — Precio fundador disponible ·{' '}
                    <a href="/login?mode=register" style={{ color: '#e9d5ff', fontWeight: 700, textDecoration: 'underline' }}>
                        Aprovecha →
                    </a>
                </div>

                {/* Texto central */}
                <div style={{
                    maxWidth: '820px',
                    padding: '0 32px',
                    textAlign: 'center',
                    lineHeight: 1.15,
                }}>
                    {/* Línea 1: "20 minutos." */}
                    <div style={{ marginBottom: '0.15em' }}>
                        {PALABRAS.slice(0, 2).map((p, i) => (
                            <Word key={i} p={p} visible={visibleWords.includes(i)} />
                        ))}
                    </div>

                    {/* Línea 2: "Un mes de contenido listo." */}
                    <div>
                        {PALABRAS.slice(2).map((p, i) => (
                            <Word key={i + 2} p={p} visible={visibleWords.includes(i + 2)} />
                        ))}
                    </div>
                </div>

                {/* Botón skip */}
                <button
                    onClick={skip}
                    style={{
                        position: 'fixed',
                        bottom: '32px',
                        right: '32px',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        transition: 'color 0.2s ease, background 0.2s ease',
                        fontFamily: "'Inter', sans-serif",
                        letterSpacing: '0.02em',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                        e.currentTarget.style.background = 'none';
                    }}
                >
                    Saltar →
                </button>
            </div>
        </>
    );
}

function Word({ p, visible }) {
    const baseStyle = {
        display: 'inline-block',
        fontSize: 'clamp(44px, 7.5vw, 92px)',
        fontWeight: 300,
        letterSpacing: '-0.02em',
        marginRight: '0.28em',
        opacity: 0,
        transform: 'translateY(20px)',
        transition: 'none',
        fontFamily: "'Inter', 'Geist', sans-serif",
    };

    const visibleStyle = visible ? {
        animation: 'introWordIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
    } : {};

    if (p.gradient) {
        return (
            <span style={{
                ...baseStyle,
                ...visibleStyle,
                background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
            }}>
                {p.texto}
            </span>
        );
    }

    if (p.glow) {
        return (
            <span style={{
                ...baseStyle,
                ...visibleStyle,
                color: '#ffffff',
                ...(visible ? { animation: 'introWordIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards, glowPulse 2s ease 0.6s infinite' } : {}),
            }}>
                {p.texto}
            </span>
        );
    }

    return (
        <span style={{
            ...baseStyle,
            ...visibleStyle,
            color: '#ffffff',
        }}>
            {p.texto}
        </span>
    );
}

'use client';
import { useState, useEffect, useRef } from 'react';

const T = {
    skipShow:  1800,
    f1In:       500,
    f1Out:     2300,
    f2In:      2800,
    f2Out:     4600,
    f3In:      5000,
    f3L2In:    5350,
    f3Out:     7800,
    logoIn:    8200,
    fadeOut:  10000,
};

export default function WelcomeCinematic({ onComplete, userName }) {
    const [f1, setF1]             = useState('init');
    const [f2, setF2]             = useState('init');
    const [f3, setF3]             = useState('init');
    const [f3l2, setF3l2]         = useState(false);
    const [logo, setLogo]         = useState(false);
    const [skipVisible, setSkip]  = useState(false);
    const [leaving, setLeaving]   = useState(false);
    const ts = useRef([]);

    const add = (fn, ms) => { ts.current.push(setTimeout(fn, ms)); };

    const finish = () => {
        ts.current.forEach(clearTimeout);
        setLeaving(true);
        setTimeout(onComplete, 900);
    };

    useEffect(() => {
        add(() => setSkip(true),          T.skipShow);
        add(() => setF1('in'),            T.f1In);
        add(() => setF1('out'),           T.f1Out);
        add(() => setF2('in'),            T.f2In);
        add(() => setF2('out'),           T.f2Out);
        add(() => setF3('in'),            T.f3In);
        add(() => setF3l2(true),          T.f3L2In);
        add(() => setF3('out'),           T.f3Out);
        add(() => setLogo(true),          T.logoIn);
        add(finish,                       T.fadeOut);
        return () => ts.current.forEach(clearTimeout);
    }, []);

    // Base style for each "frase" element — all absolutely positioned so they overlap
    const fs = (state) => ({
        position: 'absolute',
        left: 0, right: 0,
        opacity: state === 'in' ? 1 : 0,
        transform: state === 'in'
            ? 'translateY(0)'
            : state === 'out'
            ? 'translateY(-14px)'
            : 'translateY(24px)',
        transition: 'opacity 0.85s ease, transform 0.85s ease',
        textAlign: 'center',
        padding: '0 40px',
        margin: 0,
        pointerEvents: 'none',
    });

    const name = userName?.trim();
    const line1 = name
        ? `${name}, es hora de crear contenido`
        : 'Es hora de crear contenido';

    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                background: '#000',
                zIndex: 99999,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: leaving ? 0 : 1,
                transition: leaving ? 'opacity 0.9s ease' : 'none',
                pointerEvents: leaving ? 'none' : 'all',
            }}
        >
            {/* ── Frases stage ────────────────────────────────── */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>

                {/* Frase 1 */}
                <p style={{
                    ...fs(f1),
                    fontSize: 'clamp(18px, 2.8vw, 28px)',
                    fontWeight: 300,
                    color: '#9CA3AF',
                    letterSpacing: '0.01em',
                }}>
                    El contenido que publicas...
                </p>

                {/* Frase 2 */}
                <p style={{
                    ...fs(f2),
                    fontSize: 'clamp(22px, 3.5vw, 36px)',
                    fontWeight: 700,
                    color: '#FFFFFF',
                }}>
                    define quién eres en internet.
                </p>

                {/* Frase 3 — two lines, container animates as one */}
                <div style={{
                    ...fs(f3),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <span style={{
                        display: 'block',
                        fontSize: 'clamp(24px, 4vw, 48px)',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        lineHeight: 1.15,
                    }}>
                        {line1}
                    </span>
                    <span style={{
                        display: 'block',
                        fontSize: 'clamp(24px, 4vw, 48px)',
                        fontWeight: 900,
                        color: '#7C3AED',
                        lineHeight: 1.15,
                        textShadow: '0 0 40px rgba(124,58,237,0.8), 0 0 80px rgba(124,58,237,0.4)',
                        opacity: f3l2 ? 1 : 0,
                        transform: f3l2 ? 'translateY(0)' : 'translateY(14px)',
                        transition: 'opacity 0.85s ease, transform 0.85s ease',
                    }}>
                        que te representa de verdad.
                    </span>
                </div>
            </div>

            {/* ── Logo ─────────────────────────────────────────── */}
            <div style={{
                opacity: logo ? 1 : 0,
                transform: logo ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 1s ease, transform 1s ease',
                textAlign: 'center',
                marginTop: '8px',
                pointerEvents: 'none',
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #7ECECA, #5BB5B1)',
                    borderRadius: '14px',
                    padding: '10px 18px',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    color: '#000',
                    letterSpacing: '0.1em',
                    display: 'inline-block',
                    marginBottom: '12px',
                }}>
                    WRITI
                </div>
                <p style={{
                    color: 'rgba(255,255,255,0.38)',
                    fontSize: '0.88rem',
                    margin: 0,
                    fontWeight: 400,
                    letterSpacing: '0.02em',
                }}>
                    Tu sistema de contenido con IA
                </p>
            </div>

            {/* ── Skip button ──────────────────────────────────── */}
            <button
                onClick={finish}
                style={{
                    position: 'fixed',
                    bottom: '28px',
                    right: '28px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    padding: '8px 12px',
                    letterSpacing: '0.03em',
                    opacity: skipVisible ? 1 : 0,
                    transition: 'opacity 0.6s ease, color 0.2s',
                    pointerEvents: skipVisible && !leaving ? 'all' : 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
                Saltar →
            </button>
        </div>
    );
}

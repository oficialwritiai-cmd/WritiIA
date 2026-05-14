'use client';
import { useSession } from '@/app/components/SessionContext';
import { Loader2, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid loading all steps upfront
const SessionStep1Brain    = dynamic(() => import('./SessionStep1Brain'));
const SessionStep2Ideas    = dynamic(() => import('./SessionStep2Ideas'));
const SessionStep3Scripts  = dynamic(() => import('./SessionStep3Scripts'));
const SessionStep4Calendar = dynamic(() => import('./SessionStep4Calendar'));

const STEPS = [
    { n: 1, label: 'Cerebro IA', emoji: '🧠' },
    { n: 2, label: 'Ideas',      emoji: '💡' },
    { n: 3, label: 'Guiones',    emoji: '✍️' },
    { n: 4, label: 'Calendario', emoji: '📅' },
];

const STEP_MAP = {
    1: SessionStep1Brain,
    2: SessionStep2Ideas,
    3: SessionStep3Scripts,
    4: SessionStep4Calendar,
};

export default function SessionLayout() {
    const { state } = useSession();
    const { currentStep, loading, saving, status, error } = state;

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
                <Loader2 size={36} style={{ color: '#7ECECA', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#888', fontSize: '0.9rem' }}>Cargando tu sesión...</p>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                <p style={{ color: '#EF4444', marginBottom: '8px', fontWeight: 700 }}>Error al cargar la sesión</p>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '24px' }}>{error}</p>
                <a href="/dashboard/home" style={{ color: '#7ECECA', fontSize: '0.9rem' }}>← Volver al dashboard</a>
            </div>
        );
    }

    if (status === 'completed') {
        return (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🎉</div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>¡Sesión completada!</h2>
                <p style={{ color: '#888', maxWidth: '380px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                    Tu contenido está planificado y en el calendario. Ahora solo queda grabar.
                </p>
                <a href="/dashboard/calendar" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'var(--accent-gradient)', color: 'black',
                    padding: '14px 28px', borderRadius: '14px', fontWeight: 900,
                    textDecoration: 'none', fontSize: '1rem',
                }}>
                    Ver mi calendario →
                </a>
            </div>
        );
    }

    const ActiveStep = STEP_MAP[currentStep] || SessionStep1Brain;

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>

            {/* ── Header Matrix ───────────────────────────────── */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🔮</span>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Matrix</h1>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '100px', padding: '3px 10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Tu Cerebro IA · Activo
                    </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    El algoritmo que aprende de ti y genera contenido en tu voz.
                </p>
            </div>

            {/* ── Step indicators ─────────────────────────────── */}
            <div style={{ marginBottom: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
                    {STEPS.map(s => {
                        const isDone    = s.n < currentStep;
                        const isActive  = s.n === currentStep;
                        const isPending = s.n > currentStep;
                        return (
                            <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: isDone ? '1rem' : '0.85rem', fontWeight: 800,
                                    background: isDone ? '#7ECECA' : isActive ? 'rgba(126,206,202,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${isDone || isActive ? '#7ECECA' : 'rgba(255,255,255,0.1)'}`,
                                    color: isDone ? '#111' : isActive ? '#7ECECA' : '#555',
                                    transition: 'all 0.3s ease',
                                }}>
                                    {isDone ? '✓' : s.emoji}
                                </div>
                                <div style={{
                                    fontSize: '0.72rem', fontWeight: 700,
                                    color: isActive ? '#fff' : isPending ? '#444' : '#7ECECA',
                                    textTransform: 'uppercase', letterSpacing: '.04em',
                                }}>
                                    {s.label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Progress bar */}
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: '4px',
                        background: 'linear-gradient(90deg, #7ECECA, #4A9D9A)',
                        width: `${((currentStep - 1) / 3) * 100}%`,
                        transition: 'width 0.5s ease',
                    }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#555' }}>
                        Paso {currentStep} de 4
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#555' }}>
                        ~{[8, 5, 10, 5][currentStep - 1]} min restantes en este paso
                    </span>
                </div>
            </div>

            {/* ── Active step ──────────────────────────────────── */}
            <ActiveStep />

            {/* ── Auto-save indicator ──────────────────────────── */}
            {saving && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(0,0,0,0.85)', padding: '8px 16px',
                    borderRadius: '100px', fontSize: '0.8rem', color: '#7ECECA',
                    border: '1px solid rgba(126,206,202,0.2)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                }}>
                    <Save size={13} /> Guardando...
                </div>
            )}

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

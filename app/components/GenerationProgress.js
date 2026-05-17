'use client';
import { useState, useEffect } from 'react';
import { CheckCircle2, Zap, Brain, Sparkles, Clock } from 'lucide-react';

const TIPS = [
    'Los hooks en pregunta tienen 40% más retención',
    'Los primeros 3 segundos definen si te siguen viendo',
    'Los guiones con historia personal convierten 3× más',
    'Hablar de errores genera más conexión que los logros',
    'Los CTAs directos funcionan mejor que los genéricos',
];

export default function GenerationProgress({ steps, currentPhase, subtitle, brainName }) {
    const [tipIdx, setTipIdx] = useState(0);
    const [tipVisible, setTipVisible] = useState(true);

    useEffect(() => {
        const t = setInterval(() => {
            setTipVisible(false);
            setTimeout(() => { setTipIdx(i => (i + 1) % TIPS.length); setTipVisible(true); }, 300);
        }, 3500);
        return () => clearInterval(t);
    }, []);

    const isLastStep = currentPhase >= steps.length - 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '520px', gap: '40px', padding: '40px 24px' }}>

            {/* Brain badge */}
            {brainName && (
                <div style={{ padding: '10px 20px', background: 'rgba(124,58,237,0.12)', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <Brain size={15} color="#a78bfa" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa' }}>Cerebro IA activo: {brainName}</span>
                </div>
            )}

            {/* Animated icon */}
            <div style={{ position: 'relative', width: '88px', height: '88px' }}>
                <div style={{
                    width: '88px', height: '88px', borderRadius: '50%',
                    border: '3px solid rgba(124,58,237,0.15)',
                    borderTop: '3px solid #7c3aed',
                    animation: 'spinSlow 1.2s linear infinite',
                    position: 'absolute', top: 0, left: 0,
                }} />
                <div style={{
                    width: '66px', height: '66px', borderRadius: '50%',
                    border: '2px solid rgba(167,139,250,0.1)',
                    borderBottom: '2px solid #a78bfa',
                    animation: 'spinSlow 2s linear infinite reverse',
                    position: 'absolute', top: '11px', left: '11px',
                }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                    <Zap size={24} color="#a78bfa" fill="#a78bfa" style={{ animation: 'iconPulse 1.5s ease-in-out infinite' }} />
                </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                    Tu Cerebro IA está trabajando...
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                    {isLastStep ? 'Casi listo, unos segundos más…' : (subtitle || 'Esto suele tomar entre 15 y 30 segundos')}
                </p>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {steps.map((s, i) => {
                    const isActive    = i === currentPhase;
                    const isCompleted = i < currentPhase;
                    const isPending   = i > currentPhase;
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: isPending ? 0.25 : 1, transition: 'all 0.5s ease' }}>
                            <div style={{
                                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                background: isCompleted ? '#34d399' : isActive ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${isCompleted ? '#34d399' : isActive ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: isActive ? '0 0 14px rgba(124,58,237,0.4)' : 'none',
                                animation: isActive ? 'dotPulse 1.5s ease-in-out infinite' : 'none',
                                transition: 'all 0.4s',
                            }}>
                                {isCompleted
                                    ? <CheckCircle2 size={14} color="#fff" />
                                    : isActive
                                        ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed', animation: 'dotBlink 1s ease-in-out infinite' }} />
                                        : null
                                }
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : isCompleted ? 600 : 400, color: isCompleted ? '#34d399' : isActive ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'color 0.4s' }}>
                                {s}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Rotating tip */}
            <div style={{ padding: '12px 20px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '12px', maxWidth: '420px', width: '100%', opacity: tipVisible ? 1 : 0, transition: 'opacity 0.3s ease', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>💡 </span>
                    {TIPS[tipIdx]}
                </p>
            </div>

            <style>{`
                @keyframes spinSlow { to { transform: rotate(360deg); } }
                @keyframes iconPulse { 0%,100% { opacity:1; transform:translate(-50%,-50%) scale(1); } 50% { opacity:0.7; transform:translate(-50%,-50%) scale(0.9); } }
                @keyframes dotPulse { 0%,100% { box-shadow:0 0 8px rgba(124,58,237,0.3); } 50% { box-shadow:0 0 20px rgba(124,58,237,0.7); } }
                @keyframes dotBlink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
            `}</style>
        </div>
    );
}

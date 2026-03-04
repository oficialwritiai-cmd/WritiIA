'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';

/**
 * Reusable generation progress indicator with animated steps.
 * 
 * @param {Object} props
 * @param {string[]} props.steps - Array of step labels
 * @param {number} props.currentPhase - Index of the current active step (0-based)
 * @param {string} [props.subtitle] - Optional subtitle shown below the steps
 * @param {string} [props.brainName] - Optional brain profile name to show in badge
 */
export default function GenerationProgress({ steps, currentPhase, subtitle, brainName }) {
    const isLastStep = currentPhase >= steps.length - 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', gap: '48px' }}>
            {brainName && (
                <div style={{ padding: '12px 24px', background: 'rgba(126, 206, 202, 0.1)', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(126, 206, 202, 0.3)' }}>
                    <Sparkles size={16} color="#7ECECA" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#7ECECA' }}>Generando con tu Cerebro IA: {brainName}</span>
                </div>
            )}
            <div style={{ position: 'relative' }}>
                <div className="loading-spinner" style={{ width: '80px', height: '80px', borderTopColor: '#7ECECA', borderWidth: '4px' }}></div>
                <Sparkles style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#7ECECA' }} className="pulse" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '440px', padding: '32px', background: 'rgba(126, 206, 202, 0.03)', borderRadius: '24px', border: '1px solid rgba(126, 206, 202, 0.1)' }}>
                {steps.map((s, i) => {
                    const isActive = i === currentPhase;
                    const isCompleted = i < currentPhase;
                    const isPending = i > currentPhase;

                    return (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            opacity: isPending ? 0.2 : 1,
                            transition: '0.8s all ease',
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            color: isActive ? '#7ECECA' : 'white',
                            animation: isActive ? 'stepPulse 2s ease-in-out infinite' : 'none'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: '2px solid',
                                borderColor: isCompleted || isActive ? '#7ECECA' : 'rgba(255,255,255,0.2)',
                                background: isCompleted ? '#7ECECA' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isActive ? '0 0 15px rgba(126, 206, 202, 0.4)' : 'none',
                                animation: isActive ? 'dotPulse 1.5s ease-in-out infinite' : 'none'
                            }}>
                                {isCompleted ? <CheckCircle2 size={14} color="black" /> : null}
                            </div>
                            <span style={{
                                fontSize: '0.95rem',
                                fontWeight: isActive ? 800 : 500,
                                textShadow: isActive ? '0 0 10px rgba(126, 206, 202, 0.3)' : 'none'
                            }}>{s}</span>
                        </div>
                    );
                })}
            </div>
            <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                animation: isLastStep ? 'textPulse 2s ease-in-out infinite' : 'none'
            }}>
                {isLastStep
                    ? 'Casi listo, solo unos segundos más...'
                    : (subtitle || 'Esto suele tomar entre 15 y 30 segundos...')}
            </p>

            <style jsx>{`
                @keyframes stepPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                @keyframes dotPulse {
                    0%, 100% { box-shadow: 0 0 8px rgba(126, 206, 202, 0.3); }
                    50% { box-shadow: 0 0 20px rgba(126, 206, 202, 0.7); }
                }
                @keyframes textPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

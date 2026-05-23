'use client';
import { X } from 'lucide-react';

const VIDEO_URL = 'https://www.youtube.com/embed/C6MJRgDxbIY?rel=0&modestbranding=1';

export default function OnboardingVideoModal({ onClose, onConfirm }) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.82)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
                backdropFilter: 'blur(8px)',
                animation: 'obFadeIn 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#0D0D14',
                    borderRadius: '20px',
                    border: '1px solid rgba(124,58,237,0.25)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
                    width: '100%',
                    maxWidth: '860px',
                    overflow: 'hidden',
                    animation: 'obSlideUp 0.25s ease',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '28px 32px 22px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #7ECECA, #5BB5B1)',
                            borderRadius: '10px',
                            padding: '6px 11px',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            color: '#000',
                            letterSpacing: '0.08em',
                            flexShrink: 0,
                        }}>
                            WRITI
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0, fontSize: '1.3rem', fontWeight: 900,
                                color: '#fff', lineHeight: 1.2,
                            }}>
                                Antes de empezar, mira esto 👋
                            </h2>
                            <p style={{
                                margin: '5px 0 0', fontSize: '0.85rem',
                                color: 'rgba(255,255,255,0.42)', lineHeight: 1.4,
                            }}>
                                2 minutos que te ahorran 2 horas
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px', color: 'rgba(255,255,255,0.4)',
                            width: '32px', height: '32px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Video */}
                <div style={{ padding: '24px 32px', background: '#080810' }}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
                        <iframe
                            src={VIDEO_URL}
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            style={{
                                display: 'block',
                                width: '100%',
                                aspectRatio: '16/9',
                            }}
                            title="Tutorial de inicio — Writi.AI"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    gap: '12px', padding: '16px 32px 28px',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '10px', color: 'rgba(255,255,255,0.45)',
                            padding: '11px 20px', fontSize: '0.85rem',
                            fontWeight: 600, cursor: 'pointer',
                            transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    >
                        Ver más tarde
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                            border: 'none', borderRadius: '10px',
                            color: '#fff', padding: '11px 26px',
                            fontSize: '0.92rem', fontWeight: 800,
                            cursor: 'pointer', transition: 'opacity 0.15s',
                            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                        ✓ Entendido, empezar →
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes obFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes obSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}

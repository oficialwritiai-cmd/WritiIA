'use client';
import { X } from 'lucide-react';

const VIMEO_URL =
    'https://player.vimeo.com/video/1195009713?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0';

export default function OnboardingVideoModal({ onClose, onConfirm }) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 3000,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
                backdropFilter: 'blur(6px)',
                animation: 'obFadeIn 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#0a0a0f',
                    borderRadius: '16px',
                    border: '1px solid rgba(124,58,237,0.25)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
                    width: '100%',
                    maxWidth: '900px',
                    overflow: 'hidden',
                    animation: 'obSlideUp 0.25s ease',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '24px 28px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #7ECECA, #5BB5B1)',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            color: '#000',
                            letterSpacing: '0.08em',
                        }}>
                            WRITI
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0, fontSize: '1.25rem', fontWeight: 900,
                                color: '#fff', lineHeight: 1.2,
                            }}>
                                Bienvenido a Writi.AI 👋
                            </h2>
                            <p style={{
                                margin: '4px 0 0', fontSize: '0.82rem',
                                color: 'rgba(255,255,255,0.45)', lineHeight: 1.4,
                            }}>
                                Ve este video antes de empezar — te ahorra 2 horas de prueba y error
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px', color: 'rgba(255,255,255,0.4)',
                            width: '30px', height: '30px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'background 0.15s',
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Video */}
                <div style={{ padding: '20px 28px', background: '#06060a' }}>
                    <div style={{
                        position: 'relative', width: '100%', paddingBottom: '56.25%',
                        borderRadius: '10px', overflow: 'hidden',
                        border: '1px solid rgba(124,58,237,0.2)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                        <iframe
                            src={VIMEO_URL}
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: '100%',
                            }}
                            title="Tutorial de inicio — Writi.AI"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    gap: '12px', padding: '16px 28px 24px',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px', color: 'rgba(255,255,255,0.4)',
                            padding: '10px 18px', fontSize: '0.82rem',
                            fontWeight: 600, cursor: 'pointer',
                            transition: 'border-color 0.15s, color 0.15s',
                        }}
                    >
                        Ver después →
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                            border: 'none', borderRadius: '10px',
                            color: '#fff', padding: '10px 24px',
                            fontSize: '0.9rem', fontWeight: 800,
                            cursor: 'pointer', transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                        Entendido, empezar →
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes obFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes obSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}

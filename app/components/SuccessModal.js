import React from 'react';
import { CheckCircle, ExternalLink, X } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message, actionLabel, actionOnClick }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{
                background: '#111',
                border: '1px solid #333',
                borderRadius: '24px',
                padding: '40px',
                maxWidth: '450px',
                width: '90%',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(126, 206, 202, 0.15)',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                    }}
                >
                    <X size={24} />
                </button>

                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'rgba(126, 206, 202, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: '#7ECECA',
                }}>
                    <CheckCircle size={48} />
                </div>

                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '12px', color: '#fff' }}>
                    {title || '¡Buen trabajo!'}
                </h2>

                <p style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.6', marginBottom: '32px' }}>
                    {message || 'Tu contenido ha sido guardado correctamente.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={actionOnClick}
                        style={{
                            background: 'var(--accent-gradient)',
                            color: '#000',
                            border: 'none',
                            padding: '16px 24px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            transition: 'transform 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {actionLabel || 'Ver en Biblioteca'}
                        <ExternalLink size={18} />
                    </button>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            color: 'rgba(255, 255, 255, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '16px 24px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Continuar creando
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;

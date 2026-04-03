import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, onClose, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, isDangerous = false }) => {
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
                border: `1px solid ${isDangerous ? '#EF4444' : '#333'}`,
                borderRadius: '24px',
                padding: '40px',
                maxWidth: '450px',
                width: '90%',
                textAlign: 'center',
                position: 'relative',
                boxShadow: `0 25px 50px -12px rgba(${isDangerous ? '239, 68, 68' : '126, 206, 202'}, 0.15)`,
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
                    background: isDangerous ? 'rgba(239, 68, 68, 0.1)' : 'rgba(126, 206, 202, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: isDangerous ? '#EF4444' : '#7ECECA',
                }}>
                    <AlertCircle size={48} />
                </div>

                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                    color: 'white',
                }}>
                    {title}
                </h2>

                <p style={{
                    fontSize: '0.95rem',
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: '32px',
                    lineHeight: 1.6,
                }}>
                    {message}
                </p>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: '0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            background: isDangerous ? '#EF4444' : '#7ECECA',
                            border: 'none',
                            borderRadius: '12px',
                            color: isDangerous ? 'white' : '#000',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: '0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.target.style.opacity = '0.8';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.opacity = '1';
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;

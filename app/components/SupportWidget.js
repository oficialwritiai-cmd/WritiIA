'use client';

import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const SUPPORT_WHATSAPP_NUMBER = "34610859703";
const SUPPORT_WHATSAPP_MESSAGE = "Hola, necesito ayuda con WRITI.AI";

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);

    const handleWhatsAppClick = () => {
        const encodedMessage = encodeURIComponent(SUPPORT_WHATSAPP_MESSAGE);
        const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodedMessage}`;
        window.open(url, '_blank');
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Tooltip/Panel */}
            {isOpen && (
                <div style={{
                    width: '300px',
                    background: '#111',
                    border: '1px solid rgba(157, 0, 255, 0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(157, 0, 255, 0.1)',
                    overflow: 'hidden',
                    animation: 'slideUp 0.3s ease-out forwards',
                }}>
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, #9D00FF, #6E00B3)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>¿Necesitas ayuda?</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Soporte técnico y estratégico</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '20px', background: '#111' }}>
                        <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                            Escríbenos por WhatsApp y te ayudamos con tu estrategia de contenido o con cualquier duda de la app.
                        </p>

                        <button
                            onClick={handleWhatsAppClick}
                            style={{
                                width: '100%',
                                background: '#25D366',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '12px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'transform 0.2s ease, filter 0.2s ease'
                            }}
                            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                            onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
                        >
                            <Send size={18} />
                            Abrir WhatsApp
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: isOpen ? '#222' : 'linear-gradient(135deg, #9D00FF, #00F3FF)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </button>

            <style jsx>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

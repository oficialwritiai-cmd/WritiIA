'use client';

import { useState } from 'react';
import { Loader2, Zap, Star, ShieldCheck, X } from 'lucide-react';

export default function CreditsModal({ isOpen, onClose, balance, user }) {
    const [loading, setLoading] = useState(null);

    if (!isOpen) return null;

    const handleBuyCredits = async (packId) => {
        setLoading(packId);
        try {
            if (!user) {
                alert('Inicia sesión para continuar');
                return;
            }

            const res = await fetch('/api/stripe/credits/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pack: packId,
                    userId: user.id,
                    email: user.email
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Error al conectar con Stripe');
            }
        } catch (err) {
            console.error('Error al comprar créditos:', err);
            alert(err.message);
        } finally {
            setLoading(null);
        }
    };

    const packs = [
        { id: '100', name: 'Pack Básico', credits: 100, price: '19 €', icon: <Zap size={24} className="text-blue-400" /> },
        { id: '250', name: 'Pack Crecimiento', credits: 250, price: '39 €', icon: <Star size={24} className="text-yellow-400" />, popular: true },
        { id: '500', name: 'Pack Pro', credits: 500, price: '69 €', icon: <ShieldCheck size={24} className="text-green-400" /> }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>
                        Depositar <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Créditos</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Saldo actual: <strong style={{ color: 'white' }}>{balance} créditos</strong>
                    </p>
                </div>

                <div className="packs-grid">
                    {packs.map(pack => (
                        <div key={pack.id} className={`pack-card ${pack.popular ? 'popular' : ''}`}>
                            {pack.popular && <div className="popular-badge">MÁS POPULAR</div>}
                            <div className="pack-icon">{pack.icon}</div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{pack.name}</h3>
                            <div className="pack-credits">{pack.credits} <span>créditos</span></div>
                            <div className="pack-price">{pack.price}</div>
                            <button
                                onClick={() => handleBuyCredits(pack.id)}
                                disabled={loading === pack.id}
                                className={pack.popular ? "btn-primary" : "btn-secondary"}
                                style={{ width: '100%', padding: '12px' }}
                            >
                                {loading === pack.id ? <Loader2 className="animate-spin" size={20} /> : 'Comprar'}
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <p>Pago único • Sin suscripción • Los créditos no caducan</p>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: fadeIn 0.3s ease;
                }
                .modal-content {
                    background: #0A0A0A;
                    border: 1px solid var(--border);
                    border-radius: 32px;
                    width: 100%;
                    max-width: 900px;
                    padding: 48px;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    animation: slideUp 0.3s ease;
                }
                .close-btn {
                    position: absolute;
                    top: 24px;
                    right: 24px;
                    background: none;
                    border: none;
                    color: #555;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .close-btn:hover { color: white; transform: rotate(90deg); }
                .packs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                }
                .pack-card {
                    background: #111;
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 32px 24px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    transition: 0.3s ease;
                }
                .pack-card:hover { border-color: #444; transform: translateY(-4px); }
                .pack-card.popular {
                    border: 2px solid var(--accent);
                    background: #141414;
                    box-shadow: 0 0 30px rgba(126, 206, 202, 0.1);
                }
                .popular-badge {
                    position: absolute;
                    top: -12px;
                    background: var(--accent-gradient);
                    color: black;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    fontWeight: 900;
                }
                .pack-icon {
                    width: 56px;
                    height: 56px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                .pack-credits {
                    font-size: 2rem;
                    font-weight: 900;
                    color: var(--accent);
                    margin: 12px 0;
                }
                .pack-credits span { font-size: 0.9rem; color: var(--text-secondary); }
                .pack-price { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                @media (max-width: 640px) {
                    .modal-content { padding: 32px 20px; }
                    .packs-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}

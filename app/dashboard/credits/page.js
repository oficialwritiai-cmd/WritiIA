'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Zap, Star, ShieldCheck } from 'lucide-react';

export default function CreditsPage() {
    const [loading, setLoading] = useState(null);
    const [balance, setBalance] = useState(0);
    const [user, setUser] = useState(null);
    const router = useRouter();
    const supabase = createSupabaseClient();

    useEffect(() => {
        async function fetchBalance() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data } = await supabase
                    .from('users_profiles')
                    .select('credits_balance')
                    .eq('id', user.id)
                    .single();
                if (data) {
                    setBalance(data.credits_balance || 0);
                }
            }
        }
        fetchBalance();

        // Listen to URL params to show success message
        const urlParams = new URLSearchParams(window.location.search);
        const creditsPurchased = urlParams.get('credits_purchased');
        if (creditsPurchased) {
            alert(`¡Pago completado! En breves momentos se añadirán ${creditsPurchased} créditos a tu cuenta.`);
            router.replace('/dashboard/credits'); // clear url
        }
    }, [router, supabase]);

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
        { id: '100', name: 'Starter Pack', credits: 100, price: '19 €', icon: <Zap size={24} className="text-blue-400" /> },
        { id: '250', name: 'Growth Pack', credits: 250, price: '39 €', icon: <Star size={24} className="text-yellow-400" />, popular: true },
        { id: '500', name: 'Pro Pack', credits: 500, price: '69 €', icon: <ShieldCheck size={24} className="text-green-400" /> }
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.02em' }}>
                    Recarga tus <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Créditos IA</span>
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                    Tu saldo actual:{' '}
                    <strong style={{ color: 'white', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
                        {balance} créditos
                    </strong>
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
                {packs.map(pack => (
                    <div key={pack.id} style={{
                        background: 'var(--bg-card)',
                        border: pack.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '24px',
                        padding: '32px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        boxShadow: pack.popular ? '0 0 30px rgba(126, 206, 202, 0.15)' : 'none',
                        transition: 'transform 0.3s ease',
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {pack.popular && (
                            <div style={{
                                position: 'absolute', top: '-12px', background: 'var(--accent-gradient)', color: 'black',
                                padding: '4px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 900
                            }}>
                                MÁS POPULAR
                            </div>
                        )}
                        <div style={{
                            background: 'rgba(255,255,255,0.05)', width: '64px', height: '64px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
                        }}>
                            {pack.icon}
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>{pack.name}</h2>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '24px', color: 'var(--accent)' }}>
                            {pack.credits} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>créditos</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '32px' }}>
                            {pack.price}
                        </div>
                        <button
                            onClick={() => handleBuyCredits(pack.id)}
                            disabled={loading === pack.id}
                            className={pack.popular ? "btn-primary" : "btn-secondary"}
                            style={{
                                width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {loading === pack.id ? <Loader2 className="animate-spin" size={20} /> : 'Comprar ahora'}
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <p>Pago único, sin suscripciones ocultas. Los créditos no caducan.</p>
                <p>Protegido por pagos 100% seguros mediante Stripe.</p>
            </div>
        </div>
    );
}

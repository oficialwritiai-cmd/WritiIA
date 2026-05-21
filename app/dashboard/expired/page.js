'use client';

import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Rocket, Key, Loader2 } from 'lucide-react';

export default function TrialExpiredPage() {
    const supabase = createSupabaseClient();
    const router = useRouter();
    const [isNewUser, setIsNewUser] = useState(false);
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');

    useEffect(() => {
        async function checkProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            setUserEmail(user.email);

            const { data: profile } = await supabase
                .from('users_profiles')
                .select('subscription_status, trial_started_at')
                .eq('id', user.id)
                .single();

            if (profile?.subscription_status === 'pending' && !profile?.trial_started_at) {
                setIsNewUser(true);
            }
        }
        checkProfile();
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    async function handlePay() {
        if (!userId || !userEmail) return;
        setPaying(true);
        setPayError('');
        try {
            const res = await fetch('/api/stripe/checkout-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email: userEmail }),
            });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.error || 'Error al generar el pago');
            window.location.href = data.url;
        } catch (err) {
            setPayError(err.message);
            setPaying(false);
        }
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', padding: '20px', color: 'white' }}>
            <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(126, 206, 202, 0.2), rgba(91, 181, 177, 0.1))', boxShadow: '0 0 20px rgba(126, 206, 202, 0.2)' }}>
                    {isNewUser ? <Key size={40} color="#7ECECA" /> : <Rocket size={40} color="#7ECECA" />}
                </div>

                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', background: 'linear-gradient(135deg, #FFF, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isNewUser ? 'Activa tu acceso' : 'Tu periodo de acceso ha terminado'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '40px', lineHeight: '1.6', fontSize: '1rem' }}>
                    {isNewUser
                        ? <>Para usar <strong style={{ color: '#7ECECA' }}>Writi AI</strong> activa el Plan Pro. Sin permanencias, cancela cuando quieras.</>
                        : <>Tu acceso se ha pausado, pero tu contenido sigue a salvo. Activa el Plan Pro para continuar creando.</>
                    }
                </p>

                {payError && (
                    <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>{payError}</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                        onClick={handlePay}
                        disabled={paying || !userId}
                        style={{
                            height: '64px',
                            fontSize: '1.1rem',
                            fontWeight: 900,
                            width: '100%',
                            background: paying ? 'rgba(126,206,202,0.5)' : 'linear-gradient(135deg, #7ECECA, #5BB5B1)',
                            color: 'black',
                            border: 'none',
                            borderRadius: '16px',
                            cursor: paying ? 'not-allowed' : 'pointer',
                            boxShadow: '0 10px 30px rgba(126, 206, 202, 0.3)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                        }}
                        onMouseOver={e => { if (!paying) e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {paying
                            ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Redirigiendo al pago...</>
                            : 'Activar Plan Pro →'
                        }
                    </button>

                    <button
                        onClick={handleLogout}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', padding: '12px', borderRadius: '12px', transition: '0.2s' }}
                    >
                        <LogOut size={16} /> Cerrar sesión
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

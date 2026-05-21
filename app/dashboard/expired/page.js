'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { LogOut, Loader2 } from 'lucide-react';

export default function TrialExpiredPage() {
    const router = useRouter();
    const supabase = createSupabaseClient();
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    async function handlePay() {
        setPaying(true);
        setPayError('');
        try {
            // El API lee la sesión desde cookies — no necesita userId del cliente
            const res = await fetch('/api/stripe/checkout-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.error || 'Error al conectar con el sistema de pago');
            window.location.href = data.url;
        } catch (err) {
            setPayError(err.message);
            setPaying(false);
        }
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', padding: '20px', color: 'white' }}>
            <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>

                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>

                <h1 style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: '14px', background: 'linear-gradient(135deg, #FFF, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Activa tu acceso
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px', lineHeight: '1.6', fontSize: '1rem' }}>
                    Para usar <strong style={{ color: '#7ECECA' }}>Writi AI</strong> necesitas el Plan Pro. Sin permanencias — cancela cuando quieras.
                    <br /><br />
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
                        Si iniciaste sesión con Google, <strong style={{ color: 'rgba(255,255,255,0.5)' }}>cierra sesión y regístrate con email y contraseña</strong> para poder pagar directamente.
                    </span>
                </p>

                {payError && (
                    <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#f87171', textAlign: 'left' }}>
                        <strong>Error:</strong> {payError}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <button
                        onClick={handlePay}
                        disabled={paying}
                        style={{
                            height: '60px', fontSize: '1.05rem', fontWeight: 900, width: '100%',
                            background: paying ? 'rgba(126,206,202,0.5)' : 'linear-gradient(135deg, #7ECECA, #5BB5B1)',
                            color: 'black', border: 'none', borderRadius: '14px',
                            cursor: paying ? 'not-allowed' : 'pointer',
                            boxShadow: paying ? 'none' : '0 10px 30px rgba(126,206,202,0.3)',
                            transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        }}
                    >
                        {paying
                            ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Conectando con el pago...</>
                            : 'Activar Plan Pro →'
                        }
                    </button>

                    <button
                        onClick={handleLogout}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', padding: '12px', borderRadius: '10px' }}
                    >
                        <LogOut size={15} /> Cerrar sesión
                    </button>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function UpdatePasswordPage() {
    const [password, setPassword]       = useState('');
    const [confirm, setConfirm]         = useState('');
    const [showPw, setShowPw]           = useState(false);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');
    const [success, setSuccess]         = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();
    const supabase = createSupabaseClient();

    // Supabase injects the recovery session from the URL hash automatically
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) { setSessionReady(true); return; }
            // Wait for onAuthStateChange to fire (Supabase reads the hash)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                    setSessionReady(true);
                    subscription.unsubscribe();
                }
            });
            // If no session after 4s, redirect to login
            setTimeout(() => {
                subscription.unsubscribe();
                if (!sessionReady) router.push('/login');
            }, 4000);
        };
        checkSession();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
        setLoading(true); setError('');
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => router.push('/dashboard/home'), 2500);
        } catch (err) {
            setError(err.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    }

    const inputStyle = {
        width: '100%', height: '48px', background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
        padding: '0 44px 0 16px', color: '#fff', fontSize: '0.9rem',
        outline: 'none', boxSizing: 'border-box',
    };

    return (
        <main style={{ minHeight: '100vh', background: '#0c0c0e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <span style={{ fontSize: '1.4rem' }}>W</span>
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                        Nueva contraseña
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                        Elige una contraseña segura para tu cuenta
                    </p>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '20px' }}>
                        <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>¡Contraseña actualizada!</h2>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Redirigiendo al dashboard…</p>
                    </div>
                ) : !sessionReady ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Loader2 size={32} color="#a78bfa" style={{ animation: 'spin 1s linear infinite' }} />
                        <p>Verificando enlace de recuperación…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px' }}>Nueva contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <button type="button" onClick={() => setShowPw(p => !p)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px' }}>Confirmar contraseña</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Repite la contraseña"
                                required
                                style={{ ...inputStyle, paddingRight: '16px', borderColor: confirm && confirm !== password ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                                onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {error && (
                            <p style={{ fontSize: '0.82rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '10px 14px', margin: 0 }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading || !password || !confirm}
                            style={{ width: '100%', height: '50px', background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', marginTop: '4px' }}>
                            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Actualizando…</> : 'Actualizar contraseña'}
                        </button>
                    </form>
                )}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </main>
    );
}

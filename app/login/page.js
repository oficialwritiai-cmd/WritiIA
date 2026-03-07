'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot_password'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mounted, setMounted] = useState(false);

    const router = useRouter();
    const supabase = createSupabaseClient();

    useEffect(() => {
        setMounted(true);
        const params = new URLSearchParams(window.location.search);
        const initialMode = params.get('mode');
        if (['register', 'login', 'forgot_password'].includes(initialMode)) {
            setMode(initialMode);
        }
    }, []);

    async function handleResetPassword(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/dashboard/settings`,
            });

            if (error) throw error;
            setSuccess('Se ha enviado un enlace de recuperación a tu email.');
        } catch (err) {
            setError(err.message || 'Error al enviar el email de recuperación.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (mode === 'register') {
                // Check access key if provided
                const hasAccessKey = accessKey.trim().length > 0;
                const isMasterKey = hasAccessKey && accessKey.trim() === process.env.NEXT_PUBLIC_MASTER_KEY;
                let keyData = null;

                if (hasAccessKey && !isMasterKey) {
                    const { data, error: keyQueryError } = await supabase
                        .from('access_keys')
                        .select('*')
                        .eq('key_code', accessKey.trim())
                        .single();

                    if (keyQueryError || !data) throw new Error('Esta llave no es válida.');
                    if (data.is_used) throw new Error('Esta llave ya ha sido utilizada.');
                    keyData = data;
                }

                // Sign Up
                const { error: signUpError, data: { user } } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: email.split('@')[0] },
                        emailRedirectTo: `${window.location.origin}/dashboard`
                    }
                });

                if (signUpError) {
                    if (signUpError.message.includes('already registered')) {
                        if (isMasterKey) {
                            setError('Este email ya existe. Intenta iniciar sesión con tu contraseña.');
                            setMode('login');
                            setLoading(false);
                            return;
                        }
                        throw new Error('Este email ya está registrado.');
                    }
                    throw signUpError;
                }

                if (user) {
                    const now = new Date();
                    const trialEnds = new Date();
                    trialEnds.setDate(now.getDate() + 7);

                    // New Logic: 
                    // No key -> plan: 'pending', is_trial_active: false
                    // Key -> plan: 'trial', is_trial_active: true
                    const isTrialActive = hasAccessKey;
                    const plan = isMasterKey ? 'pro' : (hasAccessKey ? 'trial' : 'pending');

                    await supabase.from('users_profiles').upsert({
                        id: user.id,
                        email: user.email,
                        name: email.split('@')[0],
                        plan: plan,
                        is_admin: isMasterKey ? true : false,
                        trial_started_at: isTrialActive ? now.toISOString() : null,
                        trial_ends_at: isTrialActive ? trialEnds.toISOString() : null,
                        is_trial_active: isTrialActive,
                        created_at: now.toISOString()
                    });

                    if (!isMasterKey && keyData) {
                        await supabase.from('access_keys').update({
                            is_used: true,
                            used_by_user_id: user.id,
                            used_at: now.toISOString()
                        }).eq('id', keyData.id);
                    }

                    if (plan === 'pending') {
                        try {
                            const resp = await fetch('/api/stripe/checkout-plan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, email: user.email }),
                            });
                            const data = await resp.json();
                            if (data.url) {
                                window.location.href = data.url;
                                return;
                            }
                        } catch (err) {
                            console.error('Checkout error:', err);
                        }
                    }
                }
                router.push('/dashboard');
            } else {
                const { error: signInError, data: { user: signedInUser } } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) throw new Error('Email o contraseña incorrectos.');
                    if (signInError.message.includes('Email not confirmed')) throw new Error('Por favor verifica tu email primero.');
                    throw signInError;
                }

                if (process.env.NEXT_PUBLIC_MASTER_KEY && accessKey.trim() === process.env.NEXT_PUBLIC_MASTER_KEY) {
                    await supabase.from('users_profiles').update({
                        plan: 'pro',
                        is_admin: true
                    }).eq('id', signedInUser.id);
                }

                router.push('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Error de autenticación.');
        } finally {
            setLoading(false);
        }
    }

    if (!mounted) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)', padding: '20px' }}>
            <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>
                        <span style={{ color: 'var(--accent)' }}>W</span>RITI.AI
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        {mode === 'login' ? 'Bienvenido al futuro del contenido' :
                            mode === 'register' ? 'Regístrate y empieza a crear' :
                                'Recuperar acceso a tu cuenta'}
                    </p>
                </div>

                {mode !== 'forgot_password' && (
                    <div style={{ display: 'flex', background: 'var(--bg-sidebar)', borderRadius: 'var(--radius-md)', padding: '6px', marginBottom: '32px', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                            className={mode === 'login' ? 'btn-primary' : 'btn-secondary'}
                            style={{ flex: 1, padding: '12px', border: 'none', background: mode === 'login' ? 'var(--accent-gradient)' : 'transparent' }}
                        >
                            ACCEDER
                        </button>
                        <button
                            onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                            className={mode === 'register' ? 'btn-primary' : 'btn-secondary'}
                            style={{ flex: 1, padding: '12px', border: 'none', background: mode === 'register' ? 'var(--accent-gradient)' : 'transparent' }}
                        >
                            REGISTRO
                        </button>
                    </div>
                )}

                {mode === 'forgot_password' ? (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <span className="script-label">Email de tu cuenta</span>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className="btn-secondary"
                            style={{ background: 'transparent', border: 'none', fontSize: '0.85rem' }}
                        >
                            ← Volver al inicio
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {mode === 'register' && (
                            <div>
                                <span className="script-label">Llave Beta (Opcional)</span>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Si tienes una llave, obtendrás 7 días gratis"
                                    value={accessKey}
                                    onChange={(e) => setAccessKey(e.target.value)}
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    Si no tienes llave, podrás registrarte y adquirir un plan para empezar.
                                </p>
                            </div>
                        )}
                        <div>
                            <span className="script-label">Email</span>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span className="script-label" style={{ marginBottom: 0 }}>Contraseña</span>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('forgot_password')}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar al Escritorio' : 'Crear mi cuenta'}
                        </button>
                    </form>
                )}

                {error && <div className="error-message" style={{ textAlign: 'center', marginTop: '20px' }}>{error}</div>}
                {success && <div className="success-message" style={{ textAlign: 'center', marginTop: '20px', color: 'var(--accent)' }}>{success}</div>}
            </div>
        </div>
    );
}

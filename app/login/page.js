'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    const router = useRouter();
    const supabase = createSupabaseClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'register') {
                if (!accessKey.trim()) throw new Error('Se requiere una llave de acceso para el registro.');

                // 1. Validar la llave de acceso
                const { data: keyData, error: keyQueryError } = await supabase
                    .from('access_keys')
                    .select('*')
                    .eq('key_code', accessKey.trim())
                    .single();

                if (keyQueryError || !keyData) {
                    throw new Error('Esta llave no es válida.');
                }

                if (keyData.is_used) {
                    throw new Error('Esta llave ya ha sido utilizada.');
                }

                // 2. Crear el usuario
                const { error: signUpError, data: { user } } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0],
                        }
                    }
                });

                if (signUpError) {
                    if (signUpError.message.includes('already registered')) throw new Error('Este email ya está registrado.');
                    throw signUpError;
                }

                if (user) {
                    const now = new Date();
                    const trialEnds = new Date();
                    trialEnds.setDate(now.getDate() + 7);

                    // 3. Crear perfil con periodo de prueba
                    const { error: profileError } = await supabase.from('users_profiles').upsert({
                        id: user.id,
                        email: user.email,
                        name: email.split('@')[0],
                        plan: 'trial',
                        trial_started_at: now.toISOString(),
                        trial_ends_at: trialEnds.toISOString(),
                        is_trial_active: true,
                        created_at: now.toISOString()
                    });

                    if (profileError) console.error('Error creating profile:', profileError);

                    // 4. Marcar llave como utilizada
                    await supabase.from('access_keys').update({
                        is_used: true,
                        used_by_user_id: user.id,
                        used_at: now.toISOString()
                    }).eq('id', keyData.id);
                }

                router.push('/dashboard');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        throw new Error('Email o contraseña incorrectos.');
                    }
                    if (signInError.message.includes('Email not confirmed')) {
                        throw new Error('Por favor verifica tu email primero.');
                    }
                    throw signInError;
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
                        {mode === 'login' ? 'Bienvenido al futuro del contenido' : 'Exclusivo para usuarios con llave beta'}
                    </p>
                </div>

                <div style={{ display: 'flex', background: 'var(--bg-sidebar)', borderRadius: 'var(--radius-md)', padding: '6px', marginBottom: '32px', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        className={mode === 'login' ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1, padding: '12px', border: 'none', background: mode === 'login' ? 'var(--accent-gradient)' : 'transparent' }}
                    >
                        ACCEDER
                    </button>
                    <button
                        onClick={() => { setMode('register'); setError(''); }}
                        className={mode === 'register' ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1, padding: '12px', border: 'none', background: mode === 'register' ? 'var(--accent-gradient)' : 'transparent' }}
                    >
                        REGISTRO
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {mode === 'register' && (
                        <div>
                            <span className="script-label">Llave de acceso a la beta</span>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Introduce tu llave especial"
                                value={accessKey}
                                onChange={(e) => setAccessKey(e.target.value)}
                                required
                            />
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
                        <span className="script-label">Contraseña</span>
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
                        {loading ? 'Procesando...' : mode === 'login' ? 'Entrar al Escritorio' : 'Poner en Marcha WRITI.AI'}
                    </button>
                </form>

                {error && <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>}
            </div>
        </div>
    );
}

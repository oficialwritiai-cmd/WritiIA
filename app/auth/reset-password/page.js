'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!password || !confirmPassword) {
                throw new Error('Ambos campos son obligatorios');
            }

            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err) {
            setError(err.message || 'Error al restablecer contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px', textAlign: 'center' }}>🔐 Restablecer Contraseña</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '30px', fontSize: '0.9rem' }}>Crea una nueva contraseña para tu cuenta</p>

                {success ? (
                    <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', color: '#10B981', textAlign: 'center', fontWeight: 600 }}>
                        ✅ Contraseña restablecida exitosamente. Redirigiendo...
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Nueva Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: '0.2s',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirma tu nueva contraseña"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: '0.2s',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: loading ? 'rgba(126, 206, 202, 0.5)' : 'var(--accent-gradient)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: '0.2s',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Procesando...' : 'Restablecer Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

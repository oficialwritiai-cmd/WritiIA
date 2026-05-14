'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Eye, EyeOff, ArrowLeft, Check, Sparkles } from 'lucide-react';

/* ─── Video URL ─────────────────────────────────────── */
const HERO_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4';

/* ─── Step item component ───────────────────────────── */
function StepItem({ number, text, active, done }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
            border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
            borderRadius: '12px', padding: '10px 14px',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
        }}>
            <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700,
                background: done ? 'rgba(52,211,153,0.8)' : active ? '#fff' : 'rgba(255,255,255,0.12)',
                color: done ? '#fff' : active ? '#000' : 'rgba(255,255,255,0.4)',
            }}>
                {done ? <Check size={13} strokeWidth={3} /> : number}
            </div>
            <span style={{
                fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
            }}>
                {text}
            </span>
        </div>
    );
}

/* ─── Input component ───────────────────────────────── */
function InputField({ label, type = 'text', placeholder, value, onChange, required, helper, showToggle, onToggle, showPassword }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    type={showToggle ? (showPassword ? 'text' : 'password') : type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    style={{
                        width: '100%', height: '44px', background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', padding: '0 16px',
                        paddingRight: showToggle ? '44px' : '16px',
                        color: '#fff', fontSize: '0.88rem',
                        outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s ease',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                {showToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
                            padding: '4px',
                        }}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
            {helper && <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{helper}</p>}
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function LoginPage() {
    const [mode, setMode]               = useState('login'); // 'login' | 'register' | 'forgot_password'
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [accessKey, setAccessKey]     = useState('');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');
    const [success, setSuccess]         = useState('');
    const [mounted, setMounted]         = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router   = useRouter();
    const supabase = createSupabaseClient();

    useEffect(() => {
        setMounted(true);
        const params = new URLSearchParams(window.location.search);
        const initialMode = params.get('mode');
        if (['register', 'login', 'forgot_password'].includes(initialMode)) setMode(initialMode);
        const err = params.get('error');
        if (err) setError(err);
    }, []);

    const handleGoBack = () => router.push('/');

    const handleLogoClick = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        router.push(session ? '/dashboard/home' : '/');
    };

    async function handleResetPassword(e) {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/dashboard/settings`,
            });
            if (error) throw error;
            setSuccess('¡Enlace enviado! Revisa tu email para recuperar el acceso.');
        } catch (err) {
            setError(err.message || 'Error al enviar el email de recuperación.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');
        try {
            if (mode === 'register') {
                const hasAccessKey = accessKey.trim().length > 0;
                const isMasterKey  = hasAccessKey && accessKey.trim() === process.env.NEXT_PUBLIC_MASTER_KEY;
                let keyData = null;

                if (hasAccessKey && !isMasterKey) {
                    const { data, error: keyQueryError } = await supabase
                        .from('access_keys').select('*').eq('key_code', accessKey.trim()).single();
                    if (keyQueryError || !data) throw new Error('Esta llave no es válida.');
                    if (data.is_used) throw new Error('Esta llave ya ha sido utilizada.');
                    keyData = data;
                }

                if (!hasAccessKey) {
                    const res = await fetch('/api/auth/register-pending', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Error al preparar registro');
                    if (data.url) { window.location.href = data.url; return; }
                }

                const { error: signUpError, data: { user, session } } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { full_name: email.split('@')[0] }, emailRedirectTo: `${window.location.origin}/dashboard` }
                });

                if (signUpError) {
                    if (signUpError.message.includes('already registered')) {
                        if (isMasterKey) { setError('Este email ya existe. Inicia sesión.'); setMode('login'); setLoading(false); return; }
                        throw new Error('Este email ya está registrado.');
                    }
                    throw signUpError;
                }

                if (user && !user.email_confirmed_at) {
                    setSuccess('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.');
                    setMode('login'); setLoading(false); return;
                }

                if (user) {
                    const now = new Date();
                    const trialEnds = new Date(); trialEnds.setDate(now.getDate() + 7);
                    const isTrialActive = hasAccessKey;
                    const plan = isMasterKey ? 'pro' : (hasAccessKey ? 'trial' : 'pending');

                    await supabase.from('users_profiles').upsert({
                        id: user.id, email: user.email, name: email.split('@')[0],
                        plan, is_admin: isMasterKey,
                        trial_started_at: isTrialActive ? now.toISOString() : null,
                        trial_ends_at: isTrialActive ? trialEnds.toISOString() : null,
                        trial_active: isTrialActive, credits_balance: 250,
                        subscription_status: isTrialActive ? 'trial' : 'pending',
                        created_at: now.toISOString()
                    });

                    if (!isMasterKey && keyData) {
                        await supabase.from('access_keys').update({
                            is_used: true, used_by_user_id: user.id, used_at: now.toISOString()
                        }).eq('id', keyData.id);
                        try {
                            await fetch('/api/auth/trial-welcome', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id })
                            });
                        } catch (err) { console.error('[Registration] trial email error:', err); }
                    }
                }

                if (!session && !isMasterKey && hasAccessKey) {
                    setSuccess('¡Registro exitoso! Revisa tu email para confirmar y activar tu acceso.');
                    setMode('login'); setLoading(false); return;
                }

                router.push('/dashboard/home');
            } else {
                const { error: signInError, data: { user: signedInUser } } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) throw new Error('Email o contraseña incorrectos.');
                    if (signInError.message.includes('Email not confirmed')) throw new Error('Por favor verifica tu email primero.');
                    throw signInError;
                }
                if (signedInUser && !signedInUser.email_confirmed_at) {
                    try { await supabase.auth.resendEmailConfirmationEmail({ email: signedInUser.email }); } catch {}
                    throw new Error('Email no confirmado. Te hemos reenviado el enlace de confirmación.');
                }
                if (process.env.NEXT_PUBLIC_MASTER_KEY && accessKey.trim() === process.env.NEXT_PUBLIC_MASTER_KEY) {
                    await supabase.from('users_profiles').update({ plan: 'pro', is_admin: true }).eq('id', signedInUser.id);
                }
                router.push('/dashboard/home');
            }
        } catch (err) {
            setError(err.message || 'Error de autenticación.');
        } finally {
            setLoading(false);
        }
    }

    const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

    const leftSteps = mode === 'register'
        ? [
            { text: 'Crea tu cuenta', active: true,  done: false },
            { text: 'Configura tu proyecto', active: false, done: false },
            { text: 'Activa tu acceso', active: false, done: false },
          ]
        : mode === 'forgot_password'
        ? [
            { text: 'Introduce tu email', active: true,  done: false },
            { text: 'Revisa tu bandeja',  active: false, done: false },
            { text: 'Restablece tu clave', active: false, done: false },
          ]
        : [
            { text: 'Introduce tus datos', active: true, done: false },
            { text: 'Accede al dashboard', active: false, done: false },
            { text: 'Crea contenido', active: false, done: false },
          ];

    if (!mounted) return null;

    return (
        <main style={{
            display: 'flex', minHeight: '100vh', width: '100%',
            background: '#000', padding: '8px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>

            {/* ── LEFT COLUMN (hero video) ─────────────────────── */}
            <div style={{
                width: '52%', position: 'relative',
                borderRadius: '24px', overflow: 'hidden',
                display: 'none', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-end',
                paddingBottom: '48px', paddingLeft: '40px', paddingRight: '40px',
            }} className="login-left">
                {/* Video background */}
                <video
                    autoPlay muted loop playsInline
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                >
                    <source src={HERO_VIDEO} type="video/mp4" />
                </video>

                {/* Content over video */}
                <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={16} color="#000" />
                        </div>
                        <span
                            onClick={handleLogoClick}
                            style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', cursor: 'pointer', letterSpacing: '-0.02em' }}
                        >
                            WRITI.AI
                        </span>
                    </div>

                    {/* Heading */}
                    <div>
                        <h1 style={{ fontSize: '2.1rem', fontWeight: 600, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '10px' }}>
                            {mode === 'login' ? 'Bienvenido de nuevo' : mode === 'register' ? 'Únete a WRITI' : 'Recupera tu acceso'}
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                            {mode === 'login'
                                ? 'Tu sistema de contenido te está esperando. Entra y sigue creando.'
                                : mode === 'register'
                                ? 'Sigue estos 3 pasos rápidos para activar tu espacio de contenido.'
                                : 'Te enviamos un enlace para que puedas volver a acceder a tu cuenta.'}
                        </p>
                    </div>

                    {/* Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {leftSteps.map((s, i) => (
                            <StepItem key={i} number={i + 1} text={s.text} active={s.active} done={s.done} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── RIGHT COLUMN (form) ─────────────────────────── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '48px 24px', overflowY: 'auto',
                position: 'relative',
            }}>
                {/* Back button */}
                <button
                    onClick={handleGoBack}
                    style={{
                        position: 'absolute', top: '24px', left: '24px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', borderRadius: '10px',
                        padding: '8px 14px', fontSize: '0.8rem', fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                    <ArrowLeft size={14} /> Volver
                </button>

                <div style={{ width: '100%', maxWidth: '420px' }}>

                    {/* Logo (mobile only) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }} className="mobile-logo">
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={14} color="#000" />
                        </div>
                        <span onClick={handleLogoClick} style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', cursor: 'pointer', letterSpacing: '-0.02em' }}>
                            WRITI.AI
                        </span>
                    </div>

                    {/* Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '1.7rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px', lineHeight: 1.2 }}>
                            {mode === 'login' ? 'Accede a tu espacio' : mode === 'register' ? 'Crea tu perfil' : 'Recuperar acceso'}
                        </h2>
                        <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.35)' }}>
                            {mode === 'login' ? 'Introduce tus datos para entrar al dashboard.' : mode === 'register' ? 'Rellena los datos básicos para empezar.' : 'Te enviaremos un enlace de recuperación.'}
                        </p>
                    </div>

                    {/* Mode toggle tabs */}
                    {mode !== 'forgot_password' && (
                        <div style={{
                            display: 'flex', background: '#111', borderRadius: '12px',
                            padding: '4px', marginBottom: '28px',
                            border: '1px solid rgba(255,255,255,0.07)',
                        }}>
                            {[['login', 'Iniciar sesión'], ['register', 'Registrarse']].map(([m, label]) => (
                                <button
                                    key={m}
                                    onClick={() => switchMode(m)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '9px',
                                        background: mode === m ? '#fff' : 'transparent',
                                        color: mode === m ? '#000' : 'rgba(255,255,255,0.4)',
                                        border: 'none', fontSize: '0.82rem', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* FORGOT PASSWORD form */}
                    {mode === 'forgot_password' ? (
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <InputField
                                label="Email de tu cuenta"
                                type="email"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', height: '48px',
                                    background: loading ? 'rgba(255,255,255,0.6)' : '#fff',
                                    color: '#000', border: 'none', borderRadius: '12px',
                                    fontSize: '0.88rem', fontWeight: 700,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    marginTop: '8px',
                                }}
                            >
                                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                            </button>
                            <button
                                type="button" onClick={() => switchMode('login')}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                            >
                                ← Volver al inicio de sesión
                            </button>
                        </form>
                    ) : (
                        /* LOGIN / REGISTER form */
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Access key (register only) */}
                            {mode === 'register' && (
                                <InputField
                                    label="Llave Beta (Opcional)"
                                    placeholder="Si tienes una llave, obtendrás acceso inmediato"
                                    value={accessKey}
                                    onChange={e => setAccessKey(e.target.value)}
                                    helper="Sin llave, podrás comprar un plan para empezar."
                                />
                            )}

                            {/* Email */}
                            <InputField
                                label="Email"
                                type="email"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />

                            {/* Password */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Contraseña</label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => switchMode('forgot_password')}
                                            style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.85)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        style={{
                                            width: '100%', height: '44px', background: '#1a1a1a',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '12px', padding: '0 44px 0 16px',
                                            color: '#fff', fontSize: '0.88rem', outline: 'none',
                                            boxSizing: 'border-box', transition: 'border-color 0.2s ease',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        style={{
                                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {mode === 'register' && (
                                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                        Mínimo 6 caracteres
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', height: '48px',
                                    background: loading ? 'rgba(255,255,255,0.7)' : '#fff',
                                    color: '#000', border: 'none', borderRadius: '12px',
                                    fontSize: '0.88rem', fontWeight: 700,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease', marginTop: '6px',
                                }}
                                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#fff'; }}
                            >
                                {loading ? 'Procesando…' : mode === 'login' ? 'Entrar al Dashboard' : 'Crear mi cuenta'}
                            </button>

                            {/* Footer link */}
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                                {mode === 'login' ? (
                                    <>¿No tienes cuenta?{' '}
                                        <button type="button" onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.9)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                                            Regístrate
                                        </button>
                                    </>
                                ) : (
                                    <>¿Ya tienes cuenta?{' '}
                                        <button type="button" onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', color: 'rgba(167,139,250,0.9)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                                            Inicia sesión
                                        </button>
                                    </>
                                )}
                            </p>
                        </form>
                    )}

                    {/* Error / Success */}
                    {error && (
                        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', fontSize: '0.82rem', color: '#f87171', lineHeight: 1.5 }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '10px', fontSize: '0.82rem', color: '#34d399', lineHeight: 1.5 }}>
                            {success}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Responsive ─────────────────────────────────── */}
            <style>{`
                @media (min-width: 1024px) {
                    .login-left { display: flex !important; }
                    .mobile-logo { display: none !important; }
                    main { padding: 16px; height: 100vh; overflow: hidden; }
                }
                input::placeholder { color: rgba(255,255,255,0.2); }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0px 1000px #1a1a1a inset;
                    -webkit-text-fill-color: #fff;
                    caret-color: #fff;
                }
            `}</style>
        </main>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Rocket, Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

const TONOS = ['Profesional', 'Cercano', 'Inspiracional', 'Directo', 'Divertido'];

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [brandName, setBrandName] = useState('');
    const [defaultTone, setDefaultTone] = useState('Profesional');
    const [plan, setPlan] = useState('trial');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [planLoading, setPlanLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const supabase = createSupabaseClient();

    const [isAdmin, setIsAdmin] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [deployResult, setDeployResult] = useState({ success: false, message: '' });

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setEmail(user.email || '');
            setUserId(user.id);

            const { data, error: fetchError } = await supabase
                .from('users_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (data) {
                setName(data.name || '');
                setBrandName(data.brand_name || '');
                setDefaultTone(data.default_tone || 'Profesional');
                setPlan(data.plan || 'trial');
                setIsAdmin(data.is_admin || false);
            }
        } catch (err) {
            setError('Error al cargar el perfil.');
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckoutPlan() {
        if (plan === 'pro') return; // Already on pro

        setPlanLoading(true);
        setError('');

        try {
            const res = await fetch('/api/stripe/checkout-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al crear sesión de pago');

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Error checkout plan:', err);
            setError(err.message);
        } finally {
            setPlanLoading(false);
        }
    }

    async function handleDeploy() {
        if (!confirm('¿Estás seguro de que quieres lanzar un nuevo despliegue a Vercel?')) return;

        setDeploying(true);
        setDeployResult({ success: false, message: '' });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al lanzar despliegue');

            setDeployResult({ success: true, message: '🚀 ¡Despliegue iniciado! Tu app se actualizará en 2-3 minutos.' });
        } catch (err) {
            setDeployResult({ success: false, message: '❌ Error: ' + err.message });
        } finally {
            setDeploying(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSaved(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Save Profile
            const { error: updateError } = await supabase
                .from('users_profiles')
                .upsert({
                    id: user.id,
                    name,
                    brand_name: brandName,
                    default_tone: defaultTone,
                });

            if (updateError) throw updateError;

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError('Error al guardar los cambios.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="loading-pulse">Cargando ajustes...</div>;
    }

    return (
        <div className="settings-page" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '32px' }}>Ajustes</h1>

            {error && <div className="error-message mb-4">{error}</div>}
            {saved && (
                <div className="error-message mb-4" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(126, 206, 202, 0.05)' }}>
                    ✓ Cambios guardados correctamente
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Sección: Perfil */}
                <div className="settings-section">
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: 'rgba(255,255,255,0.4)' }}>PERFIL</h2>
                    <div className="card" style={{ padding: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Nombre</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Tu nombre"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={email}
                                    disabled
                                    style={{ opacity: 0.4 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección: Plan Pro */}
                <div className="settings-section">
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: 'rgba(255,255,255,0.4)' }}>SUSCRIPCIÓN</h2>
                    <div className="premium-card" style={{ padding: '40px', textAlign: 'center', background: 'rgba(126, 206, 202, 0.03)', border: '1px solid #7ECECA20' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7ECECA', marginBottom: '8px' }}>Plan Pro</h3>
                        <div style={{ marginBottom: '24px' }}>
                            <span style={{ fontSize: '3rem', fontWeight: 900 }}>€39</span>
                            <span style={{ color: 'var(--text-secondary)' }}>/mes</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>
                            Precio de lanzamiento. Subirá a €49/mes para nuevos usuarios.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>40 guiones avanzados/mes</strong> (200 créditos IA)</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Todas las plataformas:</strong> Reels, TikTok, Shorts, LinkedIn, X</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Cerebro IA</strong> — memoria de tu voz de marca</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Biblioteca + Calendario</strong> — organiza tu contenido</div>
                        </div>

                        <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '16px 40px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            onClick={handleCheckoutPlan}
                            disabled={planLoading || plan === 'pro'}
                        >
                            {planLoading ? (
                                <><Loader2 size={20} className="animate-spin" /> Redirigiendo a Stripe...</>
                            ) : plan === 'pro' ? (
                                '✅ Plan Pro Activo'
                            ) : (
                                'Empezar ahora por €39/mes →'
                            )}
                        </button>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '16px' }}>
                            ✓ Sin permanencias · ✓ Cancelas cuando quieras
                        </p>
                    </div>
                </div>

                {/* Zona Admin / Despliegue */}
                {isAdmin && (
                    <div className="settings-section">
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: '#ff4d4d' }}>ZONA ADMIN / DESPLIEGUE</h2>
                        <div className="card" style={{ padding: '32px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>Actualizar App en Vercel</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Si has hecho cambios en el código y quieres que se reflejen en <strong>público</strong> ahora mismo,
                                usa este botón. Se lanzará un &quot;build&quot; automático en tu panel de Vercel.
                            </p>

                            <button
                                type="button"
                                onClick={handleDeploy}
                                disabled={deploying}
                                className="btn-primary"
                                style={{
                                    background: '#FFF',
                                    color: '#000',
                                    padding: '12px 24px',
                                    width: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                {deploying ? 'Lanzando...' : <><Rocket size={18} /> Lanzar nueva versión a Vercel</>}
                            </button>

                            {deployResult.message && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    background: deployResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                                    color: deployResult.success ? '#22C55E' : '#FF4D4D',
                                    border: '1px solid ' + (deployResult.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 77, 77, 0.2)')
                                }}>
                                    {deployResult.message}
                                </div>
                            )}

                            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px dotted rgba(255,255,255,0.1)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>Nota para el Admin:</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    Debes configurar la variable de entorno <strong>VERCEL_DEPLOY_HOOK</strong> en Vercel Settings con tu Deploy Hook URL personal.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 10 }}>
                    <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '16px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        {saving ? 'Guardando...' : 'Guardar todos los cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}

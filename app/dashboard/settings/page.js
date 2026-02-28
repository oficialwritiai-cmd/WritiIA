'use client';

import { useState, useEffect } from 'react';
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
    const supabase = createSupabaseClient();

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setEmail(user.email || '');

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
            }
        } catch (err) {
            setError('Error al cargar el perfil.');
        } finally {
            setLoading(false);
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
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Guiones ilimitados</strong> cada mes</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Todas las plataformas:</strong> Reels, TikTok, Shorts, LinkedIn, X</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Cerebro IA:</strong> memoria completa de tu voz</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>✓ <strong>Biblioteca y Calendario</strong> en 1 clic</div>
                        </div>

                        <button type="button" className="btn-primary" style={{ padding: '16px 40px', fontSize: '1rem' }}>
                            {plan === 'pro' ? 'Gestionar suscripción' : 'Empezar ahora por €39/mes →'}
                        </button>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '16px' }}>
                            ✓ Sin permanencias · ✓ Cancelas cuando quieras
                        </p>
                    </div>
                </div>

                <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 10 }}>
                    <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '16px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        {saving ? 'Guardando...' : 'Guardar todos los cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}

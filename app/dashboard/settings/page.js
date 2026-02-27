'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const TONOS = ['Profesional', 'Cercano', 'Inspiracional', 'Directo', 'Divertido'];

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [brandName, setBrandName] = useState('');
    const [defaultTone, setDefaultTone] = useState('Profesional');
    const [plan, setPlan] = useState('free');
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
                setPlan(data.plan || 'free');
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

            const { error: updateError } = await supabase
                .from('users_profiles')
                .upsert({
                    id: user.id,
                    name,
                    brand_name: brandName,
                    default_tone: defaultTone,
                    plan,
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

    const planLabels = {
        free: 'Free',
        pro: 'Pro',
        agency: 'Agency',
    };

    if (loading) {
        return <div className="loading-pulse">Cargando ajustes...</div>;
    }

    return (
        <div className="settings-page">
            <h1>Ajustes</h1>

            {error && <div className="error-message mb-4">{error}</div>}
            {saved && (
                <div className="error-message mb-4" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    ✓ Cambios guardados correctamente
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Sección: Perfil */}
                <div className="settings-section">
                    <h2>Perfil</h2>
                    <div className="card">
                        <div className="settings-form">
                            <div>
                                <label htmlFor="settings-name">Nombre</label>
                                <input
                                    id="settings-name"
                                    type="text"
                                    className="input-field"
                                    placeholder="Tu nombre"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="settings-email">Email</label>
                                <input
                                    id="settings-email"
                                    type="email"
                                    className="input-field"
                                    value={email}
                                    disabled
                                    style={{ opacity: 0.5 }}
                                />
                            </div>
                            <div>
                                <label>Avatar</label>
                                <div className="avatar" style={{ width: '56px', height: '56px', fontSize: '1.2rem' }}>
                                    {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección: Mi marca */}
                <div className="settings-section">
                    <h2>Mi marca</h2>
                    <div className="card">
                        <div className="settings-form">
                            <div>
                                <label htmlFor="settings-brand">Nombre de marca</label>
                                <input
                                    id="settings-brand"
                                    type="text"
                                    className="input-field"
                                    placeholder="Nombre de tu marca o negocio"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="settings-tone">Tono predeterminado</label>
                                <select
                                    id="settings-tone"
                                    className="select-field"
                                    value={defaultTone}
                                    onChange={(e) => setDefaultTone(e.target.value)}
                                >
                                    {TONOS.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección: Plan actual */}
                <div className="settings-section">
                    <h2>Plan actual</h2>
                    <div className="card">
                        <div className="plan-badge">
                            <span className="badge">{planLabels[plan] || plan}</span>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn-primary mt-4" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
}

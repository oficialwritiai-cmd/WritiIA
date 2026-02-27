'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const SECTIONS = [
    { id: 'bio', label: 'Biografía / Historia', icon: '👤', placeholder: 'Cuenta quién eres, tu trayectoria y por qué haces lo que haces...' },
    { id: 'audience', label: 'Público Objetivo', icon: '👥', placeholder: '¿A quién le hablas? (Ej: Emprendedores de 25-40 años, interesados en finanzas...)' },
    { id: 'values', label: 'Valores y Tono', icon: '✨', placeholder: '¿Cuáles son tus pilares? (Ej: Transparencia, acción, humor, seriedad...)' },
    { id: 'niche', label: 'Nicho y Temas', icon: '🎯', placeholder: '¿De qué eres experto? ¿Qué temas NO tocas?' },
];

export default function KnowledgePage() {
    const [context, setContext] = useState({
        bio: '',
        audience: '',
        values: '',
        niche: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const supabase = createSupabaseClient();

    useEffect(() => {
        loadContext();
    }, []);

    async function loadContext() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error: fetchError } = await supabase
                .from('users_profiles')
                .select('brand_context')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
            if (data?.brand_context) {
                setContext(data.brand_context);
            }
        } catch (err) {
            setError('Error al cargar la información.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión.');

            const { error: saveError } = await supabase
                .from('users_profiles')
                .update({ brand_context: context })
                .eq('id', user.id);

            if (saveError) throw saveError;
            setSuccess('¡Cerebro IA actualizado con éxito!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    }

    const handleChange = (id, value) => {
        setContext(prev => ({ ...prev, [id]: value }));
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Contexto de Marca</p>
                    <h1 style={{ fontSize: '2.5rem' }}>Cerebro IA</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Entrena a la IA con tu información para crear contenido que suene 100% a ti.</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ minWidth: '160px' }}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', textAlign: 'center', fontWeight: 700, border: '1px solid rgba(34, 197, 94, 0.2)' }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {SECTIONS.map((section) => (
                    <div key={section.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{section.icon}</span>
                            <h3 style={{ fontSize: '1.2rem' }}>{section.label}</h3>
                        </div>
                        <textarea
                            className="textarea-field"
                            rows={8}
                            placeholder={section.placeholder}
                            value={context[section.id]}
                            onChange={(e) => handleChange(section.id, e.target.value)}
                            style={{ background: 'var(--bg-main)', resize: 'none' }}
                        />
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginTop: '24px', background: 'rgba(157, 0, 255, 0.05)', border: '1px solid rgba(157, 0, 255, 0.2)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    💡 **Tip**: Cuanto más detalle des, más precisos y auténticos serán los guiones de la IA. No tengas miedo de ser específico.
                </p>
            </div>
        </div>
    );
}

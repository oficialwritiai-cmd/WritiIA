'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';

export default function KnowledgePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [brain, setBrain] = useState({
        biography: '',
        audience: '',
        values_tone: '',
        niche_topics: '',
        knowledge_raw: ''
    });

    const supabase = createSupabaseClient();
    const fileInputRef = useRef(null);

    useEffect(() => {
        async function loadBrain() {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data, error } = await supabase
                        .from('brand_brain')
                        .select('*')
                        .eq('user_id', user.id);

                    if (data && data.length > 0) {
                        setBrain(data[0]);
                    }
                }
            } catch (err) {
                console.error('Error loading brand brain:', err);
            } finally {
                setLoading(false);
            }
        }
        loadBrain();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user session found');

            const { error } = await supabase.from('brand_brain').upsert({
                user_id: user.id,
                biography: brain.biography,
                audience: brain.audience,
                values_tone: brain.values_tone,
                niche_topics: brain.niche_topics,
                knowledge_raw: brain.knowledge_raw,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

            if (error) throw error;
            showToast('Cerebro IA guardado ✓', 'success');
        } catch (err) {
            console.error('Error saving brand brain:', err);
            showToast('No se pudieron guardar los cambios. Intenta de nuevo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const countWords = (text) => {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            showToast('El PDF excede los 10MB permitidos.', 'error');
            return;
        }
        showToast('Extrayendo texto del PDF... (Simulado)', 'success');
        // Final implementation would involve a server action or API call
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧠 Cerebro IA</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Entrena a la IA con tu historia y documentos para que genere contenido con tu voz única.
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ minWidth: '180px', height: '50px', fontSize: '1rem' }}
                >
                    {saving ? 'Guardando...' : 'Guardar Cerebro'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                {/* Information Grid */}
                {[
                    { key: 'biography', label: 'Biografía / Historia', icon: '👤', placeholder: '¿Quién eres? Cuéntanos tu trayectoria...' },
                    { key: 'audience', label: 'Público Objetivo', icon: '👥', placeholder: '¿Para quién escribes? ¿Qué necesitan?' },
                    { key: 'values_tone', label: 'Valores y Tono', icon: '✨', placeholder: '¿Qué tono usas? (Ej: Cercano, Rebelde...)' },
                    { key: 'niche_topics', label: 'Nicho y Temas', icon: '🎯', placeholder: 'Marketing, Fitness, IA... ¿Cuáles son tus temas?' },
                ].map((sec) => (
                    <div key={sec.key} className="premium-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '1.4rem' }}>{sec.icon}</span>
                            <h3 style={{ fontSize: '1.1rem' }}>{sec.label}</h3>
                        </div>
                        <AIPolishedTextarea
                            className="textarea-field"
                            rows={6}
                            placeholder={sec.placeholder}
                            value={brain[sec.key]}
                            onChange={(e) => setBrain({ ...brain, [sec.key]: e.target.value })}
                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                        />
                    </div>
                ))}
            </div>

            {/* Knowledge Base Section */}
            <div className="premium-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Base de Conocimiento (Knowledge Base)</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>WRITI.AI analizará este contenido para clonar tu estilo de comunicación.</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>PALABRAS INDEXADAS</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{countWords(brain.knowledge_raw).toLocaleString()}</p>
                    </div>
                </div>

                <textarea
                    className="textarea-field"
                    rows={12}
                    placeholder="Pega aquí contenido largo: páginas de venta, blogs, guiones antiguos..."
                    value={brain.knowledge_raw}
                    onChange={(e) => setBrain({ ...brain, knowledge_raw: e.target.value })}
                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', marginBottom: '24px', fontSize: '1rem', lineHeight: '1.6' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 24px' }}>
                        📄 Importar PDF de Marca
                    </button>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sube manuales de marca o guiones exitosos (máx. 10MB).</p>
                </div>
            </div>

            {/* Toast Notify */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    color: 'white',
                    padding: '14px 28px',
                    borderRadius: '50px',
                    fontWeight: 700,
                    boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                    animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}>
                    {toast.msg}
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { transform: translate(-50%, 30px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `}</style>
        </div>
    );
}

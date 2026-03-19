'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import BrainField from '@/app/components/BrainField';
import BrainWizardModal from '@/app/components/BrainWizardModal';
import { useProject } from '@/app/components/ProjectContext';
import { useLanguage } from '@/app/components/LanguageContext';

export default function KnowledgePage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [brain, setBrain] = useState({
        biography: '',
        audience: '',
        values_tone: '',
        niche: '',
        sub_niche: '',
        niche_topics: '',
        knowledge_raw: '',
        products_services: '',
        style_words: '',
        learning_notes: ''
    });
    const [showWizard, setShowWizard] = useState(false);

    const supabase = createSupabaseClient();
    const fileInputRef = useRef(null);
    const { activeProject, refreshBrain } = useProject();

    useEffect(() => {
        if (activeProject) loadBrain();
    }, [activeProject]);

    async function loadBrain() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('project_brains')
                .select('*')
                .eq('project_id', activeProject.id)
                .single();

            if (data) {
                setBrain({
                    biography: data.biography || '',
                    audience: data.audience || '',
                    values_tone: data.values_tone || '',
                    niche: data.niche || '',
                    sub_niche: data.sub_niche || '',
                    niche_topics: data.niche_topics || '',
                    knowledge_raw: data.knowledge_raw || '',
                    products_services: data.products_services || '',
                    style_words: data.style_words || '',
                    learning_notes: data.learning_notes || ''
                });
            } else {
                setBrain({
                    biography: '',
                    audience: '',
                    values_tone: '',
                    niche: '',
                    sub_niche: '',
                    niche_topics: '',
                    knowledge_raw: '',
                    products_services: '',
                    style_words: '',
                    learning_notes: ''
                });
            }
        } catch (err) {
            console.error('Error loading project brain:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async () => {
        if (!activeProject) {
            showToast(t('dashboard.select_project'), 'error');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from('project_brains').upsert({
                project_id: activeProject.id,
                biography: brain.biography,
                audience: brain.audience,
                values_tone: brain.values_tone,
                niche: brain.niche,
                sub_niche: brain.sub_niche,
                niche_topics: brain.niche_topics,
                knowledge_raw: brain.knowledge_raw,
                products_services: brain.products_services,
                style_words: brain.style_words,
                learning_notes: brain.learning_notes,
                updated_at: new Date().toISOString(),
                last_trained_at: new Date().toISOString()
            }, {
                onConflict: 'project_id'
            });

            if (error) throw error;
            showToast(t('common.success'), 'success');
            await refreshBrain();
        } catch (err) {
            console.error('Error saving project brain:', err);
            showToast(t('common.error'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleWizardComplete = async (generatedBrain) => {
        // AI returns a JSON with the 7 exact keys. Merging them into current state.
        setBrain(prev => ({
            ...prev,
            ...generatedBrain
        }));

        showToast('Cerebro IA generado! Registrando guardado...', 'success');

        // Let React state update before saving, simple timeout pattern
        setTimeout(() => {
            document.getElementById('save-brain-btn')?.click();
        }, 300);
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
    };

    if (!activeProject) return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '24px', textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '4rem', opacity: 0.5 }}>🏗️</div>
            <p style={{ color: '#888', fontSize: '1.2rem', maxWidth: '400px' }}>Selecciona o crea un proyecto para configurar su Cerebro IA.</p>
            <button 
                onClick={() => window.location.href = '/dashboard/home?create=true'}
                className="btn-primary"
                style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: 800 }}
            >
                ➕ Crear / Seleccionar Proyecto
            </button>
        </div>
    );

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="knowledge-container">
            {/* Header */}
            <div className="knowledge-header">
                <div className="header-info">
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧠 Cerebro IA</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Proyecto: <strong style={{ color: '#7ECECA' }}>{activeProject.name}</strong> — Entrena a la IA con la identidad de este proyecto.
                    </p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="wizard-btn"
                    >
                        ✨ Crear mi Cerebro con IA (Rápido)
                    </button>
                </div>
                <button
                    id="save-brain-btn"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ minWidth: '180px', height: '50px', fontSize: '1rem' }}
                >
                    {saving ? 'Guardando...' : 'Guardar Cerebro'}
                </button>
            </div>

            <div className="knowledge-grid">
                {[
                    { key: 'niche', label: t('brain.niche'), icon: '🎯', placeholder: 'Ej: Marketing, Cicloturismo, Fitness...' },
                    { key: 'sub_niche', label: t('brain.sub_niche'), icon: '🔍', placeholder: 'Ej: Marketing de afiliados, Rutas por Europa...' },
                    { key: 'biography', label: 'Biografía / Historia', icon: '👤', placeholder: '¿Quién eres? Cuéntanos tu trayectoria...' },
                    { key: 'audience', label: t('brain.audience'), icon: '👥', placeholder: '¿Para quién escribes? ¿Qué necesitan?' },
                    { key: 'products_services', label: 'Productos / Servicios', icon: '💼', placeholder: '¿Qué vendes o qué servicios ofreces?' },
                    { key: 'values_tone', label: t('brain.tone'), icon: '✨', placeholder: '¿Qué tono usas? (Ej: Cercano, Rebelde...)' },
                ].map((sec) => (
                    <div key={sec.key} className="premium-card brain-card-item">
                        <BrainField
                            fieldKey={sec.key}
                            label={sec.label}
                            icon={sec.icon}
                            className="textarea-field brain-textarea"
                            rows={3}
                            placeholder={sec.placeholder}
                            value={brain[sec.key]}
                            onChange={(e) => setBrain({ ...brain, [sec.key]: e.target.value })}
                            brainContext={brain}
                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', fontSize: '1rem' }}
                        />
                    </div>
                ))}
            </div>

            {/* AI Learning & Evolution Section */}
            <div className="premium-card brain-learning-card">
                <div className="learning-header">
                    <div style={{ fontSize: '1.5rem' }}>🚀</div>
                    <div>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Algoritmo de Aprendizaje (Log de Entrenamiento)</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Aquí es donde la IA guarda lo que "aprende" de tu feedback. Puedes editarlo manualmente para guiar a la IA.
                        </p>
                    </div>
                </div>

                <BrainField
                    fieldKey="learning_notes"
                    className="textarea-field brain-textarea"
                    rows={6}
                    placeholder="Feedback aprendido: 'Evita hablar de precios directamente', 'Usa más storytelling emocional', 'Enfatiza que somos pro-ambiente'..."
                    value={brain.learning_notes}
                    onChange={(e) => setBrain({ ...brain, learning_notes: e.target.value })}
                    brainContext={brain}
                    style={{ background: 'rgba(126, 206, 202, 0.05)', border: '1px solid rgba(126, 206, 202, 0.2)', fontSize: '1rem', color: '#7ECECA' }}
                />
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

                <BrainField
                    fieldKey="knowledge_raw"
                    className="textarea-field"
                    rows={12}
                    placeholder="Pega aquí contenido largo: páginas de venta, blogs, guiones antiguos..."
                    value={brain.knowledge_raw}
                    onChange={(e) => setBrain({ ...brain, knowledge_raw: e.target.value })}
                    brainContext={brain}
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
                .knowledge-container {
                    maxWidth: 1100px;
                    margin: 0 auto;
                    animation: fadeIn 0.5s ease-out;
                    padding: 20px;
                }
                .knowledge-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    gap: 20px;
                }
                .wizard-btn {
                    margin-top: 12px;
                    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                    color: white; border: none; padding: 10px 20px;
                    borderRadius: 8px; fontSize: 0.95rem; fontWeight: 700;
                    display: inline-flex; alignItems: center; gap: 8px;
                    cursor: pointer; boxShadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }
                .knowledge-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .brain-card-item {
                    padding: 24px;
                }
                .brain-learning-card {
                    padding: 32px;
                    margin-bottom: 32px;
                    border: 1px solid rgba(126, 206, 202, 0.2);
                }
                .learning-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                @media (max-width: 768px) {
                    .knowledge-header {
                        flex-direction: column;
                        align-items: flex-start;
                        text-align: left;
                    }
                    .header-info {
                        width: 100%;
                    }
                    #save-brain-btn {
                        width: 100%;
                    }
                    .knowledge-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    .brain-card-item {
                        padding: 20px;
                    }
                    .brain-learning-card {
                        padding: 20px;
                    }
                    .learning-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { transform: translate(-50%, 30px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `}</style>

            <BrainWizardModal
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onComplete={handleWizardComplete}
                projectId={activeProject?.id}
            />
        </div>
    );
}

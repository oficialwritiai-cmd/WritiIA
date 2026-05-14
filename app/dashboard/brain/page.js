'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useProject } from '@/app/components/ProjectContext';
import BrainImproveModal from '@/app/dashboard/session/BrainImproveModal';
import { Brain, Save, Wand2, Loader2, CheckCircle2 } from 'lucide-react';

const FIELDS = [
    {
        key: 'biography',
        label: 'Biografía / Historia',
        placeholder: '¿Quién eres? Comparte tu trayectoria, logros y lo que te hace único...',
        rows: 4,
    },
    {
        key: 'audience',
        label: 'Audiencia ideal',
        placeholder: '¿Para quién creas contenido? Describe su perfil, necesidades y motivaciones...',
        rows: 3,
    },
    {
        key: 'style_words',
        label: 'Estilo y palabras clave',
        placeholder: 'Palabras que definen tu voz: directo, emotivo, técnico, inspiracional...',
        rows: 3,
    },
    {
        key: 'niche',
        label: 'Nicho',
        placeholder: 'Ej: Marketing digital, Fitness, Finanzas personales, Tecnología...',
        rows: 2,
    },
    {
        key: 'products_services',
        label: 'Productos / Servicios',
        placeholder: '¿Qué vendes o qué servicios ofreces a tu audiencia?',
        rows: 3,
    },
];

export default function BrainPage() {
    const { activeProject } = useProject();
    const activeProjectId = activeProject?.id || null;

    const [brain, setBrain] = useState({
        biography: '',
        audience: '',
        style_words: '',
        niche: '',
        products_services: '',
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedKey, setSavedKey] = useState(null); // field key last saved
    const [toast, setToast] = useState(null);
    const [isImproveOpen, setIsImproveOpen] = useState(false);

    const supabase = createSupabaseClient();
    const debounceTimers = useRef({});

    // ── Load brain on project change ──────────────────────────────
    useEffect(() => {
        if (!activeProjectId) return;
        setLoading(true);
        supabase
            .from('project_brains')
            .select('biography,audience,style_words,niche,products_services')
            .eq('project_id', activeProjectId)
            .single()
            .then(({ data }) => {
                if (data) {
                    setBrain({
                        biography: data.biography || '',
                        audience: data.audience || '',
                        style_words: data.style_words || '',
                        niche: data.niche || '',
                        products_services: data.products_services || '',
                    });
                }
            })
            .finally(() => setLoading(false));
    }, [activeProjectId]);

    // ── Upsert to Supabase ────────────────────────────────────────
    const saveBrain = useCallback(async (data) => {
        if (!activeProjectId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('project_brains')
                .upsert(
                    {
                        project_id: activeProjectId,
                        ...data,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'project_id' }
                );
            if (error) throw error;
            showToast('Guardado');
        } catch (err) {
            console.error('Error saving brain:', err);
            showToast('Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    }, [activeProjectId]);

    // ── Auto-save on blur (debounced 400ms) ───────────────────────
    const handleChange = (key, value) => {
        setBrain(prev => ({ ...prev, [key]: value }));
    };

    const handleBlur = (key) => {
        clearTimeout(debounceTimers.current[key]);
        debounceTimers.current[key] = setTimeout(() => {
            setBrain(current => {
                saveBrain(current);
                return current;
            });
        }, 400);
    };

    // ── Manual save button ────────────────────────────────────────
    const handleManualSave = () => {
        saveBrain(brain);
    };

    // ── BrainImproveModal apply ───────────────────────────────────
    const handleImproveApply = (improved) => {
        const merged = {
            biography: improved.bio || brain.biography,
            audience: improved.audience || brain.audience,
            style_words: improved.style || brain.style_words,
            niche: brain.niche,
            products_services: brain.products_services,
        };
        setBrain(merged);
        saveBrain(merged);
    };

    // ── Toast ─────────────────────────────────────────────────────
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── No project ───────────────────────────────────────────────
    if (!activeProjectId) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                gap: '20px',
                textAlign: 'center',
                padding: '20px',
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid rgba(167,139,250,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                }}>
                    <Brain size={28} color="#a78bfa" strokeWidth={1.6} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>
                    Selecciona un proyecto
                </h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', maxWidth: '340px', lineHeight: 1.6 }}>
                    Para configurar el Cerebro IA necesitas tener un proyecto activo seleccionado.
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '4px 0 40px' }}>

            {/* ── Page header ──────────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '32px',
                flexWrap: 'wrap',
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(167,139,250,0.12)',
                            border: '1px solid rgba(167,139,250,0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Brain size={18} color="#a78bfa" strokeWidth={1.8} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
                            Cerebro IA
                        </h1>
                        {saving && (
                            <Loader2
                                size={15}
                                color="#a78bfa"
                                style={{ animation: 'brainSpin 0.8s linear infinite', flexShrink: 0 }}
                            />
                        )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                        Proyecto: <span style={{ color: '#a78bfa', fontWeight: 600 }}>{activeProject?.name}</span>
                        {' '}— Entrena a la IA con tu identidad de marca.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Improve with AI */}
                    <button
                        onClick={() => setIsImproveOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: 'rgba(124,58,237,0.12)',
                            border: '1px solid rgba(124,58,237,0.35)',
                            borderRadius: '10px',
                            padding: '9px 16px',
                            color: '#a78bfa',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background 0.15s ease, border-color 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.55)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'; }}
                    >
                        <Wand2 size={15} strokeWidth={2} />
                        Mejorar con IA
                    </button>

                    {/* Save */}
                    <button
                        onClick={handleManualSave}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: saving ? 'rgba(124,58,237,0.2)' : '#7c3aed',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '9px 18px',
                            color: 'white',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            transition: 'background 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#6d28d9'; }}
                        onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#7c3aed'; }}
                    >
                        {saving
                            ? <Loader2 size={14} style={{ animation: 'brainSpin 0.8s linear infinite' }} />
                            : <Save size={14} strokeWidth={2} />
                        }
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* ── Loading skeleton ─────────────────────────────── */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {FIELDS.map(f => (
                        <div key={f.key} style={{
                            height: `${f.rows * 28 + 60}px`,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px',
                            animation: 'brainPulse 1.4s ease-in-out infinite',
                        }} />
                    ))}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {FIELDS.map((field) => (
                        <div
                            key={field.key}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '14px',
                                padding: '20px 22px',
                                transition: 'border-color 0.15s ease',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                        >
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: '10px',
                                userSelect: 'none',
                            }}>
                                {field.label}
                            </label>
                            <textarea
                                value={brain[field.key]}
                                onChange={e => handleChange(field.key, e.target.value)}
                                onBlur={() => handleBlur(field.key)}
                                placeholder={field.placeholder}
                                rows={field.rows}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'rgba(255,255,255,0.88)',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.65,
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Toast ────────────────────────────────────────── */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '36px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.12)',
                    border: `1px solid ${toast.type === 'error' ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.3)'}`,
                    color: toast.type === 'error' ? '#f87171' : '#34d399',
                    padding: '10px 20px',
                    borderRadius: '50px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    zIndex: 3000,
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    animation: 'brainSlideUp 0.25s cubic-bezier(0.18,0.89,0.32,1.28)',
                    whiteSpace: 'nowrap',
                }}>
                    {toast.type !== 'error' && <CheckCircle2 size={14} />}
                    {toast.msg}
                </div>
            )}

            {/* ── BrainImproveModal ─────────────────────────────── */}
            <BrainImproveModal
                isOpen={isImproveOpen}
                onClose={() => setIsImproveOpen(false)}
                target="brain"
                currentData={{
                    bio: brain.biography,
                    audience: brain.audience,
                    style: brain.style_words,
                }}
                onApply={handleImproveApply}
            />

            <style>{`
                @keyframes brainSpin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes brainPulse {
                    0%, 100% { opacity: 0.4; }
                    50%       { opacity: 0.7; }
                }
                @keyframes brainSlideUp {
                    from { transform: translate(-50%, 16px); opacity: 0; }
                    to   { transform: translate(-50%, 0);    opacity: 1; }
                }
                textarea::placeholder { color: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
}

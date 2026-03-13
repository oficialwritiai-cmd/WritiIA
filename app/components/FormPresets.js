'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useProject } from '@/app/components/ProjectContext';
import { Save, Trash2, FolderOpen, Loader2 } from 'lucide-react';

/**
 * FormPresets — Reusable preset save/load/delete component.
 *
 * Props:
 *  - type: 'ads' | 'plan' | 'script'
 *  - getCurrentConfig: () => object  — returns current form values as a plain object
 *  - onLoadConfig: (config) => void  — called when user loads a preset; receives the saved config
 */
export default function FormPresets({ type = 'script', getCurrentConfig, onLoadConfig }) {
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    const [presets, setPresets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);

    const TYPE_LABELS = { ads: 'Ads', plan: 'Plan Mensual', script: 'Guion' };

    useEffect(() => {
        loadPresets();
    }, [activeProject]);

    async function loadPresets() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);

        let query = supabase.from('ad_presets').select('*').eq('user_id', user.id).eq('type', type);
        if (activeProject) query = query.eq('project_id', activeProject.id);

        const { data } = await query.order('created_at', { ascending: false });
        setPresets(data || []);
        setLoading(false);
    }

    function handleLoad(presetId) {
        const preset = presets.find(p => p.id === presetId);
        if (!preset || !onLoadConfig) return;
        onLoadConfig(preset.config || {});
        setSelectedId(presetId);
    }

    async function handleSave() {
        if (!getCurrentConfig) return;
        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const config = getCurrentConfig();
            const name = saveName.trim() || `${TYPE_LABELS[type]} ${new Date().toLocaleDateString()}`;

            await supabase.from('ad_presets').insert({
                user_id: user.id,
                project_id: activeProject?.id || null,
                name,
                config,
                type
            });

            setSaveName('');
            setShowSaveInput(false);
            await loadPresets();
        } catch (err) {
            console.error('[FormPresets] Save error:', err);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(presetId) {
        if (!confirm('¿Eliminar este preajuste?')) return;
        await supabase.from('ad_presets').delete().eq('id', presetId);
        if (selectedId === presetId) setSelectedId('');
        await loadPresets();
    }

    return (
        <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '14px 20px',
            background: 'rgba(255,255,255,0.015)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.04)',
            marginBottom: '20px'
        }}>
            <FolderOpen size={16} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />

            {/* Load */}
            {presets.length > 0 ? (
                <select
                    value={selectedId}
                    onChange={e => { setSelectedId(e.target.value); if (e.target.value) handleLoad(e.target.value); }}
                    style={{
                        flex: 1,
                        minWidth: '180px',
                        background: '#0A0A0A',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: 'white',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        outline: 'none'
                    }}
                >
                    <option value="">Cargar preajuste...</option>
                    {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            ) : (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', flex: 1 }}>
                    {loading ? 'Cargando...' : 'Sin preajustes guardados'}
                </span>
            )}

            {/* Delete selected */}
            {selectedId && (
                <button onClick={() => handleDelete(selectedId)} title="Eliminar preajuste" style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,0.7)', cursor: 'pointer', padding: '6px', display: 'flex' }}>
                    <Trash2 size={14} />
                </button>
            )}

            {/* Save */}
            {showSaveInput ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder="Nombre..."
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                        autoFocus
                        style={{
                            background: '#0A0A0A',
                            border: '1px solid rgba(126,206,202,0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            width: '140px'
                        }}
                    />
                    <button onClick={handleSave} disabled={isSaving} style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'rgba(126,206,202,0.15)',
                        border: '1px solid rgba(126,206,202,0.3)',
                        color: '#7ECECA',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Guardar
                    </button>
                    <button onClick={() => setShowSaveInput(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                </div>
            ) : (
                <button onClick={() => setShowSaveInput(true)} style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(126,206,202,0.08)',
                    border: '1px solid rgba(126,206,202,0.15)',
                    color: '#7ECECA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                }}>
                    <Save size={12} />
                    Guardar preajuste
                </button>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Save, Sparkles, Trash2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

const SheetEditor = ({ sheetId, onClose, onSave, userId, activeProjectId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [platform, setPlatform] = useState('Reels');
    const [status, setStatus] = useState('Idea');
    const [hook, setHook] = useState('');
    const [desarrollo, setDesarrollo] = useState('');
    const [cta, setCta] = useState('');
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const supabase = createSupabaseClient();

    const PLATFORMS = ['Reels', 'TikTok', 'Shorts', 'YouTube', 'LinkedIn', 'X'];
    const STATUSES = ['Idea', 'Borrador', 'Listo', 'Publicado'];

    useEffect(() => {
        if (sheetId && sheetId !== 'new') {
            loadSheet();
        }
    }, [sheetId]);

    async function loadSheet() {
        try {
            const { data, error } = await supabase
                .from('library')
                .select('*')
                .eq('id', sheetId)
                .single();
            if (error) throw error;
            if (data) {
                setTitle(data.titulo || data.title || '');
                setPlatform(data.platform || 'Reels');
                setStatus(data.metadata?.status || 'Idea');
                setContent(data.script_full_text || data.content?.full_text || '');
                setHook(data.content?.hook || '');
                setDesarrollo((data.content?.desarrollo || []).join('\n'));
                setCta(data.content?.cta || '');
            }
        } catch (err) {
            console.error('Error loading sheet:', err);
        }
    }

    async function handleSave() {
        if (!title.trim()) {
            alert('Por favor escribe un título');
            return;
        }

        setSaving(true);
        try {
            const fullContent = [
                hook ? `GANCHO:\n${hook}` : '',
                desarrollo ? `DESARROLLO:\n${desarrollo}` : '',
                cta ? `CTA:\n${cta}` : ''
            ].filter(Boolean).join('\n\n');

            const payload = {
                user_id: userId,
                project_id: activeProjectId,
                titulo: title,
                platform: platform,
                type: 'guion',
                script_full_text: content || fullContent,
                metadata: {
                    status: status,
                    tipo_creacion: 'manual'
                },
                content: {
                    hook,
                    desarrollo: desarrollo.split('\n').filter(d => d.trim()),
                    cta,
                    full_text: content || fullContent
                },
                tags: ['guion', platform, 'manual']
            };

            if (sheetId && sheetId !== 'new') {
                // Update
                const { error } = await supabase
                    .from('library')
                    .update(payload)
                    .eq('id', sheetId);
                if (error) throw error;
            } else {
                // Create
                const { data, error } = await supabase
                    .from('library')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                if (data) onSave?.(data);
            }

            alert('✅ Guion guardado');
            onClose?.();
        } catch (err) {
            console.error('Error saving:', err);
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleGenerateWithAI() {
        if (!title.trim()) {
            alert('Escribe un título para que la IA genere contenido');
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch('/api/generate-scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: title,
                    platform: platform,
                    goal: 'engagement',
                    tone_brand: 'cercano'
                })
            });

            if (!res.ok) throw new Error('Error generando contenido');
            const { scripts } = await res.json();
            if (scripts?.[0]) {
                const script = scripts[0];
                setHook(script.hook || script.gancho || '');
                setDesarrollo(Array.isArray(script.desarrollo) ? script.desarrollo.join('\n') : script.desarrollo || '');
                setCta(script.cta || '');
                setContent(`GANCHO:\n${script.hook || script.gancho}\n\nDESARROLLO:\n${script.desarrollo}\n\nCTA:\n${script.cta}`);
            }
        } catch (err) {
            console.error('AI generation error:', err);
            alert('Error en generación de IA: ' + err.message);
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0a0a0a',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.5)'
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                    {sheetId && sheetId !== 'new' ? 'Editar' : 'Nueva'} Hoja
                </h1>
                <button onClick={onClose} style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer'
                }}>
                    <X size={24} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* Title */}
                    <input
                        type="text"
                        placeholder="Título del guion..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                            width: '100%',
                            fontSize: '2rem',
                            fontWeight: 800,
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '2px solid rgba(126,206,202,0.3)',
                            color: 'white',
                            padding: '12px 0 20px 0',
                            marginBottom: '32px',
                            outline: 'none'
                        }}
                    />

                    {/* Platform & Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>Plataforma</label>
                            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}>
                                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>Estado</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>Gancho</label>
                        <textarea value={hook} onChange={(e) => setHook(e.target.value)} placeholder="El gancho de tu publicación..." rows={3} style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            outline: 'none',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }} />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>Desarrollo</label>
                        <textarea value={desarrollo} onChange={(e) => setDesarrollo(e.target.value)} placeholder="Puntos clave (uno por línea)..." rows={5} style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            outline: 'none',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }} />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>CTA (Call To Action)</label>
                        <textarea value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Lo que quieres que haga la audiencia..." rows={2} style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            outline: 'none',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }} />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>Contenido completo (opcional)</label>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Aquí va el contenido completo del guion..." rows={8} style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            outline: 'none',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            resize: 'vertical'
                        }} />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex',
                gap: '12px',
                padding: '20px 32px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.5)',
                justifyContent: 'flex-end'
            }}>
                <button onClick={onClose} style={{
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600
                }}>
                    Cancelar
                </button>
                <button onClick={handleGenerateWithAI} disabled={generating} style={{
                    padding: '12px 24px',
                    background: 'rgba(126, 206, 202, 0.1)',
                    border: '1px solid rgba(126,206,202,0.3)',
                    borderRadius: '8px',
                    color: '#7ECECA',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Sparkles size={16} />
                    {generating ? 'Generando...' : 'Generar con IA'}
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                    padding: '12px 24px',
                    background: '#7ECECA',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar Hoja'}
                </button>
            </div>
        </div>
    );
};

export default SheetEditor;

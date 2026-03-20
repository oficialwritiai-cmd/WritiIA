'use client';

import { useState, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Save, Copy, CheckCircle2 } from 'lucide-react';

export default function LibraryScriptEditor({ item, onClose, onSave, supabase, userId, projectId }) {
    const [content, setContent] = useState(item.content || {});
    const [titulo, setTitulo] = useState(item.titulo || item.content?.titulo_angulo || 'Sin título');
    const [saving, setSaving] = useState(false);
    const [refining, setRefining] = useState(null); // 'gancho', 'desarrollo', 'cta', 'copy'
    const [chatInputs, setChatInputs] = useState({});
    const [copied, setCopied] = useState(false);

    // Normalize keys on mount
    useEffect(() => {
        if (item.content) {
            const c = { ...item.content };
            // If gancho is missing but hook/hook_principal etc exist, normalize it
            if (!c.gancho) {
                c.gancho = c.hook || c.hook_principal || c.hookText || c.gancho_principal || '';
            }
            setContent(c);
        }
    }, [item]);

    const handleUpdateContent = (field, value) => {
        setContent(prev => ({ ...prev, [field]: value }));
    };

    const handleUpdateCopy = (field, value) => {
        setContent(prev => ({
            ...prev,
            copy_post: { ...prev.copy_post, [field]: value }
        }));
    };

    const handleRefine = async (field, text) => {
        const instruction = chatInputs[field] || '';
        
        if (!text || text.trim().length < 5) {
            alert('El texto es demasiado corto para refinar. Escribe algo más de 5 caracteres.');
            return;
        }

        setRefining(field);

        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    type: field === 'copy' ? 'desarrollo' : field,
                    instruction,
                    context: `Guion en biblioteca. Plataforma: ${item.platform}`,
                    userId,
                    projectId
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al refinar');

            if (field === 'gancho' || field === 'gancho_principal') {
                handleUpdateContent('gancho', data.refinedText);
            } else if (field === 'desarrollo') {
                handleUpdateContent('desarrollo', Array.isArray(data.refinedText) ? data.refinedText : [data.refinedText]);
            } else if (field === 'cta') {
                handleUpdateContent('cta', data.refinedText);
            } else if (field === 'copy') {
                handleUpdateCopy('descripcion_larga', data.refinedText);
            }

            setChatInputs(prev => ({ ...prev, [field]: '' }));
        } catch (err) {
            alert(err.message);
        } finally {
            setRefining(null);
        }
    };

    const handleLocalSave = async () => {
        setSaving(true);
        try {
            const updatedContent = { ...content, titulo_angulo: titulo };

            // 1. Update Library DB
            const { error } = await supabase
                .from('library')
                .update({ titulo, content: updatedContent })
                .eq('id', item.id);

            if (error) throw error;

            // v5.2.0: Synchronize with the source of truth (scripts table)
            if (item.script_id) {
                const scriptUpdate = {
                    title: titulo,
                    hook: updatedContent.gancho || updatedContent.hook || '',
                    cta: updatedContent.cta || updatedContent.cierre || '',
                    notes: updatedContent.notes || '',
                    updated_at: new Date().toISOString()
                };

                // Handle development/structure if present
                if (updatedContent.desarrollo) {
                    if (Array.isArray(updatedContent.desarrollo)) {
                        scriptUpdate.structure = updatedContent.desarrollo.map(d => ({ point: 'Sección', detail: d }));
                    } else {
                        scriptUpdate.content = updatedContent.desarrollo;
                    }
                }

                // Handle post copy if present
                if (updatedContent.copy_post) {
                    scriptUpdate.post_copy = {
                        headline: updatedContent.copy_post.titulo || updatedContent.copy_post.headline || '',
                        body: updatedContent.copy_post.descripcion_larga || updatedContent.copy_post.body || '',
                        hashtags: updatedContent.copy_post.hashtags || []
                    };
                }

                const { error: scriptErr } = await supabase
                    .from('scripts')
                    .update(scriptUpdate)
                    .eq('id', item.script_id);
                
                if (scriptErr) console.error('[v5.2.0] Script Sync Error:', scriptErr);
            }

            // 2. Sync to Calendar Events
            let calendarText = `GUION:\n\nHOOK: ${updatedContent.gancho || ''}\n\n`;
            calendarText += `DESARROLLO:\n${Array.isArray(updatedContent.desarrollo) ? updatedContent.desarrollo.join('\n') : (updatedContent.desarrollo || '')}\n\n`;
            if (updatedContent.cierre) calendarText += `CIERRE: ${updatedContent.cierre}\n\n`;
            calendarText += `CTA: ${updatedContent.cta || ''}\n\n`;

            // Adding copies strings for calendar 
            if (updatedContent.copy_post?.descripcion_larga) {
                calendarText += `\n--- COPY POST ---\n${updatedContent.copy_post.descripcion_larga}\n`;
            }

            const { error: calError } = await supabase
                .from('calendar_events')
                .update({
                    title: titulo,
                    script_full_text: calendarText,
                    content: updatedContent
                })
                .eq('reference_id', item.id);

            if (calError) {
                console.error('Error syncing to calendar:', calError);
                // Note: Not throwing to let library save succeed, but ideally we'd want a transaction
            }

            onSave({ ...item, titulo, content: updatedContent });
            onClose();
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px'
        }}>
            <div style={{
                background: '#111', borderRadius: '32px', width: '100%', maxWidth: '900px', height: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '80%' }}>
                        <input 
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            style={{ 
                                fontSize: '1.5rem', fontWeight: 900, color: 'white', margin: 0, 
                                background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.3)',
                                width: '100%', outline: 'none'
                            }}
                        />
                        <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '8px' }}>{item.platform} • {item.type}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    
                    {/* GANCHO */}
                    <Section 
                        title="🪝 Gancho" 
                        value={content.gancho || ''} 
                        onChange={v => handleUpdateContent('gancho', v)}
                        onRefine={() => handleRefine('gancho', content.gancho || '')}
                        instruction={chatInputs['gancho'] || ''}
                        onInstructionChange={v => setChatInputs(prev => ({...prev, gancho: v}))}
                        loading={refining === 'gancho'}
                    />

                    {/* DESARROLLO */}
                    <Section 
                        title="📝 Desarrollo" 
                        value={Array.isArray(content.desarrollo) ? content.desarrollo.join('\n\n') : content.desarrollo || ''} 
                        onChange={v => handleUpdateContent('desarrollo', v.split('\n\n'))}
                        onRefine={() => handleRefine('desarrollo', Array.isArray(content.desarrollo) ? content.desarrollo.join('\n\n') : content.desarrollo || '')}
                        instruction={chatInputs['desarrollo'] || ''}
                        onInstructionChange={v => setChatInputs(prev => ({...prev, desarrollo: v}))}
                        loading={refining === 'desarrollo'}
                        isTextarea
                    />

                    {/* CTA */}
                    <Section 
                        title="🎯 CTA" 
                        value={content.cta || ''} 
                        onChange={v => handleUpdateContent('cta', v)}
                        onRefine={() => handleRefine('cta', content.cta || '')}
                        instruction={chatInputs['cta'] || ''}
                        onInstructionChange={v => setChatInputs(prev => ({...prev, cta: v}))}
                        loading={refining === 'cta'}
                    />

                    {/* COPY POST (Optional) */}
                    {content.copy_post && (
                        <>
                            <Section 
                                title="📱 Copy Post / Descripción" 
                                value={content.copy_post.descripcion_larga || ''} 
                                onChange={v => handleUpdateCopy('descripcion_larga', v)}
                                onRefine={() => handleRefine('copy', content.copy_post.descripcion_larga || '')}
                                instruction={chatInputs['copy'] || ''}
                                onInstructionChange={v => setChatInputs(prev => ({...prev, copy: v}))}
                                loading={refining === 'copy'}
                                isTextarea
                            />

                            {(content.copy_post.hashtags || content.hashtags) && (
                                <Section 
                                    title="#️⃣ Hashtags" 
                                    value={Array.isArray(content.copy_post.hashtags) ? content.copy_post.hashtags.join(' ') : content.copy_post.hashtags || ''} 
                                    onChange={v => handleUpdateCopy('hashtags', v.split(' ').filter(x => x.trim() !== ''))}
                                    onRefine={() => handleRefine('hashtags', Array.isArray(content.copy_post.hashtags) ? content.copy_post.hashtags.join(' ') : content.copy_post.hashtags || '')}
                                    instruction={chatInputs['hashtags'] || ''}
                                    onInstructionChange={v => setChatInputs(prev => ({...prev, hashtags: v}))}
                                    loading={refining === 'hashtags'}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(content, null, 2));
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }} 
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {copied ? <CheckCircle2 size={18} color="#7ECECA" /> : <Copy size={18} />}
                        {copied ? 'Copiado' : 'Copiar todo'}
                    </button>
                    <button 
                        onClick={handleLocalSave} 
                        disabled={saving} 
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Section({ title, value, onChange, onRefine, instruction, onInstructionChange, loading, isTextarea }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7ECECA', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</h3>
            <div style={{ position: 'relative' }}>
                {isTextarea ? (
                    <textarea 
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        style={{
                            width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '16px', padding: '16px', color: 'white', fontSize: '1rem', lineHeight: '1.6', outline: 'none', resize: 'vertical'
                        }}
                    />
                ) : (
                    <input 
                        type="text"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        style={{
                            width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '16px', padding: '16px', color: 'white', fontSize: '1rem', outline: 'none'
                        }}
                    />
                )}

                {/* Mini Chat for Refinement */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Sparkles size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7ECECA', opacity: 0.6 }} />
                        <input 
                            type="text"
                            placeholder="Instrucción para la IA (ej: hazlo más polémico...)"
                            value={instruction}
                            onChange={e => onInstructionChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onRefine()}
                            style={{
                                width: '100%', background: 'rgba(126, 206, 202, 0.03)', border: '1px solid rgba(126, 206, 202, 0.1)',
                                borderRadius: '12px', padding: '10px 12px 10px 36px', color: 'white', fontSize: '0.85rem', outline: 'none'
                            }}
                        />
                    </div>
                    <button 
                        onClick={onRefine} 
                        disabled={loading}
                        style={{
                            background: 'var(--accent-gradient)', color: 'black', border: 'none', borderRadius: '12px',
                            padding: '0 16px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        Refinar con IA
                    </button>
                </div>
            </div>
        </div>
    );
}

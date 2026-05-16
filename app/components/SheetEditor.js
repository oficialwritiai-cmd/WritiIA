'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

const PLATFORMS = ['Reels', 'TikTok', 'Shorts', 'YouTube', 'LinkedIn', 'X'];
const STATUSES  = ['Borrador', 'Listo', 'Publicado', 'Idea'];

const inp = {
    width: '100%', background: 'transparent', border: 'none',
    color: '#fff', outline: 'none', fontFamily: 'inherit',
    resize: 'vertical', boxSizing: 'border-box',
};
const section = {
    marginBottom: '32px',
};
const label = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.3)', marginBottom: '8px',
};
const field = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#fff', padding: '12px 14px',
    fontSize: '0.9rem', lineHeight: 1.65, resize: 'vertical',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

export default function SheetEditor({ sheetId, item: initialItem, onClose, onSave, userId, activeProjectId }) {
    const [title,      setTitle]      = useState('');
    const [platform,   setPlatform]   = useState('Reels');
    const [status,     setStatus]     = useState('Borrador');
    const [hook,       setHook]       = useState('');
    const [desarrollo, setDesarrollo] = useState('');
    const [cta,        setCta]        = useState('');
    const [copyPost,   setCopyPost]   = useState('');
    const [fullText,   setFullText]   = useState('');
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
    const [itemId,     setItemId]     = useState(sheetId !== 'new' ? sheetId : null);

    const supabase  = createSupabaseClient();
    const timerRef  = useRef(null);
    const isNew     = !itemId;

    useEffect(() => {
        if (initialItem) {
            populate(initialItem);
        } else if (sheetId && sheetId !== 'new') {
            loadSheet(sheetId);
        }
    }, [sheetId, initialItem]);

    function populate(data) {
        setItemId(data.id || null);
        setTitle(data.titulo || data.title || '');
        setPlatform(data.platform || 'Reels');
        setStatus(data.metadata?.status || data.status || 'Borrador');
        setHook(data.content?.hook || data.content?.gancho || '');
        setDesarrollo((data.content?.desarrollo || []).join('\n'));
        setCta(data.content?.cta || '');
        setCopyPost(
            data.content?.copy_post
                ? (typeof data.content.copy_post === 'string'
                    ? data.content.copy_post
                    : `${data.content.copy_post.headline || ''}\n${data.content.copy_post.body || ''}`.trim())
                : ''
        );
        setFullText(data.script_full_text || data.content?.full_text || '');
    }

    async function loadSheet(id) {
        const { data } = await supabase.from('library').select('*').eq('id', id).single();
        if (data) populate(data);
    }

    // Auto-save debounced 1.5s after last change
    const triggerAutoSave = useCallback(() => {
        clearTimeout(timerRef.current);
        setSaveStatus('idle');
        timerRef.current = setTimeout(() => {
            performSave();
        }, 1500);
    }, [title, platform, status, hook, desarrollo, cta, copyPost, fullText, itemId]);

    async function performSave() {
        setSaveStatus('saving');
        try {
            const fullContent = fullText || [
                hook       ? `⚡ HOOK:\n${hook}` : '',
                desarrollo ? `📝 DESARROLLO:\n${desarrollo}` : '',
                cta        ? `📢 CTA:\n${cta}` : '',
                copyPost   ? `📱 COPY:\n${copyPost}` : '',
            ].filter(Boolean).join('\n\n');

            const payload = {
                titulo:           title || 'Sin título',
                platform,
                type:             'guion',
                script_full_text: fullContent,
                metadata:         { status },
                content: {
                    titulo_angulo: title,
                    hook,
                    gancho: hook,
                    desarrollo: desarrollo.split('\n').filter(d => d.trim()),
                    cta,
                    copy_post: copyPost,
                    full_text: fullContent,
                },
            };

            if (itemId) {
                const { error } = await supabase.from('library').update(payload).eq('id', itemId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('library').insert({
                    ...payload,
                    user_id:    userId,
                    project_id: activeProjectId || null,
                }).select().single();
                if (error) throw error;
                if (data) { setItemId(data.id); onSave?.(data); }
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (e) {
            console.error('[SheetEditor] save error:', e);
            setSaveStatus('idle');
        }
    }

    // Trigger auto-save on any field change
    function onChange(setter) {
        return (val) => { setter(val); triggerAutoSave(); };
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#0c0c0e',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* ── Top bar ─────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 32px', height: '52px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: '#13131a', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Biblioteca</span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title || 'Sin título'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Auto-save indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        {saveStatus === 'saving' && <>
                            <Loader2 size={13} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
                            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Guardando…</span>
                        </>}
                        {saveStatus === 'saved' && <>
                            <CheckCircle2 size={13} color="#34d399" />
                            <span style={{ color: '#34d399' }}>Guardado</span>
                        </>}
                        {saveStatus === 'idle' && (
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>Auto-guardado activado</span>
                        )}
                    </div>

                    <button onClick={() => { clearTimeout(timerRef.current); onClose?.(); }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={17} />
                    </button>
                </div>
            </div>

            {/* ── Main content ─────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '48px 32px' }}>
                <div style={{ maxWidth: '780px', margin: '0 auto' }}>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Plataforma', value: platform, set: onChange(setPlatform), opts: PLATFORMS },
                            { label: 'Estado',     value: status,   set: onChange(setStatus),   opts: STATUSES },
                        ].map(({ label: lbl, value, set, opts }) => (
                            <div key={lbl}>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '4px' }}>{lbl}</span>
                                <select value={value} onChange={e => set(e.target.value)}
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
                                    {opts.map(o => <option key={o} value={o} style={{ background: '#1a1a24' }}>{o}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Title — big Notion-style */}
                    <textarea
                        value={title}
                        onChange={e => onChange(setTitle)(e.target.value)}
                        placeholder="Título del guion…"
                        rows={2}
                        style={{ ...inp, fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: '40px', color: '#fff', resize: 'none' }}
                        onInput={e => { e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                    />

                    {/* Hook */}
                    <div style={section}>
                        <span style={label}>⚡ Hook — primeras palabras</span>
                        <textarea value={hook} rows={3} placeholder="Las palabras que paran el scroll en los primeros 3 segundos…"
                            onChange={e => onChange(setHook)(e.target.value)}
                            style={{ ...field, borderLeft: '3px solid #a78bfa', paddingLeft: '16px', fontSize: '1.05rem', fontWeight: 500 }}
                            onFocus={e => e.target.style.borderColor='rgba(167,139,250,0.5)'}
                            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Desarrollo */}
                    <div style={section}>
                        <span style={label}>📝 Desarrollo — cuerpo del guion</span>
                        <textarea value={desarrollo} rows={12} placeholder="Desarrollo completo del guion. Puedes usar formato libre o bloques numerados…"
                            onChange={e => onChange(setDesarrollo)(e.target.value)}
                            style={{ ...field, fontSize: '0.92rem', lineHeight: 1.75 }}
                            onFocus={e => e.target.style.borderColor='rgba(255,255,255,0.2)'}
                            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* CTA */}
                    <div style={section}>
                        <span style={label}>📢 CTA — llamada a la acción</span>
                        <textarea value={cta} rows={2} placeholder="¿Qué quieres que haga el espectador al terminar el video?"
                            onChange={e => onChange(setCta)(e.target.value)}
                            style={{ ...field, borderLeft: '3px solid #34d399', paddingLeft: '16px' }}
                            onFocus={e => e.target.style.borderColor='rgba(52,211,153,0.4)'}
                            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Copy redes */}
                    <div style={section}>
                        <span style={label}>📱 Copy para redes sociales</span>
                        <textarea value={copyPost} rows={4} placeholder="Copy para el pie de foto o descripción del video en redes…"
                            onChange={e => onChange(setCopyPost)(e.target.value)}
                            style={{ ...field, borderLeft: '3px solid #60a5fa', paddingLeft: '16px' }}
                            onFocus={e => e.target.style.borderColor='rgba(96,165,250,0.4)'}
                            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Full text (collapsed by default) */}
                    <div style={{ ...section, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                        <span style={label}>📄 Guion completo (texto libre)</span>
                        <textarea value={fullText} rows={16} placeholder="Pega aquí el guion completo o edítalo libremente…"
                            onChange={e => onChange(setFullText)(e.target.value)}
                            style={{ ...field, fontSize: '0.88rem', lineHeight: 1.75, fontFamily: "'JetBrains Mono', monospace" }}
                            onFocus={e => e.target.style.borderColor='rgba(255,255,255,0.2)'}
                            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                    </div>

                </div>
            </div>

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

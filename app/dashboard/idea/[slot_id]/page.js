'use client';

/**
 * WRITIAI – Idea/Guion Page (Notion-style)
 * Version: v6.3.0 (Guided Debug)
 * Route: /dashboard/idea/[slot_id]
 *
 * Full-screen workspace for a single content idea + script.
 * Loads from content_slots + scripts tables.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

const supabase = createSupabaseClient();

// ─────────────────── Helpers ────────────────────────────────────────────────
const PLATFORM_EMOJI = {
    Reels: '📸', TikTok: '🎵', Instagram: '📷', YouTube: '▶️',
    LinkedIn: '💼', Twitter: '🐦', X: '𝕏', General: '🌐',
};

const STATUS_CONFIG = {
    idea_only: { label: 'Idea', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    script_generating: { label: 'Generando...', color: '#7ECECA', bg: 'rgba(126,206,202,0.12)' },
    script_ready: { label: 'Guion listo', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    script_error: { label: 'Error', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    idea: { label: 'Idea', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    prep: { label: 'En preparación', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    rec: { label: 'Grabando', color: '#9D00FF', bg: 'rgba(157,0,255,0.12)' },
    pub: { label: 'Publicado', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

function Badge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['idea'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem',
            fontWeight: 700, color: cfg.color, background: cfg.bg,
            border: `1px solid ${cfg.color}33`,
        }}>{cfg.label}</span>
    );
}

function MetaRow({ icon, label, children }) {
    return (
        <div className="meta-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="meta-label" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', minWidth: '110px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {icon} {label}
            </span>
            <span className="meta-value" style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                {children}
            </span>
        </div>
    );
}

function Section({ emoji, title, children, color = '#7ECECA' }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
            </div>
            {children}
        </div>
    );
}

function EditableBlock({ value, onChange, placeholder, rows = 4, mono = false }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; }
    }, [value]);
    return (
        <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="textarea-field-idea"
            style={{
                width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '14px 16px', color: 'white', fontSize: mono ? '0.84rem' : '0.95rem',
                fontFamily: mono ? 'monospace' : 'inherit', lineHeight: 1.7, resize: 'none', outline: 'none',
                transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(126,206,202,0.4)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />
    );
}

// ─────────────────── Main Component ─────────────────────────────────────────
export default function IdeaPage() {
    const router = useRouter();
    const { slot_id } = useParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [isAutosave, setIsAutosave] = useState(false);
    const [isAutosaving, setIsAutosaving] = useState(false);
    const [error, setError] = useState(null);

    // Core Data
    const [slot, setSlot] = useState(null);
    const [script, setScript] = useState(null);
    const [calEvent, setCalEvent] = useState(null);
    const [userId, setUserId] = useState(null);
    const [user, setUser] = useState(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goal, setGoal] = useState('');
    const [contentType, setContentType] = useState('');
    const [platform, setPlatform] = useState('Reels');
    const [scheduledDate, setScheduledDate] = useState('');

    // Script Logic
    const [hook, setHook] = useState('');
    const [structureText, setStructureText] = useState('');
    const [ctaText, setCtaText] = useState('');
    const [notes, setNotes] = useState('');
    const [postHeadline, setPostHeadline] = useState('');
    const [postBody, setPostBody] = useState('');
    const [postHashtags, setPostHashtags] = useState('');

    // Generation UI Options
    const [showGenOptions, setShowGenOptions] = useState(false);
    const [genPlatform, setGenPlatform] = useState('');
    const [genDuration, setGenDuration] = useState('60 seg');
    const [genFocus, setGenFocus] = useState('');
    const [genInstruction, setGenInstruction] = useState('');

    // Status
    const [slotStatus, setSlotStatus] = useState('idea_only');
    const [versions, setVersions] = useState([]);
    const [currentVersionIdx, setCurrentVersionIdx] = useState(0);
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [lastSavedHash, setLastSavedHash] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!slot_id) return;
        loadFullIdea();
    }, [slot_id]);

    async function loadFullIdea() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            setUser(user);
            setUserId(user.id);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            console.log('GET_SCRIPT', { scriptId: slot_id, hasAuth: !!token });

            const res = await fetch(`/api/scripts/${slot_id}`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            const scriptRes = await res.json();
            
            if (scriptRes.ok && scriptRes.data) {
                const s = scriptRes.data;
                setScript(s);
                populateFromScript(s);
                setSlotStatus('script_ready');
                if (s.slot_id) {
                    const { data: sl } = await supabase.from('content_slots').select('*').eq('id', s.slot_id).single();
                    if (sl) { setSlot(sl); populateFromSlot(sl); }
                    // Fetch versions
                    const { data: v } = await supabase.from('scripts').select('*').eq('slot_id', s.slot_id).order('created_at', { ascending: false });
                    if (v) setVersions(v);
                }
            } else {
                // Try Content Slots
                const { data: sl } = await supabase.from('content_slots').select('*').eq('id', slot_id).single();
                if (sl) {
                    setSlot(sl);
                    populateFromSlot(sl);
                    const { data: v } = await supabase.from('scripts').select('*').eq('slot_id', sl.id).order('created_at', { ascending: false });
                    if (v && v.length > 0) {
                        setVersions(v);
                        setScript(v[0]);
                        populateFromScript(v[0]);
                        setSlotStatus('script_ready');
                    }
                } else {
                    // Try Calendar Events
                    const { data: ev } = await supabase.from('calendar_events').select('*').eq('id', slot_id).maybeSingle();
                    if (ev) {
                        setCalEvent(ev);
                        populateFromCalendar(ev);
                        // For calendar, scripts might be in 'library' or 'scripts' table
                        const { data: v } = await supabase.from('scripts').select('*').eq('source_reference_id', ev.id).order('created_at', { ascending: false });
                        if (v && v.length > 0) {
                            setVersions(v);
                            setScript(v[0]);
                            populateFromScript(v[0]);
                            setSlotStatus('script_ready');
                        } else if (ev.script_id) {
                            const { data: s } = await supabase.from('scripts').select('*').eq('id', ev.script_id).maybeSingle();
                            if (s) { setScript(s); populateFromScript(s); setSlotStatus('script_ready'); }
                        }
                    } else {
                        // FALLBACK v6.3.1: Library
                        const { data: libItem } = await supabase.from('library').select('*').eq('id', slot_id).maybeSingle();
                        if (libItem) {
                            populateFromLibrary(libItem);
                            setSlotStatus('script_ready');
                        } else {
                            throw new Error('No se encontró la idea o el guion.');
                        }
                    }
                }
            }

            setLastSavedHash(JSON.stringify({
                title, description, goal, contentType, platform, scheduledDate,
                hook, structureText, ctaText, notes, postHeadline, postBody, postHashtags
            }));

        } catch (err) {
            console.error('Error loading idea:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function populateFromSlot(sl) {
        setTitle(sl.title || sl.idea_title || '');
        setDescription(sl.description || sl.idea_description || '');
        setGoal(sl.goal || '');
        setContentType(sl.content_type || '');
        setPlatform(sl.platform || 'Reels');
        setScheduledDate(sl.scheduled_date || '');
    }

    function populateFromCalendar(ev) {
        setTitle(ev.title || '');
        setDescription(ev.description || '');
        setPlatform(ev.platform || 'General');
        setScheduledDate(ev.event_date || '');
    }

    function populateFromScript(sc) {
        if (sc.title) setTitle(sc.title);
        setHook(sc.hook || sc.gancho || '');
        setCtaText(sc.cta || '');
        setNotes(sc.notes || '');
        if (Array.isArray(sc.structure) && sc.structure.length > 0) {
            setStructureText(sc.structure.map((p, i) => `${i + 1}. ${p.point || ''}: ${p.detail || ''}`).join('\n\n'));
        } else if (sc.content) {
            setStructureText(typeof sc.content === 'string' ? sc.content : '');
        } else if (sc.full_text) {
             setStructureText(sc.full_text);
        }
        const pc = sc.post_copy || {};
        setPostHeadline(pc.headline || pc.titulo || '');
        setPostBody(pc.body || pc.descripcion_larga || '');
        setPostHashtags(Array.isArray(pc.hashtags) ? pc.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : (pc.hashtags || ''));
    }

    function populateFromLibrary(item) {
        setTitle(item.titulo || item.title || '');
        setPlatform(item.platform || 'General');
        const c = item.content || {};
        setHook(c.hook || c.gancho || c.hook_principal || '');
        setCtaText(c.cta || c.cierre || '');
        setNotes(c.notes || '');
        if (c.full_text) {
            setStructureText(c.full_text);
        } else if (Array.isArray(c.desarrollo)) {
            setStructureText(c.desarrollo.join('\n\n'));
        }
        if (c.copy_post) {
            setPostHeadline(c.copy_post.headline || '');
            setPostBody(c.copy_post.body || '');
            const ht = c.copy_post.hashtags;
            setPostHashtags(Array.isArray(ht) ? ht.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : (ht || ''));
        }
    }

    async function saveScript(scriptId, payload, isAutosave = false) {
        if (!scriptId) return null;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        console.log('SAVE_SCRIPT_PAYLOAD', { scriptId, title: payload.title, body: payload.content, hasAuth: !!token });
        if (isAutosave) setIsAutosaving(true);
        try {
            const res = await fetch(`/api/scripts/${scriptId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.ok) { setLastSavedTime(new Date()); return result.data; }
            throw new Error(result.error || 'API Error');
        } catch (err) {
            console.error('SAVE ERROR:', err);
            throw err;
        } finally {
            if (isAutosave) setIsAutosaving(false);
        }
    }

    async function handleSave(isAutosave = false) {
        if (!isAutosave) { setSaving(true); setSaveError(null); setSaveSuccess(false); }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión no encontrada');
            const structureArr = structureText.split('\n\n').filter(Boolean).map((block, i) => {
                const lines = block.split('\n');
                const firstLine = lines[0] || '';
                const hasColon = firstLine.includes(':') && firstLine.length < 80;
                const point = hasColon ? firstLine.split(':')[0].replace(/^\d+\.\s*/, '').trim() : 'Sección ' + (i + 1);
                const detail = hasColon ? (firstLine.split(':').slice(1).join(':').trim() + '\n' + lines.slice(1).join('\n')).trim() : block.trim();
                return { point, detail: detail || firstLine };
            });
            const postCopy = { headline: postHeadline, body: postBody, hashtags: postHashtags.split(/\s+/).filter(h => h.trim().length > 0) };
            const fullContentText = [`HOOK: ${hook}`, `DESARROLLO:\n${structureText}`, `CTA: ${ctaText}`, `POST COPY:\n${postHeadline}\n${postBody}\n${postHashtags}`, `NOTAS:\n${notes}`].join('\n\n');
            const payload = { title, hook, structure: structureArr, cta: ctaText, notes, post_copy: postCopy, content: fullContentText, platform };
            // v6.3.1: Ensure we use the slot_id from the URL as the primary identifier if no script row exists yet
            const finalScriptId = script?.id || slot_id;
            const updatedScript = await saveScript(finalScriptId, payload, isAutosave);
            if (updatedScript) setScript(updatedScript);
            setLastSavedHash(JSON.stringify({ title, description, goal, contentType, platform, scheduledDate, hook, structureText, ctaText, notes, postHeadline, postBody, postHashtags }));
            if (!isAutosave) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); }
        } catch (err) {
            console.error('Save failed:', err);
            if (!isAutosave) setSaveError(err.message);
        } finally {
            if (!isAutosave) setSaving(false);
        }
    }

    async function handleGenerate() {
        const params = new URLSearchParams();
        params.set('mode', 'single');
        params.set('topic', `${title}\n${description}`);
        params.set('platform', genPlatform || platform || 'Reels');
        params.set('goal', goal || 'Viralidad pura');

        if (slot?.id) {
            params.set('source_type', 'content_slots');
            params.set('source_reference_id', slot.id);
        } else if (calEvent?.id) {
            params.set('source_type', 'calendar_events');
            params.set('source_reference_id', calEvent.id);
        } else {
            params.set('source_type', 'library'); // Fallback or another type
            params.set('source_reference_id', slot_id);
        }

        router.push(`/dashboard?${params.toString()}`);
    }

    function handleCopy() {
        const text = [
            `📋 ${title}`,
            '',
            hook ? `🎯 HOOK\n${hook}` : '',
            structureText ? `\n📝 DESARROLLO\n${structureText}` : '',
            ctaText ? `\n🔥 CTA\n${ctaText}` : '',
            postHeadline ? `\n📱 POST COPY\n${postHeadline}\n${postBody}` : '',
            postHashtags ? `\n${postHashtags}` : '',
            notes ? `\n🎬 NOTAS\n${notes}` : '',
        ].filter(Boolean).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #7ECECA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Cargando idea...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#EF4444', fontSize: '1rem' }}>⚠️ {error}</p>
            <button onClick={() => router.back()} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>← Volver</button>
        </div>
    );

    const hasScript = !!(hook || structureText || ctaText);
    const platformEmoji = PLATFORM_EMOJI[platform] || '🌐';

    return (
        <div style={{ minHeight: '100vh', background: '#0d0d0d', color: 'white', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>←</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{platformEmoji}</span>
                        <input value={title} onChange={e => setTitle(e.target.value)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.95rem', fontWeight: 600, outline: 'none', width: '300px' }} placeholder="Título de la idea..." />
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {isAutosaving && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Autoguardando...</span>}
                    {lastSavedTime && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Guardado {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    <button onClick={() => handleSave(false)} disabled={saving} className="notion-btn" style={{ background: saveSuccess ? '#10B981' : '#7ECECA', color: '#0d0d0d', padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                        {saving ? 'Guardando...' : saveSuccess ? '✓ Guardado' : 'Guardar v6.3.0'}
                    </button>
                </div>
            </div>

            <main style={{ maxWidth: '850px', margin: '0 auto', padding: '40px 24px 100px' }}>
                <div style={{ marginBottom: '48px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Badge status={slotStatus} />
                    </div>
                    <MetaRow icon="🎯" label="Objetivo">{goal || 'Sin objetivo definido'}</MetaRow>
                    <MetaRow icon="📱" label="Plataforma">{platform}</MetaRow>
                    <MetaRow icon="🎬" label="Tipo">{contentType}</MetaRow>
                    <MetaRow icon="📅" label="Programado">{scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'No programado'}</MetaRow>
                </div>

                {!hasScript && slotStatus !== 'script_generating' ? (
                    <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(126,206,202,0.03)', borderRadius: '24px', border: '2px dashed rgba(126,206,202,0.15)' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '20px' }}>✍️</span>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>¿Empezamos con el guion?</h2>
                        <button onClick={handleGenerate} style={{ background: '#7ECECA', color: '#0d0d0d', padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                            Generar Guion Mágico ✨
                        </button>
                    </div>
                ) : (
                    <div className="script-editor-container">
                        {versions.length > 1 && (
                            <div style={{ marginBottom: '32px', background: 'rgba(126,206,202,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(126,206,202,0.1)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7ECECA', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Historial de Versiones</div>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {versions.map((v, idx) => (
                                        <button 
                                            key={v.id} 
                                            onClick={() => {
                                                setScript(v);
                                                populateFromScript(v);
                                                setCurrentVersionIdx(idx);
                                            }}
                                            style={{
                                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', whiteSpace: 'nowrap', cursor: 'pointer',
                                                background: currentVersionIdx === idx ? '#7ECECA' : 'rgba(255,255,255,0.03)',
                                                color: currentVersionIdx === idx ? '#0d0d0d' : 'rgba(255,255,255,0.5)',
                                                border: currentVersionIdx === idx ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.1)',
                                                fontWeight: 600, transition: 'all 0.2s'
                                            }}
                                        >
                                            Sesión {versions.length - idx} <span style={{ opacity: 0.6, marginLeft: '4px', fontSize: '0.65rem' }}>{new Date(v.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Section emoji="🎯" title="Gancho / Hook" color="#F59E0B">
                            <EditableBlock value={hook} onChange={setHook} placeholder="Escribe el gancho..." rows={2} />
                        </Section>
                        <Section emoji="📝" title="Estructura y Desarrollo" color="#7ECECA">
                            <EditableBlock value={structureText} onChange={setStructureText} placeholder="Desarrollo..." rows={12} />
                        </Section>
                        <Section emoji="🔥" title="Llamada a la Acción (CTA)" color="#10B981">
                            <EditableBlock value={ctaText} onChange={setCtaText} placeholder="CTA..." rows={2} />
                        </Section>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '40px 0' }} />
                        <Section emoji="📱" title="Post Copy y Hashtags" color="#3B82F6">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <input value={postHeadline} onChange={e => setPostHeadline(e.target.value)} placeholder="Título..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px', color: 'white', outline: 'none' }} />
                                <EditableBlock value={postBody} onChange={setPostBody} placeholder="Cuerpo..." rows={5} />
                                <input value={postHashtags} onChange={e => setPostHashtags(e.target.value)} placeholder="#hashtags" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px', color: 'white', outline: 'none' }} />
                            </div>
                        </Section>
                        <Section emoji="🎬" title="Notas" color="rgba(255,255,255,0.3)">
                            <EditableBlock value={notes} onChange={setNotes} placeholder="Notas..." rows={3} mono />
                        </Section>
                    </div>
                )}
            </main>

            <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px', background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(16px)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
                <button onClick={handleGenerate} style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(126,206,202,0.1)', border: '1px solid rgba(126,206,202,0.2)', color: '#7ECECA', cursor: 'pointer' }}>✨ Regenerar</button>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: 'auto' }} />
                <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                    {copied ? '✅' : '⧉'} {copied ? 'Copiado' : 'Copiar guion'}
                </button>
            </div>
        </div>
    );
}

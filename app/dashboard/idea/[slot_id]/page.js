'use client';

/**
 * WRITIAI – Idea/Guion Page (Notion-style)
 * Version: v4.7.0
 * Route: /dashboard/idea/[slot_id]
 *
 * Full-screen workspace for a single content idea + script.
 * Loads from content_slots + scripts tables.
 * If slot_id is a calendar_events.id, falls back to that.
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
    'Guion listo': { label: 'Guion listo', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    'Idea': { label: 'Idea', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
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
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);

    // Source data
    const [slot, setSlot] = useState(null);
    const [script, setScript] = useState(null);
    const [calEvent, setCalEvent] = useState(null); // fallback if no slot
    const [sourceType, setSourceType] = useState('slot'); // 'slot' | 'event'

    // Editable fields — idea
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goal, setGoal] = useState('');
    const [contentType, setContentType] = useState('');
    const [platform, setPlatform] = useState('General');
    const [scheduledDate, setScheduledDate] = useState('');
    const [slotStatus, setSlotStatus] = useState('idea_only');

    // Editable fields — script
    const [hook, setHook] = useState('');
    const [structureText, setStructureText] = useState('');
    const [ctaText, setCtaText] = useState('');
    const [notes, setNotes] = useState('');
    const [postHeadline, setPostHeadline] = useState('');
    const [postBody, setPostBody] = useState('');
    const [postHashtags, setPostHashtags] = useState('');

    // Script generation options
    const [showGenOptions, setShowGenOptions] = useState(false);
    const [genPlatform, setGenPlatform] = useState('Reels');
    const [genDuration, setGenDuration] = useState('60 seg');
    const [genFocus, setGenFocus] = useState('autoridad');
    const [genInstruction, setGenInstruction] = useState('');

    // ── Load data ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!slot_id) return;
        load();
    }, [slot_id]);

    async function load() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setUserId(user.id);

        // 1. Try content_slots
        const { data: slotData } = await supabase
            .from('content_slots')
            .select('*')
            .eq('id', slot_id)
            .eq('user_id', user.id)
            .single();

        if (slotData) {
            setSlot(slotData);
            setSourceType('slot');
            populateFromSlot(slotData);

            // Load script if exists
            if (slotData.script_id) {
                const { data: scriptData } = await supabase
                    .from('scripts')
                    .select('*')
                    .eq('id', slotData.script_id)
                    .single();
                if (scriptData) {
                    setScript(scriptData);
                    populateFromScript(scriptData);
                }
            }
            setLoading(false);
            return;
        }

        // 2. Fallback: calendar_events
        const { data: evData } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('id', slot_id)
            .eq('user_id', user.id)
            .single();

        if (evData) {
            setCalEvent(evData);
            setSourceType('event');
            populateFromCalEvent(evData);

            // Try to get slot via reference_id
            if (evData.reference_id) {
                const { data: refSlot } = await supabase
                    .from('content_slots')
                    .select('*')
                    .eq('id', evData.reference_id)
                    .single();
                if (refSlot) {
                    setSlot(refSlot);
                    populateFromSlot(refSlot);
                    if (refSlot.script_id) {
                        const { data: sc } = await supabase.from('scripts').select('*').eq('id', refSlot.script_id).single();
                        if (sc) { setScript(sc); populateFromScript(sc); }
                    }
                }
            }
        } else {
            // 3. Fallback: library (Single Script / Generator)
            const { data: libData } = await supabase
                .from('library')
                .select('*')
                .eq('id', slot_id)
                .eq('user_id', user.id)
                .single();

            if (libData) {
                setSlot(libData);
                setSourceType('library');
                
                const contentObj = libData.content || {};
                setTitle(libData.titulo || contentObj.titulo_guion || contentObj.titulo_angulo || 'Idea');
                setDescription(libData.script_full_text || contentObj.descripcion || '');
                setGoal(libData.goal || '');
                setContentType(libData.type || '');
                setPlatform(libData.platform || 'General');
                setSlotStatus(libData.status || 'idea');
                
                setHook(contentObj.hook || contentObj.gancho || '');
                setCtaText(contentObj.cierre || contentObj.cta || '');
                if (Array.isArray(contentObj.desarrollo)) {
                    setStructureText(contentObj.desarrollo.join('\n\n'));
                } else {
                    setStructureText(contentObj.desarrollo || '');
                }
                if (contentObj.copy_post) {
                    setPostHeadline(contentObj.copy_post.titulo || '');
                    setPostBody(contentObj.copy_post.descripcion_larga || '');
                    setPostHashtags(Array.isArray(contentObj.copy_post.hashtags) ? contentObj.copy_post.hashtags.join(' ') : '');
                }
                setNotes(contentObj.notes || '');

                // v5.2.0: Prioritize Scripts table if script_id exists in library
                if (libData.script_id) {
                    const { data: scriptData } = await supabase
                        .from('scripts')
                        .select('*')
                        .eq('id', libData.script_id)
                        .single();
                    if (scriptData) {
                        setScript(scriptData);
                        populateFromScript(scriptData);
                    }
                }

                setLoading(false);
                return;
            }

            setError('No se encontró esta idea. Puede que haya sido eliminada.');
        }

        setLoading(false);
    }

    function populateFromSlot(s) {
        setTitle(s.idea_title || '');
        setDescription(s.idea_description || '');
        setGoal(s.goal || '');
        setContentType(s.content_type || '');
        setPlatform(s.platform || 'General');
        setScheduledDate(s.scheduled_date || '');
        setSlotStatus(s.slot_status || (s.has_script ? 'script_ready' : 'idea_only'));
        setGenPlatform(s.platform || 'Reels');
    }

    function populateFromCalEvent(ev) {
        setTitle(ev.title || '');
        setDescription(ev.description || ev.notes || '');
        setPlatform(ev.platform || 'General');
        setScheduledDate(ev.event_date || '');
        setSlotStatus(ev.status || 'idea');
        setGenPlatform(ev.platform || 'Reels');
        if (ev.notes && !ev.has_script) {
            setHook(ev.notes);
        }
    }

    function populateFromScript(sc) {
        if (sc.title) setTitle(sc.title);
        setHook(sc.hook || sc.gancho || '');
        setCtaText(sc.cta || '');
        setNotes(sc.notes || '');
        // Build structure text from structure JSONB or legacy content
        if (Array.isArray(sc.structure) && sc.structure.length > 0) {
            setStructureText(sc.structure.map((p, i) => `${i + 1}. ${p.point || ''}: ${p.detail || ''}`).join('\n\n'));
        } else if (sc.content) {
            setStructureText(typeof sc.content === 'string' ? sc.content : '');
        }
        const pc = sc.post_copy || {};
        setPostHeadline(pc.headline || pc.titulo || '');
        setPostBody(pc.body || pc.descripcion_larga || '');
        setPostHashtags(Array.isArray(pc.hashtags) ? pc.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') : (pc.hashtags || ''));
    }

    // ── Save changes ───────────────────────────────────────────────────────
    async function handleSave() {
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión de usuario no encontrada.');

            // 1. Preparar datos del guion (v5.1.4)
            const structureArr = structureText.split('\n\n').filter(Boolean).map((block, i) => {
                const lines = block.split('\n');
                const firstLine = lines[0] || '';
                const hasColon = firstLine.includes(':') && firstLine.length < 80;
                const point = hasColon ? firstLine.split(':')[0].replace(/^\d+\.\s*/, '').trim() : `Sección ${i + 1}`;
                const detail = hasColon ? (firstLine.split(':').slice(1).join(':').trim() + '\n' + lines.slice(1).join('\n')).trim() : block.trim();
                return { point, detail: detail || firstLine };
            });

            const postCopy = { 
                headline: postHeadline, 
                body: postBody, 
                hashtags: postHashtags.split(/\s+/).filter(h => h.trim().length > 0)
            };

            const fullContentText = [
                `TÍTULO: ${title}`,
                '',
                '🎯 HOOK',
                hook,
                '',
                '📝 ESTRUCTURA',
                structureText,
                '',
                '🔥 CTA',
                ctaText,
                '',
                '📱 POST COPY',
                postHeadline,
                postBody,
                postCopy.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
                '',
                '🎬 NOTAS',
                notes
            ].filter(Boolean).join('\n');

            const commonScriptData = {
                hook,
                desarrollo: structureArr.map(s => s.point.startsWith('Sección') ? s.detail : `${s.point}: ${s.detail}`),
                cta: ctaText,
                copy_post: postCopy,
                notes,
                titulo_guion: title,
                descripcion: description,
                // v5.1.4: Mapeo extendido para máxima compatibilidad con componentes legacy
                gancho: hook,
                hook_principal: hook,
                cierre: ctaText,
                titulo_idea: title,
                full_text: fullContentText
            };

            let currentScriptId = script?.id || slot?.script_id;
            let finalScriptId = currentScriptId;
            const realSlotId = sourceType === 'library' ? (slot?.metadata?.slot_id || null) : slot?.id;
            const realLibraryId = sourceType === 'library' ? slot?.id : (slot?.metadata?.library_id || null);

            const scriptTableUpdates = {
                title,
                hook,
                structure: structureArr,
                cta: ctaText,
                notes,
                post_copy: postCopy,
                content: fullContentText,
                platform,
                updated_at: new Date().toISOString()
            };

            // 2. Sincronizar tabla 'scripts'
            if (finalScriptId) {
                const { error: scErr } = await supabase.from('scripts').update(scriptTableUpdates).eq('id', finalScriptId);
                if (scErr) throw new Error(`Script Update Error: ${scErr.message}`);
            } else if (realSlotId && sourceType !== 'library') {
                const { data: newSc, error: scErr } = await supabase.from('scripts').insert({
                    user_id: user.id,
                    slot_id: realSlotId,
                    project_id: slot?.project_id,
                    tone: slot?.metadata?.tone || slot?.tone || 'cercano',
                    is_saved: true,
                    ...scriptTableUpdates
                }).select().single();
                
                if (scErr) throw new Error(`Script Insert Error: ${scErr.message}`);
                if (newSc) {
                    finalScriptId = newSc.id;
                    setScript(newSc);
                }
            }

            // 3. Sincronizar Slot (content_slots)
            if (realSlotId) {
                const slotUpdates = {
                    idea_title: title,
                    idea_description: description,
                    goal,
                    content_type: contentType,
                    platform,
                    scheduled_date: scheduledDate || null,
                    script_id: finalScriptId,
                    has_script: !!(finalScriptId || sourceType === 'library'),
                    script_data: commonScriptData
                };
                const { error: e2 } = await supabase.from('content_slots').update(slotUpdates).eq('id', realSlotId);
                if (e2) throw new Error(`Slot Sync Error: ${e2.message}`);
            }

            // 4. Sincronizar Calendario (calendar_events)
            if (realSlotId || realLibraryId || finalScriptId) {
                const calUpdates = {
                    title,
                    platform,
                    status: 'Guion listo',
                    has_script: true,
                    script_id: finalScriptId,
                    script_full_text: fullContentText,
                    description: description || title,
                    content: commonScriptData
                };
                if (scheduledDate) {
                    calUpdates.event_date = scheduledDate;
                }

                let orConditions = [];
                if (realSlotId) orConditions.push(`reference_id.eq.${realSlotId}`);
                if (realLibraryId) orConditions.push(`reference_id.eq.${realLibraryId}`);
                if (finalScriptId) orConditions.push(`script_id.eq.${finalScriptId}`);
                
                if (orConditions.length > 0) {
                    const { error: e3 } = await supabase.from('calendar_events').update(calUpdates).or(orConditions.join(','));
                    if (e3) throw new Error(`Calendar Sync Error: ${e3.message}`);
                }
            }

            // 5. Sincronizar Biblioteca (library)
            let libIdToUpdate = realLibraryId;
            
            // Si venimos de un slot y no sabemos el ID de biblioteca, lo buscamos explícitamente
            if (!libIdToUpdate && realSlotId) {
                const { data: libData, error: findErr } = await supabase
                    .from('library')
                    .select('id')
                    .eq('metadata->>slot_id', realSlotId)
                    .maybeSingle();
                
                if (libData) libIdToUpdate = libData.id;
                if (findErr) console.error('[v5.1.5] Buscando Library ID Error:', findErr);
            }

            const libUpdates = {
                titulo: title,
                platform,
                goal,
                script_full_text: fullContentText,
                content: {
                    ...commonScriptData,
                    titulo_guion: title,
                    descripcion: description,
                    cierre: ctaText
                },
                updated_at: new Date().toISOString()
            };

            if (libIdToUpdate) {
                const { error: e4 } = await supabase.from('library').update(libUpdates).eq('id', libIdToUpdate);
                if (e4) throw new Error(`Library Update Error: ${e4.message}`);
            } else if (realSlotId) {
                // Si no existe, lo creamos para garantizar que aparezca en el historial
                const { error: e5 } = await supabase.from('library').insert({
                    user_id: user.id,
                    project_id: slot?.project_id || null,
                    type: 'guion',
                    ...libUpdates,
                    metadata: { slot_id: realSlotId }
                });
                if (e5) throw new Error(`Library Insert Error: ${e5.message}`);
            }

            // Force Refresh
            router.refresh();

            // Visual feedback via React state
            setSaving(false);
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
            }, 3000);

        } catch (err) {
            setSaving(false);
            console.error('Error saving script:', err);
            setSaveError(err.message);
            setTimeout(() => {
                setSaveError(null);
            }, 5000);
        }
    }

    // ── Generate / Regenerate script ───────────────────────────────────────
    async function handleGenerate() {
        const realSlotId = slot?.id;
        if (!realSlotId) { alert('Esta idea no tiene slot vinculado. Solo se pueden generar guiones desde ideas del Plan Mensual.'); return; }

        setGenerating(true);
        setShowGenOptions(false);
        setSlotStatus('script_generating');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No autorizado. Por favor, inicia sesión de nuevo.');

            const res = await fetch(`/api/slots/${realSlotId}/generate-script`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    userId,
                    platform: genPlatform || platform || 'Reels',
                    videoDuration: genDuration || '60 seg',
                    focus: genFocus || contentType || 'autoridad',
                    instruction: genInstruction || '',
                }),
            });

            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); setSlotStatus('idea_only'); return; }

            const data = await res.json();
            if (!res.ok || !data.ok) { alert(data.error || 'Error al generar el guion.'); setSlotStatus('script_error'); return; }

            const sc = data.script;
            setScript(sc);
            setHook(sc.hook || '');
            setCtaText(sc.cta || '');
            setNotes(sc.notes || '');
            if (Array.isArray(sc.structure)) {
                setStructureText(sc.structure.map((p, i) => `${i + 1}. ${p.point}: ${p.detail}`).join('\n\n'));
            }
            const pc = sc.post_copy || {};
            setPostHeadline(pc.headline || '');
            setPostBody(pc.body || '');
            setPostHashtags(Array.isArray(pc.hashtags) ? pc.hashtags.join(' ') : '');
            setSlotStatus('script_ready');
        } catch (err) {
            alert('Error de red: ' + err.message);
            setSlotStatus('script_error');
        } finally {
            setGenerating(false);
        }
    }

    // ── Copy script ────────────────────────────────────────────────────────
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

    // ── Render ─────────────────────────────────────────────────────────────
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
            <style>{`
                * { box-sizing: border-box; }
                textarea { font-family: inherit; color-scheme: dark; }
                input { color-scheme: dark; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .notion-editable:hover { background: rgba(255,255,255,0.03) !important; }
                .notion-btn { transition: all 0.18s ease; }
                .notion-btn:hover { opacity: 0.85; transform: translateY(-1px); }
                .gen-options-enter { animation: fadeIn 0.2s ease; }

                @media (max-width: 768px) {
                    .topbar-idea { padding: 10px 16px !important; flex-wrap: wrap; gap: 10px !important; }
                    .topbar-left { width: 100%; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }
                    .topbar-right { width: 100%; justify-content: space-between; gap: 8px !important; }
                    .main-container { padding: 24px 16px 120px 16px !important; }
                    .meta-row { flex-direction: column; align-items: flex-start !important; gap: 4px !important; }
                    .meta-label { min-width: auto !important; }
                    .meta-value { width: 100%; }
                    .meta-value select, .meta-value input { width: 100% !important; border: 1px solid rgba(255,255,255,0.1) !important; padding: 8px !important; border-radius: 8px !important; background: rgba(255,255,255,0.02) !important; }
                    .sticky-footer { flex-wrap: wrap; height: auto !important; padding: 16px !important; bottom: 0; }
                    .sticky-footer .notion-btn { flex: 1; min-width: 140px !important; font-size: 0.8rem !important; padding: 10px !important; }
                    .textarea-field-idea { font-size: 16px !important; } /* Evita zoom en iOS */
                }
            `}</style>

            {/* ═══ TOPBAR ════════════════════════════════════════════════════ */}
            <div className="topbar-idea" style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(13,13,13,0.92)', backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 24px',
            }}>
                {/* Left: back + breadcrumb */}
                <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => router.back()}
                        className="notion-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                        ← Volver
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem' }}>Calendario</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }} className="hide-mobile-mini">/</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hide-mobile-mini">{title || 'Nueva idea'}</span>
                </div>

                {/* Right: actions */}
                <div className="topbar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={handleCopy}
                        className="notion-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', padding: '7px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                        {copied ? '✅ Copiado' : '⧉ Copiar guion'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="notion-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: saveSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(126,206,202,0.15)', border: `1px solid ${saveSuccess ? 'rgba(16, 185, 129, 0.35)' : 'rgba(126,206,202,0.35)'}`, borderRadius: '8px', color: saveSuccess ? '#10B981' : '#7ECECA', padding: '7px 16px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                        {saving ? '💾 Guardando...' : saveSuccess ? '✅ Guardado v5.1.7' : '💾 Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* ═══ MAIN CONTENT ══════════════════════════════════════════════ */}
            <div className="main-container" style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 32px 120px 32px' }}>

                {/* ── STATUS BADGE ─────────────────────────────────────────────── */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Badge status={slotStatus} />
                    {platform && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {platformEmoji} {platform}
                        </span>
                    )}
                    {scheduledDate && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            📅 {new Date(scheduledDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    )}
                </div>

                {/* ── TITLE ──────────────────────────────────────────────────────── */}
                <textarea
                    value={title}
                    onChange={e => { setTitle(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    placeholder="Título de la idea..."
                    rows={1}
                    style={{
                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                        fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: 'white',
                        lineHeight: 1.2, letterSpacing: '-0.03em', resize: 'none', overflow: 'hidden',
                        marginBottom: '32px', padding: '0', fontFamily: 'inherit',
                    }}
                    onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />

                {/* ── METADATA BLOCK ─────────────────────────────────────────────── */}
                <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '14px', padding: '8px 20px', marginBottom: '36px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <MetaRow icon="📱" label="Plataforma">
                        <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
                            {['General', 'Reels', 'TikTok', 'Instagram', 'YouTube', 'YouTube Shorts', 'LinkedIn', 'Twitter', 'X', 'Podcast'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </MetaRow>
                    <MetaRow icon="📅" label="Fecha">
                        <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer', outline: 'none' }} />
                    </MetaRow>
                    <MetaRow icon="🎯" label="Objetivo">
                        <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="engagement, leads, ventas..." style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: 500, width: '100%', outline: 'none' }} />
                    </MetaRow>
                    <MetaRow icon="📌" label="Enfoque">
                        <input value={contentType} onChange={e => setContentType(e.target.value)} placeholder="educativo, storytelling, tutorial..." style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', fontWeight: 500, width: '100%', outline: 'none' }} />
                    </MetaRow>
                    <MetaRow icon="🔖" label="Estado">
                        <Badge status={slotStatus} />
                    </MetaRow>
                </div>

                {/* ── IDEA BLOCK ─────────────────────────────────────────────────── */}
                <Section emoji="💡" title="Resumen de la idea" color="#F59E0B">
                    <EditableBlock value={description} onChange={setDescription} placeholder="Describe la idea en 2-3 frases. Qué aprenderá el espectador, qué historia contarás, qué problema resuelves..." rows={3} />
                </Section>

                {/* ── DIVIDER ──────────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '12px 0 32px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guion</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* ── SCRIPT BLOCK ───────────────────────────────────────────────── */}
                {hasScript ? (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <Section emoji="🎯" title="Hook / Gancho" color="#FFD700">
                            <EditableBlock value={hook} onChange={setHook} placeholder="Frase de apertura que engancha en los primeros 5 segundos..." rows={2} />
                        </Section>
                        <Section emoji="📝" title="Desarrollo / Estructura" color="#7ECECA">
                            <EditableBlock value={structureText} onChange={setStructureText} placeholder="1. Punto clave: Explicación...\n\n2. Ejemplo o caso real...\n\n3. Solución práctica..." rows={8} mono />
                        </Section>
                        <Section emoji="🔥" title="CTA" color="#EF4444">
                            <EditableBlock value={ctaText} onChange={setCtaText} placeholder="Instrucción final al espectador. ¿Qué quieres que haga?" rows={2} />
                        </Section>
                        <Section emoji="📱" title="Post Copy" color="#9D00FF">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <EditableBlock value={postHeadline} onChange={setPostHeadline} placeholder="Primera línea del post (gancho de texto)..." rows={1} />
                                <EditableBlock value={postBody} onChange={setPostBody} placeholder="Cuerpo del post para redes sociales..." rows={4} />
                                <EditableBlock value={postHashtags} onChange={setPostHashtags} placeholder="#hashtag1 #hashtag2 #hashtag3" rows={1} mono />
                            </div>
                        </Section>
                        <Section emoji="🎬" title="Notas de grabación" color="#6B7280">
                            <EditableBlock value={notes} onChange={setNotes} placeholder="Plano recomendado, b-roll, momentos de énfasis, transiciones..." rows={3} />
                        </Section>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✍️</div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', marginBottom: '6px', fontWeight: 600 }}>Todavía no hay guion para esta idea</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginBottom: '24px' }}>Genera un guion completo con IA en 1 clic.</p>
                    </div>
                )}

                {/* ── GENERATE OPTIONS PANEL ─────────────────────────────────────── */}
                {showGenOptions && (
                    <div className="gen-options-enter" style={{ background: 'rgba(126,206,202,0.06)', border: '1px solid rgba(126,206,202,0.2)', borderRadius: '14px', padding: '20px', marginTop: '20px' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7ECECA', marginBottom: '16px' }}>⚙️ Opciones de generación</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>Plataforma</label>
                                <select value={genPlatform} onChange={e => setGenPlatform(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '8px 10px', fontSize: '0.85rem', outline: 'none' }}>
                                    {['Reels', 'TikTok', 'YouTube', 'LinkedIn', 'Podcast', 'General'].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>Duración</label>
                                <select value={genDuration} onChange={e => setGenDuration(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '8px 10px', fontSize: '0.85rem', outline: 'none' }}>
                                    {['30 seg', '60 seg', '90 seg', '2 min', '3 min', '5 min'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>Enfoque IA</label>
                                <select value={genFocus} onChange={e => setGenFocus(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '8px 10px', fontSize: '0.85rem', outline: 'none' }}>
                                    {['autoridad', 'ventas', 'comunidad', 'educativo', 'entretenimiento', 'storytelling'].map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>

                        {hasScript && (
                            <div style={{ marginTop: '16px' }}>
                                <label style={{ fontSize: '0.72rem', color: '#7ECECA', display: 'block', marginBottom: '6px', fontWeight: 800, textTransform: 'uppercase' }}>✍️ Instrucciones de mejora (Ej: más humor, más corto...)</label>
                                <input 
                                    type="text"
                                    value={genInstruction}
                                    onChange={e => setGenInstruction(e.target.value)}
                                    placeholder="¿Qué quieres cambiar del guion actual?"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(126,206,202,0.3)', borderRadius: '10px', color: 'white', padding: '12px 14px', fontSize: '0.88rem', outline: 'none' }}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button onClick={handleGenerate} disabled={generating} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #7ECECA, #4db8b2)', border: 'none', borderRadius: '10px', color: '#0d0d0d', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {generating ? <><span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Generando guion...</> : '✨ Generar ahora'}
                            </button>
                            <button onClick={() => setShowGenOptions(false)} style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                        </div>
                    </div>
                )}

            </div>

            {/* ═══ STICKY FOOTER ACTIONS ═════════════════════════════════════ */}
            <div className="sticky-footer" style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
                background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '12px', padding: '14px 24px',
            }}>
                <button
                    onClick={() => { if (!showGenOptions) setShowGenOptions(true); else handleGenerate(); }}
                    disabled={generating}
                    className="notion-btn"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', border: 'none',
                        background: generating ? 'rgba(126,206,202,0.2)' : 'linear-gradient(135deg, #7ECECA, #4db8b2)',
                        color: generating ? '#7ECECA' : '#0d0d0d',
                        minWidth: '220px', justifyContent: 'center',
                    }}
                >
                    {generating
                        ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(126,206,202,0.4)', borderTopColor: '#7ECECA', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Generando guion...</>
                        : hasScript ? '✨ Regenerar guion con IA' : '✨ Crear Guion con IA'
                    }
                </button>

                {saveError && (
                    <span style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                        ⚠️ Error: {saveError}
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="notion-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: saveSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${saveSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.12)'}`, color: saveSuccess ? '#10B981' : 'rgba(255,255,255,0.85)' }}
                >
                    {saving ? '💾 Guardando...' : saveSuccess ? '✅ Guardado v5.1.7' : '💾 Guardar cambios'}
                </button>

                <button
                    onClick={handleCopy}
                    className="notion-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                    {copied ? '✅' : '⧉'} {copied ? 'Copiado' : 'Copiar guion'}
                </button>
            </div>
        </div>
    );
}

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, Loader2, Copy, Check, BookOpen, Zap, Target, MessageSquare, FileText, ChevronDown, Download } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

const PLATFORMS = ['Reels', 'TikTok', 'Shorts', 'YouTube', 'LinkedIn', 'X', 'General'];
const STATUSES  = ['Borrador', 'Listo', 'Publicado', 'Idea'];

/* ─── Token counter ──────────────────────────────────────────── */
function countWords(str) {
    return (str || '').trim().split(/\s+/).filter(Boolean).length;
}

/* ─── Notion block component ─────────────────────────────────── */
function Block({ icon, label, color, accent, children, collapsible = false, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{
            borderRadius: '16px',
            border: `1px solid ${accent}22`,
            background: `linear-gradient(135deg, ${accent}08 0%, transparent 100%)`,
            overflow: 'hidden',
            marginBottom: '20px',
            transition: 'border-color 0.2s',
        }}>
            <div
                onClick={collapsible ? () => setOpen(o => !o) : undefined}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px 12px',
                    borderBottom: open ? `1px solid ${accent}18` : 'none',
                    cursor: collapsible ? 'pointer' : 'default',
                    userSelect: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: `${accent}18`, border: `1px solid ${accent}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {icon}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {label}
                    </span>
                </div>
                {collapsible && (
                    <div style={{ color: 'rgba(255,255,255,0.2)', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                        <ChevronDown size={15} />
                    </div>
                )}
            </div>
            {open && (
                <div style={{ padding: '16px 20px 20px' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

/* ─── Inline textarea ────────────────────────────────────────── */
function InlineArea({ value, onChange, placeholder, rows = 4, mono = false, large = false }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value]);
    return (
        <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            style={{
                width: '100%', background: 'transparent', border: 'none',
                color: large ? '#ffffff' : 'rgba(255,255,255,0.85)',
                outline: 'none', fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : "'Inter', sans-serif",
                fontSize: large ? '1rem' : '0.92rem',
                lineHeight: large ? 1.7 : 1.75,
                resize: 'none', boxSizing: 'border-box',
                fontWeight: large ? 500 : 400,
                letterSpacing: large ? '-0.01em' : 'normal',
            }}
            onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }}
        />
    );
}

/* ─── Property row ───────────────────────────────────────────── */
function PropRow({ icon, label, children }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '110px', flexShrink: 0 }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 0 }}>{icon}</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
}

const selectStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fff', padding: '5px 10px',
    fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
    fontFamily: "'Inter', sans-serif",
};

/* ─── Main SheetEditor ────────────────────────────────────────── */
export default function SheetEditor({ sheetId, item: initialItem, onClose, onSave, userId, activeProjectId }) {
    const [title,      setTitle]      = useState('');
    const [platform,   setPlatform]   = useState('Reels');
    const [status,     setStatus]     = useState('Borrador');
    const [hook,       setHook]       = useState('');
    const [desarrollo, setDesarrollo] = useState('');
    const [cta,        setCta]        = useState('');
    const [copyPost,   setCopyPost]   = useState('');
    const [fullText,   setFullText]   = useState('');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [saveError,  setSaveError]  = useState('');
    const [itemId,     setItemId]     = useState(sheetId !== 'new' ? sheetId : null);
    const [copied,     setCopied]     = useState(false);
    const [showFull,   setShowFull]   = useState(false);

    const supabase  = createSupabaseClient();
    const timerRef  = useRef(null);
    // Ref keeps latest values for auto-save — avoids stale closure bug
    const latestRef = useRef({ title, platform, status, hook, desarrollo, cta, copyPost, fullText, itemId, userId, activeProjectId });

    useEffect(() => {
        latestRef.current = { title, platform, status, hook, desarrollo, cta, copyPost, fullText, itemId, userId, activeProjectId };
    });

    useEffect(() => {
        const hasRealId = sheetId && sheetId !== 'new';
        if (hasRealId) {
            // Always load fresh from DB when we have a real ID
            loadSheet(sheetId);
        } else if (initialItem) {
            populate(initialItem);
        }
    }, [sheetId]);

    function populate(data) {
        // Never set itemId to the string 'new' — that causes silent save failures
        setItemId(data.id && data.id !== 'new' ? data.id : null);
        setTitle(data.titulo || data.title || '');
        setPlatform(data.platform || 'Reels');
        setStatus(data.metadata?.status || data.status || 'Borrador');
        setHook(data.content?.hook || data.content?.gancho || '');
        const des = data.content?.desarrollo || [];
        setDesarrollo(Array.isArray(des) ? des.join('\n') : String(des || ''));
        setCta(data.content?.cta || data.content?.cierre || '');
        const cp = data.content?.copy_post;
        setCopyPost(
            cp ? (typeof cp === 'string' ? cp
                : `${cp.headline || cp.titulo || ''}\n${cp.body || cp.descripcion_larga || ''}`.trim())
            : ''
        );
        setFullText(data.script_full_text || data.content?.full_text || '');
    }

    async function loadSheet(id) {
        const { data } = await supabase.from('library').select('*').eq('id', id).single();
        if (data) populate(data);
    }

    // Auto-save reads from ref — always uses latest values regardless of closure
    function triggerAutoSave() {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(performSave, 800);
    }

    async function performSave() {
        const d = latestRef.current;
        setSaveStatus('saving');
        try {
            const fullContent = d.fullText || [
                d.hook       ? `⚡ HOOK:\n${d.hook}` : '',
                d.desarrollo ? `📝 DESARROLLO:\n${d.desarrollo}` : '',
                d.cta        ? `📢 CTA:\n${d.cta}` : '',
                d.copyPost   ? `📱 COPY:\n${d.copyPost}` : '',
            ].filter(Boolean).join('\n\n');

            const payload = {
                titulo:           d.title || 'Sin título',
                platform:         d.platform || 'Reels',
                type:             'guion',
                script_full_text: fullContent,
                content: {
                    titulo_angulo: d.title,
                    hook: d.hook || '', gancho: d.hook || '',
                    desarrollo: (d.desarrollo || '').split('\n').filter(l => l.trim()),
                    cta: d.cta || '', copy_post: d.copyPost || null,
                    full_text: fullContent,
                },
            };

            const hasRealId = d.itemId && d.itemId !== 'new';
            if (hasRealId) {
                const { error } = await supabase.from('library').update(payload).eq('id', d.itemId);
                if (error) throw new Error(`Update falló: ${error.message}`);
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                const uid = user?.id;
                if (!uid) throw new Error('No hay sesión activa — recarga la página');
                const { data: ins, error } = await supabase.from('library').insert({
                    ...payload,
                    user_id:    uid,
                    project_id: d.activeProjectId || null,
                    goal:       'engagement',
                }).select().single();
                if (error) throw new Error(`Insert falló: ${error.message}`);
                if (ins) { setItemId(ins.id); onSave?.(ins); }
            }
            setSaveStatus('saved');
            setSaveError('');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (e) {
            console.error('[SheetEditor] save error:', e);
            setSaveStatus('error');
            setSaveError(e.message);
        }
    }

    function change(setter) {
        return (val) => { setter(val); triggerAutoSave(); };
    }

    function copyAll() {
        const d = latestRef.current;
        const text = d.fullText || [
            d.title      ? `🎬 ${d.title}` : '',
            d.hook       ? `\n⚡ HOOK:\n${d.hook}` : '',
            d.desarrollo ? `\n📝 DESARROLLO:\n${d.desarrollo}` : '',
            d.cta        ? `\n📢 CTA:\n${d.cta}` : '',
            d.copyPost   ? `\n📱 COPY:\n${d.copyPost}` : '',
        ].filter(Boolean).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function downloadDocx() {
        const d = latestRef.current;
        try {
            const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle, ShadingType } = await import('docx');

            const heading = (text, level = HeadingLevel.HEADING_2, color = '7c3aed') => new Paragraph({
                heading: level,
                children: [new TextRun({ text, bold: true, color, size: level === HeadingLevel.TITLE ? 48 : 28 })],
                spacing: { before: 240, after: 120 },
            });

            const body = (text, color = '333333') => new Paragraph({
                children: [new TextRun({ text: text || '', size: 24, color })],
                spacing: { before: 60, after: 60 },
            });

            const divider = () => new Paragraph({
                children: [new TextRun({ text: '' })],
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' } },
                spacing: { before: 200, after: 200 },
            });

            const sectionLabel = (emoji, label, color = '7c3aed') => new Paragraph({
                children: [
                    new TextRun({ text: `${emoji} `, size: 26 }),
                    new TextRun({ text: label.toUpperCase(), bold: true, size: 22, color, allCaps: true }),
                ],
                spacing: { before: 300, after: 80 },
            });

            const children = [
                // Cover
                new Paragraph({ children: [new TextRun({ text: 'WRITI.AI', size: 18, color: '9ca3af' })], spacing: { after: 80 } }),
                new Paragraph({
                    children: [new TextRun({ text: d.title || 'Sin título', bold: true, size: 52, color: '111827' })],
                    spacing: { after: 120 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Plataforma: `, size: 22, color: '6b7280' }),
                        new TextRun({ text: d.platform, size: 22, bold: true, color: '4b5563' }),
                        new TextRun({ text: `   ·   Estado: `, size: 22, color: '6b7280' }),
                        new TextRun({ text: d.status, size: 22, bold: true, color: '4b5563' }),
                        new TextRun({ text: `   ·   Generado con WRITI.AI`, size: 22, color: '9ca3af' }),
                    ],
                    spacing: { after: 200 },
                }),
                divider(),

                // Hook
                ...(d.hook ? [
                    sectionLabel('⚡', 'Hook — Para el scroll', '7c3aed'),
                    new Paragraph({
                        children: [new TextRun({ text: d.hook, size: 26, bold: true, color: '1f2937', italics: false })],
                        spacing: { before: 60, after: 180 },
                    }),
                    divider(),
                ] : []),

                // Desarrollo
                ...(d.desarrollo ? [
                    sectionLabel('📝', 'Desarrollo', '374151'),
                    ...d.desarrollo.split('\n').filter(l => l.trim()).map((line, i) =>
                        new Paragraph({
                            children: [new TextRun({ text: line, size: 24, color: '374151' })],
                            spacing: { before: 40, after: 40 },
                            bullet: { level: 0 },
                        })
                    ),
                    divider(),
                ] : []),

                // CTA
                ...(d.cta ? [
                    sectionLabel('📢', 'CTA — Llamada a la acción', '059669'),
                    new Paragraph({
                        children: [new TextRun({ text: d.cta, size: 24, bold: true, color: '059669' })],
                        spacing: { before: 60, after: 180 },
                    }),
                ] : []),

                // Copy redes
                ...(d.copyPost ? [
                    divider(),
                    sectionLabel('📱', 'Copy para redes sociales', '0ea5e9'),
                    ...d.copyPost.split('\n').map(line =>
                        new Paragraph({
                            children: [new TextRun({ text: line, size: 22, color: '374151' })],
                            spacing: { before: 40, after: 40 },
                        })
                    ),
                ] : []),

                // Full text fallback
                ...(d.fullText && !d.hook ? [
                    divider(),
                    sectionLabel('📄', 'Guion completo', '374151'),
                    ...d.fullText.split('\n').map(line =>
                        new Paragraph({
                            children: [new TextRun({ text: line || ' ', size: 23, color: '374151' })],
                            spacing: { before: 30, after: 30 },
                        })
                    ),
                ] : []),
            ];

            const doc = new Document({
                creator: 'WRITI.AI',
                title: d.title || 'Guion',
                sections: [{
                    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                    children,
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(d.title || 'guion').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[DOCX] Error:', e);
            alert('Error al generar el documento: ' + e.message);
        }
    }

    const totalWords = countWords(hook) + countWords(desarrollo) + countWords(cta) + countWords(copyPost) + countWords(fullText);
    const hasContent = hook || desarrollo || cta || copyPost || fullText;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#0c0c0e',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
            {/* ── Topbar ─────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 24px', height: '54px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(13,13,20,0.95)',
                backdropFilter: 'blur(12px)',
                flexShrink: 0,
                gap: '16px',
            }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <BookOpen size={14} color="rgba(255,255,255,0.2)" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>Biblioteca</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>/</span>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                        {title || 'Sin título'}
                    </span>
                </div>

                {/* Right controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {/* Auto-save */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                        {saveStatus === 'saving' && (
                            <><Loader2 size={12} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite' }} /><span style={{ color: '#a78bfa' }}>Guardando…</span></>
                        )}
                        {saveStatus === 'saved' && (
                            <><CheckCircle2 size={12} color="#34d399" /><span style={{ color: '#34d399' }}>Guardado ✓</span></>
                        )}
                        {saveStatus === 'error' && (
                            <span style={{ color: '#f87171', fontWeight: 700 }} title={saveError}>
                                ⚠ {saveError || 'Error al guardar'}
                            </span>
                        )}
                        {saveStatus === 'idle' && <span>Auto-guardado activo</span>}
                    </div>

                    {/* Word count */}
                    {totalWords > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)', padding: '3px 9px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {totalWords} palabras
                        </span>
                    )}

                    {/* Copy button */}
                    {hasContent && (
                        <button onClick={copyAll}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', color: copied ? '#34d399' : 'rgba(255,255,255,0.5)', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                            {copied ? 'Copiado' : 'Copiar todo'}
                        </button>
                    )}

                    {/* Download DOCX */}
                    {hasContent && (
                        <button onClick={downloadDocx} title="Descargar como Word (.docx)"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.1)'; e.currentTarget.style.color = '#7dd3fc'; e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                            <Download size={13} />
                            Descargar .docx
                        </button>
                    )}

                    {/* Close */}
                    <button onClick={async () => { clearTimeout(timerRef.current); await performSave(); onClose?.(); }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', width: '34px', height: '34px', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ── Two-column layout ─────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflowY: 'hidden', minHeight: 0 }}>

                {/* ── LEFT: Properties sidebar ──────────────── */}
                <div style={{
                    width: '240px', flexShrink: 0,
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.01)',
                    overflowY: 'auto',
                    padding: '28px 20px',
                    display: 'flex', flexDirection: 'column', gap: '4px',
                }}>
                    <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                        Propiedades
                    </p>

                    <PropRow icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>} label="Plataforma">
                        <select value={platform} onChange={e => change(setPlatform)(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                            {PLATFORMS.map(p => <option key={p} value={p} style={{ background: '#1a1a24' }}>{p}</option>)}
                        </select>
                    </PropRow>

                    <PropRow icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} label="Estado">
                        <select value={status} onChange={e => change(setStatus)(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                            {STATUSES.map(s => <option key={s} value={s} style={{ background: '#1a1a24' }}>{s}</option>)}
                        </select>
                    </PropRow>

                    <PropRow icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>} label="Tipo">
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(167,139,250,0.1)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, color: '#a78bfa' }}>Guion</span>
                    </PropRow>

                    {/* Quick stats */}
                    {totalWords > 0 && (
                        <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: '12px' }}>
                            <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(167,139,250,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Estadísticas</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: 'Palabras', value: totalWords },
                                    { label: 'Hook', value: `${countWords(hook)} pal.` },
                                    { label: 'Desarrollo', value: `${countWords(desarrollo)} pal.` },
                                    { label: 'Lectura', value: `~${Math.max(1, Math.ceil(totalWords / 150))} min` },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Content ──────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '48px 56px 80px' }}>
                    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

                        {/* Big Notion-style title */}
                        <textarea
                            value={title}
                            onChange={e => change(setTitle)(e.target.value)}
                            placeholder="Sin título…"
                            rows={1}
                            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                            style={{
                                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                                color: '#ffffff', fontFamily: "'Inter', sans-serif",
                                fontSize: '2.6rem', fontWeight: 900, lineHeight: 1.15,
                                letterSpacing: '-0.04em', resize: 'none', boxSizing: 'border-box',
                                marginBottom: '40px',
                            }}
                        />

                        {/* ── Hook block ───────────────────────── */}
                        <Block
                            icon={<Zap size={14} color="#a78bfa" />}
                            label="Hook — Para el scroll"
                            color="white"
                            accent="#a78bfa"
                        >
                            <InlineArea
                                value={hook}
                                onChange={change(setHook)}
                                placeholder="Las primeras 10–15 palabras que paran el scroll. Deben generar curiosidad, impacto o emoción en los primeros 3 segundos…"
                                rows={3}
                                large
                            />
                        </Block>

                        {/* ── Desarrollo block ─────────────────── */}
                        <Block
                            icon={<MessageSquare size={14} color="rgba(255,255,255,0.5)" />}
                            label="Desarrollo — Cuerpo del guion"
                            color="white"
                            accent="rgba(255,255,255,0.3)"
                        >
                            <InlineArea
                                value={desarrollo}
                                onChange={change(setDesarrollo)}
                                placeholder={`1. Primer punto clave del video\n2. Segundo punto con ejemplo o historia\n3. Tercer punto con el dato que sorprende\n\nEscribe libremente o usa bloques numerados…`}
                                rows={10}
                            />
                        </Block>

                        {/* ── CTA block ────────────────────────── */}
                        <Block
                            icon={<Target size={14} color="#34d399" />}
                            label="CTA — Llamada a la acción"
                            color="white"
                            accent="#34d399"
                        >
                            <InlineArea
                                value={cta}
                                onChange={change(setCta)}
                                placeholder="¿Qué quieres que haga el espectador? Sé directo y específico…"
                                rows={2}
                            />
                        </Block>

                        {/* ── Copy redes block ─────────────────── */}
                        <Block
                            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
                            label="Copy para redes sociales"
                            color="white"
                            accent="#60a5fa"
                            collapsible
                            defaultOpen={!!copyPost}
                        >
                            <InlineArea
                                value={copyPost}
                                onChange={change(setCopyPost)}
                                placeholder="Título del post / Caption para Instagram, TikTok, YouTube…\n\n#hashtag1 #hashtag2 #hashtag3"
                                rows={4}
                            />
                        </Block>

                        {/* ── Guion completo block ─────────────── */}
                        <Block
                            icon={<FileText size={14} color="rgba(255,255,255,0.3)" />}
                            label="Guion completo (texto libre)"
                            color="white"
                            accent="rgba(255,255,255,0.15)"
                            collapsible
                            defaultOpen={!!fullText && !hook}
                        >
                            <InlineArea
                                value={fullText}
                                onChange={change(setFullText)}
                                placeholder="Pega o escribe aquí el guion completo en formato libre…"
                                rows={14}
                                mono
                            />
                        </Block>

                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
                textarea::placeholder { color: rgba(255,255,255,0.2) !important; }
            `}</style>
        </div>
    );
}

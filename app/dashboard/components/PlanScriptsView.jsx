'use client';
import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import {
    Loader2, Sparkles, RefreshCw, BookOpen, Copy, Check,
    Zap, MessageSquare, Target, GitBranch, ChevronDown, ChevronUp,
    CalendarDays, CheckCircle2, AlertCircle
} from 'lucide-react';

const VARIANT_OPTIONS = [
    { id: 'storytelling', label: 'Storytelling personal', emoji: '🎭' },
    { id: 'educativo',    label: 'Educativo directo',     emoji: '📚' },
    { id: 'provocador',   label: 'Provocador / gancho fuerte', emoji: '🔥' },
];

function parseSections(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') return { fullText: raw };
    return {
        title: raw.title || '',
        hook: raw.hook || raw.gancho || '',
        structure: raw.structure || (raw.desarrollo
            ? (Array.isArray(raw.desarrollo) ? raw.desarrollo.map(d => {
                const sep = d.indexOf(':');
                return sep > 0
                    ? { point: d.slice(0, sep).trim(), detail: d.slice(sep + 1).trim() }
                    : { point: d, detail: '' };
              }) : [])
            : []),
        cta: raw.cta || raw.cierre || '',
        copyPost: raw.post_copy || raw.copy_post || null,
        fullText: '',
    };
}

/* ── Single Script Card ────────────────────────────────────── */
function ScriptCard({ slot, idx, onGenerate, loading, error, script, saved,
    variant, loadingVariant, showVariantPicker, onToggleVariantPicker, onSelectVariant }) {

    const [copied, setCopied]         = useState(false);
    const [expanded, setExpanded]     = useState(false);
    const [varExpanded, setVarExpanded] = useState(true);
    const sections = script ? parseSections(script.raw) : null;
    const varSections = variant ? parseSections(variant.raw) : null;

    function copyText() {
        navigator.clipboard.writeText(script?.text || '').catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{
            background: '#13131a',
            border: `1px solid ${script ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '20px', overflow: 'hidden', marginBottom: '16px',
            transition: 'border-color 0.3s',
        }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px', borderBottom: script ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: script ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${script ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800,
                    color: script ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                }}>{idx + 1}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        {slot.content_type && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {slot.content_type}
                            </span>
                        )}
                        {slot.platform && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                                {slot.platform}
                            </span>
                        )}
                        {saved && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <BookOpen size={10} /> En Biblioteca
                            </span>
                        )}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: 0 }}>
                        {slot.idea_title}
                    </h3>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {script && (
                        <>
                            <button onClick={copyText} title="Copiar"
                                style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: copied ? '#34d399' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {copied ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                            <div style={{ position: 'relative' }}>
                                <button onClick={onToggleVariantPicker}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: showVariantPicker ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: showVariantPicker ? '#f59e0b' : 'rgba(255,255,255,0.4)', border: `1px solid ${showVariantPicker ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 9, padding: '7px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                    <GitBranch size={13} /> Variante {showVariantPicker ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                                {showVariantPicker && (
                                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#1a1a24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 6, zIndex: 50, minWidth: 220, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                                        {VARIANT_OPTIONS.map(opt => (
                                            <button key={opt.id} onClick={() => onSelectVariant(opt.id)} disabled={loadingVariant}
                                                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: loadingVariant ? '#555' : 'rgba(255,255,255,0.8)', fontSize: '0.82rem', fontWeight: 600, cursor: loadingVariant ? 'not-allowed' : 'pointer', borderRadius: 8, textAlign: 'left' }}
                                                onMouseEnter={e => { if (!loadingVariant) e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <span style={{ fontSize: '1rem' }}>{opt.emoji}</span>{opt.label}
                                                {loadingVariant && <Loader2 size={12} style={{ marginLeft: 'auto', animation: 'spin 0.8s linear infinite' }} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <button onClick={onGenerate} disabled={loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: loading ? 'rgba(255,255,255,0.04)' : script ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.15)', color: loading ? '#555' : script ? 'rgba(255,255,255,0.4)' : '#a78bfa', border: `1px solid ${script ? 'rgba(255,255,255,0.09)' : 'rgba(124,58,237,0.25)'}`, borderRadius: 9, padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={13} />}
                        {script ? 'Regenerar' : 'Generar'}
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(167,139,250,0.04)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Loader2 size={18} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: 3 }}>Escribiendo tu guion…</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>La IA está personalizando el guion con tu cerebro IA</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div style={{ padding: '16px 24px', display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(248,113,113,0.05)' }}>
                    <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.82rem', color: '#f87171', margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Script content */}
            {script && !loading && sections && (
                <div style={{ padding: '0 24px 20px' }}>
                    {sections.hook && (
                        <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderLeft: '3px solid #a78bfa', borderRadius: '0 12px 12px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <Zap size={12} color="#a78bfa" />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hook</span>
                            </div>
                            <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{sections.hook}</p>
                        </div>
                    )}

                    {sections.structure?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <MessageSquare size={12} color="rgba(255,255,255,0.3)" />
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Desarrollo · {sections.structure.length} bloques
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(expanded ? sections.structure : sections.structure.slice(0, 2)).map((block, i) => (
                                    <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{i + 1}. {block.point}</p>
                                        <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, margin: 0 }}>{block.detail}</p>
                                    </div>
                                ))}
                                {!expanded && sections.structure.length > 2 && (
                                    <button onClick={() => setExpanded(true)}
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center' }}>
                                        +{sections.structure.length - 2} bloques más — ver completo
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {sections.cta && (
                        <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderLeft: '3px solid #34d399', borderRadius: '0 10px 10px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                <Target size={12} color="#34d399" />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CTA</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, lineHeight: 1.5 }}>{sections.cta}</p>
                        </div>
                    )}

                    {!sections.hook && !sections.structure?.length && sections.fullText && (
                        <pre style={{ marginTop: 16, fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                            {expanded ? sections.fullText : sections.fullText.slice(0, 300) + (sections.fullText.length > 300 ? '…' : '')}
                            {!expanded && sections.fullText.length > 300 && (
                                <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', marginTop: 6, fontWeight: 600, display: 'block' }}>Ver completo →</button>
                            )}
                        </pre>
                    )}

                    {/* Variant loading */}
                    {loadingVariant && (
                        <div style={{ marginTop: 14, padding: '14px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Loader2 size={15} style={{ color: '#f59e0b', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Generando variante…</p>
                        </div>
                    )}

                    {/* Variant result */}
                    {variant && !loadingVariant && varSections && (
                        <div style={{ marginTop: 14, border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, overflow: 'hidden' }}>
                            <button onClick={() => setVarExpanded(v => !v)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: 'none', cursor: 'pointer', color: '#f59e0b' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                                    <GitBranch size={13} /> Variante: {VARIANT_OPTIONS.find(o => o.id === variant.type)?.emoji} {VARIANT_OPTIONS.find(o => o.id === variant.type)?.label}
                                </span>
                                {varExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {varExpanded && (
                                <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.04)' }}>
                                    {varSections.hook && <div style={{ marginBottom: 10, padding: '12px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderLeft: '3px solid #f59e0b', borderRadius: '0 10px 10px 0' }}><div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Hook</div><p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0 }}>{varSections.hook}</p></div>}
                                    {varSections.structure?.map((b, i) => (
                                        <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, marginBottom: 6 }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>{i + 1}. {b.point}</p>
                                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>{b.detail}</p>
                                        </div>
                                    ))}
                                    {varSections.cta && <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderLeft: '3px solid #34d399', borderRadius: '0 10px 10px 0' }}><div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>CTA</div><p style={{ fontSize: '0.85rem', color: '#fff', margin: 0 }}>{varSections.cta}</p></div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* No script yet */}
            {!script && !loading && !error && (
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ flex: 1, fontSize: '0.83rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                        Haz clic en "Generar" para crear el guion con IA
                    </p>
                    <button onClick={onGenerate}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                        <Sparkles size={14} /> Generar guion
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── Main PlanScriptsView ──────────────────────────────────── */
export default function PlanScriptsView({ slots, projectId, initialScripts = {}, onScriptsChange, onSendToCalendar, sendingToCalendar }) {
    const supabase = createSupabaseClient();
    const [scripts, setScripts]               = useState(initialScripts);
    const [loading, setLoading]               = useState({});
    const [errors, setErrors]                 = useState({});
    const [saved, setSaved]                   = useState(() => {
        // Mark as saved any slots that already have scripts from cache
        const s = {};
        Object.keys(initialScripts).forEach(id => { s[id] = true; });
        return s;
    });
    const [variants, setVariants]             = useState({});
    const [loadingVariant, setLoadingVariant] = useState({});
    const [showVariantPicker, setShowVariantPicker] = useState({});
    const [autoRunning, setAutoRunning]       = useState(false);
    const [globalError, setGlobalError]       = useState('');
    const autoStartedRef                      = useRef(false);
    const scriptsRef                          = useRef(initialScripts); // always current, no stale closure

    // Keep scriptsRef in sync
    useEffect(() => { scriptsRef.current = scripts; }, [scripts]);

    // Notify parent when scripts change (for module-level cache persistence)
    useEffect(() => {
        onScriptsChange?.(scripts);
    }, [scripts]);

    // Auto-generate all on mount (only for slots without cached scripts)
    useEffect(() => {
        if (!slots?.length || autoStartedRef.current) return;
        const pending = slots.filter(s => !initialScripts[s.id]);
        if (pending.length === 0) return;
        autoStartedRef.current = true;
        generateAll();
    }, [slots]);

    async function getToken() {
        // Retry up to 3 times with delay — session might not be ready on first mount
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) return session.access_token;
            } catch {}
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
        return '';
    }

    async function generateOne(slotId, preloadedToken) {
        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;
        setLoading(p => ({ ...p, [slotId]: true }));
        setErrors(p => ({ ...p, [slotId]: '' }));
        try {
            const tok = preloadedToken || await getToken();
            if (!tok) throw new Error('Sin sesión activa. Recarga la página.');
            const res = await fetch('/api/generate-idea-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                body: JSON.stringify({
                    idea_title: slot.idea_title,
                    idea_description: slot.idea_description || '',
                    platform: slot.platform || 'Reels',
                    projectId: projectId || null,
                    videoDuration: slot.platform?.toLowerCase().includes('youtube') && !slot.platform?.toLowerCase().includes('short') ? '5-10 min' : '60-90 seg',
                }),
            });
            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error generando guion.'); }
            const data = await res.json();
            const raw = data.script || {};
            const obj = { text: formatText(raw), raw };
            setScripts(p => ({ ...p, [slotId]: obj }));
            setSaved(p => ({ ...p, [slotId]: true }));
        } catch (e) {
            setErrors(p => ({ ...p, [slotId]: e.message }));
        } finally {
            setLoading(p => ({ ...p, [slotId]: false }));
        }
    }

    async function generateVariant(slotId, variantType) {
        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;
        setLoadingVariant(p => ({ ...p, [slotId]: true }));
        setShowVariantPicker(p => ({ ...p, [slotId]: false }));
        try {
            const tok = await getToken();
            const res = await fetch('/api/generate-idea-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                body: JSON.stringify({
                    idea_title: slot.idea_title,
                    idea_description: slot.idea_description || '',
                    platform: slot.platform || 'Reels',
                    projectId: projectId || null,
                    videoDuration: '60 seg',
                    ctaIdea: `Estilo: ${variantType}`,
                }),
            });
            if (!res.ok) throw new Error('Error generando variante.');
            const data = await res.json();
            const raw = data.script || {};
            setVariants(p => ({ ...p, [slotId]: { type: variantType, text: formatText(raw), raw } }));
        } catch (e) {
            setErrors(p => ({ ...p, [slotId]: e.message }));
        } finally {
            setLoadingVariant(p => ({ ...p, [slotId]: false }));
        }
    }

    async function generateAll() {
        setAutoRunning(true);
        setGlobalError('');

        const tok = await getToken();
        if (!tok) {
            setGlobalError('Sesión no disponible. Recarga la página e intenta de nuevo.');
            setAutoRunning(false);
            return;
        }

        // Secuencial con pausa para no exceder rate limit de Anthropic (10k tokens/min)
        const pending = (slots || []).filter(s => !scriptsRef.current[s.id]);

        for (let i = 0; i < pending.length; i++) {
            await generateOne(pending[i].id, tok);
            if (i < pending.length - 1) {
                await new Promise(r => setTimeout(r, 3000)); // 3s entre guiones
            }
        }

        setAutoRunning(false);
    }

    function formatText(s) {
        if (!s) return '';
        if (typeof s === 'string') return s;
        const p = [];
        if (s.title) p.push(`🎬 ${s.title}\n`);
        if (s.hook)  p.push(`⚡ HOOK:\n${s.hook}\n`);
        if (s.structure?.length) { p.push('📝 DESARROLLO:'); s.structure.forEach((b, i) => p.push(`\n${i + 1}. ${b.point}\n${b.detail}`)); }
        if (s.cta)   p.push(`\n\n📢 CTA:\n${s.cta}`);
        return p.join('\n');
    }

    const doneCount = (slots || []).filter(s => scripts[s.id]).length;
    const allDone   = slots?.length > 0 && doneCount === slots.length;
    const hasErrors = (slots || []).some(s => errors[s.id]);

    // Build slots with script_data for calendar sync
    function getSlotsWithScripts() {
        return (slots || []).map(slot => {
            const sc = scripts[slot.id];
            if (!sc?.raw) return slot;
            return {
                ...slot,
                has_script: true,
                script_data: {
                    hook: sc.raw.hook || sc.raw.gancho || '',
                    desarrollo: (sc.raw.structure || []).map(b => `${b.point}: ${b.detail}`),
                    cta: sc.raw.cta || '',
                    copy_post: sc.raw.post_copy || {},
                },
                script_full_text: sc.text,
            };
        });
    }

    return (
        <div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Global error */}
            {globalError && (
                <div style={{ padding: '14px 18px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: '0.85rem', color: '#f87171', margin: 0 }}>⚠ {globalError}</p>
                    <button onClick={() => { setGlobalError(''); generateAll(); }} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                        Reintentar
                    </button>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.02em' }}>
                        ✍️ Guiones de tu plan
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                        {doneCount}/{slots?.length || 0} generados · Se guardan automáticamente en Biblioteca
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {!allDone && (
                        <button onClick={generateAll} disabled={autoRunning}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: autoRunning ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.15)', color: autoRunning ? '#555' : '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10, padding: '9px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: autoRunning ? 'not-allowed' : 'pointer' }}>
                            {autoRunning ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={14} />}
                            {autoRunning ? 'Generando...' : 'Generar todos'}
                        </button>
                    )}
                </div>
            </div>

            {/* Script cards */}
            {(slots || []).map((slot, idx) => (
                <ScriptCard
                    key={slot.id}
                    slot={slot}
                    idx={idx}
                    total={slots.length}
                    onGenerate={() => generateOne(slot.id)}
                    loading={!!loading[slot.id]}
                    error={errors[slot.id] || ''}
                    script={scripts[slot.id] || null}
                    saved={!!saved[slot.id]}
                    variant={variants[slot.id] || null}
                    loadingVariant={!!loadingVariant[slot.id]}
                    showVariantPicker={!!showVariantPicker[slot.id]}
                    onToggleVariantPicker={() => setShowVariantPicker(p => ({ ...p, [slot.id]: !p[slot.id] }))}
                    onSelectVariant={(type) => generateVariant(slot.id, type)}
                />
            ))}

            {/* Send to calendar */}
            <div style={{ marginTop: 32, padding: '20px 24px', background: allDone ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${allDone ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    {allDone ? (
                        <>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399', margin: '0 0 4px' }}>
                                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                                {doneCount} guiones listos para publicar
                            </p>
                            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                                Al guardar se envían al Calendario y a la Biblioteca
                            </p>
                        </>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                            {autoRunning ? `Generando guiones... ${doneCount}/${slots?.length}` : `${doneCount} de ${slots?.length} guiones listos${hasErrors ? ' (algunos fallaron — puedes regenerarlos)' : ''}`}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onSendToCalendar(getSlotsWithScripts())}
                    disabled={sendingToCalendar || doneCount === 0}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: doneCount > 0 ? '#22c55e' : 'rgba(255,255,255,0.05)', color: doneCount > 0 ? '#fff' : '#555', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: '0.9rem', fontWeight: 800, cursor: doneCount > 0 && !sendingToCalendar ? 'pointer' : 'not-allowed', boxShadow: doneCount > 0 ? '0 4px 20px rgba(34,197,94,0.3)' : 'none', transition: 'all 0.2s' }}>
                    {sendingToCalendar ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CalendarDays size={16} />}
                    {sendingToCalendar ? 'Enviando...' : 'Guardar y enviar al Calendario'}
                </button>
            </div>
        </div>
    );
}

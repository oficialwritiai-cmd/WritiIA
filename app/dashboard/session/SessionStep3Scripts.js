'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import {
    Loader2, Sparkles, ChevronRight, CheckCircle2,
    AlertCircle, RefreshCw, BookOpen, Copy, Check,
    Zap, FileText, MessageSquare, Target, GitBranch, ChevronDown, ChevronUp
} from 'lucide-react';

const VARIANT_OPTIONS = [
    { id: 'storytelling', label: 'Storytelling personal', emoji: '🎭' },
    { id: 'educativo',    label: 'Educativo directo',     emoji: '📚' },
    { id: 'provocador',   label: 'Provocador / gancho fuerte', emoji: '🔥' },
];

/* ─── Parse script object into clean sections ─────── */
function parseSections(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
        return { fullText: raw };
    }
    return {
        title:     raw.title     || '',
        hook:      raw.hook      || '',
        structure: raw.structure || [],
        cta:       raw.cta       || '',
        copyPost:  raw.post_copy || null,
        fullText:  '',
    };
}

/* ─── Single script card ───────────────────────────── */
function ScriptCard({ slot, idx, total, onGenerate, onSave, loading, error, script, saved,
    variant, loadingVariant, showVariantPicker, onToggleVariantPicker, onSelectVariant }) {
    const [copied, setCopied]         = useState(false);
    const [expanded, setExpanded]     = useState(false);
    const [variantExpanded, setVariantExpanded] = useState(true);
    const sections = script ? parseSections(script.raw) : null;
    const variantSections = variant ? parseSections(variant.raw) : null;

    function copyText() {
        const text = script?.text || '';
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{
            background: '#13131a',
            border: `1px solid ${script ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '20px',
            overflow: 'hidden',
            transition: 'border-color 0.2s',
            marginBottom: '16px',
        }}>
            {/* Card header */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px', borderBottom: script ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* Number badge */}
                <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                    background: script ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${script ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800,
                    color: script ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                }}>
                    {idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        {slot.content_type && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', borderRadius: '6px', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {slot.content_type}
                            </span>
                        )}
                        {saved && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', borderRadius: '6px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <BookOpen size={10} /> En Biblioteca
                            </span>
                        )}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: 0 }}>
                        {slot.idea_title}
                    </h3>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {script && (
                        <>
                            <button onClick={copyText} title="Copiar guion"
                                style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: copied ? '#34d399' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                {copied ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                            <button onClick={() => setExpanded(e => !e)}
                                style={{ width: '34px', height: '34px', borderRadius: '9px', background: expanded ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${expanded ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.09)'}`, color: expanded ? '#a78bfa' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                <FileText size={15} />
                            </button>
                            {/* Variant picker trigger */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={onToggleVariantPicker}
                                    title="Generar variante"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        background: showVariantPicker ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                                        color: showVariantPicker ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                        border: `1px solid ${showVariantPicker ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.09)'}`,
                                        borderRadius: '9px', padding: '7px 12px',
                                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                    }}>
                                    <GitBranch size={13} />
                                    Variante
                                    {showVariantPicker ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                                {/* Inline dropdown */}
                                {showVariantPicker && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                                        background: '#1a1a24', border: '1px solid rgba(245,158,11,0.25)',
                                        borderRadius: '12px', padding: '6px', zIndex: 50,
                                        minWidth: '220px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                    }}>
                                        {VARIANT_OPTIONS.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => onSelectVariant(opt.id)}
                                                disabled={loadingVariant}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    width: '100%', padding: '10px 12px',
                                                    background: 'transparent', border: 'none',
                                                    color: loadingVariant ? '#555' : 'rgba(255,255,255,0.8)',
                                                    fontSize: '0.82rem', fontWeight: 600, cursor: loadingVariant ? 'not-allowed' : 'pointer',
                                                    borderRadius: '8px', textAlign: 'left', transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => { if (!loadingVariant) e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span style={{ fontSize: '1rem' }}>{opt.emoji}</span>
                                                {opt.label}
                                                {loadingVariant && variant?.type === opt.id && (
                                                    <Loader2 size={12} style={{ marginLeft: 'auto', animation: 'spin 0.8s linear infinite' }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <button onClick={onGenerate} disabled={loading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: loading ? 'rgba(255,255,255,0.04)' : script ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.15)',
                            color: loading ? '#555' : script ? 'rgba(255,255,255,0.4)' : '#a78bfa',
                            border: `1px solid ${script ? 'rgba(255,255,255,0.09)' : 'rgba(124,58,237,0.25)'}`,
                            borderRadius: '9px', padding: '7px 14px',
                            fontSize: '0.78rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                        }}>
                        {loading ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={13} />}
                        {script ? 'Regenerar' : 'Generar'}
                    </button>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(167,139,250,0.04)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Loader2 size={18} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>Escribiendo tu guion…</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>La IA está personalizando el guion con tu cerebro IA</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div style={{ padding: '16px 24px', display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(248,113,113,0.05)' }}>
                    <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.82rem', color: '#f87171' }}>{error}</p>
                </div>
            )}

            {/* Script preview cards — always visible when script exists */}
            {script && !loading && sections && (
                <div style={{ padding: '0 24px 20px' }}>

                    {/* Hook — always visible */}
                    {sections.hook && (
                        <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderLeft: '3px solid #a78bfa', borderRadius: '0 12px 12px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <Zap size={12} color="#a78bfa" />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hook</span>
                            </div>
                            <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                                {sections.hook}
                            </p>
                        </div>
                    )}

                    {/* Structure blocks — shown when expanded or if short */}
                    {sections.structure?.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <MessageSquare size={12} color="rgba(255,255,255,0.3)" />
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Desarrollo · {sections.structure.length} bloques
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(expanded ? sections.structure : sections.structure.slice(0, 2)).map((block, i) => (
                                    <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                                            {i + 1}. {block.point}
                                        </p>
                                        <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, margin: 0 }}>
                                            {block.detail}
                                        </p>
                                    </div>
                                ))}
                                {!expanded && sections.structure.length > 2 && (
                                    <button onClick={() => setExpanded(true)}
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'center' }}>
                                        +{sections.structure.length - 2} bloques más — ver completo
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    {sections.cta && (
                        <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderLeft: '3px solid #34d399', borderRadius: '0 10px 10px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                <Target size={12} color="#34d399" />
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CTA</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, lineHeight: 1.5 }}>{sections.cta}</p>
                        </div>
                    )}

                    {/* Copy post */}
                    {sections.copyPost && (sections.copyPost.headline || sections.copyPost.body) && expanded && (
                        <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>📱 Copy Redes</span>
                            </div>
                            {sections.copyPost.headline && <p style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{sections.copyPost.headline}</p>}
                            {sections.copyPost.body && <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0 }}>{sections.copyPost.body}</p>}
                        </div>
                    )}

                    {/* Full text fallback */}
                    {!sections.hook && !sections.structure?.length && sections.fullText && (
                        <div style={{ marginTop: '16px' }}>
                            <pre style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                                {expanded ? sections.fullText : sections.fullText.slice(0, 300) + (sections.fullText.length > 300 ? '…' : '')}
                            </pre>
                            {!expanded && sections.fullText.length > 300 && (
                                <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', marginTop: '6px', fontWeight: 600 }}>
                                    Ver completo →
                                </button>
                            )}
                        </div>
                    )}

                    {/* Save to library button */}
                    {!saved && (
                        <button onClick={() => onSave(slot.id)} style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '9px', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                            <BookOpen size={13} /> Guardar en Biblioteca
                        </button>
                    )}

                    {/* Variant loading state */}
                    {loadingVariant && (
                        <div style={{ marginTop: '14px', padding: '14px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Loader2 size={15} style={{ color: '#f59e0b', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Generando variante…</p>
                        </div>
                    )}

                    {/* Variant result */}
                    {variant && !loadingVariant && (
                        <div style={{ marginTop: '14px', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '14px', overflow: 'hidden' }}>
                            <button
                                onClick={() => setVariantExpanded(v => !v)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: 'none', cursor: 'pointer', color: '#f59e0b' }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                                    <GitBranch size={13} />
                                    Variante: {VARIANT_OPTIONS.find(o => o.id === variant.type)?.emoji}{' '}
                                    {VARIANT_OPTIONS.find(o => o.id === variant.type)?.label}
                                </span>
                                {variantExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {variantExpanded && variantSections && (
                                <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.04)' }}>
                                    {variantSections.hook && (
                                        <div style={{ marginBottom: '10px', padding: '12px 14px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderLeft: '3px solid #f59e0b', borderRadius: '0 10px 10px 0' }}>
                                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>Hook</div>
                                            <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0 }}>{variantSections.hook}</p>
                                        </div>
                                    )}
                                    {variantSections.structure?.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                            {variantSections.structure.map((block, i) => (
                                                <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>{i + 1}. {block.point}</p>
                                                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>{block.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {variantSections.cta && (
                                        <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderLeft: '3px solid #34d399', borderRadius: '0 10px 10px 0' }}>
                                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>CTA</div>
                                            <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0 }}>{variantSections.cta}</p>
                                        </div>
                                    )}
                                    {!variantSections.hook && !variantSections.structure?.length && variantSections.fullText && (
                                        <pre style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                                            {variantSections.fullText}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* No script yet */}
            {!script && !loading && !error && (
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            Haz clic en "Generar" para crear el guion con IA
                        </p>
                    </div>
                    <button onClick={onGenerate}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                        <Sparkles size={14} /> Generar guion
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Main Step 3 ─────────────────────────────────── */
export default function SessionStep3Scripts() {
    const { state, dispatch, completeStep, restartSession } = useSession();
    const { selectedSlotIds = [], projectId } = state;
    const supabase = createSupabaseClient();

    const [slots, setSlots]         = useState([]);
    const [scripts, setScripts]     = useState({});
    const [loading, setLoading]     = useState({});
    const [errors, setErrors]       = useState({});
    const [saved, setSaved]         = useState({});
    const [generatingAll, setAll]   = useState(false);
    const [advancing, setAdvancing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [loadingSlots, setLoadingSlots] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // Variant state
    const [variants, setVariants]               = useState({});       // { slotId: { type, text, raw } }
    const [loadingVariant, setLoadingVariant]   = useState({});       // { slotId: bool }
    const [showVariantPicker, setShowVariantPicker] = useState({});   // { slotId: bool }

    // Recargar cuando selectedSlotIds esté disponible (puede hidratarse tras el mount).
    // Sin esto, si el estado llega async, se queda en 0/0 para siempre.
    const loadedRef = useRef(false);
    useEffect(() => {
        if (selectedSlotIds.length && !loadedRef.current) {
            loadedRef.current = true;
            loadSlots();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSlotIds]);

    // ── sessionStorage helpers ──────────────────────────────────────────────
    function cacheKey(slotId) { return `writi_s3_${projectId}_${slotId}`; }
    function writeCache(slotId, obj) {
        try { sessionStorage.setItem(cacheKey(slotId), JSON.stringify(obj)); } catch(e) {}
    }
    function readCache(slotId) {
        try { const r = sessionStorage.getItem(cacheKey(slotId)); return r ? JSON.parse(r) : null; } catch(e) { return null; }
    }

    async function loadSlots() {
        setLoadingSlots(true);
        setLoadError('');

        // ── Layer 1: sessionStorage (instant, zero DB calls) ───────────────
        const fromCache = {};
        for (const id of selectedSlotIds) {
            const cached = readCache(id);
            if (cached) fromCache[id] = cached;
        }
        if (Object.keys(fromCache).length) {
            setScripts(p => ({ ...p, ...fromCache }));
            setSaved(p => {
                const s = { ...p };
                Object.keys(fromCache).forEach(id => { s[id] = true; });
                return s;
            });
        }

        // ── Layer 2: DB — content_slots primero SIN el embed de scripts.
        // Si la tabla `scripts` tiene un problema de permisos/RLS, un select
        // embebido (`*, scripts(*)`) puede fallar la consulta COMPLETA y
        // dejar `slots` vacío (el famoso "0/0"). Separar las dos consultas
        // garantiza que los slots se muestren aunque el embed falle.
        const { data: slotData, error: slotErr } = await supabase
            .from('content_slots')
            .select('*')
            .in('id', selectedSlotIds);

        if (slotErr) {
            console.error('[Step3] content_slots load error:', slotErr);
            setSlots([]);
            setLoadError(`No se pudieron cargar tus ideas seleccionadas (${slotErr.message}). Reintenta.`);
            setLoadingSlots(false);
            return;
        }

        setSlots(slotData || []);
        setLoadingSlots(false);

        if (!slotData?.length) return;

        // ── Layer 3: scripts ya existentes, en consulta separada — si falla
        // (p.ej. permisos en la tabla `scripts`), no bloquea los slots ya cargados.
        const scriptIds = slotData.map(s => s.script_id).filter(Boolean);
        let scriptsById = {};
        if (scriptIds.length) {
            const { data: scriptRows, error: scriptsErr } = await supabase
                .from('scripts')
                .select('*')
                .in('id', scriptIds);
            if (scriptsErr) {
                console.error('[Step3] scripts load error (non-blocking):', scriptsErr);
            } else {
                scriptsById = Object.fromEntries((scriptRows || []).map(s => [s.id, s]));
            }
        }

        for (const slot of slotData) {
            if (fromCache[slot.id]) continue;
            const s = scriptsById[slot.script_id];
            if (!s) continue;
            const raw = {
                title:     s.title     || '',
                hook:      s.hook      || s.gancho || '',
                structure: Array.isArray(s.structure) ? s.structure : [],
                cta:       s.cta       || '',
                post_copy: s.post_copy || {},
            };
            const obj = { id: s.id, text: formatScript(raw), raw };
            setScripts(p => ({ ...p, [slot.id]: obj }));
            setSaved(p => ({ ...p, [slot.id]: true }));
            writeCache(slot.id, obj);
        }

        // ── Layer 4: legacy content_slots.script_data fallback ─────────────
        for (const slot of slotData) {
            if (scriptsById[slot.script_id] || fromCache[slot.id] || !slot.has_script || !slot.script_data) continue;
            const sd = slot.script_data;
            const raw = {
                hook:      sd.hook || '',
                structure: Array.isArray(sd.desarrollo) ? sd.desarrollo.map(d => {
                    const parts = d.split(': ');
                    return { point: parts[0] || d, detail: parts.slice(1).join(': ') || d };
                }) : (Array.isArray(sd.puntos) ? sd.puntos : []),
                cta:       sd.cta       || '',
                post_copy: sd.copy_post || {},
            };
            const obj = { id: slot.script_id || null, text: formatScript(raw), raw };
            setScripts(p => ({ ...p, [slot.id]: obj }));
            setSaved(p => ({ ...p, [slot.id]: true }));
            writeCache(slot.id, obj);
        }
    }

    function retryLoadSlots() {
        loadedRef.current = true;
        loadSlots();
    }

    async function generateOne(slotId) {
        setLoading(p => ({ ...p, [slotId]: true }));
        setErrors(p => ({ ...p, [slotId]: '' }));
        try {
            const res = await fetch(`/api/slots/${slotId}/generate-script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoDuration: '60 seg', focus: 'autoridad' }),
            });
            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error generando guion.'); }
            const data = await res.json();
            const raw  = data.script || data;
            const text = formatScript(raw);
            const obj  = { id: raw.id || null, text, raw };
            setScripts(p => ({ ...p, [slotId]: obj }));
            setSaved(p => ({ ...p, [slotId]: true }));
            writeCache(slotId, obj); // persist for tab navigation
        } catch (e) {
            setErrors(p => ({ ...p, [slotId]: e.message }));
        } finally {
            setLoading(p => ({ ...p, [slotId]: false }));
        }
    }

    function formatScript(s) {
        if (!s) return '';
        if (typeof s === 'string') return s;
        const p = [];
        if (s.title)          p.push(`🎬 ${s.title}\n`);
        if (s.hook)           p.push(`⚡ HOOK:\n${s.hook}\n`);
        if (s.structure?.length) { p.push('📝 DESARROLLO:'); s.structure.forEach((b,i) => p.push(`\n${i+1}. ${b.point}\n${b.detail}`)); }
        if (s.cta)            p.push(`\n\n📢 CTA:\n${s.cta}`);
        if (s.post_copy?.headline) p.push(`\n\n📱 COPY:\n${s.post_copy.headline}\n${s.post_copy.body||''}`);
        return p.join('\n');
    }

    async function saveToLibraryManual(slotId) {
        // Manual save button: re-call the generate endpoint to ensure library is populated
        // (The API always upserts to library on each call)
        setLoading(p => ({ ...p, [slotId]: true }));
        setErrors(p => ({ ...p, [slotId]: '' }));
        try {
            const s = scripts[slotId];
            if (!s) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const slot = slots.find(sl => sl.id === slotId);
            const title = slot?.idea_title || s.raw?.title || 'Guion';
            const fullText = formatScript(s.raw);
            const contentPayload = {
                titulo_angulo: title, titulo_guion: s.raw?.title || title,
                hook: s.raw?.hook || '', gancho: s.raw?.hook || '',
                desarrollo: (s.raw?.structure || []).map(b => `${b.point}: ${b.detail}`),
                cta: s.raw?.cta || '', copy_post: s.raw?.post_copy || {},
            };
            const { data: existing } = await supabase.from('library')
                .select('id').eq('user_id', user.id).eq('type', 'guion').eq('titulo', title).limit(1);
            let err;
            if (existing?.length) {
                ({ error: err } = await supabase.from('library')
                    .update({ script_full_text: fullText, content: contentPayload })
                    .eq('id', existing[0].id));
            } else {
                ({ error: err } = await supabase.from('library').insert({
                    user_id: user.id, project_id: projectId || slot?.project_id || null,
                    type: 'guion', platform: slot?.platform || 'Reels', goal: 'engagement',
                    titulo: title, script_full_text: fullText, content: contentPayload,
                }));
            }
            if (!err) setSaved(p => ({ ...p, [slotId]: true }));
            else setErrors(p => ({ ...p, [slotId]: `Error guardando: ${err.message}` }));
        } finally {
            setLoading(p => ({ ...p, [slotId]: false }));
        }
    }

    async function generateVariant(slotId, variantType) {
        setLoadingVariant(p => ({ ...p, [slotId]: true }));
        setShowVariantPicker(p => ({ ...p, [slotId]: false }));
        try {
            const res = await fetch(`/api/slots/${slotId}/generate-script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoDuration: '60 seg', focus: 'autoridad', variant: variantType }),
            });
            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error generando variante.'); }
            const data = await res.json();
            const raw  = data.script || data;
            const text = formatScript(raw);
            setVariants(p => ({ ...p, [slotId]: { type: variantType, text, raw } }));
        } catch (e) {
            setErrors(p => ({ ...p, [slotId]: e.message }));
        } finally {
            setLoadingVariant(p => ({ ...p, [slotId]: false }));
        }
    }

    function toggleVariantPicker(slotId) {
        setShowVariantPicker(p => ({ ...p, [slotId]: !p[slotId] }));
    }

    async function generateAll() {
        setAll(true);
        for (const s of slots) { if (!scripts[s.id]) await generateOne(s.id); }
        setAll(false);
    }

    async function handleAdvance() {
        setAdvancing(true);
        await completeStep(3);
        setAdvancing(false);
    }

    const allDone   = slots.length > 0 && slots.every(s => scripts[s.id]);
    const doneCount = slots.filter(s => scripts[s.id]).length;

    if (!selectedSlotIds.length) return (
        <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <p style={{ color:'#888', marginBottom:'16px' }}>No hay ideas seleccionadas.</p>
            <button onClick={() => dispatch({ type:'SET_STEP', payload:2 })}
                style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                ← Volver a Ideas
            </button>
        </div>
    );

    if (loadingSlots) return (
        <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <Loader2 size={32} style={{ color:'#a78bfa', animation:'spin 0.8s linear infinite', marginBottom:'16px' }} />
            <p style={{ color:'#888' }}>Cargando tus ideas seleccionadas…</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (loadError) return (
        <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <AlertCircle size={32} color="#f87171" style={{ marginBottom:'16px' }} />
            <p style={{ color:'#f87171', marginBottom:'20px', fontSize:'0.9rem' }}>{loadError}</p>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                <button onClick={() => dispatch({ type:'SET_STEP', payload:2 })}
                    style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                    ← Volver a Ideas
                </button>
                <button onClick={retryLoadSlots}
                    style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(126,206,202,0.1)', color:'#7ECECA', border:'1px solid rgba(126,206,202,0.2)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                    <RefreshCw size={13} /> Reintentar
                </button>
            </div>
        </div>
    );

    if (!slots.length) return (
        <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <p style={{ color:'#888', marginBottom:'16px' }}>No se encontraron tus ideas seleccionadas. Puede ser un problema temporal.</p>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                <button onClick={() => dispatch({ type:'SET_STEP', payload:2 })}
                    style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                    ← Volver a Ideas
                </button>
                <button onClick={retryLoadSlots}
                    style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(126,206,202,0.1)', color:'#7ECECA', border:'1px solid rgba(126,206,202,0.2)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' }}>
                    <RefreshCw size={13} /> Reintentar
                </button>
            </div>
        </div>
    );

    return (
        <div>
            {/* Cancelar sesion — discreto, esquina superior derecha */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                <button onClick={() => setShowCancelModal(true)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '4px 6px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
                    ✕ Nueva sesión
                </button>
            </div>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', gap:'12px', flexWrap:'wrap' }}>
                <div>
                    <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>✍️ Tus Guiones</h2>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem', marginBottom: '8px' }}>
                        {doneCount}/{slots.length} generados · Se guardan automáticamente en Biblioteca
                    </p>
                    <button onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#7ECECA', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                        ← Cambiar ideas
                    </button>
                </div>
                <button onClick={generateAll} disabled={generatingAll || allDone}
                    style={{
                        display:'inline-flex', alignItems:'center', gap:'8px',
                        background: allDone ? 'rgba(52,211,153,0.1)' : generatingAll ? 'rgba(255,255,255,0.05)' : '#7c3aed',
                        color: allDone ? '#34d399' : generatingAll ? '#555' : '#fff',
                        border: allDone ? '1px solid rgba(52,211,153,0.3)' : 'none',
                        borderRadius:'12px', padding:'12px 22px', fontSize:'0.88rem', fontWeight:700,
                        cursor:(generatingAll||allDone)?'not-allowed':'pointer',
                    }}>
                    {generatingAll ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> Generando {doneCount}/{slots.length}…</>
                    : allDone ? <><CheckCircle2 size={16}/> Todos generados</>
                    : <><Sparkles size={16}/> Generar todos ({slots.length})</>}
                </button>
            </div>

            {/* Modal de confirmacion — nueva sesion */}
            {showCancelModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
                    <div style={{ background: '#15151c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>¿Empezar sesión nueva?</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '24px' }}>
                            Los guiones ya generados están guardados en tu Biblioteca. Esta acción limpiará la sesión actual.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCancelModal(false)} disabled={cancelling}
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                                Seguir aquí
                            </button>
                            <button onClick={async () => { setCancelling(true); await restartSession(); }} disabled={cancelling}
                                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {cancelling ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                                Sí, nueva sesión →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Script cards */}
            {slots.map((slot, idx) => (
                <ScriptCard
                    key={slot.id}
                    slot={slot}
                    idx={idx}
                    total={slots.length}
                    loading={!!loading[slot.id]}
                    error={errors[slot.id]}
                    script={scripts[slot.id]}
                    saved={!!saved[slot.id]}
                    onGenerate={() => generateOne(slot.id)}
                    onSave={(id) => saveToLibraryManual(id)}
                    variant={variants[slot.id]}
                    loadingVariant={!!loadingVariant[slot.id]}
                    showVariantPicker={!!showVariantPicker[slot.id]}
                    onToggleVariantPicker={() => toggleVariantPicker(slot.id)}
                    onSelectVariant={(type) => generateVariant(slot.id, type)}
                />
            ))}

            {/* Footer */}
            <div style={{ paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
                <button onClick={handleAdvance} disabled={advancing || !allDone}
                    style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:(!allDone||advancing)?'rgba(255,255,255,0.04)':'#7c3aed', color:(!allDone||advancing)?'#555':'#fff', border:'none', borderRadius:'12px', padding:'13px 26px', fontSize:'0.9rem', fontWeight:700, cursor:(!allDone||advancing)?'not-allowed':'pointer', transition:'background 0.2s' }}
                    onMouseEnter={e=>{ if(allDone)e.currentTarget.style.background='#6d28d9'; }}
                    onMouseLeave={e=>e.currentTarget.style.background=allDone?'#7c3aed':'rgba(255,255,255,0.04)'}>
                    {advancing ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> Guardando…</> : <>Continuar al Calendario <ChevronRight size={18}/></>}
                </button>
                {!allDone && <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.3)' }}>Genera todos los guiones para continuar ({doneCount}/{slots.length})</p>}
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

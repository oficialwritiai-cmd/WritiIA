'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import {
    Loader2, Sparkles, ChevronRight, CheckCircle2,
    AlertCircle, RefreshCw, BookOpen, Copy, Check,
    Zap, FileText, MessageSquare, Target
} from 'lucide-react';

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
function ScriptCard({ slot, idx, total, onGenerate, onSave, loading, error, script, saved }) {
    const [copied, setCopied]   = useState(false);
    const [expanded, setExpanded] = useState(false);
    const sections = script ? parseSections(script.raw) : null;

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
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
    const { state, dispatch, completeStep } = useSession();
    const { selectedSlotIds = [], projectId } = state;
    const supabase = createSupabaseClient();

    const [slots, setSlots]         = useState([]);
    const [scripts, setScripts]     = useState({});
    const [loading, setLoading]     = useState({});
    const [errors, setErrors]       = useState({});
    const [saved, setSaved]         = useState({});
    const [generatingAll, setAll]   = useState(false);
    const [advancing, setAdvancing] = useState(false);

    useEffect(() => { if (selectedSlotIds.length) { loadSlots(); } }, []);

    async function loadSlots() {
        const { data: slotData } = await supabase.from('content_slots').select('*').in('id', selectedSlotIds);
        setSlots(slotData || []);
        // Load previously saved scripts from DB
        const savedSlots = (slotData || []).filter(s => s.has_script && s.script_data);
        if (savedSlots.length) {
            for (const slot of savedSlots) {
                const slotId = slot.id;
                const sd = slot.script_data;
                const raw = {
                    hook: sd.hook || '',
                    structure: Array.isArray(sd.desarrollo) ? sd.desarrollo.map(d => {
                        const parts = d.split(': ');
                        return { point: parts[0] || d, detail: parts.slice(1).join(': ') || d };
                    }) : (Array.isArray(sd.puntos) ? sd.puntos : []),
                    cta: sd.cta || '',
                    post_copy: sd.copy_post || {},
                };
                const text = formatScript(raw);
                setScripts(p => ({ ...p, [slotId]: { id: slot.script_id || null, text, raw } }));
                setSaved(p => ({ ...p, [slotId]: true }));
            }
        }
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
            setScripts(p => ({ ...p, [slotId]: { id: raw.id || null, text, raw } }));
            // API already saved to library — mark as saved
            setSaved(p => ({ ...p, [slotId]: true }));
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

    return (
        <div>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', gap:'12px', flexWrap:'wrap' }}>
                <div>
                    <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>✍️ Tus Guiones</h2>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem' }}>
                        {doneCount}/{slots.length} generados · Se guardan automáticamente en Biblioteca
                    </p>
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

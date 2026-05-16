'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Sparkles, ChevronRight, Edit3, CheckCircle2, AlertCircle, Wand2 } from 'lucide-react';

const S = {
    card: { background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'14px' },
    btn: { display:'inline-flex', alignItems:'center', gap:'8px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'12px', padding:'12px 24px', fontSize:'0.88rem', fontWeight:700, cursor:'pointer', transition:'background 0.2s' },
    btnSec: { display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' },
    textarea: { width:'100%', background:'#111118', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#fff', padding:'12px 14px', fontSize:'0.85rem', lineHeight:1.65, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' },
};

function formatScript(s) {
    if (!s) return '';
    if (typeof s === 'string') return s;
    const p = [];
    if (s.title)          p.push(`🎬 ${s.title}\n`);
    if (s.hook)           p.push(`⚡ HOOK:\n${s.hook}\n`);
    if (s.structure?.length) {
        p.push('📝 DESARROLLO:');
        s.structure.forEach((b, i) => p.push(`\n${i+1}. ${b.point}\n${b.detail}`));
    }
    if (s.cta)            p.push(`\n\n📢 CTA:\n${s.cta}`);
    if (s.post_copy?.headline) p.push(`\n\n📱 COPY:\n${s.post_copy.headline}\n${s.post_copy.body || ''}`);
    return p.join('\n');
}

export default function SessionStep3Scripts() {
    const { state, dispatch, completeStep } = useSession();
    const { selectedSlotIds = [], projectId } = state;
    const supabase = createSupabaseClient();

    const [slots, setSlots]         = useState([]);
    const [scripts, setScripts]     = useState({});
    const [loading, setLoading]     = useState({});
    const [errors, setErrors]       = useState({});
    const [edited, setEdited]       = useState({});
    const [generatingAll, setAll]   = useState(false);
    const [advancing, setAdvancing] = useState(false);

    useEffect(() => { if (selectedSlotIds.length) loadSlots(); }, []);

    async function loadSlots() {
        const { data } = await supabase.from('content_slots').select('*').in('id', selectedSlotIds);
        setSlots(data || []);
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
            const txt = formatScript(data.script || data);
            setScripts(p => ({ ...p, [slotId]: txt }));
            setEdited(p => ({ ...p, [slotId]: txt }));
        } catch (e) {
            setErrors(p => ({ ...p, [slotId]: e.message }));
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
        for (const s of slots) {
            const txt = edited[s.id] || scripts[s.id];
            if (txt) await supabase.from('content_slots').update({ idea_description: txt }).eq('id', s.id);
        }
        await completeStep(3);
        setAdvancing(false);
    }

    const allDone    = slots.length > 0 && slots.every(s => scripts[s.id]);
    const anyLoading = Object.values(loading).some(Boolean) || generatingAll;
    const doneCount  = slots.filter(s => scripts[s.id]).length;

    if (!selectedSlotIds.length) return (
        <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <p style={{ color:'#888', marginBottom:'16px' }}>No hay ideas seleccionadas.</p>
            <button onClick={() => dispatch({ type:'SET_STEP', payload:2 })} style={S.btnSec}>← Volver a Ideas</button>
        </div>
    );

    return (
        <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
                <div>
                    <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>✍️ Tus Guiones</h2>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem' }}>
                        {slots.length} ideas · {doneCount} guiones generados
                    </p>
                </div>
                <button onClick={generateAll} disabled={anyLoading || allDone}
                    style={{ ...S.btn, opacity:(anyLoading||allDone)?0.6:1, cursor:(anyLoading||allDone)?'not-allowed':'pointer' }}>
                    {generatingAll
                        ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> Generando {doneCount}/{slots.length}…</>
                        : <><Sparkles size={16} /> Generar todos los guiones</>
                    }
                </button>
            </div>

            {slots.map((slot, idx) => {
                const isLoading = !!loading[slot.id];
                const err       = errors[slot.id];
                const hasTxt    = !!scripts[slot.id];
                const txt       = edited[slot.id] ?? scripts[slot.id] ?? '';

                return (
                    <div key={slot.id} style={S.card}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'12px' }}>
                            <div style={{ flex:1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px' }}>
                                    <span style={{ fontSize:'0.65rem', color:'#a78bfa', fontWeight:700, background:'rgba(167,139,250,0.1)', borderRadius:'100px', padding:'2px 8px' }}>
                                        {idx+1}/{slots.length}
                                    </span>
                                    {slot.content_type && <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.3)', fontWeight:600 }}>{slot.content_type}</span>}
                                    {hasTxt && <CheckCircle2 size={13} color="#34d399" />}
                                </div>
                                <h3 style={{ fontSize:'0.93rem', fontWeight:700, color:'#fff', lineHeight:1.3 }}>{slot.idea_title}</h3>
                            </div>
                            <button onClick={() => generateOne(slot.id)} disabled={isLoading}
                                style={{ ...S.btnSec, flexShrink:0, color: hasTxt?'rgba(255,255,255,0.4)':'#a78bfa', borderColor: hasTxt?'rgba(255,255,255,0.08)':'rgba(167,139,250,0.25)' }}>
                                {isLoading ? <Loader2 size={12} style={{ animation:'spin 0.8s linear infinite' }} /> : <Wand2 size={12} />}
                                {hasTxt ? 'Regenerar' : 'Generar'}
                            </button>
                        </div>

                        {isLoading && (
                            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px', background:'rgba(167,139,250,0.05)', borderRadius:'10px' }}>
                                <Loader2 size={16} style={{ color:'#a78bfa', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                                <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>Escribiendo tu guion con IA…</span>
                            </div>
                        )}

                        {err && !isLoading && (
                            <div style={{ padding:'10px 14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'10px', fontSize:'0.82rem', color:'#f87171', display:'flex', gap:'8px' }}>
                                <AlertCircle size={14} style={{ flexShrink:0, marginTop:'1px' }} /> {err}
                            </div>
                        )}

                        {hasTxt && !isLoading && (
                            <div>
                                <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:'7px', display:'flex', alignItems:'center', gap:'5px' }}>
                                    <Edit3 size={11} /> Edita tu guion
                                </p>
                                <textarea value={txt} rows={16} style={S.textarea}
                                    onChange={e => setEdited(p => ({ ...p, [slot.id]: e.target.value }))}
                                    onFocus={e => e.target.style.borderColor='rgba(167,139,250,0.4)'}
                                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                                />
                            </div>
                        )}

                        {!hasTxt && !isLoading && (
                            <button onClick={() => generateOne(slot.id)}
                                style={{ ...S.btn, background:'rgba(124,58,237,0.12)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.2)' }}>
                                <Sparkles size={13} /> Generar guion
                            </button>
                        )}
                    </div>
                );
            })}

            <div style={{ marginTop:'20px', paddingTop:'18px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
                <button onClick={handleAdvance} disabled={advancing || !allDone}
                    style={{ ...S.btn, opacity:(!allDone||advancing)?0.4:1, cursor:(!allDone||advancing)?'not-allowed':'pointer' }}
                    onMouseEnter={e=>{ if(allDone)e.currentTarget.style.background='#6d28d9'; }}
                    onMouseLeave={e=>e.currentTarget.style.background='#7c3aed'}>
                    {advancing
                        ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> Guardando…</>
                        : <>Continuar al Calendario <ChevronRight size={18} /></>
                    }
                </button>
                {!allDone && (
                    <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.3)' }}>
                        Genera todos los guiones para continuar ({doneCount}/{slots.length})
                    </p>
                )}
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

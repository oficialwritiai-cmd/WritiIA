'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Sparkles, ChevronRight, Edit3, CheckCircle2, AlertCircle, Wand2, BookOpen, Save } from 'lucide-react';

const S = {
    card: { background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px', marginBottom:'14px', transition:'border-color 0.2s' },
    btn: { display:'inline-flex', alignItems:'center', gap:'8px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'12px', padding:'12px 24px', fontSize:'0.88rem', fontWeight:700, cursor:'pointer', transition:'background 0.2s' },
    btnSec: { display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer' },
    btnGreen: { display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'10px', padding:'8px 14px', fontSize:'0.78rem', fontWeight:700, cursor:'pointer' },
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
    if (s.post_copy?.headline) p.push(`\n\n📱 COPY REDES:\n${s.post_copy.headline}\n${s.post_copy.body||''}`);
    return p.join('\n');
}

export default function SessionStep3Scripts() {
    const { state, dispatch, completeStep } = useSession();
    const { selectedSlotIds = [], projectId } = state;
    const supabase = createSupabaseClient();

    const [slots, setSlots]         = useState([]);
    const [scripts, setScripts]     = useState({});   // { slotId: { id, text, raw } }
    const [edited, setEdited]       = useState({});   // { slotId: string }
    const [loading, setLoading]     = useState({});
    const [errors, setErrors]       = useState({});
    const [saved, setSaved]         = useState({});   // { slotId: bool } — saved to library
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

            // API saves to 'scripts' table automatically — data.script.id is the scripts.id
            const raw  = data.script || data;
            const txt  = formatScript(raw);
            const scriptDbId = raw.id || null;

            setScripts(p => ({ ...p, [slotId]: { id: scriptDbId, text: txt, raw } }));
            setEdited(p => ({ ...p, [slotId]: txt }));

            // Auto-save to library right after generation
            await saveToLibrary(slotId, raw, scriptDbId);
        } catch (e) {
            setErrors(p => ({ ...p, [slotId]: e.message }));
        } finally {
            setLoading(p => ({ ...p, [slotId]: false }));
        }
    }

    async function saveToLibrary(slotId, raw, scriptDbId) {
        try {
            const slot = slots.find(s => s.id === slotId);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('library').insert({
                user_id:       user.id,
                project_id:    projectId || null,
                type:          'guion',
                platform:      slot?.platform || 'Reels',
                goal:          'engagement',
                titulo_angulo: slot?.idea_title || raw.title || 'Guion',
                content: {
                    script_id:  scriptDbId,
                    slot_id:    slotId,
                    hook:       raw.hook || '',
                    structure:  raw.structure || [],
                    cta:        raw.cta || '',
                    post_copy:  raw.post_copy || {},
                    full_text:  formatScript(raw),
                },
                metadata: { source: 'matrix_session', slot_id: slotId },
                tags:   ['matrix', slot?.content_type || 'Educativo'],
                status: 'borrador',
            });

            if (!error) setSaved(p => ({ ...p, [slotId]: true }));
        } catch (e) {
            console.error('[saveToLibrary]', e);
        }
    }

    async function saveEdited(slotId) {
        const txt = edited[slotId];
        const s   = scripts[slotId];
        if (!txt || !s) return;
        // Update in scripts table if we have the DB id
        if (s.id) {
            await supabase.from('scripts').update({ content: txt }).eq('id', s.id);
        }
        // Update in library too
        await supabase.from('library')
            .update({ 'content->full_text': txt })
            .eq('project_id', projectId)
            .contains('metadata', { slot_id: slotId });

        setSaved(p => ({ ...p, [slotId]: true }));
    }

    async function generateAll() {
        setAll(true);
        for (const s of slots) { if (!scripts[s.id]) await generateOne(s.id); }
        setAll(false);
    }

    async function handleAdvance() {
        setAdvancing(true);
        // Save any pending edits
        for (const s of slots) {
            if (edited[s.id] !== scripts[s.id]?.text) await saveEdited(s.id);
        }
        await completeStep(3);
        setAdvancing(false);
    }

    const allDone   = slots.length > 0 && slots.every(s => scripts[s.id]);
    const anyLoad   = Object.values(loading).some(Boolean) || generatingAll;
    const doneCount = slots.filter(s => scripts[s.id]).length;

    if (!selectedSlotIds.length) return (
        <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <p style={{ color:'#888', marginBottom:'16px' }}>No hay ideas seleccionadas.</p>
            <button onClick={() => dispatch({ type:'SET_STEP', payload:2 })} style={S.btnSec}>← Volver a Ideas</button>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
                <div>
                    <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>✍️ Tus Guiones</h2>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem' }}>
                        {doneCount}/{slots.length} guiones generados · se guardan automáticamente en tu Biblioteca
                    </p>
                </div>
                <button onClick={generateAll} disabled={anyLoad || allDone}
                    style={{ ...S.btn, opacity:(anyLoad||allDone)?0.6:1, cursor:(anyLoad||allDone)?'not-allowed':'pointer' }}>
                    {generatingAll
                        ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> Generando {doneCount}/{slots.length}…</>
                        : allDone
                        ? <><CheckCircle2 size={16} /> Todos generados</>
                        : <><Sparkles size={16} /> Generar todos</>
                    }
                </button>
            </div>

            {/* Script cards */}
            {slots.map((slot, idx) => {
                const isLoad = !!loading[slot.id];
                const err    = errors[slot.id];
                const sc     = scripts[slot.id];
                const txt    = edited[slot.id] ?? sc?.text ?? '';
                const isSaved = saved[slot.id];

                return (
                    <div key={slot.id} style={{ ...S.card, borderColor: sc ? (isSaved ? 'rgba(52,211,153,0.2)' : 'rgba(167,139,250,0.2)') : 'rgba(255,255,255,0.07)' }}>
                        {/* Card header */}
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'12px' }}>
                            <div style={{ flex:1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px', flexWrap:'wrap' }}>
                                    <span style={{ fontSize:'0.65rem', color:'#a78bfa', fontWeight:700, background:'rgba(167,139,250,0.1)', borderRadius:'100px', padding:'2px 8px' }}>
                                        {idx+1}/{slots.length}
                                    </span>
                                    {slot.content_type && <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.3)', fontWeight:600 }}>{slot.content_type}</span>}
                                    {isSaved && (
                                        <span style={{ fontSize:'0.65rem', color:'#34d399', fontWeight:700, background:'rgba(52,211,153,0.08)', borderRadius:'100px', padding:'2px 8px', display:'inline-flex', alignItems:'center', gap:'3px' }}>
                                            <BookOpen size={10} /> Guardado en Biblioteca
                                        </span>
                                    )}
                                </div>
                                <h3 style={{ fontSize:'0.93rem', fontWeight:700, color:'#fff', lineHeight:1.3 }}>{slot.idea_title}</h3>
                            </div>
                            <button onClick={() => generateOne(slot.id)} disabled={isLoad}
                                style={{ ...S.btnSec, flexShrink:0, fontSize:'0.75rem', color:sc?'rgba(255,255,255,0.4)':'#a78bfa', borderColor:sc?'rgba(255,255,255,0.08)':'rgba(167,139,250,0.25)' }}>
                                {isLoad ? <Loader2 size={12} style={{ animation:'spin 0.8s linear infinite' }} /> : <Wand2 size={12} />}
                                {sc ? 'Regenerar' : 'Generar'}
                            </button>
                        </div>

                        {/* Loading */}
                        {isLoad && (
                            <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px', background:'rgba(167,139,250,0.05)', borderRadius:'10px' }}>
                                <Loader2 size={16} style={{ color:'#a78bfa', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                                <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)' }}>Escribiendo guion y guardando en Biblioteca…</span>
                            </div>
                        )}

                        {/* Error */}
                        {err && !isLoad && (
                            <div style={{ padding:'10px 14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'10px', fontSize:'0.82rem', color:'#f87171', display:'flex', gap:'8px' }}>
                                <AlertCircle size={14} style={{ flexShrink:0 }} /> {err}
                            </div>
                        )}

                        {/* Script textarea */}
                        {sc && !isLoad && (
                            <div>
                                <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:'7px', display:'flex', alignItems:'center', gap:'5px' }}>
                                    <Edit3 size={11} /> Edita tu guion — los cambios se guardan en Biblioteca
                                </p>
                                <textarea value={txt} rows={16} style={S.textarea}
                                    onChange={e => { setEdited(p => ({ ...p, [slot.id]: e.target.value })); setSaved(p => ({ ...p, [slot.id]: false })); }}
                                    onFocus={e => e.target.style.borderColor='rgba(167,139,250,0.4)'}
                                    onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.08)'; saveEdited(slot.id); }}
                                />
                                <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                                    <button onClick={() => saveEdited(slot.id)} style={S.btnGreen}>
                                        <Save size={12} /> {isSaved ? 'Guardado ✓' : 'Guardar en Biblioteca'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Generate button if no script yet */}
                        {!sc && !isLoad && (
                            <button onClick={() => generateOne(slot.id)}
                                style={{ ...S.btn, background:'rgba(124,58,237,0.12)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.2)' }}>
                                <Sparkles size={13} /> Generar guion
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Footer actions */}
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
                        Genera todos los guiones para continuar ({doneCount}/{slots.length} listos)
                    </p>
                )}
                {allDone && (
                    <p style={{ fontSize:'0.78rem', color:'rgba(52,211,153,0.6)', display:'flex', alignItems:'center', gap:'5px' }}>
                        <BookOpen size={12} /> Todos guardados en Biblioteca
                    </p>
                )}
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

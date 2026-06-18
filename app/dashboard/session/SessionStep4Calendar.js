'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, CheckCircle2, Sparkles, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────── */
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d)    { return d.toISOString().split('T')[0]; }
function parseDate(s) { return s ? new Date(s + 'T12:00:00') : null; }
function dayName(d) { return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]; }
function monthName(d) { return d.toLocaleDateString('es-ES',{month:'long'}); }

function getPostingDays(needed) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = []; let offset = 0;
    while (days.length < Math.max(needed, 1) && offset < 300) {
        const d = addDays(today, offset);
        const dow = d.getDay();
        if (dow===1||dow===3||dow===5) days.push(d);
        offset++;
    }
    return days;
}

/* ─── Week grid component ─────────────────────────────── */
function WeekGrid({ weekStart, slots, assigned, onMove }) {
    const days = Array.from({length:7}, (_,i) => addDays(weekStart, i));
    const today = fmt(new Date());

    return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'6px' }}>
            {days.map(d => {
                const ds       = fmt(d);
                const isToday  = ds === today;
                const isPast   = ds < today;
                const daySlots = slots.filter(s => assigned[s.id] === ds);
                const isPosting = d.getDay()===1||d.getDay()===3||d.getDay()===5;

                return (
                    <div key={ds} style={{
                        minHeight:'90px', borderRadius:'10px', padding:'8px',
                        background: isToday ? 'rgba(124,58,237,0.12)' : isPast ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                        border:`1px solid ${isToday ? 'rgba(124,58,237,0.4)' : isPosting&&!isPast ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        opacity: isPast ? 0.5 : 1,
                        transition:'all 0.2s',
                    }}>
                        {/* Day header */}
                        <div style={{ marginBottom:'6px', textAlign:'center' }}>
                            <div style={{ fontSize:'0.62rem', fontWeight:700, color: isToday?'#a78bfa':'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                {dayName(d)}
                            </div>
                            <div style={{ fontSize:'0.85rem', fontWeight: isToday?800:500, color: isToday?'#a78bfa':'rgba(255,255,255,0.6)' }}>
                                {d.getDate()}
                            </div>
                        </div>

                        {/* Slots on this day */}
                        {daySlots.map(s => (
                            <div key={s.id} style={{
                                background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)',
                                borderRadius:'6px', padding:'4px 6px', marginBottom:'4px',
                                fontSize:'0.65rem', fontWeight:600, color:'#c4b5fd', lineHeight:1.3,
                                cursor:'default',
                            }}>
                                {(s.idea_title||'').slice(0,35)}{s.idea_title?.length>35?'…':''}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Main ────────────────────────────────────────────── */
export default function SessionStep4Calendar() {
    const { state, completeSession } = useSession();
    const { selectedSlotIds=[], timeHorizon } = state;
    const supabase = createSupabaseClient();
    const router   = useRouter();

    const [slots, setSlots]       = useState([]);
    const [assigned, setAssigned] = useState({});
    const [saving, setSaving]     = useState(false);
    const [done, setDone]         = useState(false);
    const [error, setError]       = useState('');
    const [weekOffset, setWeekOffset] = useState(0);

    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = fmt(today);

    // Week start = Monday of current week + offset
    const weekStart = (() => {
        const d = new Date(today);
        const dow = d.getDay(); // 0=Sun
        const diff = dow===0 ? -6 : 1-dow; // go to Monday
        d.setDate(d.getDate() + diff + weekOffset*7);
        return d;
    })();

    useEffect(() => { if (selectedSlotIds.length) loadSlots(); }, []);

    async function loadSlots() {
        const { data } = await supabase.from('content_slots').select('*').in('id', selectedSlotIds);
        if (!data) return;
        setSlots(data);
        // Auto-assign all slots
        const days = getPostingDays(data.length);
        const auto = {};
        data.forEach((s, i) => { auto[s.id] = fmt(days[i]||addDays(today,i*2+1)); });
        setAssigned(auto);
    }

    async function forceSave() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const results = await Promise.allSettled(
            Object.entries(assigned).map(async ([slotId, date]) => {
                if (!date) return;
                const slot = slots.find(s => s.id === slotId);

                // 1. Update content_slots.scheduled_date
                await supabase.from('content_slots')
                    .update({ scheduled_date: date })
                    .eq('id', slotId);

                // 2. Insert into calendar_events so it appears in the calendar
                const { data: existing } = await supabase
                    .from('calendar_events')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('reference_id', slotId)
                    .maybeSingle();

                if (!existing) {
                    await supabase.from('calendar_events').insert({
                        user_id:      user.id,
                        project_id:   slot?.project_id || null,
                        event_date:   date,
                        title:        slot?.idea_title || 'Guion Matrix',
                        notes:        slot?.idea_description || '',
                        platform:     slot?.platform || 'Reels',
                        status:       'idea',
                        color:        'purple',
                        start_time:   '09:00',
                        end_time:     '10:00',
                        reference_id: slotId,
                    });
                } else {
                    await supabase.from('calendar_events')
                        .update({ event_date: date })
                        .eq('id', existing.id);
                }

                // 3. BUG FIX: Matrix nunca guardaba el guion en `library` — el
                // calendario lo mostraba via fallback (content_slots.script_data)
                // pero la Biblioteca quedaba vacía y reference_id apuntaba a
                // content_slots.id en vez de a library.id. Sincronizamos aquí,
                // evitando duplicados (busca por user_id+type+titulo antes de
                // insertar, igual que el resto de la app).
                if (slot?.script_data) {
                    try {
                        const sd = slot.script_data;
                        const hookVal = sd.hook || sd.gancho || '';
                        const desArr  = Array.isArray(sd.desarrollo) ? sd.desarrollo : [];
                        const ctaVal  = sd.cta || sd.cierre || '';
                        const fullText = [
                            slot.idea_title || '',
                            hookVal ? `\n⚡ HOOK:\n${hookVal}` : '',
                            desArr.length ? `\n📝 DESARROLLO:\n${desArr.map((d, i) => `${i + 1}. ${typeof d === 'string' ? d : `${d.point}: ${d.detail}`}`).join('\n')}` : '',
                            ctaVal ? `\n📢 CTA:\n${ctaVal}` : '',
                        ].filter(Boolean).join('\n');

                        const { data: existingLib } = await supabase.from('library')
                            .select('id').eq('user_id', user.id).eq('type', 'guion')
                            .eq('titulo', slot.idea_title).limit(1);

                        let libraryId = null;
                        if (existingLib?.length) {
                            await supabase.from('library').update({
                                content: sd,
                                script_full_text: fullText,
                                platform: slot.platform || 'Reels',
                            }).eq('id', existingLib[0].id);
                            libraryId = existingLib[0].id;
                        } else {
                            const { data: newLib } = await supabase.from('library').insert({
                                user_id: user.id,
                                project_id: slot.project_id || null,
                                titulo: slot.idea_title,
                                type: 'guion',
                                platform: slot.platform || 'Reels',
                                content: sd,
                                script_full_text: fullText,
                            }).select('id').single();
                            libraryId = newLib?.id || null;
                        }

                        if (libraryId) {
                            await supabase.from('calendar_events')
                                .update({ reference_id: libraryId, has_script: true })
                                .eq('reference_id', slotId)
                                .eq('user_id', user.id);
                        }
                    } catch (libErr) {
                        console.error('[Calendar][Matrix] library sync error (non-fatal):', libErr);
                    }
                }
            })
        );

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) console.error('[Calendar] save errors:', failed);
        return true;
    }

    async function handleFinish() {
        setSaving(true); setError('');
        try {
            await forceSave();
            if (completeSession) await completeSession();
            setDone(true);
        } catch(e) {
            setError('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
    }

    if (done) {
        return (
            <div style={{ textAlign:'center', padding:'60px 24px' }}>
                <div style={{ fontSize:'3.5rem', marginBottom:'20px' }}>🎉</div>
                <h2 style={{ fontSize:'2rem', fontWeight:900, color:'#fff', marginBottom:'12px' }}>¡Sesión Matrix completada!</h2>
                <p style={{ color:'rgba(255,255,255,0.5)', maxWidth:'400px', margin:'0 auto 32px', lineHeight:1.65 }}>
                    Tu contenido está planificado. {Object.keys(assigned).length} guiones guardados con fechas de publicación.
                </p>
                <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
                    <button onClick={()=>router.push('/dashboard/calendar')}
                        style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'12px', padding:'13px 24px', fontSize:'0.9rem', fontWeight:700, cursor:'pointer' }}>
                        <Calendar size={16}/> Ver mi Calendario
                    </button>
                    <button onClick={()=>router.push('/dashboard/library')}
                        style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'13px 24px', fontSize:'0.9rem', fontWeight:600, cursor:'pointer' }}>
                        Ver Biblioteca
                    </button>
                </div>
            </div>
        );
    }

    const assignedCount = Object.values(assigned).filter(Boolean).length;
    const weekLabel = `${weekStart.getDate()} – ${addDays(weekStart,6).getDate()} ${monthName(weekStart)} ${weekStart.getFullYear()}`;

    return (
        <div>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
                <div>
                    <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>📅 Calendario de publicación</h2>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.85rem' }}>
                        {assignedCount}/{slots.length} guiones programados · Lun/Mié/Vie · Edita la fecha de cualquier guion abajo
                    </p>
                </div>
                <button onClick={handleFinish} disabled={saving}
                    style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:saving?'rgba(255,255,255,0.05)':'linear-gradient(135deg,#10b981,#059669)', color:saving?'#555':'#fff', border:'none', borderRadius:'12px', padding:'12px 22px', fontSize:'0.88rem', fontWeight:700, cursor:saving?'not-allowed':'pointer', flexShrink:0 }}>
                    {saving ? <><Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/> Guardando…</> : <><Sparkles size={15}/> Guardar y finalizar</>}
                </button>
            </div>

            {/* Week calendar */}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'16px', marginBottom:'20px' }}>
                {/* Week nav */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                    <button onClick={()=>setWeekOffset(w=>w-1)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'8px', color:'rgba(255,255,255,0.6)', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <ChevronLeft size={16}/>
                    </button>
                    <span style={{ fontSize:'0.82rem', fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{weekLabel}</span>
                    <button onClick={()=>setWeekOffset(w=>w+1)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'8px', color:'rgba(255,255,255,0.6)', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <ChevronRight size={16}/>
                    </button>
                </div>
                <WeekGrid weekStart={weekStart} slots={slots} assigned={assigned} onMove={(id,d)=>setAssigned(p=>({...p,[id]:d}))} />
            </div>

            {/* Slot list with date pickers */}
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'24px' }}>
                {slots.map((slot, idx) => {
                    const date = assigned[slot.id]||'';
                    const d    = parseDate(date);
                    return (
                        <div key={slot.id} style={{
                            background:'rgba(255,255,255,0.025)', border:`1px solid ${date?'rgba(52,211,153,0.18)':'rgba(255,255,255,0.07)'}`,
                            borderRadius:'12px', padding:'12px 16px',
                            display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap',
                        }}>
                            <span style={{ width:'24px', height:'24px', borderRadius:'7px', background:'rgba(167,139,250,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'0.68rem', fontWeight:800, color:'#a78bfa', flexShrink:0 }}>{idx+1}</span>
                            <div style={{ flex:1, minWidth:'120px' }}>
                                <p style={{ fontSize:'0.85rem', fontWeight:700, color:'#fff', margin:0, lineHeight:1.3 }}>{slot.idea_title}</p>
                                <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)', margin:0 }}>{slot.content_type||'Educativo'}</p>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                                {date && <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#34d399', display:'flex', alignItems:'center', gap:'4px' }}><CheckCircle2 size={13}/>{d?`${dayName(d)} ${d.getDate()} ${monthName(d).slice(0,3)}`:''}</span>}
                                <input type="date" value={date} min={todayStr}
                                    onChange={e=>setAssigned(p=>({...p,[slot.id]:e.target.value}))}
                                    style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', borderRadius:'8px', color:'#a78bfa', padding:'6px 10px', fontSize:'0.78rem', cursor:'pointer', outline:'none', colorScheme:'dark', fontFamily:'inherit' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary + error */}
            {error && <div style={{ padding:'12px 16px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'10px', fontSize:'0.83rem', color:'#f87171', marginBottom:'16px' }}>{error}</div>}

            <div style={{ background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:'12px', padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px' }}>
                <CheckCircle2 size={18} color="#34d399" style={{flexShrink:0}}/>
                <p style={{ fontSize:'0.83rem', color:'rgba(255,255,255,0.65)', margin:0 }}>
                    <strong style={{color:'#34d399'}}>{assignedCount} guiones</strong> listos para publicar · al guardar se envían al Calendario y a la Biblioteca
                </p>
            </div>

            <style>{`
                @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6) sepia(1) saturate(3) hue-rotate(200deg);cursor:pointer}
            `}</style>
        </div>
    );
}

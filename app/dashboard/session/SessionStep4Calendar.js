'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Calendar, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function fmt(date) { return date.toISOString().split('T')[0]; }
function fmtDisplay(date) {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function SessionStep4Calendar() {
    const { state, completeSession } = useSession();
    const { selectedSlotIds = [], timeHorizon } = state;
    const supabase = createSupabaseClient();

    const [slots, setSlots]         = useState([]);
    const [assigned, setAssigned]   = useState({}); // { slotId: 'YYYY-MM-DD' }
    const [saving, setSaving]       = useState(false);
    const [saved, setSaved]         = useState(false);

    const weeks = timeHorizon === '2weeks' ? 2 : 4;
    const today = new Date();

    // Generate posting days: Mon, Wed, Fri
    const postingDays = [];
    for (let w = 0; w < weeks * 7; w++) {
        const d = addDays(today, w);
        const dow = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
        if (dow === 1 || dow === 3 || dow === 5) postingDays.push(d); // Mon, Wed, Fri
    }

    useEffect(() => {
        if (selectedSlotIds.length) loadSlots();
    }, []);

    async function loadSlots() {
        const { data } = await supabase.from('content_slots').select('*').in('id', selectedSlotIds);
        if (!data) return;
        setSlots(data);
        // Auto-distribute across posting days
        const auto = {};
        data.forEach((s, i) => {
            if (postingDays[i]) auto[s.id] = fmt(postingDays[i]);
        });
        setAssigned(auto);
    }

    function moveSlot(slotId, date) {
        setAssigned(p => ({ ...p, [slotId]: date }));
    }

    async function saveCalendar() {
        setSaving(true);
        for (const [slotId, date] of Object.entries(assigned)) {
            await supabase.from('content_slots').update({ scheduled_date: date }).eq('id', slotId);
        }
        setSaved(true);
        setSaving(false);
    }

    async function handleFinish() {
        await saveCalendar();
        if (completeSession) await completeSession();
    }

    const assignedCount = Object.keys(assigned).length;

    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>
                    📅 Tu Calendario de Contenido
                </h2>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem' }}>
                    Hemos distribuido tus {slots.length} guiones en los próximos {weeks} semanas (Lun/Mié/Vie). Ajusta las fechas si quieres.
                </p>
            </div>

            {slots.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#888' }}>
                    <Loader2 size={24} style={{ animation:'spin 0.8s linear infinite', marginBottom:'10px' }} />
                    <p>Cargando guiones…</p>
                </div>
            ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
                    {slots.map((slot, idx) => {
                        const date = assigned[slot.id] || '';
                        const dateObj = date ? new Date(date + 'T12:00:00') : null;

                        return (
                            <div key={slot.id} style={{
                                background:'rgba(255,255,255,0.025)',
                                border:`1px solid ${date ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                borderRadius:'14px', padding:'16px 18px',
                                display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
                            }}>
                                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(167,139,250,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <span style={{ fontSize:'0.8rem', fontWeight:800, color:'#a78bfa' }}>{idx+1}</span>
                                </div>
                                <div style={{ flex:1, minWidth:'160px' }}>
                                    <p style={{ fontSize:'0.88rem', fontWeight:700, color:'#fff', marginBottom:'2px', lineHeight:1.3 }}>
                                        {slot.idea_title}
                                    </p>
                                    <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>{slot.content_type || 'Educativo'} · Reels</p>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                                    {date && <CheckCircle2 size={15} color="#34d399" />}
                                    <select
                                        value={date}
                                        onChange={e => moveSlot(slot.id, e.target.value)}
                                        style={{
                                            background:'#111118', border:'1px solid rgba(255,255,255,0.1)',
                                            borderRadius:'9px', color: date ? '#fff' : 'rgba(255,255,255,0.4)',
                                            padding:'7px 12px', fontSize:'0.82rem', cursor:'pointer', outline:'none',
                                        }}
                                    >
                                        <option value="">Sin fecha</option>
                                        {postingDays.map(d => (
                                            <option key={fmt(d)} value={fmt(d)}>
                                                {DAYS_ES[(d.getDay() + 6) % 7]} {fmtDisplay(d)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            <div style={{ background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:'14px', padding:'16px 20px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'12px' }}>
                <Calendar size={20} color="#34d399" style={{ flexShrink:0 }} />
                <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>
                    <strong style={{ color:'#34d399' }}>{assignedCount} guiones</strong> programados en los próximos <strong style={{ color:'#34d399' }}>{weeks} semanas</strong>. Solo queda grabar.
                </p>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <button
                    onClick={handleFinish}
                    disabled={saving}
                    style={{
                        display:'inline-flex', alignItems:'center', gap:'9px',
                        background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#10b981,#059669)',
                        color: saving ? '#555' : '#fff',
                        border:'none', borderRadius:'13px', padding:'14px 28px',
                        fontSize:'0.92rem', fontWeight:800, cursor: saving ? 'not-allowed' : 'pointer',
                        transition:'all 0.2s',
                    }}
                >
                    {saving
                        ? <><Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }} /> Guardando…</>
                        : <><Sparkles size={17} /> {saved ? '¡Sesión completada! Ver calendario' : 'Guardar calendario y finalizar'}</>
                    }
                </button>
                <button onClick={saveCalendar} disabled={saving}
                    style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'11px', padding:'11px 18px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>
                    Guardar sin finalizar
                </button>
            </div>

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

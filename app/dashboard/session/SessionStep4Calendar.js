'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Calendar, CheckCircle2, Sparkles } from 'lucide-react';

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function fmt(date) { return date.toISOString().split('T')[0]; }
function fmtDisplay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
}

// Generate Mon/Wed/Fri dates starting from today until we have `needed` dates
function getPostingDays(needed) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = []; let offset = 0;
    while (days.length < Math.max(needed, 1) && offset < 200) {
        const d = addDays(today, offset);
        const dow = d.getDay(); // 1=Mon 3=Wed 5=Fri
        if (dow === 1 || dow === 3 || dow === 5) days.push(d);
        offset++;
    }
    return days;
}

export default function SessionStep4Calendar() {
    const { state, completeSession } = useSession();
    const { selectedSlotIds = [], timeHorizon } = state;
    const supabase = createSupabaseClient();

    const [slots, setSlots]       = useState([]);
    const [assigned, setAssigned] = useState({});
    const [saving, setSaving]     = useState(false);
    const [saved, setSaved]       = useState(false);

    const weeks   = timeHorizon === '2weeks' ? 2 : 4;
    const todayStr = fmt(new Date());

    useEffect(() => { if (selectedSlotIds.length) loadSlots(); }, []);

    async function loadSlots() {
        const { data } = await supabase.from('content_slots').select('*').in('id', selectedSlotIds);
        if (!data) return;
        setSlots(data);
        // Auto-assign dates — EVERY slot gets a date
        const postingDays = getPostingDays(data.length);
        const auto = {};
        data.forEach((s, i) => {
            auto[s.id] = fmt(postingDays[i] || addDays(new Date(), (i * 2) + 1));
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

    const assignedCount = Object.values(assigned).filter(Boolean).length;

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom:'28px' }}>
                <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#fff', marginBottom:'6px', letterSpacing:'-0.02em' }}>
                    📅 Tu Calendario de Contenido
                </h2>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem' }}>
                    {assignedCount} de {slots.length} guiones programados en Lun/Mié/Vie · Haz click en la fecha para cambiarla
                </p>
            </div>

            {/* Slot list */}
            {slots.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px' }}>
                    <Loader2 size={22} style={{ animation:'spin 0.8s linear infinite', color:'#a78bfa' }} />
                </div>
            ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
                    {slots.map((slot, idx) => {
                        const date    = assigned[slot.id] || '';
                        const display = fmtDisplay(date);

                        return (
                            <div key={slot.id} style={{
                                background:'rgba(255,255,255,0.025)',
                                border:`1px solid ${date ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                borderRadius:'14px', padding:'14px 18px',
                                display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
                                transition:'border-color 0.2s',
                            }}>
                                {/* Index */}
                                <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'rgba(167,139,250,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <span style={{ fontSize:'0.78rem', fontWeight:800, color:'#a78bfa' }}>{idx+1}</span>
                                </div>

                                {/* Title + type */}
                                <div style={{ flex:1, minWidth:'140px' }}>
                                    <p style={{ fontSize:'0.88rem', fontWeight:700, color:'#fff', marginBottom:'2px', lineHeight:1.3 }}>
                                        {slot.idea_title}
                                    </p>
                                    <p style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>
                                        {slot.content_type || 'Educativo'} · Reels
                                    </p>
                                </div>

                                {/* Date picker + display */}
                                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
                                    {date && (
                                        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                                            <CheckCircle2 size={14} color="#34d399" />
                                            <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#34d399' }}>
                                                {display}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ position:'relative' }}>
                                        <input
                                            type="date"
                                            value={date}
                                            min={todayStr}
                                            onChange={e => moveSlot(slot.id, e.target.value)}
                                            style={{
                                                background:'rgba(124,58,237,0.1)',
                                                border:'1px solid rgba(124,58,237,0.3)',
                                                borderRadius:'9px', color:'#a78bfa',
                                                padding:'7px 10px', fontSize:'0.8rem',
                                                cursor:'pointer', outline:'none',
                                                fontFamily:'inherit',
                                                colorScheme:'dark',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            <div style={{ background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:'14px', padding:'14px 18px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'12px' }}>
                <Calendar size={18} color="#34d399" style={{ flexShrink:0 }} />
                <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>
                    <strong style={{ color:'#34d399' }}>{assignedCount} guiones</strong> programados automáticamente en Lunes, Miércoles y Viernes durante{' '}
                    <strong style={{ color:'#34d399' }}>{weeks} semanas</strong>. Cambia cualquier fecha haciendo click en el selector.
                </p>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <button onClick={handleFinish} disabled={saving}
                    style={{
                        display:'inline-flex', alignItems:'center', gap:'9px',
                        background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#10b981,#059669)',
                        color: saving ? '#555' : '#fff',
                        border:'none', borderRadius:'13px', padding:'14px 28px',
                        fontSize:'0.92rem', fontWeight:800, cursor: saving ? 'not-allowed' : 'pointer',
                    }}>
                    {saving
                        ? <><Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }} /> Guardando…</>
                        : <><Sparkles size={17} /> Guardar calendario y finalizar</>
                    }
                </button>
                <button onClick={saveCalendar} disabled={saving}
                    style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'11px', padding:'11px 18px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>
                    Guardar sin finalizar
                </button>
            </div>

            <style>{`
                @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7) sepia(1) saturate(3) hue-rotate(200deg); cursor: pointer; }
            `}</style>
        </div>
    );
}

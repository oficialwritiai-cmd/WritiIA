'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CalendarDays, Zap, Clock, CheckCircle2 } from 'lucide-react';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [scripts, setScripts] = useState([]);
    const [slots, setSlots] = useState([]);
    const [unscheduledScripts, setUnscheduledScripts] = useState([]);
    const [unscheduledSlots, setUnscheduledSlots] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const supabase = createSupabaseClient();

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                setProfile(profileData);

                // Fetch scheduled scripts
                const { data: scheduled } = await supabase
                    .from('scripts')
                    .select('*')
                    .eq('user_id', user.id)
                    .not('scheduled_date', 'is', null);

                setScripts(scheduled || []);

                // Fetch scheduled slots
                const { data: scheduledSlots } = await supabase
                    .from('content_slots')
                    .select('*')
                    .eq('user_id', user.id)
                    .not('scheduled_date', 'is', null);

                setSlots(scheduledSlots || []);

                // Fetch unscheduled scripts
                const { data: unscheduled } = await supabase
                    .from('scripts')
                    .select('*')
                    .eq('user_id', user.id)
                    .is('scheduled_date', null)
                    .limit(10);

                setUnscheduledScripts(unscheduled || []);

                // Fetch unscheduled slots
                const { data: unscheduledSlts } = await supabase
                    .from('content_slots')
                    .select('*')
                    .eq('user_id', user.id)
                    .is('scheduled_date', null)
                    .limit(10);

                setUnscheduledSlots(unscheduledSlts || []);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderHeader = () => {
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Calendario Editorial</h1>
                    <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>
                        {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="btn-secondary" style={{ padding: '8px' }}><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="btn-secondary" style={{ padding: '8px' }}><ChevronRight size={20} /></button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px' }}>
                {days.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d}</div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        const cells = [];

        // Padding previous month
        for (let i = 0; i < startDay; i++) {
            cells.push(<div key={`prev-${i}`} style={{ height: '140px', border: '1px solid rgba(255,255,255,0.03)', opacity: 0.1 }}></div>);
        }

        // Current month
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayScripts = scripts.filter(s => s.scheduled_date?.startsWith(dateStr));
            const daySlots = slots.filter(s => s.scheduled_date?.startsWith(dateStr));

            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            cells.push(
                <div key={day} style={{
                    height: '140px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '10px',
                    background: isToday ? 'rgba(126, 206, 202, 0.02)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    overflowY: 'auto'
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 900 : 400, color: isToday ? '#7ECECA' : 'white', marginBottom: '4px' }}>{day}</span>

                    {dayScripts.map((s, idx) => (
                        <div key={`script-${idx}`} style={{
                            fontSize: '0.65rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: '#7ECECA',
                            color: 'black',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }} title={s.content}>
                            ✓ {s.platform}: {s.topic || s.content.substring(0, 20)}
                        </div>
                    ))}

                    {daySlots.map((s, idx) => (
                        <div key={`slot-${idx}`} style={{
                            fontSize: '0.65rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: s.has_script ? '#7ECECA' : 'transparent',
                            border: s.has_script ? 'none' : '1px dashed rgba(255,255,255,0.3)',
                            color: s.has_script ? 'black' : 'rgba(255,255,255,0.8)',
                            fontWeight: s.has_script ? 700 : 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }} title={s.idea_title}>
                            {s.has_script ? '✓' : '🕒'} {s.platform}: {s.idea_title}
                        </div>
                    ))}
                </div>
            );
        }

        return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>{cells}</div>;
    };

    const autoSchedule = async () => {
        if (unscheduledScripts.length === 0 && unscheduledSlots.length === 0) {
            alert("No hay guiones ni ideas sin programar.");
            return;
        }

        setLoading(true);
        const today = new Date();
        let counter = 1;

        const updatesScripts = unscheduledScripts.map((s) => {
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + counter++); // Mark for the next few days
            return supabase.from('scripts').update({ scheduled_date: futureDate.toISOString() }).eq('id', s.id);
        });

        const updatesSlots = unscheduledSlots.map((s) => {
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + counter++); // Mark for the next few days
            return supabase.from('content_slots').update({ scheduled_date: futureDate.toISOString() }).eq('id', s.id);
        });

        await Promise.all([...updatesScripts, ...updatesSlots]);
        window.location.reload();
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
            <div>
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="premium-card" style={{ padding: '24px', background: 'var(--accent-gradient)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Zap color="white" fill="white" />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Auto-Organizar</h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginBottom: '24px', lineHeight: '1.4' }}>
                        ¿Tienes guiones sin fecha? Nuestra IA los distribuirá de forma óptima en tu calendario.
                    </p>
                    <button onClick={autoSchedule} className="btn-secondary" style={{ width: '100%', background: 'white', color: 'var(--accent)', fontWeight: 800 }}>
                        Organizar en 1 clic
                    </button>
                </div>

                <div className="premium-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="#7ECECA" /> Pendientes ({unscheduledScripts.length + unscheduledSlots.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {unscheduledScripts.map((s, i) => (
                            <div key={`us-${i}`} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>{s.platform} (Guión)</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {s.topic || s.content}
                                </p>
                            </div>
                        ))}
                        {unscheduledSlots.map((s, i) => (
                            <div key={`uslo-${i}`} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>{s.platform} (Plan)</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    {s.idea_title}
                                </p>
                            </div>
                        ))}
                        {(unscheduledScripts.length === 0 && unscheduledSlots.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>
                                <CheckCircle2 size={32} style={{ margin: '0 auto 10px' }} />
                                <p style={{ fontSize: '0.8rem' }}>Todo programado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

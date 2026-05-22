'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { BarChart2, Zap, Save, Activity, Calendar } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';

export default function StatsPage() {
    const [stats, setStats] = useState({ guiones: 0, ideas: 0, calendarEvents: 0, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    useEffect(() => {
        fetchStats();
    }, [activeProject?.id]);

    async function fetchStats() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const pid = activeProject?.id;

        // Guiones en biblioteca
        let guionesQ = supabase.from('library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'guion');

        // Ideas en biblioteca
        let ideasQ = supabase.from('library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'idea');

        // Eventos en calendario
        let calQ = supabase.from('calendar_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Total biblioteca
        let totalQ = supabase.from('library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (pid) {
            guionesQ  = guionesQ.eq('project_id', pid);
            ideasQ    = ideasQ.eq('project_id', pid);
            calQ      = calQ.eq('project_id', pid);
            totalQ    = totalQ.eq('project_id', pid);
        }

        const [{ count: guiones }, { count: ideas }, { count: calendarEvents }, { count: totalItems }] =
            await Promise.all([guionesQ, ideasQ, calQ, totalQ]);

        setStats({
            guiones:        guiones || 0,
            ideas:          ideas || 0,
            calendarEvents: calendarEvents || 0,
            totalItems:     totalItems || 0,
        });
        setLoading(false);
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', borderTopColor: '#7ECECA' }} />
            </div>
        );
    }

    const cards = [
        { label: 'Guiones generados', value: stats.guiones,        color: '#7ECECA', icon: <Zap size={24} color="#7ECECA" />,          sub: 'En tu biblioteca' },
        { label: 'Ideas guardadas',   value: stats.ideas,          color: '#a78bfa', icon: <Save size={24} color="#a78bfa" />,         sub: 'En tu biblioteca' },
        { label: 'Eventos planificados', value: stats.calendarEvents, color: '#34d399', icon: <Calendar size={24} color="#34d399" />, sub: 'En tu calendario' },
        { label: 'Total contenido',   value: stats.totalItems,     color: '#fbbf24', icon: <Activity size={24} color="#fbbf24" />,     sub: 'Guiones + ideas' },
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <BarChart2 size={32} color="var(--accent)" />
                    Métricas {activeProject ? `— ${activeProject.name}` : ''}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    {activeProject ? `Contenido del proyecto "${activeProject.name}"` : 'Selecciona un proyecto para ver sus métricas'}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                {cards.map(c => (
                    <div key={c.label} className="premium-card" style={{ padding: '28px', border: `1px solid ${c.color}22` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ padding: '8px', background: `${c.color}18`, borderRadius: '10px' }}>{c.icon}</div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{c.label}</h3>
                        </div>
                        <p style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1, margin: 0 }}>{c.value}</p>
                        <p style={{ fontSize: '0.82rem', color: c.color, marginTop: '10px', fontWeight: 600 }}>{c.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

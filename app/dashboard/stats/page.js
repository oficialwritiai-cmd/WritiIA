'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { BarChart2, Zap, Save, Activity, Calendar } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';

export default function StatsPage() {
    const [stats, setStats]   = useState({ guiones: 0, ideas: 0, calendarEvents: 0, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [debugPid, setDebugPid] = useState('cargando...');
    const supabase = createSupabaseClient();
    const { activeProject, projectVersion } = useProject();

    // Pasar activeProject como argumento explícito — elimina problemas de closure
    useEffect(() => {
        fetchStats(activeProject);
    }, [projectVersion, activeProject?.id]);

    async function fetchStats(project) {
        setLoading(true);
        const pid = project?.id ?? null;
        setDebugPid(project ? `${project.name} (${pid})` : 'ninguno');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        let guionesQ = supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'guion');
        let ideasQ   = supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'idea');
        let calQ     = supabase.from('calendar_events').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        let totalQ   = supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

        if (pid) {
            guionesQ = guionesQ.eq('project_id', pid);
            ideasQ   = ideasQ.eq('project_id', pid);
            calQ     = calQ.eq('project_id', pid);
            totalQ   = totalQ.eq('project_id', pid);
        }

        const [{ count: guiones }, { count: ideas }, { count: calendarEvents }, { count: totalItems }] =
            await Promise.all([guionesQ, ideasQ, calQ, totalQ]);

        setStats({ guiones: guiones||0, ideas: ideas||0, calendarEvents: calendarEvents||0, totalItems: totalItems||0 });
        setLoading(false);
    }

    const cards = [
        { label: 'Guiones',           value: stats.guiones,        color: '#7ECECA', icon: <Zap size={24} color="#7ECECA" /> },
        { label: 'Ideas',             value: stats.ideas,          color: '#a78bfa', icon: <Save size={24} color="#a78bfa" /> },
        { label: 'Eventos calendario',value: stats.calendarEvents, color: '#34d399', icon: <Calendar size={24} color="#34d399" /> },
        { label: 'Total contenido',   value: stats.totalItems,     color: '#fbbf24', icon: <Activity size={24} color="#fbbf24" /> },
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BarChart2 size={30} color="var(--accent)" />
                    Métricas — {activeProject?.name || 'sin proyecto'}
                </h1>
                {/* Debug temporal — muestra qué proyecto está activo y su ID */}
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                    proyecto activo: {debugPid} · v{projectVersion}
                </p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="loading-spinner" style={{ width: '36px', height: '36px', borderTopColor: '#7ECECA' }} />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {cards.map(c => (
                        <div key={c.label} className="premium-card" style={{ padding: '24px', border: `1px solid ${c.color}22` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <div style={{ padding: '8px', background: `${c.color}18`, borderRadius: '10px' }}>{c.icon}</div>
                                <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{c.label}</h3>
                            </div>
                            <p style={{ fontSize: '2.8rem', fontWeight: 800, color: 'white', lineHeight: 1, margin: 0 }}>{c.value}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

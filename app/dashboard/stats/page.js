'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { BarChart2, Zap, Save, Activity } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';

export default function StatsPage() {
    const [stats, setStats] = useState({ generated: 0, saved: 0, monthGenerations: 0, totalTokens: 0 });
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            } else {
                setLoading(false);
            }
        }
        loadUser();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const fetchStats = async () => {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Build Queries
            let scriptsQuery = supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            let savedQuery = supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_saved', true);
            let monthLogQuery = supabase.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('action', 'generate_scripts').gte('created_at', startOfMonth.toISOString());
            let usageQuery = supabase.from('usage_logs').select('cost_eur, tokens_used').eq('user_id', userId).gte('created_at', startOfMonth.toISOString());

            if (activeProject) {
                scriptsQuery = scriptsQuery.eq('project_id', activeProject.id);
                savedQuery = savedQuery.eq('project_id', activeProject.id);
                monthLogQuery = monthLogQuery.eq('project_id', activeProject.id);
                usageQuery = usageQuery.eq('project_id', activeProject.id);
            } else {
                scriptsQuery = scriptsQuery.is('project_id', null);
                savedQuery = savedQuery.is('project_id', null);
                monthLogQuery = monthLogQuery.is('project_id', null);
                usageQuery = usageQuery.is('project_id', null);
            }

            const { count: gen } = await scriptsQuery;
            const { count: sav } = await savedQuery;
            const { count: mon } = await monthLogQuery;
            const { data: usage } = await usageQuery;

            const tokens = usage?.reduce((acc, curr) => acc + (Number(curr.tokens_used) || 0), 0) || 0;

            setStats({
                generated: gen || 0,
                saved: sav || 0,
                monthGenerations: mon || 0,
                totalTokens: tokens
            });
            setLoading(false);
        };

        fetchStats();

        // Suscripción a cambios
        const chan = supabase.channel('stats-page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_logs', filter: `user_id=eq.${userId}` }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts', filter: `user_id=eq.${userId}` }, fetchStats)
            .subscribe();

        return () => supabase.removeChannel(chan);
    }, [userId, activeProject]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', borderTopColor: '#7ECECA' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Cargando métricas...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <BarChart2 size={36} color="var(--accent)" />
                    Métricas de Uso {activeProject ? `(${activeProject.name})` : ''}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Sigue el crecimiento y coste de tu contenido generado por IA esta mensualidad.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="premium-card" style={{ padding: '32px', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(126, 206, 202, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(126, 206, 202, 0.1)', borderRadius: '12px' }}>
                            <Zap size={24} color="#7ECECA" />
                        </div>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Guiones Generados Totales</h3>
                    </div>
                    <p style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: '1' }}>{stats.generated}</p>
                    <p style={{ fontSize: '0.9rem', color: '#7ECECA', marginTop: '12px', fontWeight: 600 }}>Desde el registro</p>
                </div>

                <div className="premium-card" style={{ padding: '32px', background: 'linear-gradient(145deg, rgba(255,160,122,0.03) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                            <Save size={24} color="#F59E0B" />
                        </div>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Guiones Guardados</h3>
                    </div>
                    <p style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: '1' }}>{stats.saved}</p>
                    <p style={{ fontSize: '0.9rem', color: '#F59E0B', marginTop: '12px', fontWeight: 600 }}>En tu biblioteca</p>
                </div>

                <div className="premium-card" style={{ padding: '32px', background: 'linear-gradient(145deg, rgba(0,243,255,0.03) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(0, 243, 255, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '12px' }}>
                            <Activity size={24} color="#00F3FF" />
                        </div>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Tokens Procesados</h3>
                    </div>
                    <p style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: '1' }}>{stats.totalTokens.toLocaleString()}</p>
                    <p style={{ fontSize: '0.9rem', color: '#00F3FF', marginTop: '12px', fontWeight: 600 }}>Entrada + Salida de IA</p>
                </div>
            </div>
        </div>
    );
}

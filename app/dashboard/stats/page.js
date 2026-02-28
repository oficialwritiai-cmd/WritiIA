'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { BarChart2, Zap, Save, Euro, Activity } from 'lucide-react';

export default function StatsPage() {
    const [stats, setStats] = useState({ generated: 0, saved: 0, monthGenerations: 0, estimatedCost: 0, totalTokens: 0 });
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const supabase = createSupabaseClient();

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

            // Obtener datos globales vs mensuales
            const { count: gen } = await supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            const { count: sav } = await supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_saved', true);
            const { count: mon } = await supabase.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('action', 'generate_scripts').gte('created_at', startOfMonth.toISOString());

            const { data: usage } = await supabase.from('usage_logs').select('cost_eur, tokens_used').eq('user_id', userId).gte('created_at', startOfMonth.toISOString());

            const cost = usage?.reduce((acc, curr) => acc + (Number(curr.cost_eur) || 0), 0) || 0;
            const tokens = usage?.reduce((acc, curr) => acc + (Number(curr.tokens_used) || 0), 0) || 0;

            setStats({
                generated: gen || 0,
                saved: sav || 0,
                monthGenerations: mon || 0,
                estimatedCost: cost,
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
    }, [userId]);

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
                    Métricas de Uso
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

                <div className="premium-card" style={{ padding: '32px', background: 'linear-gradient(145deg, rgba(157,0,255,0.03) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(157, 0, 255, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(157, 0, 255, 0.1)', borderRadius: '12px' }}>
                            <Euro size={24} color="#9D00FF" />
                        </div>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Coste de API (Mes Actual)</h3>
                    </div>
                    <p style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: '1' }}>€{stats.estimatedCost.toFixed(3)}</p>
                    <p style={{ fontSize: '0.9rem', color: '#9D00FF', marginTop: '12px', fontWeight: 600 }}>Aproximado en Claude API</p>
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

            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Información de API y Facturación</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>El coste estimado de la API mostrado aquí asume el uso del modelo <strong>Claude 3.5 Sonnet</strong>. Las operaciones reales de cobranza dependen por completo de tu saldo en tu cuenta de <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Anthropic</a> y no de este software. Un uso normal estándar genera unos €0.010 a €0.025 euros por generación completa (5 guiones).</p>
            </div>
        </div>
    );
}

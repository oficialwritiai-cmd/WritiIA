'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Search, Filter, Star, Calendar, Trash2, Edit3, Loader2 } from 'lucide-react';

const PLATFORMS = ['Todas', 'Reels', 'TikTok', 'Shorts', 'YouTube', 'Blog / SEO'];
const SOURCE_TYPES = {
    'all': 'Todos los orígenes',
    'single_topic': 'Tema único',
    'monthly_plan': 'Plan mensual',
    'ideas': 'Ideas virales'
};

export default function LibraryPage() {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('Todas');
    const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [error, setError] = useState('');

    const supabase = createSupabaseClient();
    const router = useRouter();

    useEffect(() => {
        loadScripts();
    }, []);

    async function loadScripts() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error: fetchError } = await supabase
                .from('scripts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setScripts(data || []);
        } catch (err) {
            console.error(err);
            setError('Error al cargar la biblioteca.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Eliminar este guion permanentemente?')) return;
        try {
            const { error } = await supabase.from('scripts').delete().eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            alert('Error al eliminar');
        }
    }

    async function toggleFavorite(id, currentStatus) {
        try {
            const { error } = await supabase.from('scripts').update({ is_favorite: !currentStatus }).eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !currentStatus } : s));
        } catch (err) {
            alert('Error al actualizar favorito');
        }
    }

    async function handleSchedule(id) {
        const dateStr = prompt('Introduce la fecha para programar (YYYY-MM-DD):');
        if (!dateStr) return;
        try {
            const { error } = await supabase.from('scripts').update({ scheduled_date: dateStr }).eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.map(s => s.id === id ? { ...s, scheduled_date: dateStr } : s));
            alert('Fecha guardada correctamente.');
        } catch (err) {
            alert('Error al programar');
        }
    }

    const filtered = scripts.filter(s => {
        const matchesPlatform = platformFilter === 'Todas' || s.platform?.includes(platformFilter);
        const matchesSource = sourceTypeFilter === 'all' || s.source_type === sourceTypeFilter;
        const matchesFavorite = !onlyFavorites || s.is_favorite;

        const searchLower = search.toLowerCase();
        const matchesSearch = !search ||
            (s.gancho?.toLowerCase().includes(searchLower)) ||
            (s.titulo_angulo?.toLowerCase().includes(searchLower)) ||
            (s.cta?.toLowerCase().includes(searchLower)) ||
            (s.topic?.toLowerCase().includes(searchLower)) ||
            (s.content?.toLowerCase().includes(searchLower));

        return matchesPlatform && matchesSource && matchesFavorite && matchesSearch;
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '80px' }}>
            {/* Encabezado */}
            <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px' }}>Biblioteca de Guiones</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Historial completo de todos los guiones que has creado.
                </p>
            </div>

            {/* Barra superior / Filtros */}
            <div className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 300px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Buscar en título, gancho, CTA..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '48px', height: '48px' }}
                    />
                </div>

                <select
                    className="select-field"
                    style={{ width: '160px', height: '48px' }}
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    className="select-field"
                    style={{ width: '180px', height: '48px' }}
                    value={sourceTypeFilter}
                    onChange={(e) => setSourceTypeFilter(e.target.value)}
                >
                    {Object.entries(SOURCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '48px', padding: '0 16px', borderRadius: '12px', background: onlyFavorites ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255,255,255,0.05)', color: onlyFavorites ? '#FFD700' : 'white', border: `1px solid ${onlyFavorites ? 'rgba(255, 204, 0, 0.3)' : 'transparent'}` }}>
                    <Star size={18} fill={onlyFavorites ? '#FFD700' : 'none'} color={onlyFavorites ? '#FFD700' : 'white'} />
                    <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(e) => setOnlyFavorites(e.target.checked)}
                        style={{ display: 'none' }}
                    />
                    Solo favoritos
                </label>
            </div>

            {/* Lista de guiones */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                    <Loader2 size={40} className="spin" color="#7ECECA" />
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No hay guiones que coincidan con tus filtros.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filtered.map(script => (
                        <div key={script.id} className="premium-card" style={{ padding: '24px', background: '#0A0A0A', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>{script.platform || 'General'}</span>
                                    {script.source_type && <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{SOURCE_TYPES[script.source_type]}</span>}
                                    {script.scheduled_date && (
                                        <span className="badge" style={{ background: 'rgba(157, 0, 255, 0.15)', color: '#D8B4FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={12} /> Programado {new Date(script.scheduled_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => toggleFavorite(script.id, script.is_favorite)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: script.is_favorite ? '#FFD700' : 'rgba(255,255,255,0.3)' }}
                                    >
                                        <Star size={20} fill={script.is_favorite ? '#FFD700' : 'none'} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'white' }}>
                                    {script.titulo_angulo || script.topic || 'Guion sin título'}
                                </h3>
                                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.5', fontFamily: 'monospace' }}>
                                    "{script.gancho ? script.gancho : (script.content ? script.content.substring(0, 100) + '...' : '')}"
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                                    Creado el {new Date(script.created_at).toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => handleDelete(script.id)} className="btn-secondary" style={{ padding: '8px 12px', color: '#FF4D4D', borderColor: 'rgba(255, 77, 77, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Trash2 size={16} /> <span className="hide-mobile">Eliminar</span>
                                    </button>
                                    <button onClick={() => handleSchedule(script.id)} className="btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={16} /> <span className="hide-mobile">Planificar</span>
                                    </button>
                                    <button onClick={() => alert('Próximamente: Abre el mismo editor')} className="btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Edit3 size={16} /> Ver / Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                @media(max-width: 600px) {
                    .hide-mobile { display: none; }
                }
            `}</style>
        </div>
    );
}

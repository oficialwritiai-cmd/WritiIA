'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const PLATAFORMAS_FILTRO = ['Todas', 'Reels', 'TikTok', 'LinkedIn', 'X'];

export default function LibraryPage() {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('Todas');
    const [error, setError] = useState('');
    const supabase = createSupabaseClient();

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
                .eq('is_saved', true)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setScripts(data || []);
        } catch (err) {
            setError('Error al cargar la biblioteca.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Eliminar este guión permanentemente?')) return;
        try {
            const { error } = await supabase.from('scripts').delete().eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            alert('Error al eliminar');
        }
    }

    const filtered = scripts.filter(s => {
        const matchesPlatform = platformFilter === 'Todas' || s.platform === platformFilter;
        const matchesSearch = !search || s.topic?.toLowerCase().includes(search.toLowerCase());
        return matchesPlatform && matchesSearch;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Archivo de Éxitos</p>
                    <h1 style={{ fontSize: '2.5rem' }}>Mi Biblioteca</h1>
                </div>

                <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '500px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Buscar por tema..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '45px', background: 'var(--bg-sidebar)' }}
                        />
                    </div>
                    <select
                        className="select-field"
                        style={{ width: '160px', background: 'var(--bg-sidebar)' }}
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                    >
                        {PLATAFORMAS_FILTRO.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px', background: 'var(--bg-sidebar)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No hay guiones guardados que coincidan.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {filtered.map(script => (
                        <div key={script.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                <span className="badge-accent">{script.platform}</span>
                                <button onClick={() => handleDelete(script.id)} className="btn-danger">Eliminar</button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <span className="script-label">{script.topic}</span>
                                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white', marginBottom: '16px', lineHeight: '1.4' }}>
                                    {script.scripts_content?.gancho}
                                </p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {script.scripts_content?.desarrollo?.[0]}...
                                </p>
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span>{script.tone}</span>
                                <span>{new Date(script.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

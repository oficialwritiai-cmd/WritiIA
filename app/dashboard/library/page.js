'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Search, Filter, Star, Calendar, Trash2, Edit3, Loader2, Copy, RefreshCw, Zap, Sparkles } from 'lucide-react';

const PLATFORMS = ['Todas', 'Reels', 'TikTok', 'Shorts', 'YouTube', 'LinkedIn', 'X'];
const CONTENT_TYPES = ['Todos', 'guion', 'idea', 'mensual'];
const OBJECTIVES = ['Todos', 'atraer leads', 'autoridad', 'venta directa', 'engagement', 'storytelling'];
const GOALS = ['Todos', 'Viralizar', 'Generar ventas', 'Ganar seguidores', 'Crear autoridad', 'Educar'];
const TONES = ['Todos', 'brutal honesto', 'elegante', 'polémico', 'cercano', 'experto', 'profesional'];
const HOOK_TYPES = ['Todos', 'historia personal', 'pain fuerte', 'contraintuitivo', 'prueba social', 'curiosidad extrema'];

export default function LibraryPage() {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('Todas');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [goalFilter, setGoalFilter] = useState('Todos');
    const [toneFilter, setToneFilter] = useState('Todos');
    const [hookTypeFilter, setHookTypeFilter] = useState('Todos');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [selectedScript, setSelectedScript] = useState(null);
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
                .from('library')
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

    async function duplicateAndVary(id, currentContent) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const newContent = {
                ...currentContent,
                titulo_angulo: (currentContent.titulo_angulo || '').includes('(variación')
                    ? currentContent.titulo_angulo
                    : (currentContent.titulo_angulo || 'Nuevo guion') + ' (variación)'
            };

            const { error } = await supabase.from('library').insert({
                user_id: user.id,
                type: currentContent.type || 'guion',
                platform: currentContent.platform,
                goal: currentContent.goal,
                content: newContent,
                metadata: { ...currentContent.metadata, duplicated_from: id, variation: true },
                tags: currentContent.tags || [],
                status: 'borrador'
            });

            if (error) throw error;
            showToast('Duplicado y listo para variar', 'success');
            loadScripts();
        } catch (err) {
            showToast('Error al duplicar', 'error');
        }
    }

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [toast, setToast] = useState(null);

    async function handleDelete(id) {
        if (!confirm('¿Eliminar este contenido permanentemente?')) return;
        try {
            const { error } = await supabase.from('library').delete().eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            alert('Error al eliminar');
        }
    }

    async function toggleFavorite(id, currentStatus) {
        try {
            const { error } = await supabase.from('library').update({ is_favorite: !currentStatus }).eq('id', id);
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
            const { error } = await supabase.from('library').update({ scheduled_date: dateStr }).eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.map(s => s.id === id ? { ...s, scheduled_date: dateStr } : s));
            alert('Fecha guardada correctamente.');
        } catch (err) {
            alert('Error al programar');
        }
    }

    const filtered = scripts.filter(s => {
        const matchesPlatform = platformFilter === 'Todas' || s.platform?.includes(platformFilter);
        const matchesType = typeFilter === 'Todos' || s.type === typeFilter;
        const matchesGoal = goalFilter === 'Todos' || s.goal === goalFilter;
        const matchesTone = toneFilter === 'Todos' || (s.metadata?.tone || s.tone || '').toLowerCase().includes(toneFilter.toLowerCase());
        const matchesHookType = hookTypeFilter === 'Todos' || (s.metadata?.hookType || '').includes(hookTypeFilter);
        const matchesFavorite = !onlyFavorites || s.is_favorite;

        let matchesDate = true;
        if (dateFrom) matchesDate = matchesDate && new Date(s.created_at) >= new Date(dateFrom);
        if (dateTo) matchesDate = matchesDate && new Date(s.created_at) <= new Date(dateTo);

        const contentObj = s.content || {};
        const searchLower = search.toLowerCase();
        const contentText = typeof contentObj === 'string' ? contentObj : JSON.stringify(contentObj);
        const matchesSearch = !search ||
            contentText.toLowerCase().includes(searchLower) ||
            (s.titulo_angulo || contentObj.titulo_angulo || '').toLowerCase().includes(searchLower) ||
            (contentObj.hook_principal || contentObj.gancho || '').toLowerCase().includes(searchLower) ||
            (contentObj.cta || '').toLowerCase().includes(searchLower) ||
            (s.goal || '').toLowerCase().includes(searchLower);

        return matchesPlatform && matchesType && matchesGoal && matchesTone && matchesHookType && matchesFavorite && matchesDate && matchesSearch;
    });

    const copyToClipboard = (item) => {
        const { content, titulo, type } = item;
        let text = '';

        if (type === 'guion' && typeof content === 'object') {
            text = `GUION: ${titulo || content.titulo_guion || content.titulo_angulo}\n\n`;
            text += `HOOK: ${content.hook || content.gancho || ''}\n\n`;
            text += `DESARROLLO:\n${Array.isArray(content.desarrollo) ? content.desarrollo.join('\n') : ''}\n\n`;
            if (content.cierre) text += `CIERRE: ${content.cierre}\n\n`;
            text += `CTA: ${content.cta || ''}\n\n`;

            if (content.copy_post) {
                text += `--- COPY POST ---\n`;
                text += `${content.copy_post.titulo || ''}\n\n`;
                text += `${content.copy_post.descripcion_larga || ''}\n\n`;
                text += `Hashtags: ${Array.isArray(content.copy_post.hashtags) ? content.copy_post.hashtags.map(h => '#' + h).join(' ') : ''}`;
            }
        } else if (type === 'idea' && typeof content === 'object') {
            text = `IDEA: ${titulo || content.titulo || content.titulo_idea}\n\n`;
            text += `DESCRIPCIÓN: ${content.descripcion || ''}\n\n`;
            if (content.hook) text += `HOOK SUGERIDO: ${content.hook}\n\n`;
            text += `PLATAFORMA: ${item.platform}\n`;
            text += `OBJETIVO: ${item.goal}`;
        } else {
            text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        }

        navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles ✓', 'success');
    };

    const getTypeLabel = (type) => {
        const labels = { guion: 'Guion', idea: 'Idea', plan_mensual: 'Plan Mensual' };
        return labels[type] || type || 'Contenido';
    };

    const handleUpdateItem = async (id, updates) => {
        try {
            const { error } = await supabase.from('library').update(updates).eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            showToast('Actualizado', 'success');
        } catch (err) {
            showToast('Error al actualizar', 'error');
        }
    };

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
            <div className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 280px' }}>
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

                <select className="select-field" style={{ width: '140px', height: '48px' }} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select className="select-field" style={{ width: '130px', height: '48px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    {CONTENT_TYPES.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Tipo' : t}</option>)}
                </select>

                <select className="select-field" style={{ width: '150px', height: '48px' }} value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)}>
                    {GOALS.map(g => <option key={g} value={g}>{g === 'Todos' ? 'Objetivo' : g}</option>)}
                </select>

                <select className="select-field" style={{ width: '140px', height: '48px' }} value={toneFilter} onChange={(e) => setToneFilter(e.target.value)}>
                    {TONES.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Tono' : t}</option>)}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '140px', height: '48px', padding: '0 12px' }} />
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                    <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '140px', height: '48px', padding: '0 12px' }} />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '48px', padding: '0 16px', borderRadius: '12px', background: onlyFavorites ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255,255,255,0.05)', color: onlyFavorites ? '#FFD700' : 'white', border: `1px solid ${onlyFavorites ? 'rgba(255, 204, 0, 0.3)' : 'transparent'}` }}>
                    <Star size={18} fill={onlyFavorites ? '#FFD700' : 'none'} color={onlyFavorites ? '#FFD700' : 'white'} />
                    <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} style={{ display: 'none' }} />
                    Favoritos
                </label>
            </div>

            {/* Lista de contenido */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                    <Loader2 size={40} className="animate-spin" color="#7ECECA" />
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No hay contenido que coincida con tus filtros.</p>
                    <button onClick={() => router.push('/dashboard')} className="btn-primary" style={{ marginTop: '20px' }}>Crear nuevo contenido →</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filtered.map(item => {
                        const content = item.content || {};
                        const hookText = content.hookText || content.hook_principal || content.gancho || content.descripcion || '';
                        const title = item.titulo || content.titulo_angulo || item.goal || item.platform || 'Sin título';

                        return (
                            <div key={item.id} className="premium-card" style={{ padding: '24px', background: '#0A0A0A', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>{getTypeLabel(item.type)}</span>
                                        <span className="badge" style={{ background: 'rgba(157, 0, 255, 0.1)', color: '#B74DFF' }}>{item.platform || 'General'}</span>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {(item.tags || []).map((tag, idx) => (
                                                <span key={idx} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button onClick={() => toggleFavorite(item.id, item.is_favorite)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: item.is_favorite ? '#FFD700' : 'rgba(255,255,255,0.3)' }}>
                                            <Star size={20} fill={item.is_favorite ? '#FFD700' : 'none'} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <input
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '1.2rem',
                                            fontWeight: 800,
                                            marginBottom: '8px',
                                            color: 'white',
                                            width: '100%',
                                            outline: 'none',
                                            borderBottom: '1px solid transparent'
                                        }}
                                        defaultValue={title}
                                        onBlur={(e) => handleUpdateItem(item.id, { titulo: e.target.value })}
                                        onFocus={(e) => e.target.style.borderBottom = '1px solid #7ECECA'}
                                        placeholder="Título del contenido..."
                                    />
                                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                        {hookText ? hookText.substring(0, 200) + (hookText.length > 200 ? '...' : '') : 'Sin descripción disponible'}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => copyToClipboard(item)} className="btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Copy size={16} /> <span className="hide-mobile">Copiar</span>
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="btn-secondary" style={{ padding: '8px 12px', color: '#FF4D4D', borderColor: 'rgba(255, 77, 77, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#FF4D4D' : '#7ECECA', color: toast.type === 'error' ? 'white' : 'black', padding: '14px 28px', borderRadius: '50px', fontWeight: 700, boxShadow: '0 15px 40px rgba(0,0,0,0.4)', zIndex: 1000 }}>
                    {toast.msg}
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

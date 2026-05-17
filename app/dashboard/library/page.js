'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Search, Star, Trash2, Loader2, Copy, RefreshCw, BookOpen, Sparkles, AlertTriangle, Share2, ThumbsUp, ThumbsDown, BarChart2, CheckCircle2, X } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';
import SheetEditor from '@/app/components/SheetEditor';

const PLATFORMS = ['Todas', 'Reels', 'TikTok', 'Shorts', 'YouTube', 'LinkedIn', 'X'];
const CONTENT_TYPES = ['Todos', 'guion', 'idea', 'mensual'];

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
    bg:         '#0c0c0e',
    card:       'rgba(255,255,255,0.03)',
    cardHover:  'rgba(255,255,255,0.055)',
    border:     'rgba(255,255,255,0.07)',
    borderHover:'rgba(167,139,250,0.35)',
    violet:     '#a78bfa',
    violetDark: '#7c3aed',
    violetBg:   'rgba(167,139,250,0.1)',
    red:        '#f87171',
    redBg:      'rgba(248,113,113,0.1)',
    redBorder:  'rgba(248,113,113,0.25)',
    gold:       '#fbbf24',
    goldBg:     'rgba(251,191,36,0.1)',
    green:      '#34d399',
    greenBg:    'rgba(52,211,153,0.1)',
    textPrimary:'#f1f1f3',
    textSecondary:'rgba(241,241,243,0.55)',
    textMuted:  'rgba(241,241,243,0.3)',
    radius:     '14px',
    radiusSm:   '8px',
};

const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`,
    borderRadius: C.radiusSm,
    color: C.textPrimary,
    padding: '0 14px',
    height: '40px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s',
};

const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    paddingRight: '32px',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
};

export default function LibraryPage() {
    const [scripts, setScripts]             = useState([]);
    const [loading, setLoading]             = useState(true);
    const [refreshing, setRefreshing]       = useState(false);
    const [search, setSearch]               = useState('');
    const [platformFilter, setPlatformFilter] = useState('Todas');
    const [typeFilter, setTypeFilter]       = useState('Todos');
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [error, setError]                 = useState('');
    const [toast, setToast]                 = useState(null);
    const [showSheetEditor, setShowSheetEditor] = useState(false);
    const [selectedItem, setSelectedItem]   = useState(null); // item opened in SheetEditor
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearing, setClearing]           = useState(false);
    const [performances, setPerformances]   = useState({});
    const [metricsModal, setMetricsModal]   = useState(null);
    const [metricsForm, setMetricsForm]     = useState({ views: '', likes_count: '', comments_count: '', shares_count: '', published_at: '', notes: '' });
    const [savingPerf, setSavingPerf]       = useState(false);

    const supabase = createSupabaseClient();
    const router   = useRouter();
    const { activeProject } = useProject();

    // ── Load on mount + visibility change ─────────────────────────────────────
    useEffect(() => {
        loadScripts();
    }, []);

    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') loadScripts(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    // ── Data fetching ──────────────────────────────────────────────────────────
    async function loadScripts(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            setCurrentUserId(user.id);

            // FIX: Query ALL library items for the user — no project_id filter
            const { data, error: fetchError } = await supabase
                .from('library')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setScripts(data || []);

            // Cargar performances
            try {
                const res = await fetch('/api/performance');
                const { performances: perfs = [] } = await res.json().catch(() => ({}));
                const perfMap = {};
                perfs.forEach(p => { perfMap[p.script_id] = p; });
                setPerformances(perfMap);
            } catch { /* non-fatal */ }
        } catch (err) {
            console.error(err);
            setError('Error al cargar la biblioteca.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    // ── Business logic (preserved) ─────────────────────────────────────────────
    async function toggleFavorite(id, currentStatus) {
        try {
            const { error } = await supabase
                .from('library')
                .update({ is_favorite: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !currentStatus } : s));
        } catch {
            showToast('Error al actualizar favorito', 'error');
        }
    }

    async function deleteItem(id) {
        try {
            const { error } = await supabase.from('library').delete().eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.filter(s => s.id !== id));
            showToast('Elemento eliminado', 'success');
        } catch {
            showToast('Error al eliminar', 'error');
        }
    }

    async function clearAll() {
        if (!currentUserId) return;
        setClearing(true);
        try {
            const { error } = await supabase
                .from('library')
                .delete()
                .eq('user_id', currentUserId);
            if (error) throw error;
            setScripts([]);
            showToast('Biblioteca limpiada correctamente', 'success');
        } catch {
            showToast('Error al limpiar la biblioteca', 'error');
        } finally {
            setClearing(false);
            setShowClearConfirm(false);
        }
    }

    const handleUpdateItem = async (id, updates) => {
        try {
            const { error } = await supabase.from('library').update(updates).eq('id', id);
            if (error) throw error;
            setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        } catch {
            showToast('Error al actualizar', 'error');
        }
    };

    const copyToClipboard = (item) => {
        const { content, titulo, type } = item;
        let text = '';

        // Prefer the pre-rendered full text if available
        if (item.script_full_text) {
            text = item.script_full_text;
        } else if (type === 'guion' && typeof content === 'object') {
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
            text += `PLATAFORMA: ${item.platform}\nOBJETIVO: ${item.goal}`;
        } else {
            text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        }

        navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles', 'success');
    };

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Filtering ──────────────────────────────────────────────────────────────
    const filtered = scripts.filter(s => {
        const matchesPlatform = platformFilter === 'Todas' || (s.platform || '').includes(platformFilter);
        const matchesType     = typeFilter === 'Todos'    || s.type === typeFilter;
        const matchesFavorite = !onlyFavorites            || s.is_favorite;

        if (!search) return matchesPlatform && matchesType && matchesFavorite;

        const contentObj  = s.content || {};
        const searchLower = search.toLowerCase();
        const contentText = typeof contentObj === 'string' ? contentObj : JSON.stringify(contentObj);
        const matchesSearch =
            contentText.toLowerCase().includes(searchLower) ||
            (s.titulo || contentObj.titulo_angulo || '').toLowerCase().includes(searchLower) ||
            (contentObj.hook_principal || contentObj.gancho || '').toLowerCase().includes(searchLower) ||
            (s.script_full_text || '').toLowerCase().includes(searchLower) ||
            (s.goal || '').toLowerCase().includes(searchLower);

        return matchesPlatform && matchesType && matchesFavorite && matchesSearch;
    });

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getTitle = (item) =>
        item.titulo ||
        item.content?.titulo_angulo ||
        item.content?.titulo_guion ||
        item.content?.titulo ||
        'Sin título';

    const getPreview = (item) => {
        if (item.script_full_text) return item.script_full_text.slice(0, 120);
        const c = item.content || {};
        return (c.hook || c.gancho || c.descripcion || c.hook_principal || '').slice(0, 120);
    };

    const getTypeColors = (type) => {
        if (type === 'guion') return { bg: C.violetBg, color: C.violet };
        if (type === 'idea')  return { bg: C.greenBg,  color: C.green };
        return { bg: 'rgba(255,255,255,0.06)', color: C.textSecondary };
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // ── Feedback handler ──────────────────────────────────────────────────────
    async function handleFeedback(scriptId, rating) {
        try {
            const res = await fetch('/api/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId, rating }),
            });
            if (!res.ok) throw new Error('Error al guardar');
            setPerformances(p => ({ ...p, [scriptId]: { ...(p[scriptId] || {}), rating } }));
            showToast(rating === 'like' ? '¡Genial! Tu Cerebro IA aprende de esto' : 'Anotado. Evitaremos este estilo', 'success');
        } catch(e) {
            showToast('Error al guardar feedback', 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: 'inherit', padding: '32px 24px', maxWidth: '1280px', margin: '0 auto', paddingBottom: '80px' }}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: C.violetBg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={22} color={C.violet} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.textPrimary, margin: 0, lineHeight: 1.2 }}>
                            Biblioteca de Guiones
                        </h1>
                        <p style={{ fontSize: '0.82rem', color: C.textMuted, margin: '2px 0 0' }}>
                            Todo tu contenido en un solo lugar
                        </p>
                    </div>
                    {!loading && (
                        <span style={{ background: C.violetBg, color: C.violet, border: `1px solid rgba(167,139,250,0.2)`, borderRadius: '20px', padding: '3px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                            {filtered.length} {filtered.length === 1 ? 'elemento' : 'elementos'}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Refresh */}
                    <button
                        onClick={() => loadScripts(true)}
                        disabled={refreshing}
                        title="Actualizar"
                        style={{ width: '40px', height: '40px', borderRadius: C.radiusSm, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.textSecondary, cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: refreshing ? 0.5 : 1 }}
                    >
                        <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    </button>

                    {/* Clear All */}
                    {scripts.length > 0 && (
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 16px', borderRadius: C.radiusSm, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <Trash2 size={15} />
                            Limpiar todo
                        </button>
                    )}
                </div>
            </div>

            {/* ── Search + Filters row ─────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '24px', background: C.card, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: '14px 16px' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Buscar en título, gancho, texto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ ...inputStyle, width: '100%', paddingLeft: '36px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Platform */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        style={{ ...selectStyle, width: '130px' }}
                    >
                        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                {/* Type */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{ ...selectStyle, width: '120px' }}
                    >
                        {CONTENT_TYPES.map(t => <option key={t} value={t}>{t === 'Todos' ? 'Tipo: Todos' : t}</option>)}
                    </select>
                </div>

                {/* Favorites toggle */}
                <button
                    onClick={() => setOnlyFavorites(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 14px', borderRadius: C.radiusSm, background: onlyFavorites ? C.goldBg : 'rgba(255,255,255,0.03)', border: `1px solid ${onlyFavorites ? 'rgba(251,191,36,0.3)' : C.border}`, color: onlyFavorites ? C.gold : C.textSecondary, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    <Star size={15} fill={onlyFavorites ? C.gold : 'none'} />
                    Favoritos
                </button>
            </div>

            {/* ── Error ────────────────────────────────────────────────────── */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: C.radiusSm, padding: '12px 16px', marginBottom: '20px', color: C.red, fontSize: '0.9rem' }}>
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => loadScripts()} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'underline' }}>Reintentar</button>
                </div>
            )}

            {/* ── Loading ───────────────────────────────────────────────────── */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
                    <Loader2 size={36} color={C.violet} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: C.textMuted, fontSize: '0.9rem' }}>Cargando biblioteca...</span>
                </div>

            ) : filtered.length === 0 ? (
                /* ── Empty state ─────────────────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', background: C.card, border: `1px dashed ${C.border}`, borderRadius: C.radius, gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.violetBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                        <Sparkles size={28} color={C.violet} />
                    </div>
                    <div>
                        <p style={{ fontSize: '1.15rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
                            {search || platformFilter !== 'Todas' || typeFilter !== 'Todos' || onlyFavorites
                                ? 'Sin resultados para esos filtros'
                                : 'Tu biblioteca está vacía'}
                        </p>
                        <p style={{ fontSize: '0.9rem', color: C.textMuted, margin: 0 }}>
                            {search || platformFilter !== 'Todas' || typeFilter !== 'Todos' || onlyFavorites
                                ? 'Prueba con otros filtros o limpia la búsqueda.'
                                : 'Genera tu primer guion en la sesión Matrix y aparecerá aquí.'}
                        </p>
                    </div>
                    {!(search || platformFilter !== 'Todas' || typeFilter !== 'Todos' || onlyFavorites) && (
                        <button
                            onClick={() => router.push('/dashboard')}
                            style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 20px', borderRadius: C.radiusSm, background: `linear-gradient(135deg, ${C.violetDark}, ${C.violet})`, border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            <Sparkles size={16} />
                            Ir a la sesión Matrix
                        </button>
                    )}
                </div>

            ) : (
                /* ── Cards grid ──────────────────────────────────────────── */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filtered.map(item => {
                        const title    = getTitle(item);
                        const preview  = getPreview(item);
                        const typeClr  = getTypeColors(item.type);

                        return (
                            <div
                                key={item.id}
                                onClick={() => { setSelectedItem(item); setShowSheetEditor(true); }}
                                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', transition: 'border-color 0.2s, background 0.2s', position: 'relative', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
                            >
                                {/* Top row: badges + favorite */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {/* Type badge */}
                                        <span style={{ background: typeClr.bg, color: typeClr.color, borderRadius: '6px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'capitalize' }}>
                                            {item.type || 'contenido'}
                                        </span>
                                        {/* Platform badge */}
                                        {item.platform && (
                                            <span style={{ background: 'rgba(255,255,255,0.05)', color: C.textSecondary, borderRadius: '6px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {item.platform}
                                            </span>
                                        )}
                                        {/* Project badge (optional — non-filtering) */}
                                        {item.project_id && (
                                            <span title={`Proyecto: ${item.project_id}`} style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                                                Proyecto
                                            </span>
                                        )}
                                    </div>
                                    {/* Favorite star */}
                                    <button
                                        onClick={() => toggleFavorite(item.id, item.is_favorite)}
                                        title={item.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: item.is_favorite ? C.gold : C.textMuted, transition: 'color 0.2s', flexShrink: 0 }}
                                    >
                                        <Star size={18} fill={item.is_favorite ? C.gold : 'none'} />
                                    </button>
                                </div>

                                {/* Title */}
                                <div>
                                    <input
                                        defaultValue={title}
                                        onBlur={(e) => {
                                            if (e.target.value !== title) handleUpdateItem(item.id, { titulo: e.target.value });
                                        }}
                                        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', color: C.textPrimary, fontSize: '1rem', fontWeight: 700, width: '100%', outline: 'none', transition: 'border-color 0.2s', padding: '2px 0' }}
                                        onFocus={e => e.target.style.borderBottomColor = C.violet}
                                        onBlur2={e => e.target.style.borderBottomColor = 'transparent'}
                                        placeholder="Sin título"
                                    />
                                </div>

                                {/* Preview text */}
                                {preview && (
                                    <p style={{ fontSize: '0.82rem', color: C.textSecondary, margin: 0, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {preview}{preview.length >= 120 ? '...' : ''}
                                    </p>
                                )}

                                {/* Feedback row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                                    {performances[item.id]?.rating === 'like' ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '20px', padding: '3px 10px' }}>
                                            <CheckCircle2 size={11} /> Funcionó
                                        </span>
                                    ) : performances[item.id]?.rating === 'dislike' ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '20px', padding: '3px 10px' }}>
                                            <X size={11} /> No funcionó
                                        </span>
                                    ) : (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); handleFeedback(item.id, 'like'); }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '4px 10px', cursor: 'pointer' }}>
                                                <ThumbsUp size={12} /> Funcionó
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleFeedback(item.id, 'dislike'); }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '4px 10px', cursor: 'pointer' }}>
                                                <ThumbsDown size={12} /> No funcionó
                                            </button>
                                        </>
                                    )}
                                    {(performances[item.id]?.rating === 'like' || performances[item.id]?.views) && (
                                        <button onClick={(e) => { e.stopPropagation(); setMetricsForm({ views: performances[item.id]?.views || '', likes_count: performances[item.id]?.likes_count || '', comments_count: performances[item.id]?.comments_count || '', shares_count: performances[item.id]?.shares_count || '', published_at: performances[item.id]?.published_at || '', notes: performances[item.id]?.notes || '' }); setMetricsModal(item.id); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600, color: performances[item.id]?.views ? '#60a5fa' : 'rgba(255,255,255,0.35)', background: performances[item.id]?.views ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${performances[item.id]?.views ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '7px', padding: '4px 10px', cursor: 'pointer', marginLeft: 'auto' }}>
                                            <BarChart2 size={11} /> {performances[item.id]?.views ? 'Ver métricas' : '+ Añadir métricas'}
                                        </button>
                                    )}
                                </div>

                                {/* Footer: date + actions */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
                                    <span style={{ fontSize: '0.75rem', color: C.textMuted }}>
                                        {formatDate(item.created_at)}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {/* Copy */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(item); }}
                                            title="Copiar texto completo"
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '32px', padding: '0 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <Copy size={13} />
                                            Copiar
                                        </button>
                                        {/* Share */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ libraryId: item.id }) });
                                                    const { url, error: apiErr } = await res.json();
                                                    if (apiErr) { showToast('Error al generar link', 'error'); return; }
                                                    const fullUrl = window.location.origin + url;
                                                    navigator.clipboard.writeText(fullUrl);
                                                    showToast('Link copiado al portapapeles', 'success');
                                                } catch {
                                                    showToast('Error al generar link', 'error');
                                                }
                                            }}
                                            title="Compartir guion"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <Share2 size={13} />
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                            title="Eliminar"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '7px', background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Confirmation modal: Clear All ─────────────────────────────── */}
            {showClearConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}>
                    <div style={{ background: '#141416', border: `1px solid ${C.redBorder}`, borderRadius: '18px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: C.redBg, border: `1px solid ${C.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertTriangle size={22} color={C.red} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.textPrimary }}>Limpiar biblioteca</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: C.textMuted }}>Esta acción no se puede deshacer</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: C.textSecondary, lineHeight: 1.6, marginBottom: '24px' }}>
                            Vas a eliminar <strong style={{ color: C.textPrimary }}>{scripts.length} {scripts.length === 1 ? 'elemento' : 'elementos'}</strong> de tu biblioteca de forma permanente. ¿Estás seguro?
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                disabled={clearing}
                                style={{ height: '40px', padding: '0 20px', borderRadius: C.radiusSm, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={clearAll}
                                disabled={clearing}
                                style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 20px', borderRadius: C.radiusSm, background: clearing ? 'rgba(248,113,113,0.4)' : '#dc2626', border: 'none', color: 'white', fontWeight: 700, cursor: clearing ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                            >
                                {clearing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                                {clearing ? 'Eliminando...' : 'Sí, limpiar todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ─────────────────────────────────────────────────────── */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 10000, whiteSpace: 'nowrap' }}>
                    {toast.msg}
                </div>
            )}

            {/* ── Modal de métricas ─────────────────────────────────────────── */}
            {metricsModal && (
                <div onClick={e => { if (e.target === e.currentTarget) setMetricsModal(null); }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', maxWidth: '460px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>¿Cómo le fue a este vídeo?</h3>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>Opcional — ayuda a tu Cerebro IA a aprender</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                            {[
                                { key: 'views', label: 'Visualizaciones', placeholder: 'Ej: 12500' },
                                { key: 'likes_count', label: 'Likes', placeholder: 'Ej: 847' },
                                { key: 'comments_count', label: 'Comentarios', placeholder: 'Ej: 134' },
                                { key: 'shares_count', label: 'Compartidos', placeholder: 'Ej: 89' },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                                    <input type="number" value={metricsForm[key]} onChange={e => setMetricsForm(f => ({ ...f, [key]: e.target.value }))}
                                        placeholder={placeholder}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '10px 12px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha de publicación</label>
                            <input type="date" value={metricsForm.published_at} onChange={e => setMetricsForm(f => ({ ...f, published_at: e.target.value }))}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '10px 12px', fontSize: '0.88rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nota personal</label>
                            <textarea value={metricsForm.notes} onChange={e => setMetricsForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Ej: El gancho funcionó muy bien, el CTA no tanto"
                                rows={2}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '10px 12px', fontSize: '0.88rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={async () => {
                            setSavingPerf(true);
                            try {
                                await fetch('/api/performance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scriptId: metricsModal, ...metricsForm, views: metricsForm.views ? parseInt(metricsForm.views) : undefined, likes_count: metricsForm.likes_count ? parseInt(metricsForm.likes_count) : undefined, comments_count: metricsForm.comments_count ? parseInt(metricsForm.comments_count) : undefined, shares_count: metricsForm.shares_count ? parseInt(metricsForm.shares_count) : undefined }) });
                                setPerformances(p => ({ ...p, [metricsModal]: { ...(p[metricsModal] || {}), ...metricsForm } }));
                                showToast('Tu Cerebro IA es ahora más preciso', 'success');
                                setMetricsModal(null);
                            } finally { setSavingPerf(false); }
                        }} disabled={savingPerf}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: '12px', padding: '13px', fontWeight: 700, fontSize: '0.9rem', cursor: savingPerf ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            {savingPerf ? 'Guardando...' : 'Guardar métricas'}
                        </button>
                        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: '10px' }}>Tus métricas son privadas y solo mejoran tu Cerebro IA</p>
                    </div>
                </div>
            )}

            {/* ── Sheet Editor — opens on card click OR new ───────────────── */}
            {showSheetEditor && (
                <SheetEditor
                    sheetId={selectedItem ? selectedItem.id : 'new'}
                    item={selectedItem || null}
                    onClose={() => { setShowSheetEditor(false); setSelectedItem(null); loadScripts(); }}
                    onSave={(saved) => { setShowSheetEditor(false); setSelectedItem(null); loadScripts(); }}
                    userId={currentUserId}
                    activeProjectId={activeProject?.id}
                />
            )}

            {/* ── Global keyframes ──────────────────────────────────────────── */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import {
    ChevronLeft, ChevronRight, Plus, X, Save, Trash2, Search,
    BookOpen, Edit3, Calendar as CalendarIcon, LayoutGrid,
    Type, Tag, Globe, Share2, Sparkles, Filter, MoreVertical,
    CheckCircle2, Clock, Palette, Copy, ArrowRightLeft, Target
} from 'lucide-react';
import Logo from '@/app/components/Logo';
import './calendar.css';

export default function CalendarPage() {
    const router = useRouter();
    const supabase = createSupabaseClient();

    // -- State --
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
    const [events, setEvents] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Detail Panel State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Filter State
    const [filterPlatform, setFilterPlatform] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, eventId }

    // Form States (for the panel)
    const [tempTitle, setTempTitle] = useState('');
    const [tempStatus, setTempStatus] = useState('idea');
    const [tempPlatform, setTempPlatform] = useState('General');
    const [tempNotes, setTempNotes] = useState('');
    const [tempColor, setTempColor] = useState('');

    const THEME_COLORS = [
        { id: '', hex: '#333333', name: 'Default' },
        { id: 'purple', hex: '#9D00FF', name: 'Morado' },
        { id: 'pink', hex: '#EC4899', name: 'Rosa' },
        { id: 'blue', hex: '#3B82F6', name: 'Azul' },
        { id: 'green', hex: '#10B981', name: 'Verde' },
        { id: 'yellow', hex: '#F59E0B', name: 'Amarillo' },
        { id: 'red', hex: '#EF4444', name: 'Rojo' },
        { id: 'gray', hex: '#6B7280', name: 'Gris' }
    ];

    // -- Lifecycle --
    useEffect(() => {
        loadData();
    }, [currentDate]);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Load events for the current month
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: eventData } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', user.id)
                .gte('event_date', firstDay)
                .lte('event_date', lastDay);

            setEvents(eventData || []);

            // Also load library items for the import dropdown or list
            const { data: libData } = await supabase
                .from('library')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            setLibraryItems(libData || []);
        }
        setLoading(false);
    }

    // -- Event Handlers --
    const handleDayClick = (dateStr) => {
        setSelectedDate(dateStr);
        setSelectedEvent(null);
        setTempTitle('');
        setTempStatus('idea');
        setTempPlatform('General');
        setTempNotes('');
        setTempColor('');
        setIsPanelOpen(true);
    };

    const handleEventClick = (e, event) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setSelectedDate(event.event_date);
        setTempTitle(event.title || '');
        setTempStatus(event.status || 'idea');
        setTempPlatform(event.platform || 'General');
        setTempNotes(event.notes || '');
        setTempColor(event.type || '');
        setIsPanelOpen(true);
    };

    const handleSavePanel = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            user_id: user.id,
            title: tempTitle || 'Sin título',
            status: tempStatus,
            platform: tempPlatform,
            notes: tempNotes,
            event_date: selectedDate,
            type: tempColor
        };

        if (selectedEvent) {
            await supabase.from('calendar_events').update(payload).eq('id', selectedEvent.id);
        } else {
            await supabase.from('calendar_events').insert(payload);
        }

        setIsPanelOpen(false);
        loadData();
    };

    const handleDeleteEvent = async (id) => {
        if (!confirm('¿Eliminar este evento?')) return;
        await supabase.from('calendar_events').delete().eq('id', id);
        setIsPanelOpen(false);
        setContextMenu(null);
        loadData();
    };

    const handleDuplicateEvent = async (id) => {
        const eventToDup = events.find(e => e.id === id);
        if (!eventToDup) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            user_id: user.id,
            title: `${eventToDup.title} (Copia)`,
            status: eventToDup.status,
            platform: eventToDup.platform,
            notes: eventToDup.notes,
            event_date: eventToDup.event_date,
            type: eventToDup.type,
            reference_id: eventToDup.reference_id,
            has_script: eventToDup.has_script
        };

        await supabase.from('calendar_events').insert(payload);
        loadData();
        setContextMenu(null);
    };

    const handleMoveDate = (id) => {
        const eventToMove = events.find(e => e.id === id);
        if (!eventToMove) return;
        handleEventClick({ stopPropagation: () => { } }, eventToMove);
        // The panel will open, user can change date there easily
        setContextMenu(null);
    };

    // -- Context Menu Logic --
    const handleContextMenu = (e, eventId) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, eventId });
    };

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    // -- Drag & Drop --
    const onDragStart = (e, id) => {
        e.dataTransfer.setData('eventId', id);
    };

    const onDrop = async (e, date) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('eventId');
        if (!id) return;
        await supabase.from('calendar_events').update({ event_date: date }).eq('id', id);
        loadData();
    };

    // -- Helpers --
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const getStatusClass = (status) => {
        if (status === 'prep') return 'status-prep';
        if (status === 'rec') return 'status-rec';
        if (status === 'pub') return 'status-pub';
        return 'status-idea';
    };

    const getStatusLabel = (status) => {
        const labels = { idea: 'Idea', prep: 'En preparación', rec: 'En grabación', pub: 'Publicado' };
        return labels[status] || 'Idea';
    };

    const handleCreateScript = () => {
        if (!selectedEvent) return;
        const url = `/dashboard?mode=single&topic=${encodeURIComponent(selectedEvent.title)}&platform=${encodeURIComponent(selectedEvent.platform)}&source_event_id=${selectedEvent.id}`;
        router.push(url);
    };

    // -- Render --
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startOffset = firstDayOfMonth(year, month);

        const cells = [];
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        // Headers
        days.forEach(day => cells.push(<div key={day} className="cal-header-cell">{day}</div>));

        // Padding
        for (let i = 0; i < startOffset; i++) {
            cells.push(<div key={`pad-${i}`} className="cal-day-cell empty" />);
        }

        // Days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const dayEvents = events.filter(e => e.event_date === dateStr)
                .filter(e => filterPlatform === 'All' || e.platform === filterPlatform)
                .filter(e => filterStatus === 'All' || e.status === filterStatus);

            cells.push(
                <div
                    key={d}
                    className={`cal-day-cell ${isToday ? 'today' : ''}`}
                    onClick={() => handleDayClick(dateStr)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, dateStr)}
                >
                    <div className="cal-cell-header">
                        <span className="cal-day-num">{d}</span>
                        <div className="cal-cell-plus"><Plus size={12} /></div>
                    </div>
                    <div className="cal-event-wrapper">
                        {dayEvents.map(ev => (
                            <div
                                key={ev.id}
                                draggable
                                onDragStart={e => onDragStart(e, ev.id)}
                                onClick={e => handleEventClick(e, ev)}
                                onContextMenu={e => handleContextMenu(e, ev.id)}
                                className={`cal-event-pill ${ev.type ? `theme-${ev.type}` : getStatusClass(ev.status)}`}
                            >
                                <div className="pill-dot" style={{ display: ev.type ? 'none' : 'block' }} />
                                <span className="pill-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ev.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return <div className="cal-monthly-grid">{cells}</div>;
    };

    return (
        <div className={`cal-container-3col ${isPanelOpen ? 'has-panel' : ''}`}>
            {/* Sidebar Left */}
            <aside className="cal-sidebar-left">
                <div className="cal-branding">
                    <Logo size="1.2rem" />
                </div>

                <div className="cal-sidebar-group">
                    <div className="cal-mini-header">Navegación</div>
                    <div className="mini-cal-widget">
                        <div className="mini-cal-header">
                            <span>{new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(currentDate)}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="mini-ctrl" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}><ChevronLeft size={12} /></button>
                                <button className="mini-ctrl" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}><ChevronRight size={12} /></button>
                            </div>
                        </div>
                        <div className="mini-cal-grid">
                            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => <div key={d} className="mini-day-h">{d}</div>)}
                            {Array.from({ length: firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => <div key={`p-${i}`} />)}
                            {Array.from({ length: daysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                                const dayNum = i + 1;
                                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                return (
                                    <div
                                        key={dayNum}
                                        className={`mini-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                        onClick={() => handleDayClick(dateStr)}
                                    >
                                        {dayNum}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="cal-sidebar-group">
                    <div className="cal-mini-header">Filtros</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select className="cal-select" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                            <option value="All">Todas las plataformas</option>
                            <option value="TikTok">TikTok</option>
                            <option value="Instagram">Instagram</option>
                            <option value="YouTube">YouTube</option>
                            <option value="LinkedIn">LinkedIn</option>
                        </select>
                        <select className="cal-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="All">Todos los estados</option>
                            <option value="idea">Ideas</option>
                            <option value="prep">En preparación</option>
                            <option value="rec">En grabación</option>
                            <option value="pub">Publicado</option>
                        </select>
                    </div>
                </div>

                <div className="cal-sidebar-group">
                    <div className="cal-mini-header">Leyenda</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="legend-item"><div className="pill-dot status-idea" /> <span>Idea / Borrador</span></div>
                        <div className="legend-item"><div className="pill-dot status-prep" /> <span>En preparación</span></div>
                        <div className="legend-item"><div className="pill-dot status-rec" /> <span>En grabación</span></div>
                        <div className="legend-item"><div className="pill-dot status-pub" /> <span>Publicado</span></div>
                    </div>
                </div>

                <div className="cal-sidebar-group" style={{ marginTop: 'auto' }}>
                    <div className="cal-promo-card">
                        <Sparkles size={20} color="#9D00FF" />
                        <p style={{ fontSize: '0.8rem', marginTop: '8px', color: '#888' }}>
                            Usa la IA para llenar los huecos de tu calendario.
                        </p>
                        <button className="btn-primary" onClick={() => alert('¡Próximamente! La IA sugerirá huecos estratégicos en tu calendario.')} style={{ width: '100%', marginTop: '12px', fontSize: '0.8rem', padding: '10px' }}>
                            Sugerir ideas
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="cal-main-center">
                <header className="cal-header-top">
                    <div className="cal-header-info">
                        <h1 style={{ fontWeight: 900, fontSize: '1.4rem' }}>
                            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}
                        </h1>
                    </div>

                    <div className="cal-header-actions">
                        <div className="cal-view-controls">
                            <button className={`cal-view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Mes</button>
                            <button className={`cal-view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Semana</button>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 20px' }} />
                        <div className="cal-nav-controls">
                            <button className="cal-ctrl-btn" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}><ChevronLeft size={20} /></button>
                            <button className="cal-ctrl-btn" onClick={() => setCurrentDate(new Date())} style={{ fontSize: '0.85rem', padding: '0 12px' }}>Hoy</button>
                            <button className="cal-ctrl-btn" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                </header>

                <div className="cal-grid-wrapper">
                    {loading ? (
                        <div className="cal-loading">Sincronizando calendario...</div>
                    ) : renderCalendar()}
                </div>
            </main>

            {/* Detail Panel */}
            {isPanelOpen && (
                <aside className="cal-detail-panel">
                    <div className="cal-panel-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="cal-close-icon" onClick={() => setIsPanelOpen(false)}>
                                <X size={24} />
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="cal-close-icon" title="Compartir"><Share2 size={18} /></button>
                                <button className="cal-close-icon" title="Opciones"><MoreVertical size={18} /></button>
                            </div>
                        </div>
                        <input
                            className="cal-input-minimal"
                            style={{ fontSize: '2.5rem', fontWeight: 950, marginTop: '20px' }}
                            placeholder="Título de la publicación..."
                            value={tempTitle}
                            onChange={e => setTempTitle(e.target.value)}
                        />
                    </div>

                    <div className="cal-panel-body">
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="cal-prop-row">
                                <div className="cal-prop-label"><Globe size={16} /> Plataforma</div>
                                <div className="cal-prop-value">
                                    <select className="cal-input-minimal" value={tempPlatform} onChange={e => setTempPlatform(e.target.value)}>
                                        <option value="General">General</option>
                                        <option value="TikTok">TikTok</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="LinkedIn">LinkedIn</option>
                                    </select>
                                </div>
                            </div>
                            <div className="cal-prop-row">
                                <div className="cal-prop-label"><CalendarIcon size={16} /> Fecha</div>
                                <div className="cal-prop-value">
                                    <input type="date" className="cal-input-minimal" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="cal-prop-row">
                                <div className="cal-prop-label"><CheckCircle2 size={16} /> Estado</div>
                                <div className="cal-prop-value">
                                    <select className="cal-input-minimal" value={tempStatus} onChange={e => setTempStatus(e.target.value)}>
                                        <option value="idea">Idea</option>
                                        <option value="prep">En preparación</option>
                                        <option value="rec">En grabación</option>
                                        <option value="pub">Publicado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="cal-prop-row">
                                <div className="cal-prop-label"><Palette size={16} /> Color</div>
                                <div className="cal-prop-value">
                                    <div className="color-picker-group">
                                        {THEME_COLORS.map(color => (
                                            <div
                                                key={color.id}
                                                className={`color-swatch ${tempColor === color.id ? 'active' : ''}`}
                                                style={{ background: color.hex }}
                                                onClick={() => setTempColor(color.id)}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="cal-form-group">
                            <textarea
                                className="cal-textarea-minimal"
                                placeholder="Pulsa para empezar a escribir notas, objetivos o guion..."
                                value={tempNotes}
                                onChange={e => setTempNotes(e.target.value)}
                            />
                        </div>

                        {selectedEvent && (
                            <div className="cal-ai-section" style={{ padding: '24px', background: 'rgba(157, 0, 255, 0.05)', borderRadius: '20px', border: '1px solid rgba(157, 0, 255, 0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9D00FF', marginBottom: '12px' }}>
                                    <Sparkles size={18} />
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Potencia con IA</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '20px' }}>
                                    {selectedEvent.has_script ? 'Este contenido ya tiene un guion generado.' : 'Convierte esta idea en un guion estructurado en un clic.'}
                                </p>
                                <button
                                    className="btn-primary"
                                    onClick={handleCreateScript}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #9D00FF 0%, #7C3AED 100%)', height: '44px', color: 'white', border: 'none' }}
                                >
                                    {selectedEvent.has_script ? 'Ver Guion Completo' : 'Crear Guion con IA'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="cal-panel-footer">
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {selectedEvent && (
                                <button className="btn-delete" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button className="btn-primary" style={{ flex: 1, fontWeight: 900 }} onClick={handleSavePanel}>
                                <Save size={18} style={{ marginRight: '8px' }} />
                                {selectedEvent ? 'Guardar Cambios' : 'Crear Evento'}
                            </button>
                        </div>
                    </div>
                </aside>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div className="cal-ctx-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <div className="cal-ctx-item" onClick={() => {
                        const ev = events.find(e => e.id === contextMenu.eventId);
                        if (ev) handleEventClick({ stopPropagation: () => { } }, ev);
                    }}><Edit3 size={16} /> Editar</div>
                    <div className="cal-ctx-item" onClick={() => handleDuplicateEvent(contextMenu.eventId)}><Copy size={16} /> Duplicar</div>
                    <div className="cal-ctx-item" onClick={() => handleMoveDate(contextMenu.eventId)}><ArrowRightLeft size={16} /> Mover fecha</div>
                    <div className="cal-ctx-item danger" onClick={() => handleDeleteEvent(contextMenu.eventId)}><Trash2 size={16} /> Eliminar</div>
                </div>
            )}

            <style jsx>{`
                .cal-loading { padding: 40px; text-align: center; color: #555; }
                .cal-ctrl-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #888; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .cal-ctrl-btn:hover { background: rgba(255,255,255,0.1); color: white; }
                
                .cal-select { background: #111; border: 1px solid #222; color: #888; padding: 10px; border-radius: 10px; font-size: 0.85rem; outline: none; }
                .cal-input-modern { width: 100%; background: #151515; border: 1px solid #222; color: white; padding: 16px; border-radius: 12px; outline: none; transition: 0.2s; font-size: 0.95rem; }
                .cal-input-modern:focus { border-color: #9D00FF; background: #1a1a1a; }
                .cal-textarea-modern { width: 100%; min-height: 120px; background: #151515; border: 1px solid #222; color: white; padding: 16px; border-radius: 12px; outline: none; font-size: 0.95rem; resize: none; }
                
                .cal-form-group label { display: block; font-size: 0.75rem; font-weight: 800; color: #555; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.1em; }
                .cal-close-icon { background: none; border: none; color: #444; cursor: pointer; }
                .cal-close-icon:hover { color: white; }
                
                .legend-item { display: flex; alignItems: center; gap: 10px; font-size: 0.8rem; color: #666; }
                .pill-dot { width: 8px; height: 8px; border-radius: 50%; }

                .cal-promo-card { background: #111; padding: 20px; border-radius: 16px; border: 1px solid #222; }
                .btn-delete { background: rgba(255, 77, 77, 0.1); color: #FF4D4D; border: 1px solid rgba(255, 77, 77, 0.1); padding: 0 16px; border-radius: 12px; cursor: pointer; }
                
                /* Extra Refinements */
                .cal-cell-plus { opacity: 0; color: #333; transition: 0.2s; }
                .cal-day-cell:hover .cal-cell-plus { opacity: 1; }
            `}</style>
        </div>
    );
}

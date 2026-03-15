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
import { useProject } from '@/app/components/ProjectContext';

// Calendar Page v2.6.0 (v4.4.21)

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
    const [linkedScript, setLinkedScript] = useState(null);
    const [loadingScript, setLoadingScript] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, eventId }

    // Multi-Selection & Drag Logic
    const [selectedEvents, setSelectedEvents] = useState(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState(null); // 'select' | 'deselect'

    // Explicit Selection Mode & Bulk Actions
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [bulkStatusChange, setBulkStatusChange] = useState('');

    // Form States (for the panel)
    const [tempTitle, setTempTitle] = useState('');
    const [tempStatus, setTempStatus] = useState('idea');
    const [tempPlatform, setTempPlatform] = useState('General');
    const [tempNotes, setTempNotes] = useState('');
    const [tempColor, setTempColor] = useState('purple');

    const THEME_COLORS = [
        { id: 'purple', hex: '#9D00FF', name: 'Morado' },
        { id: 'pink', hex: '#EC4899', name: 'Rosa' },
        { id: 'blue', hex: '#3B82F6', name: 'Azul' },
        { id: 'green', hex: '#10B981', name: 'Verde' },
        { id: 'yellow', hex: '#F59E0B', name: 'Amarillo' },
        { id: 'red', hex: '#EF4444', name: 'Rojo' },
        { id: 'gray', hex: '#6B7280', name: 'Gris' }
    ];

    const { activeProject } = useProject();

    // -- Lifecycle --
    useEffect(() => {
        loadData();
    }, [currentDate, activeProject]);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Load events for the current month
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

            let eventQuery = supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', user.id)
                .gte('event_date', firstDay)
                .lte('event_date', lastDay);

            if (activeProject) {
                eventQuery = eventQuery.eq('project_id', activeProject.id);
            } else {
                eventQuery = eventQuery.is('project_id', null);
            }

            const { data: eventData } = await eventQuery;
            setEvents(eventData || []);
            setSelectedEvents(new Set()); // Reset selection on change

            // Also load library items for the import dropdown or list
            let libQuery = supabase
                .from('library')
                .select('*')
                .eq('user_id', user.id);

            if (activeProject) {
                libQuery = libQuery.eq('project_id', activeProject.id);
            } else {
                libQuery = libQuery.is('project_id', null);
            }

            const { data: libData } = await libQuery
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
        setTempColor('purple');
        setIsPanelOpen(true);
    };

    const handleEventClick = async (e, event) => {
        e.stopPropagation();

        // Handle Selection Mode or Ctrl/Cmd Click
        if (isSelectMode || e.ctrlKey || e.metaKey) {
            const next = new Set(selectedEvents);
            if (next.has(event.id)) {
                next.delete(event.id);
            } else {
                next.add(event.id);
            }
            setSelectedEvents(next);
            return; // Don't open panel
        }

        setSelectedEvent(event);
        setSelectedDate(event.event_date);
        setTempTitle(event.title || '');
        setTempStatus(event.status || 'idea');
        setTempPlatform(event.platform || 'General');
        
        let loadedNotes = event.script_full_text || event.notes || '';
        const loadedColor = event.color || 'purple';
        setTempColor(loadedColor);
        setIsPanelOpen(true);

        // EXTRA ROBUST FALLBACK (v4.4.14): If notes are empty but it's marked as having a script, try fetching it.
        if (!loadedNotes && event.has_script) {
            setLoadingScript(true);
            try {
                let libData = null;
                if (event.reference_id) {
                    const { data } = await supabase.from('library').select('*').eq('id', event.reference_id).single();
                    libData = data;
                }
                if (!libData) {
                    const { data } = await supabase.from('library').select('*').eq('user_id', event.user_id).ilike('titulo', event.title).single();
                    libData = data;
                }
                
                if (libData) {
                    const content = libData.content;
                    const hook = content?.hook || content?.gancho || '';
                    const des = Array.isArray(content?.desarrollo) ? content.desarrollo : (content?.puntos ? content.puntos : []);
                    const cta = content?.cta || content?.cierre || '';
                    loadedNotes = `GANCHO:\n${hook}\n\nDESARROLLO:\n${des.join('\n')}\n\nCTA:\n${cta}`;
                    setTempNotes(loadedNotes);
                    setLinkedScript(libData);
                } else {
                    setTempNotes('');
                }
            } catch (err) {
                console.warn("[v4.4.14 Fallback] Could not recover script:", err);
                setTempNotes('');
            } finally {
                setLoadingScript(false);
            }
        } else {
            setTempNotes(loadedNotes);
        }


        // Fetch linked script if exists
        if (event.content) {
            let parsedContent = event.content;
            if (typeof event.content === 'string') {
                try {
                    parsedContent = JSON.parse(event.content);
                } catch (e) {
                    console.error("Error parsing event content:", e);
                    // Fallback to extracting fields if string is not JSON
                    parsedContent = { hook: event.content };
                }
            }
            setLinkedScript({ content: parsedContent });
            setLoadingScript(false);
        } else if (event.reference_id && event.has_script) {
            setLoadingScript(true);
            setLinkedScript(null);
            try {
                const { data, error } = await supabase
                    .from('library')
                    .select('*')
                    .eq('id', event.reference_id)
                    .single();

                if (data && !error) {
                    setLinkedScript(data);
                }
            } catch (err) {
                console.error("Error fetching linked script:", err);
            } finally {
                setLoadingScript(false);
            }
        } else {
            setLinkedScript(null);
        }
    };

    const handleViewInLibrary = () => {
        if (linkedScript && linkedScript.id) {
            router.push(`/dashboard/library?id=${linkedScript.id}`);
        }
    };

    const handleSavePanel = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const colorValue = tempColor || 'purple';

        try {
            // Build the full script text Document if it's a script/guion
            let fullScriptText = tempNotes;
            if (linkedScript && tempStatus !== 'idea') {
                const content = linkedScript.content || {};
                const hook = content.hook || content.gancho || '';
                const des = (Array.isArray(content.desarrollo) ? content.desarrollo :
                    (Array.isArray(content.puntos) ? content.puntos : [])).join('\n');
                const cta = content.cta || content.cierre || '';
                const copy = content.copy_post || {};
                const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : '';

                fullScriptText = `TÍTULO: ${tempTitle}\n\nGANCHO:\n${hook}\n\nDESARROLLO:\n${des}\n\nCTA:\n${cta}\n\nCOPY POST:\n${copy.descripcion_larga || ''}\n\nHASHTAGS:\n${hashtags}`;
            }

            if (selectedEvent && selectedEvent.id) {
                const updates = {
                    title: tempTitle || 'Sin título',
                    status: tempStatus,
                    platform: tempPlatform,
                    notes: tempNotes,
                    event_date: selectedDate,
                    color: colorValue,
                    has_script: selectedEvent?.has_script || !!linkedScript,
                    script_full_text: fullScriptText,
                    content: linkedScript?.content || selectedEvent?.content || null
                };

                const { error: updateErr } = await supabase.from('calendar_events').update(updates).eq('id', selectedEvent.id);
                if (updateErr) throw updateErr;

                // Also update the linked library item if it exists
                if (selectedEvent.reference_id) {
                    await supabase.from('library').update({
                        titulo: tempTitle,
                        script_full_text: fullScriptText,
                        platform: tempPlatform,
                        content: updates.content
                    }).eq('id', selectedEvent.reference_id);
                }

                // Immediately update local state
                const newEvents = events.map(ev =>
                    ev.id === selectedEvent.id ? { ...ev, ...updates } : ev
                );
                setEvents([...newEvents]);
            } else {
                const payload = {
                    user_id: user.id,
                    project_id: activeProject?.id,
                    title: tempTitle || 'Sin título',
                    status: tempStatus,
                    platform: tempPlatform,
                    notes: tempNotes,
                    event_date: selectedDate,
                    type: 'idea',
                    color: colorValue,
                    has_script: !!linkedScript,
                    script_full_text: fullScriptText,
                    content: linkedScript?.content || null
                };
                const { data: newEv, error: insertErr } = await supabase.from('calendar_events').insert(payload).select().single();
                if (insertErr) throw insertErr;
                if (newEv) setEvents([...events, newEv]);
            }

            setIsPanelOpen(false);
            // Reload silently to ensure sync
            setTimeout(() => loadData(), 500);
        } catch (err) {
            console.error('Error saving panel:', err);
            alert('Error al guardar: ' + err.message);
        }
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
            project_id: activeProject?.id,
            title: `${eventToDup.title} (Copia)`,
            status: eventToDup.status,
            platform: eventToDup.platform,
            notes: eventToDup.notes,
            event_date: eventToDup.event_date,
            type: eventToDup.type,
            reference_id: eventToDup.reference_id,
            has_script: eventToDup.has_script,
            content: eventToDup.content || null
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

    // -- Multi-Selection Handlers --
    const handleEventMouseDown = (e, id) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        const isSelected = selectedEvents.has(id);
        const newMode = isSelected ? 'deselect' : 'select';
        setDragMode(newMode);

        const next = new Set(selectedEvents);
        if (newMode === 'select') next.add(id);
        else next.delete(id);
        setSelectedEvents(next);
    };

    const handleEventMouseEnter = (id) => {
        if (!isDragging) return;
        const next = new Set(selectedEvents);
        if (dragMode === 'select') next.add(id);
        else next.delete(id);
        setSelectedEvents(next);
    };

    const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDragMode(null);
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleDeleteSelected = () => {
        if (selectedEvents.size === 0) return;
        setShowDeleteConfirm(true);
    };

    const confirmDeleteSelected = async () => {
        const ids = Array.from(selectedEvents);
        if (ids.length === 0) return;

        try {
            const { error: err } = await supabase.from('calendar_events').delete().in('id', ids);
            if (err) throw err;
            setEvents(events.filter(ev => !selectedEvents.has(ev.id)));
            setSelectedEvents(new Set());
            setIsPanelOpen(false);
            setShowDeleteConfirm(false);
        } catch (e) {
            alert('Error al eliminar: ' + e.message);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (!newStatus || selectedEvents.size === 0) return;

        try {
            const ids = Array.from(selectedEvents);
            const { error: err } = await supabase
                .from('calendar_events')
                .update({ status: newStatus })
                .in('id', ids);

            if (err) throw err;

            // Update local state
            setEvents(events.map(ev => {
                if (selectedEvents.has(ev.id)) {
                    return { ...ev, status: newStatus };
                }
                return ev;
            }));

            setBulkStatusChange('');
        } catch (e) {
            alert('Error al actualizar estado: ' + e.message);
        }
    };

    // -- Context Menu Logic --
    const handleContextMenu = (e, eventId) => {
        e.preventDefault();
        // If the right-clicked item is NOT in the selection, clear selection or select it
        if (eventId && !selectedEvents.has(eventId)) {
            setSelectedEvents(new Set([eventId]));
        }
        setContextMenu({ x: e.pageX, y: e.pageY, eventId });
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
                        {dayEvents.map(ev => {
                            const eventColor = ev.color || 'purple';
                            return (
                                <div
                                    key={ev.id}
                                    draggable={!isDragging}
                                    onDragStart={e => onDragStart(e, ev.id)}
                                    onMouseDown={e => { e.stopPropagation(); handleEventMouseDown(e, ev.id); }}
                                    onMouseEnter={() => handleEventMouseEnter(ev.id)}
                                    onClick={e => handleEventClick(e, ev)}
                                    onContextMenu={e => handleContextMenu(e, ev.id)}
                                    className={`cal-event-pill theme-${eventColor} ${selectedEvents.has(ev.id) ? 'selected' : ''}`}
                                    style={{
                                        background: eventColor === 'purple' ? 'rgba(157, 0, 255, 0.25)' :
                                            eventColor === 'pink' ? 'rgba(236, 72, 153, 0.25)' :
                                                eventColor === 'blue' ? 'rgba(59, 130, 246, 0.25)' :
                                                    eventColor === 'green' ? 'rgba(16, 185, 129, 0.25)' :
                                                        eventColor === 'yellow' ? 'rgba(245, 158, 11, 0.25)' :
                                                            eventColor === 'red' ? 'rgba(239, 68, 68, 0.25)' :
                                                                eventColor === 'gray' ? 'rgba(107, 114, 128, 0.25)' :
                                                                    'rgba(157, 0, 255, 0.25)',
                                        borderColor: eventColor === 'purple' ? 'rgba(157, 0, 255, 0.5)' :
                                            eventColor === 'pink' ? 'rgba(236, 72, 153, 0.5)' :
                                                eventColor === 'blue' ? 'rgba(59, 130, 246, 0.5)' :
                                                    eventColor === 'green' ? 'rgba(16, 185, 129, 0.5)' :
                                                        eventColor === 'yellow' ? 'rgba(245, 158, 11, 0.5)' :
                                                            eventColor === 'red' ? 'rgba(239, 68, 68, 0.5)' :
                                                                eventColor === 'gray' ? 'rgba(107, 114, 128, 0.5)' :
                                                                    'rgba(157, 0, 255, 0.5)'
                                    }}
                                >
                                    <div className="pill-dot" style={{ background: eventColor === 'purple' ? '#9D00FF' : eventColor === 'pink' ? '#EC4899' : eventColor === 'blue' ? '#3B82F6' : eventColor === 'green' ? '#10B981' : eventColor === 'yellow' ? '#F59E0B' : eventColor === 'red' ? '#EF4444' : '#6B7280' }} />
                                    <span className="pill-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ev.title}
                                    </span>
                                </div>
                            );
                        })}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className={`cal-view-btn ${isSelectMode ? 'active' : ''}`}
                                style={{
                                    background: isSelectMode ? 'rgba(126, 206, 202, 0.2)' : 'transparent',
                                    border: `1px solid ${isSelectMode ? '#7ECECA' : 'rgba(255,255,255,0.2)'}`,
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                                onClick={() => {
                                    setIsSelectMode(!isSelectMode);
                                    if (isSelectMode) setSelectedEvents(new Set()); // Clear on exit
                                }}
                            >
                                <CheckCircle2 size={16} /> {isSelectMode ? 'Cancelar selección' : 'Seleccionar'}
                            </button>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
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
                        <textarea
                            className="cal-input-minimal"
                            style={{ 
                                fontSize: '2.2rem', 
                                fontWeight: 950, 
                                marginTop: '20px', 
                                color: 'white',
                                resize: 'none',
                                overflow: 'hidden',
                                minHeight: '40px',
                                letterSpacing: '-0.04em'
                            }}
                            placeholder="Título de la publicación..."
                            value={tempTitle}
                            onChange={e => {
                                setTempTitle(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onFocus={e => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTempColor(color.id);
                                                }}
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

                        {loadingScript ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                                <div className="spinner-mini" style={{ margin: '0 auto 10px' }}></div>
                                Cargando guion vinculado...
                            </div>
                        ) : linkedScript ? (
                            <div className="linked-script-preview" style={{
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookOpen size={16} color="#9D00FF" />
                                    <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guion Vinculado</span>
                                </div>
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div className="script-block-mini">
                                        <div className="block-label-mini" style={{ color: '#aaa', marginBottom: '8px' }}>GANCHO</div>
                                        <textarea
                                            className="cal-textarea-minimal"
                                            style={{ minHeight: '120px', padding: '16px', fontSize: '1rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                                            value={linkedScript.content?.hook || linkedScript.content?.gancho || linkedScript.gancho || ''}
                                            onChange={e => {
                                                const newContent = { ...(linkedScript.content || {}) };
                                                newContent.gancho = e.target.value;
                                                newContent.hook = e.target.value;
                                                setLinkedScript({ ...linkedScript, content: newContent });
                                            }}
                                            placeholder="Escribe el gancho..."
                                        />
                                    </div>
                                    <div className="script-block-mini">
                                        <div className="block-label-mini" style={{ color: '#aaa', marginBottom: '8px' }}>DESARROLLO</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {(() => {
                                                const des = linkedScript.content?.desarrollo || linkedScript.desarrollo || linkedScript.content?.puntos || linkedScript.puntos;
                                                const desArray = Array.isArray(des) ? des : (typeof des === 'string' ? des.split('\n').filter(Boolean) : []);

                                                // If empty, show at least one box to allow typing
                                                const finalArray = desArray.length > 0 ? desArray : [''];

                                                return finalArray.map((p, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '12px' }}>
                                                        <span style={{ color: '#9D00FF', fontWeight: 900, fontSize: '1rem', marginTop: '14px' }}>{i + 1}.</span>
                                                        <textarea
                                                            className="cal-textarea-minimal"
                                                            style={{ minHeight: '100px', padding: '16px', fontSize: '1rem', lineHeight: '1.5', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                                                            value={String(p).replace(/^\d+\.\s*/, '')}
                                                            onChange={e => {
                                                                const newDes = [...finalArray];
                                                                newDes[i] = e.target.value;
                                                                const newContent = { ...(linkedScript.content || {}) };
                                                                newContent.desarrollo = newDes;
                                                                setLinkedScript({ ...linkedScript, content: newContent });
                                                            }}
                                                            placeholder={`Punto ${i + 1}...`}
                                                        />
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                    <div className="script-block-mini">
                                        <div className="block-label-mini" style={{ color: '#aaa', marginBottom: '8px' }}>CTA</div>
                                        <textarea
                                            className="cal-textarea-minimal"
                                            style={{ minHeight: '100px', padding: '16px', fontSize: '1rem', lineHeight: '1.5', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}
                                            value={linkedScript.content?.cta || linkedScript.content?.cierre || linkedScript.cta || ''}
                                            onChange={e => {
                                                const newContent = { ...(linkedScript.content || {}) };
                                                newContent.cierre = e.target.value;
                                                newContent.cta = e.target.value;
                                                setLinkedScript({ ...linkedScript, content: newContent });
                                            }}
                                            placeholder="Escribe el CTA..."
                                        />
                                    </div>

                                    {(() => {
                                        const copy = linkedScript.content?.copy_post || linkedScript.copy_post;
                                        if (!copy) return null;

                                        const caption = copy.descripcion_larga || copy.caption || copy.texto || '';
                                        const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags : [];

                                        return (
                                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="block-label-mini" style={{ color: '#aaa', marginBottom: '8px' }}>COPY & HASHTAGS</div>
                                                <textarea
                                                    className="cal-textarea-minimal"
                                                    style={{ minHeight: '120px', padding: '16px', fontSize: '0.95rem', fontStyle: 'italic', color: '#ccc', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}
                                                    value={caption}
                                                    onChange={e => {
                                                        const newContent = { ...(linkedScript.content || {}) };
                                                        const newCopy = { ...(newContent.copy_post || {}) };
                                                        newCopy.descripcion_larga = e.target.value;
                                                        newContent.copy_post = newCopy;
                                                        setLinkedScript({ ...linkedScript, content: newContent });
                                                    }}
                                                    placeholder="Escribe el copy de la publicación..."
                                                />
                                                <div style={{ marginTop: '12px' }}>
                                                    <input
                                                        type="text"
                                                        className="cal-input-minimal"
                                                        style={{ fontSize: '0.75rem', width: '100%', marginBottom: '8px' }}
                                                        placeholder="Añadir hashtags (separados por coma)..."
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                const tags = e.target.value.split(',').map(t => t.trim().replace('#', '')).filter(Boolean);
                                                                const newContent = { ...(linkedScript.content || {}) };
                                                                const newCopy = { ...(newContent.copy_post || {}) };
                                                                newCopy.hashtags = [...new Set([...hashtags, ...tags])];
                                                                newContent.copy_post = newCopy;
                                                                setLinkedScript({ ...linkedScript, content: newContent });
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {hashtags.map((tag, idx) => (
                                                            <span
                                                                key={idx}
                                                                style={{
                                                                    color: '#9D00FF',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    background: 'rgba(157, 0, 255, 0.1)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => {
                                                                    const newContent = { ...(linkedScript.content || {}) };
                                                                    const newCopy = { ...(newContent.copy_post || {}) };
                                                                    newCopy.hashtags = hashtags.filter((_, i) => i !== idx);
                                                                    newContent.copy_post = newCopy;
                                                                    setLinkedScript({ ...linkedScript, content: newContent });
                                                                }}
                                                                title="Click para eliminar"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                        <button
                                            className="btn-secondary"
                                            onClick={() => {
                                                const hook = linkedScript.content?.hook || linkedScript.content?.gancho || '';
                                                const des = (Array.isArray(linkedScript.content?.desarrollo) ? linkedScript.content.desarrollo :
                                                    (Array.isArray(linkedScript.desarrollo) ? linkedScript.desarrollo : [])).join('\n');
                                                const cta = linkedScript.content?.cta || linkedScript.content?.cierre || '';
                                                const full = `GANCHO:\n${hook}\n\nDESARROLLO:\n${des}\n\nCTA:\n${cta}`;
                                                navigator.clipboard.writeText(full);
                                                alert('Guion completo copiado al portapapeles ✓');
                                            }}
                                            style={{ fontSize: '0.7rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        >
                                            <Copy size={12} /> Copiar Guion
                                        </button>
                                        <button
                                            className="btn-secondary"
                                            onClick={() => {
                                                const copy = linkedScript.content?.copy_post || linkedScript.copy_post;
                                                const title = copy?.titulo || '';
                                                const caption = copy?.descripcion_larga || copy?.caption || copy?.texto || '';
                                                const tags = (copy?.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
                                                const full = `${title}\n\n${caption}\n\n${tags}`;
                                                navigator.clipboard.writeText(full);
                                                alert('Copy de publicación copiado ✓');
                                            }}
                                            style={{ fontSize: '0.7rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        >
                                            <Share2 size={12} /> Copiar Copy
                                        </button>
                                    </div>

                                    <button
                                        className="btn-secondary"
                                        onClick={handleViewInLibrary}
                                        style={{ marginTop: '10px', width: '100%', borderColor: 'rgba(157, 0, 255, 0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}
                                    >
                                        Ver en Biblioteca
                                    </button>
                                </div>
                            </div>
                        ) : selectedEvent && (
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
                <div className="cal-ctx-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
                    {selectedEvents.size > 1 ? (
                        <>
                            <div className="cal-ctx-header">{selectedEvents.size} elementos seleccionados</div>
                            <div className="cal-ctx-item danger" onClick={handleDeleteSelected}><Trash2 size={16} /> Eliminar seleccionados</div>
                        </>
                    ) : (
                        <>
                            <div className="cal-ctx-item" onClick={() => {
                                const ev = events.find(e => e.id === contextMenu.eventId);
                                if (ev) handleEventClick({ stopPropagation: () => { } }, ev);
                                setContextMenu(null);
                            }}><Edit3 size={16} /> Editar</div>
                            <div className="cal-ctx-item" onClick={() => { handleDuplicateEvent(contextMenu.eventId); setContextMenu(null); }}><Copy size={16} /> Duplicar</div>
                            <div className="cal-ctx-item" onClick={() => { handleMoveDate(contextMenu.eventId); setContextMenu(null); }}><ArrowRightLeft size={16} /> Mover fecha</div>
                            <div className="cal-ctx-item danger" onClick={() => { handleDeleteEvent(contextMenu.eventId); setContextMenu(null); }}><Trash2 size={16} /> Eliminar</div>
                        </>
                    )}
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
                
                .cal-event-pill.selected { border: 2px solid white; box-shadow: 0 0 15px rgba(255,255,255,0.3); z-index: 10; transform: scale(1.02); }
                .cal-ctx-header { font-size: 0.7rem; font-weight: 800; color: #555; text-transform: uppercase; padding: 8px 12px; border-bottom: 1px solid #222; margin-bottom: 4px; }
                .cal-cell-plus { opacity: 0; color: #333; transition: 0.2s; }
                .cal-day-cell:hover .cal-cell-plus { opacity: 1; }
            `}</style>
            {/* Floating Bulk Action Bar */}
            {selectedEvents.size > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    borderRadius: '50px',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    zIndex: 2000,
                    animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        {selectedEvents.size} seleccionado{selectedEvents.size !== 1 ? 's' : ''}
                    </span>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select
                            className="cal-select"
                            style={{ padding: '6px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
                            value={bulkStatusChange}
                            onChange={(e) => handleBulkStatusChange(e.target.value)}
                        >
                            <option value="">Cambiar estado...</option>
                            <option value="idea">Idea</option>
                            <option value="prep">En preparación</option>
                            <option value="rec">En grabación</option>
                            <option value="pub">Publicado</option>
                        </select>

                        <button
                            className="btn-secondary"
                            onClick={handleDeleteSelected}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                color: '#EF4444',
                                background: 'transparent',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Trash2 size={16} /> Eliminar
                        </button>

                        <button
                            className="cal-close-icon"
                            onClick={() => setSelectedEvents(new Set())}
                            style={{ marginLeft: '12px' }}
                            title="Descartar selección"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2100
                }}>
                    <div className="premium-card" style={{ padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Trash2 size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>¿Eliminar eventos?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                            Estás a punto de eliminar de forma permanente <strong>{selectedEvents.size}</strong> eventos del calendario. Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>Cancelar</button>
                            <button className="btn-primary" onClick={confirmDeleteSelected} style={{ flex: 1, background: '#EF4444', borderColor: '#EF4444', color: 'white' }}>Eliminar Definitivemente</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 50px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

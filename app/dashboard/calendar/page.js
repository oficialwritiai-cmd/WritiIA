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

// Calendar Page v2.6.0 (v4.5.2)

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
    const [tempStartTime, setTempStartTime] = useState('09:00');
    const [tempEndTime, setTempEndTime] = useState('10:00');

    // Mobile States
    const [isMobile, setIsMobile] = useState(false);

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

        // Mobile detection
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [currentDate, activeProject]);

    // Cargar guion vinculado cuando se selecciona un evento
    useEffect(() => {
        async function loadLinkedScript() {
            if (!selectedEvent) {
                setLinkedScript(null);
                return;
            }

            // Verificar si el evento tiene guion vinculado
            const hasScript = selectedEvent.has_script || selectedEvent.reference_id;
            if (!hasScript) {
                setLinkedScript(null);
                return;
            }

            setLoadingScript(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Intentar cargar el guion de la tabla library o scripts
                const scriptId = selectedEvent.reference_id || selectedEvent.id;

                // Primero buscar en library
                const { data: libData } = await supabase
                    .from('library')
                    .select('*')
                    .eq('id', scriptId)
                    .single();

                if (libData) {
                    setLinkedScript(libData);
                } else {
                    // Intentar buscar en content_slots si tiene guion
                    const { data: slotData } = await supabase
                        .from('content_slots')
                        .select('*')
                        .eq('id', selectedEvent.id)
                        .single();

                    if (slotData?.script_content) {
                        setLinkedScript({
                            id: slotData.id,
                            content: slotData.script_content,
                            gancho: slotData.script_content?.hook || slotData.script_content?.gancho,
                            desarrollo: slotData.script_content?.desarrollo || slotData.script_content?.puntos,
                            cta: slotData.script_content?.cta || slotData.script_content?.cierre,
                            copy_post: slotData.copy_content
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading linked script:', err);
            } finally {
                setLoadingScript(false);
            }
        }

        loadLinkedScript();
    }, [selectedEvent]);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Load events for the current month range (standard calendar events)
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
            }

            const { data: eventData } = await eventQuery;

            // NEW: Also load content_slots (legacy/AI-generated plans)
            let slotsQuery = supabase
                .from('content_slots')
                .select('*')
                .eq('user_id', user.id)
                .gte('scheduled_date', firstDay)
                .lte('scheduled_date', lastDay);

            if (activeProject) {
                slotsQuery = slotsQuery.eq('project_id', activeProject.id);
            }
            const { data: slotData } = await slotsQuery;

            // Merge and normalize: content_slots -> calendar_events format
            const normalizedSlots = (slotData || []).map(slot => ({
                id: slot.id,
                user_id: slot.user_id,
                project_id: slot.project_id,
                event_date: slot.scheduled_date,
                title: slot.title || 'Idea de Contenido',
                notes: slot.description || '',
                platform: slot.platform || 'General',
                status: slot.status || 'idea',
                start_time: slot.start_time || '09:00', // Default if missing
                end_time: slot.end_time || '10:00',
                is_slot: true // Marker to distinguish
            }));

            const combinedEvents = [...(eventData || []), ...normalizedSlots];
            setEvents(combinedEvents);
            setSelectedEvents(new Set()); 

            // Also load library items...
            let libQuery = supabase.from('library').select('*').eq('user_id', user.id);
            if (activeProject) libQuery = libQuery.eq('project_id', activeProject.id);
            const { data: libData } = await libQuery.order('created_at', { ascending: false }).limit(50);
            setLibraryItems(libData || []);
        }
        setLoading(false);
    }

    // -- Event Handlers --
    const handleDayClick = (dateStr) => {
        if (selectedDate === dateStr && isMobile) {
            // Already selected on mobile? Open panel to create/edit
            setIsPanelOpen(true);
        }
        setSelectedDate(dateStr);
        setSelectedEvent(null);
        setTempTitle('');
        setTempStatus('idea');
        setTempPlatform('General');
        setTempNotes('');
        setTempColor('purple');
        setTempStartTime('09:00');
        setTempEndTime('10:00');
        setIsPanelOpen(true);
    };

    const handleEventClick = (e, event) => {
        if (e) e.stopPropagation();
        
        // Handle Selection Mode or Ctrl/Cmd Click
        if (isSelectMode || (e && (e.ctrlKey || e.metaKey))) {
            const next = new Set(selectedEvents);
            if (next.has(event.id)) {
                next.delete(event.id);
            } else {
                next.add(event.id);
            }
            setSelectedEvents(next);
            return;
        }

        // Populating form for the panel (v6.6.0 support slot fallback)
        setSelectedEvent(event);
        setSelectedDate(event.event_date || event.scheduled_date);
        setTempTitle(event.title || '');
        setTempStatus(event.status || 'idea');
        setTempPlatform(event.platform || 'General');
        setTempNotes(event.notes || event.description || '');
        setTempColor(event.color || 'purple');
        setTempStartTime(event.start_time || '09:00');
        setTempEndTime(event.end_time || '10:00');
        setIsPanelOpen(true);
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
            if (selectedEvent && selectedEvent.id) {
                // Detectar si el evento es un slot (content_slots) o un evento regular (calendar_events)
                const isSlot = selectedEvent.is_slot === true;

                if (isSlot) {
                    // Actualizar en content_slots
                    const slotUpdates = {
                        title: tempTitle || 'Sin título',
                        status: tempStatus,
                        platform: tempPlatform,
                        description: tempNotes,
                        scheduled_date: selectedDate,
                        start_time: tempStartTime,
                        end_time: tempEndTime
                    };

                    const { error: updateErr } = await supabase
                        .from('content_slots')
                        .update(slotUpdates)
                        .eq('id', selectedEvent.id);
                    if (updateErr) throw updateErr;

                    // Update local state
                    const newEvents = events.map(ev =>
                        ev.id === selectedEvent.id ? {
                            ...ev,
                            ...slotUpdates,
                            event_date: selectedDate,
                            notes: tempNotes
                        } : ev
                    );
                    setEvents([...newEvents]);
                } else {
                    // Actualizar en calendar_events
                    const updates = {
                        title: tempTitle || 'Sin título',
                        status: tempStatus,
                        platform: tempPlatform,
                        notes: tempNotes,
                        event_date: selectedDate,
                        color: colorValue,
                        start_time: tempStartTime,
                        end_time: tempEndTime
                    };

                    const { error: updateErr } = await supabase.from('calendar_events').update(updates).eq('id', selectedEvent.id);
                    if (updateErr) throw updateErr;

                    // Update local state
                    const newEvents = events.map(ev =>
                        ev.id === selectedEvent.id ? { ...ev, ...updates } : ev
                    );
                    setEvents([...newEvents]);
                }
            } else {
                // Crear nuevo evento en calendar_events
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
                    start_time: tempStartTime,
                    end_time: tempEndTime
                };
                const { data: newEv, error: insertErr } = await supabase.from('calendar_events').insert(payload).select().single();
                if (insertErr) throw insertErr;
                if (newEv) setEvents([...events, newEv]);
            }

            setIsPanelOpen(false);
            setTimeout(() => loadData(), 500);
        } catch (err) {
            console.error('Error saving panel:', err);
            alert('Error al guardar: ' + err.message);
        }
    };


    const handleDeleteEvent = async (id) => {
        if (!confirm('¿Eliminar este evento?')) return;

        // Encontrar el evento para determinar de qué tabla eliminar
        const eventToDelete = events.find(e => e.id === id);
        const isSlot = eventToDelete?.is_slot === true;

        if (isSlot) {
            await supabase.from('content_slots').delete().eq('id', id);
        } else {
            await supabase.from('calendar_events').delete().eq('id', id);
        }

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
            // Separar IDs por tipo de tabla
            const slotIds = [];
            const eventIds = [];

            ids.forEach(id => {
                const ev = events.find(e => e.id === id);
                if (ev?.is_slot) {
                    slotIds.push(id);
                } else {
                    eventIds.push(id);
                }
            });

            // Eliminar de ambas tablas según corresponda
            if (slotIds.length > 0) {
                const { error: slotErr } = await supabase.from('content_slots').delete().in('id', slotIds);
                if (slotErr) throw slotErr;
            }
            if (eventIds.length > 0) {
                const { error: eventErr } = await supabase.from('calendar_events').delete().in('id', eventIds);
                if (eventErr) throw eventErr;
            }

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
        if (selectedEvent.has_script || linkedScript) {
            const idToOpen = linkedScript?.id || selectedEvent.reference_id || selectedEvent.id;
            router.push(`/dashboard/idea/${idToOpen}`);
            return;
        }
        const url = `/dashboard?mode=single&topic=${encodeURIComponent(selectedEvent.title)}&platform=${encodeURIComponent(selectedEvent.platform)}&source_event_id=${selectedEvent.id}`;
        router.push(url);
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión no encontrada');

            const exportUrl = `/api/calendar/export?projectId=${activeProject?.id || 'global'}&userId=${user.id}`;
            
            // Trigger download
            const link = document.createElement('a');
            link.href = exportUrl;
            link.setAttribute('download', `plan-writi-${activeProject?.name || 'global'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('Error al exportar: ' + err.message);
        } finally {
            setLoading(false);
        }
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

    // -- Mobile Rendering (v6.4.0) --
    const renderMobileMonthGrid = () => {
        const days = [];
        const start = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
        const total = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());

        for (let i = 0; i < start; i++) {
            days.push(<div key={`empty-${i}`} className="cal-mobile-day empty" />);
        }

        for (let i = 1; i <= total; i++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const dayEvents = events.filter(e => e.event_date === dateStr);
            const hasEvents = dayEvents.length > 0;

            days.push(
                <div
                    key={i}
                    className={`cal-mobile-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => {
                        if (hasEvents) {
                            // Si tiene eventos, abrir directamente el primero o crear uno nuevo
                            if (dayEvents.length === 1) {
                                // Un solo evento: abrirlo directamente
                                handleEventClick(null, dayEvents[0]);
                            } else {
                                // Múltiples eventos: si ya está seleccionado, crear nuevo; si no, seleccionar
                                if (isSelected) {
                                    handleDayClick(dateStr);
                                } else {
                                    setSelectedDate(dateStr);
                                }
                            }
                        } else {
                            // Sin eventos: abrir panel para crear
                            handleDayClick(dateStr);
                        }
                    }}
                >
                    <div className="day-num-circle">{i}</div>
                    {hasEvents && <div className="event-dot" />}
                </div>
            );
        }

        return (
            <div className="cal-mobile-month-grid">
                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                    <div key={d} className="cal-mobile-day-header">{d}</div>
                ))}
                {days}
            </div>
        );
    };

    const renderMobileAgenda = () => {
        // Vista semanal: mostrar 7 días desde la fecha actual del calendario
        // Vista mensual: mostrar solo el día seleccionado
        const dateList = [];
        if (viewMode === 'week') {
            // Usar currentDate como base para mostrar la semana del mes en el que estamos navegando
            const baseDate = selectedDate
                ? new Date(selectedDate + 'T12:00:00')
                : new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() || 1);

            for (let i = 0; i < 7; i++) {
                const d = new Date(baseDate);
                d.setDate(baseDate.getDate() + i);
                dateList.push(d.toISOString().split('T')[0]);
            }
        } else {
            const dStr = selectedDate || new Date().toISOString().split('T')[0];
            dateList.push(dStr);
        }

        return (
            <div className="cal-mobile-agenda" style={{ flex: 1, overflowY: 'auto', background: '#050505', padding: '10px 15px' }}>
                {dateList.map(dateStr => {
                    const d = new Date(dateStr + 'T12:00:00');
                    const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
                    const dayNum = d.getDate();
                    const monthName = d.toLocaleDateString('es-ES', { month: 'short' });
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    const dayEvents = events.filter(ev => (ev.event_date || ev.scheduled_date) === dateStr);

                    return (
                        <div key={dateStr} style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isToday ? '#9D00FF' : '#7ECECA' }}>{dayNum}</div>
                                <div style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                    <div style={{ color: '#fff', fontWeight: 700 }}>{dayName}</div>
                                    <div style={{ opacity: 0.6, color: '#888' }}>{monthName}</div>
                                </div>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                <button
                                    onClick={() => handleDayClick(dateStr)}
                                    style={{ background: 'rgba(126,206,202,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#7ECECA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="mobile-hourly-agenda" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayEvents.length > 0 ? (
                                    dayEvents.sort((a,b) => (a.start_time||'09:00').localeCompare(b.start_time||'09:00')).map(event => (
                                        <div
                                            key={event.id}
                                            className={`mobile-event-card-wide status-${event.status || 'idea'}`}
                                            onClick={(e) => handleEventClick(e, event)}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderLeft: `4px solid ${event.color === 'purple' ? '#9D00FF' : event.color === 'pink' ? '#EC4899' : event.color === 'blue' ? '#3B82F6' : event.color === 'green' ? '#10B981' : event.color === 'yellow' ? '#F59E0B' : event.color === 'red' ? '#EF4444' : '#6B7280'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.65rem', color: '#7ECECA', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {event.platform || 'General'}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>
                                                    {event.start_time?.substring(0,5) || '09:00'} - {event.end_time?.substring(0,5) || '10:00'}
                                                </span>
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>
                                                {event.title}
                                            </div>
                                            {(event.notes || event.description) && (
                                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {event.notes || event.description}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        onClick={() => handleDayClick(dateStr)}
                                        style={{ padding: '20px', textAlign: 'center', color: '#444', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer' }}
                                    >
                                        Sin planes para este día.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
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
                                className="cal-view-btn"
                                style={{
                                    background: 'rgba(157, 0, 255, 0.15)',
                                    border: '1px solid rgba(157, 0, 255, 0.3)',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    color: '#9D00FF'
                                }}
                                onClick={handleExport}
                                title="Exportar a Google Sheets / Excel (CSV)"
                            >
                                <Share2 size={16} /> Exportar Plan
                            </button>

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
                            <button
                                className="cal-ctrl-btn"
                                onClick={() => {
                                    const today = new Date();
                                    const todayStr = today.toISOString().split('T')[0];
                                    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
                                    setSelectedDate(todayStr);
                                    setIsPanelOpen(false);
                                    setSelectedEvent(null);
                                    loadData();
                                }}
                                style={{ fontSize: '0.85rem', padding: '0 12px' }}
                            >
                                Hoy
                            </button>
                            <button className="cal-ctrl-btn" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                </header>

                <div className="cal-grid-wrapper">
                    {loading ? (
                        <div className="cal-loading">Sincronizando calendario...</div>
                    ) : isMobile ? (
                        <div className="cal-mobile-v2">
                            {viewMode === 'month' && (
                                <div className="mobile-month-section">
                                    {renderMobileMonthGrid()}
                                </div>
                            )}
                            <div className="mobile-agenda-section">
                                <div className="agenda-day-header">
                                    {viewMode === 'week' ? 'Vista Semanal (Agenda de 7 días)' : (selectedDate ? new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(selectedDate + 'T00:00:00')) : 'Selecciona un día')}
                                </div>
                                {renderMobileAgenda()}
                            </div>
                            <button className="mobile-fab" onClick={() => handleDayClick(selectedDate)}>
                                <Plus size={28} />
                            </button>
                        </div>
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
                        {selectedEvent && (
                            <button
                                className="btn-primary"
                                onClick={() => router.push(`/dashboard/idea/${linkedScript?.id || selectedEvent?.reference_id || selectedEvent?.id}`)}
                                style={{
                                    width: '100%',
                                    marginBottom: '20px',
                                    background: 'rgba(126, 206, 202, 0.1)',
                                    color: '#7ECECA',
                                    border: '1px solid rgba(126, 206, 202, 0.3)',
                                    padding: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '12px',
                                    fontWeight: 800
                                }}
                            >
                                <Edit3 size={18} style={{ marginRight: '8px' }} /> Abrir Editor Completo (Hoja Grande)
                            </button>
                        )}
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
                                <div className="cal-prop-label"><Clock size={16} /> Horario</div>
                                <div className="cal-prop-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="time" className="cal-input-minimal" value={tempStartTime} onChange={e => setTempStartTime(e.target.value)} />
                                    <span style={{ color: '#555' }}>-</span>
                                    <input type="time" className="cal-input-minimal" value={tempEndTime} onChange={e => setTempEndTime(e.target.value)} />
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
                                        className="btn-primary"
                                        onClick={() => {
                                            const idToOpen = linkedScript?.id || selectedEvent?.reference_id || selectedEvent?.id;
                                            router.push(`/dashboard/idea/${idToOpen}`);
                                        }}
                                        style={{ marginTop: '10px', width: '100%', background: 'rgba(157, 0, 255, 0.15)', borderColor: 'rgba(157, 0, 255, 0.4)', color: 'white', fontSize: '0.85rem', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Edit3 size={16} style={{ marginRight: '8px' }} /> Abrir Editor Completo (Hoja Grande)
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

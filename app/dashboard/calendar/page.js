'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import {
    ChevronLeft, ChevronRight, Plus, X, Save, Trash2, Search,
    BookOpen, Edit3, Calendar as CalendarIcon,
    Globe, Share2, Sparkles, MoreVertical,
    CheckCircle2, Clock, Palette, Copy, ArrowRightLeft
} from 'lucide-react';
import Logo from '@/app/components/Logo';
import SheetEditor from '@/app/components/SheetEditor';
import './calendar.css';
import { useProject } from '@/app/components/ProjectContext';

// Calendar Page v2.0.0 (Google Calendar / Fantastical Dark Mode)

export default function CalendarPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0c0c0e', color: '#555', fontFamily: 'Inter, sans-serif' }}>
                Cargando calendario...
            </div>
        }>
            <CalendarContent />
        </Suspense>
    );
}

// ─── Color helpers ───────────────────────────────────────────────────────────
const COLOR_MAP = {
    purple: { bg: 'rgba(124,58,237,0.25)', border: 'rgba(124,58,237,0.55)', solid: '#7c3aed', text: '#c4b5fd' },
    pink:   { bg: 'rgba(236,72,153,0.22)', border: 'rgba(236,72,153,0.5)',  solid: '#ec4899', text: '#f9a8d4' },
    blue:   { bg: 'rgba(14,165,233,0.22)', border: 'rgba(14,165,233,0.5)',  solid: '#0ea5e9', text: '#7dd3fc' },
    green:  { bg: 'rgba(5,150,105,0.22)',  border: 'rgba(5,150,105,0.5)',   solid: '#059669', text: '#6ee7b7' },
    yellow: { bg: 'rgba(245,158,11,0.22)', border: 'rgba(245,158,11,0.5)',  solid: '#f59e0b', text: '#fde68a' },
    red:    { bg: 'rgba(239,68,68,0.22)',  border: 'rgba(239,68,68,0.5)',   solid: '#ef4444', text: '#fca5a5' },
    gray:   { bg: 'rgba(107,114,128,0.2)', border: 'rgba(107,114,128,0.45)', solid: '#6b7280', text: '#d1d5db' },
};
function colorOf(id) { return COLOR_MAP[id] || COLOR_MAP.purple; }

const MONTH_NAMES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEADERS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAY_HEADERS_MIN   = ['L','M','X','J','V','S','D'];

function toDateStr(d) { return d.toISOString().split('T')[0]; }
function todayStr()   { return toDateStr(new Date()); }

// Monday-based: returns 0 for Monday, 6 for Sunday
function dowMon(date) { return (date.getDay() + 6) % 7; }

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

// Returns Mon of the week containing `date`
function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - dowMon(d));
    d.setHours(0,0,0,0);
    return d;
}

function getWeekDays(weekStart) {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });
}

// ─── Main component ───────────────────────────────────────────────────────────
function CalendarContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createSupabaseClient();

    // -- State --
    const [currentDate, setCurrentDate]   = useState(new Date());
    const [viewMode, setViewMode]         = useState('week'); // 'week' | 'month' | 'day'
    const [events, setEvents]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSmartPlan, setLoadingSmartPlan] = useState(false);

    // Detail Panel
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate]   = useState(null);
    const [isPanelOpen, setIsPanelOpen]     = useState(false);

    // Filters
    const [filterPlatform, setFilterPlatform] = useState('All');
    const [filterStatus, setFilterStatus]     = useState('All');
    const [searchQuery, setSearchQuery]       = useState('');
    const [linkedScript, setLinkedScript]     = useState(null);
    const [loadingScript, setLoadingScript]   = useState(false);

    // Context menu
    const [contextMenu, setContextMenu] = useState(null);
    const [sheetItem, setSheetItem]     = useState(null);

    // Multi-select & drag
    const [selectedEvents, setSelectedEvents] = useState(new Set());
    const [isDragging, setIsDragging]         = useState(false);
    const [dragMode, setDragMode]             = useState(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [bulkStatusChange, setBulkStatusChange]   = useState('');

    // Form
    const [tempTitle, setTempTitle]         = useState('');
    const [tempStatus, setTempStatus]       = useState('idea');
    const [tempPlatform, setTempPlatform]   = useState('General');
    const [tempNotes, setTempNotes]         = useState('');
    const [tempColor, setTempColor]         = useState('purple');
    const [tempStartTime, setTempStartTime] = useState('09:00');
    const [tempEndTime, setTempEndTime]     = useState('10:00');

    // Mobile / touch
    const [isMobile, setIsMobile]     = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    // Mini-calendar sidebar navigation (independent from main view)
    const [miniCalDate, setMiniCalDate] = useState(new Date());

    const THEME_COLORS = [
        { id: 'purple', hex: '#7c3aed', name: 'Violeta' },
        { id: 'pink',   hex: '#ec4899', name: 'Rosa' },
        { id: 'blue',   hex: '#0ea5e9', name: 'Azul' },
        { id: 'green',  hex: '#059669', name: 'Verde' },
        { id: 'yellow', hex: '#f59e0b', name: 'Amarillo' },
        { id: 'red',    hex: '#ef4444', name: 'Rojo' },
        { id: 'gray',   hex: '#6b7280', name: 'Gris' },
    ];

    const { activeProject } = useProject();

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    useEffect(() => {
        loadData();
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [currentDate, activeProject]);

    useEffect(() => {
        const importId = searchParams.get('import');
        if (importId) handleImportIdea(importId);
    }, [searchParams]);

    // ── Import idea ────────────────────────────────────────────────────────────
    async function handleImportIdea(id) {
        setLoadingSmartPlan(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: idea, error: ideaErr } = await supabase.from('library').select('*').eq('id', id).single();
            if (ideaErr || !idea) throw new Error('No se pudo encontrar la idea en el banco de ideas.');

            const response = await fetch('/api/calendar/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [idea], projectId: activeProject?.id })
            });

            const body = response.ok ? await response.json() : {};
            const suggestion = body.schedule?.[0];
            const eventDate = suggestion?.fecha_sugerida || new Date().toISOString().split('T')[0];
            const startTime = suggestion?.hora_sugerida || '09:00';
            let endTime = '10:00';
            if (startTime) {
                const [h, m] = startTime.split(':').map(Number);
                endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }

            const notes = [
                idea.gancho     ? `GANCHO: ${idea.gancho}` : '',
                idea.desarrollo ? `DESARROLLO: ${Array.isArray(idea.desarrollo) ? idea.desarrollo.join('\n') : idea.desarrollo}` : '',
                idea.content    || ''
            ].filter(Boolean).join('\n\n');

            const payload = {
                user_id: user.id, project_id: activeProject?.id,
                title: idea.titulo || idea.titulo_idea || 'Idea importada',
                status: 'idea', platform: idea.platform || 'General',
                notes, event_date: eventDate, type: 'idea', color: 'green',
                start_time: startTime, end_time: endTime, reference_id: idea.id
            };

            const { data: newEv, error: insertErr } = await supabase.from('calendar_events').insert(payload).select().single();
            if (insertErr) throw insertErr;

            if (newEv) {
                setEvents(prev => [...prev, newEv]);
                setSelectedEvent(newEv);
                setSelectedDate(eventDate);
                setTempTitle(newEv.title);
                setTempNotes(newEv.notes);
                setTempPlatform(newEv.platform);
                setTempStatus(newEv.status);
                setTempColor(newEv.color);
                setTempStartTime(newEv.start_time);
                setTempEndTime(newEv.end_time);
                setIsPanelOpen(true);
                const suggestedDateObj = new Date(eventDate + 'T12:00:00');
                if (suggestedDateObj.getMonth() !== currentDate.getMonth() || suggestedDateObj.getFullYear() !== currentDate.getFullYear()) {
                    setCurrentDate(suggestedDateObj);
                }
            }
            const url = new URL(window.location.href);
            url.searchParams.delete('import');
            window.history.replaceState({}, '', url.pathname);
        } catch (err) {
            console.error('Error importing idea:', err);
            alert('Error al analizar e insertar idea: ' + err.message);
        } finally {
            setLoadingSmartPlan(false);
        }
    }

    // ── Load linked script ─────────────────────────────────────────────────────
    useEffect(() => {
        async function loadLinkedScript() {
            if (!selectedEvent) { setLinkedScript(null); return; }
            const hasScript = selectedEvent.has_script || selectedEvent.reference_id;
            if (!hasScript) { setLinkedScript(null); return; }
            setLoadingScript(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const scriptId = selectedEvent.reference_id || selectedEvent.script_id || selectedEvent.id;
                const { data: libData } = await supabase.from('library').select('*').eq('id', scriptId).single();
                if (libData) {
                    setLinkedScript(libData);
                } else {
                    const { data: slotData } = await supabase.from('content_slots').select('*').eq('id', selectedEvent.id).single();
                    if (slotData?.script_content) {
                        setLinkedScript({
                            id: slotData.id, content: slotData.script_content,
                            gancho: slotData.script_content?.hook || slotData.script_content?.gancho,
                            desarrollo: slotData.script_content?.desarrollo || slotData.script_content?.puntos,
                            cta: slotData.script_content?.cta || slotData.script_content?.cierre,
                            copy_post: slotData.copy_content
                        });
                    }
                }
            } catch (err) { console.error('Error loading linked script:', err); }
            finally { setLoadingScript(false); }
        }
        loadLinkedScript();
    }, [selectedEvent]);

    // ── loadData ───────────────────────────────────────────────────────────────
    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
            const lastDay  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString().split('T')[0];

            let eventQuery = supabase.from('calendar_events').select('*').eq('user_id', user.id).gte('event_date', firstDay).lte('event_date', lastDay);
            if (activeProject) eventQuery = eventQuery.eq('project_id', activeProject.id);
            const { data: eventData } = await eventQuery;

            let slotsQuery = supabase.from('content_slots').select('*').eq('user_id', user.id).gte('scheduled_date', firstDay).lte('scheduled_date', lastDay);
            if (activeProject) slotsQuery = slotsQuery.eq('project_id', activeProject.id);
            const { data: slotData } = await slotsQuery;

            const normalizedSlots = (slotData || []).map(slot => ({
                id: slot.id, user_id: slot.user_id, project_id: slot.project_id,
                event_date: slot.scheduled_date,
                title: slot.title || slot.idea_title || 'Idea de Contenido',
                notes: slot.description || '', platform: slot.platform || 'General',
                status: slot.status || 'idea', start_time: slot.start_time || '09:00',
                end_time: slot.end_time || '10:00', color: slot.slot_color || 'pink', is_slot: true
            }));

            setEvents([...(eventData || []), ...normalizedSlots]);
            setSelectedEvents(new Set());

            // library items are loaded on-demand via linked script logic — no local state needed
        }
        setLoading(false);
    }

    // ── Event handlers ─────────────────────────────────────────────────────────
    const openNewEvent = (dateStr, startHour = null) => {
        setSelectedEvent(null);
        setSelectedDate(dateStr);
        setTempTitle('');
        setTempStatus('idea');
        setTempPlatform('General');
        setTempNotes('');
        setTempColor('purple');
        setTempStartTime(startHour !== null ? `${String(startHour).padStart(2,'0')}:00` : '09:00');
        setTempEndTime(startHour !== null ? `${String(startHour + 1).padStart(2,'0')}:00` : '10:00');
        setIsPanelOpen(true);
    };

    const handleDayClick = (dateStr) => {
        if (selectedDate === dateStr && isMobile) setIsPanelOpen(true);
        openNewEvent(dateStr);
    };

    const handleEventClick = (e, event) => {
        if (e) e.stopPropagation();
        if (isSelectMode || (e && (e.ctrlKey || e.metaKey))) {
            const next = new Set(selectedEvents);
            if (next.has(event.id)) next.delete(event.id); else next.add(event.id);
            setSelectedEvents(next);
            return;
        }
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

    const handleSavePanel = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const colorValue = tempColor || 'purple';
        try {
            if (selectedEvent && selectedEvent.id) {
                if (selectedEvent.is_slot) {
                    const slotUpdates = { title: tempTitle || 'Sin título', status: tempStatus, platform: tempPlatform, description: tempNotes, scheduled_date: selectedDate, start_time: tempStartTime, end_time: tempEndTime, slot_color: colorValue };
                    const { error: updateErr } = await supabase.from('content_slots').update(slotUpdates).eq('id', selectedEvent.id);
                    if (updateErr) throw updateErr;
                    setEvents(events.map(ev => ev.id === selectedEvent.id ? { ...ev, ...slotUpdates, event_date: selectedDate, notes: tempNotes, color: colorValue } : ev));
                } else {
                    const updates = { title: tempTitle || 'Sin título', status: tempStatus, platform: tempPlatform, notes: tempNotes, event_date: selectedDate, color: colorValue, start_time: tempStartTime, end_time: tempEndTime };
                    const { error: updateErr } = await supabase.from('calendar_events').update(updates).eq('id', selectedEvent.id);
                    if (updateErr) throw updateErr;
                    setEvents(events.map(ev => ev.id === selectedEvent.id ? { ...ev, ...updates } : ev));
                }
            } else {
                const payload = { user_id: user.id, project_id: activeProject?.id, title: tempTitle || 'Sin título', status: tempStatus, platform: tempPlatform, notes: tempNotes, event_date: selectedDate, type: 'idea', color: colorValue, start_time: tempStartTime, end_time: tempEndTime };
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

    const hasUnsavedChanges = () => {
        if (!tempTitle && !tempNotes && !tempStartTime && !tempEndTime) return false;
        if (selectedEvent) {
            return tempTitle !== selectedEvent.title || tempNotes !== selectedEvent.notes ||
                   tempStartTime !== selectedEvent.start_time || tempEndTime !== selectedEvent.end_time ||
                   tempStatus !== selectedEvent.status || tempPlatform !== selectedEvent.platform || tempColor !== selectedEvent.color;
        }
        return tempTitle.trim() !== '' || tempNotes.trim() !== '';
    };

    const handleClosePanel = () => {
        if (hasUnsavedChanges()) {
            if (confirm('¿Descartar cambios en esta publicación?')) {
                setIsPanelOpen(false);
                setTempTitle(''); setTempNotes(''); setTempStatus('idea'); setTempPlatform('General');
                setTempColor('purple'); setTempStartTime('09:00'); setTempEndTime('10:00');
                setSelectedEvent(null); setSelectedDate(null);
            }
        } else {
            setIsPanelOpen(false);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!confirm('¿Eliminar este evento?')) return;
        const eventToDelete = events.find(e => e.id === id);
        if (eventToDelete?.is_slot) await supabase.from('content_slots').delete().eq('id', id);
        else await supabase.from('calendar_events').delete().eq('id', id);
        setIsPanelOpen(false);
        setContextMenu(null);
        loadData();
    };

    const handleDuplicateEvent = async (id) => {
        const ev = events.find(e => e.id === id);
        if (!ev) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('calendar_events').insert({ user_id: user.id, project_id: activeProject?.id, title: `${ev.title} (Copia)`, status: ev.status, platform: ev.platform, notes: ev.notes, event_date: ev.event_date, type: ev.type, reference_id: ev.reference_id, has_script: ev.has_script, content: ev.content || null });
        loadData();
        setContextMenu(null);
    };

    const handleMoveDate = (id) => {
        const ev = events.find(e => e.id === id);
        if (!ev) return;
        handleEventClick({ stopPropagation: () => {} }, ev);
        setContextMenu(null);
    };

    // Multi-select drag
    const handleEventMouseDown = (e, id) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        const isSelected = selectedEvents.has(id);
        const newMode = isSelected ? 'deselect' : 'select';
        setDragMode(newMode);
        const next = new Set(selectedEvents);
        if (newMode === 'select') next.add(id); else next.delete(id);
        setSelectedEvents(next);
    };
    const handleEventMouseEnter = (id) => {
        if (!isDragging) return;
        const next = new Set(selectedEvents);
        if (dragMode === 'select') next.add(id); else next.delete(id);
        setSelectedEvents(next);
    };
    useEffect(() => {
        const handleMouseUp = () => { setIsDragging(false); setDragMode(null); };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleDeleteSelected = () => { if (selectedEvents.size > 0) setShowDeleteConfirm(true); };
    const confirmDeleteSelected = async () => {
        const ids = Array.from(selectedEvents);
        if (!ids.length) return;
        try {
            const slotIds = ids.filter(id => events.find(e => e.id === id)?.is_slot);
            const eventIds = ids.filter(id => !events.find(e => e.id === id)?.is_slot);
            if (slotIds.length)  { const { error: e } = await supabase.from('content_slots').delete().in('id', slotIds); if (e) throw e; }
            if (eventIds.length) { const { error: e } = await supabase.from('calendar_events').delete().in('id', eventIds); if (e) throw e; }
            setEvents(events.filter(ev => !selectedEvents.has(ev.id)));
            setSelectedEvents(new Set());
            setIsPanelOpen(false);
            setShowDeleteConfirm(false);
        } catch (e) { alert('Error al eliminar: ' + e.message); }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (!newStatus || selectedEvents.size === 0) return;
        try {
            const ids = Array.from(selectedEvents);
            const { error } = await supabase.from('calendar_events').update({ status: newStatus }).in('id', ids);
            if (error) throw error;
            setEvents(events.map(ev => selectedEvents.has(ev.id) ? { ...ev, status: newStatus } : ev));
            setBulkStatusChange('');
        } catch (e) { alert('Error al actualizar estado: ' + e.message); }
    };

    // Context menu
    const handleContextMenu = (e, eventId) => {
        e.preventDefault();
        if (eventId && !selectedEvents.has(eventId)) setSelectedEvents(new Set([eventId]));
        setContextMenu({ x: e.pageX, y: e.pageY, eventId });
    };
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    // Drag & drop
    const onDragStart = (e, id) => e.dataTransfer.setData('eventId', id);
    const onDrop = async (e, date) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('eventId');
        if (!id) return;
        await supabase.from('calendar_events').update({ event_date: date }).eq('id', id);
        loadData();
    };

    const handleCreateScript = () => {
        if (!selectedEvent) return;
        if (selectedEvent.has_script || linkedScript) {
            router.push(`/dashboard/idea/${linkedScript?.id || selectedEvent.reference_id || selectedEvent.id}`);
            return;
        }
        router.push(`/dashboard?mode=single&topic=${encodeURIComponent(selectedEvent.title)}&platform=${encodeURIComponent(selectedEvent.platform)}&source_event_id=${selectedEvent.id}`);
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sesión no encontrada');
            const link = document.createElement('a');
            link.href = `/api/calendar/export?projectId=${activeProject?.id || 'global'}&userId=${user.id}`;
            link.setAttribute('download', `plan-writi-${activeProject?.name || 'global'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) { alert('Error al exportar: ' + err.message); }
        finally { setLoading(false); }
    };

    // ── Filtered events helper ─────────────────────────────────────────────────
    const filteredEvents = events.filter(e => {
        if (filterPlatform !== 'All' && e.platform !== filterPlatform) return false;
        if (filterStatus !== 'All' && e.status !== filterStatus) return false;
        if (searchQuery && !e.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    function eventsForDate(dateStr) {
        return filteredEvents.filter(e => (e.event_date || e.scheduled_date) === dateStr)
            .sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
    }

    // ── Week view ──────────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const weekStart = getWeekStart(currentDate);
        const weekDays  = getWeekDays(weekStart);
        const hours     = Array.from({ length: 24 }, (_, i) => i);
        const HOUR_H    = 60; // px per hour
        const now       = new Date();
        const todayS    = todayStr();

        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Week column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#13131a', flexShrink: 0 }}>
                    <div style={{ width: 52 }} />
                    {weekDays.map((day, i) => {
                        const ds    = toDateStr(day);
                        const isT   = ds === todayS;
                        const dName = DAY_HEADERS_SHORT[i];
                        return (
                            <div key={ds} style={{ textAlign: 'center', padding: '10px 4px', cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.05)' }} onClick={() => openNewEvent(ds)}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isT ? '#7c3aed' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{dName}</div>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: isT ? '#7c3aed' : 'transparent', color: isT ? '#fff' : 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 700, fontSize: '0.9rem' }}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable grid */}
                <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }} className="week-scroll">
                    <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>
                        {/* Hour labels */}
                        <div style={{ gridColumn: 1, gridRow: '1 / span 24' }}>
                            {hours.map(h => (
                                <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2, boxSizing: 'border-box' }}>
                                    {h > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{String(h).padStart(2,'0')}:00</span>}
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {weekDays.map((day, colIdx) => {
                            const ds   = toDateStr(day);
                            const isT  = ds === todayS;
                            const dayEvs = eventsForDate(ds);

                            // Current time line
                            const nowMinutes = now.getHours() * 60 + now.getMinutes();
                            const nowTop     = (nowMinutes / 60) * HOUR_H;

                            return (
                                <div key={ds} style={{ gridColumn: colIdx + 2, position: 'relative', background: isT ? 'rgba(124,58,237,0.03)' : 'transparent', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                    {/* Hour cells (clickable) */}
                                    {hours.map(h => (
                                        <div
                                            key={h}
                                            style={{ height: HOUR_H, borderTop: '1px solid rgba(255,255,255,0.04)', boxSizing: 'border-box', cursor: 'pointer' }}
                                            onClick={() => openNewEvent(ds, h)}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => onDrop(e, ds)}
                                        />
                                    ))}

                                    {/* Now line */}
                                    {isT && (
                                        <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: '#7c3aed', zIndex: 10, pointerEvents: 'none' }}>
                                            <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#7c3aed' }} />
                                        </div>
                                    )}

                                    {/* Events */}
                                    {dayEvs.map(ev => {
                                        const [sh, sm] = (ev.start_time || '09:00').split(':').map(Number);
                                        const [eh, em] = (ev.end_time   || '10:00').split(':').map(Number);
                                        const topPx  = (sh * 60 + sm) / 60 * HOUR_H;
                                        const durMin = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
                                        const heightPx = durMin / 60 * HOUR_H;
                                        const c = colorOf(ev.color || 'purple');
                                        const isSelected = selectedEvents.has(ev.id);

                                        return (
                                            <div
                                                key={ev.id}
                                                draggable={!isDragging}
                                                onDragStart={e => onDragStart(e, ev.id)}
                                                onMouseDown={e => { e.stopPropagation(); handleEventMouseDown(e, ev.id); }}
                                                onMouseEnter={() => handleEventMouseEnter(ev.id)}
                                                onClick={e => handleEventClick(e, ev)}
                                                onContextMenu={e => handleContextMenu(e, ev.id)}
                                                style={{
                                                    position: 'absolute',
                                                    top: topPx + 2,
                                                    left: 2,
                                                    right: 2,
                                                    height: Math.max(heightPx - 4, 22),
                                                    background: c.bg,
                                                    borderLeft: `3px solid ${c.solid}`,
                                                    borderRadius: 6,
                                                    padding: '3px 6px',
                                                    cursor: 'pointer',
                                                    zIndex: 5,
                                                    overflow: 'hidden',
                                                    boxShadow: isSelected ? `0 0 0 2px ${c.solid}` : 'none',
                                                    transition: 'box-shadow 0.15s',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                                    {ev.title}
                                                </div>
                                                {heightPx > 36 && (
                                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                                                        {(ev.start_time || '09:00').slice(0,5)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ── Month view ─────────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const year    = currentDate.getFullYear();
        const month   = currentDate.getMonth();
        const total   = daysInMonth(year, month);
        const todayS  = todayStr();

        // First day offset (Mon-based)
        const firstDate    = new Date(year, month, 1);
        const startOffset  = dowMon(firstDate);

        const cells = [];

        // Day headers
        DAY_HEADERS_SHORT.forEach(d => (
            cells.push(
                <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {d}
                </div>
            )
        ));

        // Padding cells
        for (let i = 0; i < startOffset; i++) {
            cells.push(<div key={`pad-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', minHeight: 90 }} />);
        }

        // Day cells
        for (let d = 1; d <= total; d++) {
            const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isT = ds === todayS;
            const dayEvs = eventsForDate(ds);
            const MAX_VISIBLE = 3;
            const overflow = dayEvs.length - MAX_VISIBLE;

            cells.push(
                <div
                    key={d}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', minHeight: 90, padding: '6px 4px', cursor: 'pointer', position: 'relative', transition: 'background 0.15s' }}
                    onClick={() => handleDayClick(ds)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, ds)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: isT ? '#7c3aed' : 'transparent',
                            color: isT ? '#fff' : 'rgba(255,255,255,0.7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: isT ? 700 : 400
                        }}>{d}</span>
                        <span style={{ opacity: 0, fontSize: '0.6rem', color: '#555' }} className="cell-plus">+</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvs.slice(0, MAX_VISIBLE).map(ev => {
                            const c = colorOf(ev.color || 'purple');
                            return (
                                <div
                                    key={ev.id}
                                    draggable
                                    onDragStart={e => { e.stopPropagation(); onDragStart(e, ev.id); }}
                                    onClick={e => { e.stopPropagation(); handleEventClick(e, ev); }}
                                    onContextMenu={e => handleContextMenu(e, ev.id)}
                                    style={{
                                        background: c.bg,
                                        borderLeft: `3px solid ${c.solid}`,
                                        borderRadius: 4,
                                        padding: '1px 5px',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        color: c.text,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        cursor: 'pointer',
                                        boxShadow: selectedEvents.has(ev.id) ? `0 0 0 1.5px ${c.solid}` : 'none',
                                    }}
                                >
                                    {ev.title}
                                </div>
                            );
                        })}
                        {overflow > 0 && (
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', paddingLeft: 4, fontWeight: 600 }}>+{overflow} más</div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, alignContent: 'start' }}>
                {cells}
            </div>
        );
    };

    // ── Day view ───────────────────────────────────────────────────────────────
    const renderDayView = () => {
        const ds     = toDateStr(currentDate);
        const hours  = Array.from({ length: 24 }, (_, i) => i);
        const HOUR_H = 60;
        const now    = new Date();
        const todayS = todayStr();
        const isT    = ds === todayS;
        const dayEvs = eventsForDate(ds);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        return (
            <div style={{ flex: 1, overflowY: 'auto' }} className="week-scroll">
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '52px 1fr' }}>
                    <div>
                        {hours.map(h => (
                            <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2, boxSizing: 'border-box' }}>
                                {h > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{String(h).padStart(2,'0')}:00</span>}
                            </div>
                        ))}
                    </div>
                    <div style={{ position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                        {hours.map(h => (
                            <div key={h} style={{ height: HOUR_H, borderTop: '1px solid rgba(255,255,255,0.04)', boxSizing: 'border-box', cursor: 'pointer' }} onClick={() => openNewEvent(ds, h)} />
                        ))}
                        {isT && (
                            <div style={{ position: 'absolute', top: (nowMinutes / 60) * HOUR_H, left: 0, right: 0, height: 2, background: '#7c3aed', zIndex: 10 }}>
                                <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#7c3aed' }} />
                            </div>
                        )}
                        {dayEvs.map(ev => {
                            const [sh, sm] = (ev.start_time || '09:00').split(':').map(Number);
                            const [eh, em] = (ev.end_time   || '10:00').split(':').map(Number);
                            const topPx    = (sh * 60 + sm) / 60 * HOUR_H;
                            const durMin   = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
                            const c        = colorOf(ev.color || 'purple');
                            return (
                                <div
                                    key={ev.id}
                                    onClick={e => handleEventClick(e, ev)}
                                    onContextMenu={e => handleContextMenu(e, ev.id)}
                                    style={{ position: 'absolute', top: topPx + 2, left: 4, right: 4, height: Math.max(durMin / 60 * HOUR_H - 4, 22), background: c.bg, borderLeft: `4px solid ${c.solid}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', zIndex: 5 }}
                                >
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: c.text }}>{ev.title}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{(ev.start_time||'09:00').slice(0,5)} - {(ev.end_time||'10:00').slice(0,5)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ── Mobile views (preserved) ───────────────────────────────────────────────
    const renderMobileMonthGrid = () => {
        const days = [];
        const start = dowMon(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        const total = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        for (let i = 0; i < start; i++) days.push(<div key={`empty-${i}`} className="cal-mobile-day empty" />);
        for (let i = 1; i <= total; i++) {
            const ds        = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isSel     = selectedDate === ds;
            const isT       = todayStr() === ds;
            const dayEvents = events.filter(e => e.event_date === ds);
            days.push(
                <div key={i} className={`cal-mobile-day ${isSel ? 'selected' : ''} ${isT ? 'today' : ''}`}
                    onClick={() => {
                        if (dayEvents.length === 1) handleEventClick(null, dayEvents[0]);
                        else if (dayEvents.length > 1 && isSel) handleDayClick(ds);
                        else if (dayEvents.length > 1) setSelectedDate(ds);
                        else handleDayClick(ds);
                    }}>
                    <div className="day-num-circle">{i}</div>
                    {dayEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                            {dayEvents.slice(0, 3).map((_, idx) => <div key={idx} className="event-dot" style={{ position: 'static', background: colorOf(dayEvents[idx]?.color).solid }} />)}
                            {dayEvents.length > 3 && <span style={{ fontSize: '0.6rem', color: '#7c3aed', marginTop: '-3px' }}>+</span>}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="cal-mobile-month-grid">
                {DAY_HEADERS_MIN.map(d => <div key={d} className="cal-mobile-day-header">{d}</div>)}
                {days}
            </div>
        );
    };

    const renderMobileAgenda = () => {
        const dateList = [];
        if (viewMode === 'week') {
            const anchor    = new Date(currentDate);
            const monday    = new Date(anchor);
            monday.setDate(anchor.getDate() - dowMon(anchor) + weekOffset * 7);
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                dateList.push(toDateStr(d));
            }
        } else {
            dateList.push(selectedDate || todayStr());
        }

        const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; };
        const handleTouchEnd   = (e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
            if (Math.abs(dx) > 50 && dy < 80) setWeekOffset(p => p + (dx < 0 ? 1 : -1));
            touchStartX.current = null; touchStartY.current = null;
        };

        const weekLabel = viewMode === 'week' && dateList.length === 7
            ? `${new Date(dateList[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${new Date(dateList[6] + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : null;

        return (
            <div className="cal-mobile-agenda" style={{ flex: 1, overflowY: 'auto', background: '#0c0c0e', padding: '10px 15px 120px 15px', touchAction: 'pan-y' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {viewMode === 'week' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
                        <button onClick={() => setWeekOffset(p => p - 1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: '#fff', cursor: 'pointer' }}>‹</button>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', flex: 1 }}>{weekLabel}</span>
                        <button onClick={() => setWeekOffset(p => p + 1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: '#fff', cursor: 'pointer' }}>›</button>
                    </div>
                )}
                {dateList.map(ds => {
                    const d       = new Date(ds + 'T12:00:00');
                    const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
                    const isT     = todayStr() === ds;
                    const dayEvs  = events.filter(ev => (ev.event_date || ev.scheduled_date) === ds);
                    return (
                        <div key={ds} style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isT ? '#7c3aed' : '#7ECECA' }}>{d.getDate()}</div>
                                <div style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                    <div style={{ color: '#fff', fontWeight: 700 }}>{dayName}</div>
                                    <div style={{ opacity: 0.6, color: '#888' }}>{d.toLocaleDateString('es-ES', { month: 'short' })}</div>
                                </div>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                <button onClick={() => handleDayClick(ds)} style={{ background: 'rgba(124,58,237,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {dayEvs.length > 0 ? dayEvs.sort((a,b) => (a.start_time||'09:00').localeCompare(b.start_time||'09:00')).map(ev => {
                                    const c = colorOf(ev.color || 'purple');
                                    return (
                                        <div key={ev.id} onClick={e => handleEventClick(e, ev)}
                                            style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: `4px solid ${c.solid}`, cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.65rem', color: c.text, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ev.platform || 'General'}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>{(ev.start_time||'09:00').slice(0,5)} - {(ev.end_time||'10:00').slice(0,5)}</span>
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>{ev.title}</div>
                                            {(ev.notes || ev.description) && <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.notes || ev.description}</div>}
                                        </div>
                                    );
                                }) : (
                                    <div onClick={() => handleDayClick(ds)} style={{ padding: '20px', textAlign: 'center', color: '#444', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer' }}>
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

    // ── Mini calendar (sidebar) ────────────────────────────────────────────────
    const renderMiniCal = () => {
        const year     = miniCalDate.getFullYear();
        const month    = miniCalDate.getMonth();
        const total    = daysInMonth(year, month);
        const offset   = dowMon(new Date(year, month, 1));
        const todayS   = todayStr();

        const cells = [];
        DAY_HEADERS_MIN.forEach(d => cells.push(<div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, padding: '4px 0' }}>{d}</div>));
        for (let i = 0; i < offset; i++) cells.push(<div key={`p${i}`} />);
        for (let d = 1; d <= total; d++) {
            const ds  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isT = ds === todayS;
            const isSel = selectedDate === ds;
            const hasEv = events.some(e => (e.event_date || e.scheduled_date) === ds);
            cells.push(
                <div
                    key={d}
                    onClick={() => {
                        setSelectedDate(ds);
                        setCurrentDate(new Date(year, month, d));
                    }}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: '50%', margin: '0 auto',
                        background: isT ? '#7c3aed' : isSel ? 'rgba(124,58,237,0.3)' : 'transparent',
                        color: isT ? '#fff' : isSel ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
                        fontSize: '0.72rem', fontWeight: isT || isSel ? 700 : 400,
                        cursor: 'pointer', transition: 'background 0.15s', position: 'relative',
                    }}
                >
                    {d}
                    {hasEv && !isT && (
                        <div style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: '#7c3aed' }} />
                    )}
                </div>
            );
        }
        return cells;
    };

    // ── Today's events for sidebar ─────────────────────────────────────────────
    const sidebarDateStr  = selectedDate || todayStr();
    const sidebarEvents   = eventsForDate(sidebarDateStr);

    // ── Title for topbar ───────────────────────────────────────────────────────
    const getMainTitle = () => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        if (viewMode === 'week') {
            const ws = getWeekStart(currentDate);
            const we = getWeekDays(ws)[6];
            if (ws.getMonth() === we.getMonth()) return `${MONTH_NAMES_ES[m]} ${y}`;
            return `${MONTH_NAMES_ES[ws.getMonth()]} – ${MONTH_NAMES_ES[we.getMonth()]} ${y}`;
        }
        if (viewMode === 'day') return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return `${MONTH_NAMES_ES[m]} ${y}`;
    };

    const navPrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
        else if (viewMode === 'week') d.setDate(d.getDate() - 7);
        else d.setDate(d.getDate() - 1);
        setCurrentDate(d);
    };
    const navNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
        else if (viewMode === 'week') d.setDate(d.getDate() + 7);
        else d.setDate(d.getDate() + 1);
        setCurrentDate(d);
    };
    const goToday = () => {
        const t = new Date();
        setCurrentDate(t);
        setSelectedDate(todayStr());
        setMiniCalDate(t);
        setIsPanelOpen(false);
        setSelectedEvent(null);
        loadData();
    };

    // ══════════════════════════════════════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0c0c0e', fontFamily: 'Inter, sans-serif', color: '#fff', overflow: 'hidden' }}>

            {/* ── Sidebar ── */}
            {!isMobile && (
                <aside style={{ width: 220, flexShrink: 0, background: '#111116', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Branding */}
                    <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Logo size="1.1rem" />
                    </div>

                    {/* New event button */}
                    <div style={{ padding: '14px 12px 10px' }}>
                        <button
                            onClick={() => openNewEvent(todayStr())}
                            style={{ width: '100%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', borderRadius: 10, padding: '9px 0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.28)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.15)'}
                        >
                            <Plus size={14} /> Nuevo evento
                        </button>
                    </div>

                    {/* Mini calendar */}
                    <div style={{ padding: '0 12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {MONTH_NAMES_ES[miniCalDate.getMonth()].slice(0,3)} {miniCalDate.getFullYear()}
                            </span>
                            <div style={{ display: 'flex', gap: 2 }}>
                                <button onClick={() => setMiniCalDate(d => { const n = new Date(d); n.setMonth(n.getMonth()-1); return n; })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 2, display: 'flex' }}><ChevronLeft size={13} /></button>
                                <button onClick={() => setMiniCalDate(d => { const n = new Date(d); n.setMonth(n.getMonth()+1); return n; })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 2, display: 'flex' }}><ChevronRight size={13} /></button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
                            {renderMiniCal()}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 12px 12px' }} />

                    {/* Today's / selected day events */}
                    <div style={{ padding: '0 12px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            {sidebarDateStr === todayStr() ? 'Hoy' : new Date(sidebarDateStr + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {sidebarEvents.length === 0
                                ? <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Sin eventos</div>
                                : sidebarEvents.map(ev => {
                                    const c = colorOf(ev.color || 'purple');
                                    return (
                                        <div key={ev.id} onClick={e => handleEventClick(e, ev)}
                                            style={{ background: c.bg, borderLeft: `3px solid ${c.solid}`, borderRadius: 6, padding: '4px 7px', cursor: 'pointer' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{(ev.start_time||'09:00').slice(0,5)}</div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Filtros</div>
                        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                            style={{ width: '100%', background: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', padding: '7px 8px', borderRadius: 8, fontSize: '0.72rem', outline: 'none', marginBottom: 6 }}>
                            <option value="All">Todas las plataformas</option>
                            <option value="TikTok">TikTok</option>
                            <option value="Instagram">Instagram</option>
                            <option value="YouTube">YouTube</option>
                            <option value="LinkedIn">LinkedIn</option>
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            style={{ width: '100%', background: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', padding: '7px 8px', borderRadius: 8, fontSize: '0.72rem', outline: 'none' }}>
                            <option value="All">Todos los estados</option>
                            <option value="idea">Ideas</option>
                            <option value="prep">En preparación</option>
                            <option value="rec">En grabación</option>
                            <option value="pub">Publicado</option>
                        </select>
                    </div>

                    {/* AI promo */}
                    <div style={{ padding: '10px 12px 14px' }}>
                        <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <Sparkles size={14} color="#7c3aed" />
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c4b5fd' }}>IA de contenido</span>
                            </div>
                            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px', lineHeight: 1.5 }}>Rellena huecos del calendario con ideas generadas por IA.</p>
                            <button onClick={() => alert('Próximamente: IA sugerirá huecos estratégicos.')}
                                style={{ width: '100%', background: '#7c3aed', border: 'none', borderRadius: 8, padding: '7px 0', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                Sugerir ideas
                            </button>
                        </div>
                    </div>
                </aside>
            )}

            {/* ── Main ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'margin-right 0.3s', marginRight: isPanelOpen && !isMobile ? 320 : 0 }}>

                {/* Topbar */}
                <header style={{ height: 52, flexShrink: 0, background: '#13131a', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
                    {/* Nav controls */}
                    <button onClick={goToday} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                        Hoy
                    </button>
                    <button onClick={navPrev} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: 4 }}><ChevronLeft size={18} /></button>
                    <button onClick={navNext} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: 4 }}><ChevronRight size={18} /></button>
                    <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', margin: 0, flexShrink: 0, textTransform: 'capitalize', minWidth: 140 }}>
                        {getMainTitle()}
                    </h2>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* View tabs */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, gap: 2 }}>
                        {[{ id: 'day', label: 'Día' }, { id: 'week', label: 'Semana' }, { id: 'month', label: 'Mes' }].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setViewMode(v.id)}
                                style={{ background: viewMode === v.id ? '#7c3aed' : 'transparent', color: viewMode === v.id ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', borderRadius: 7, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                        <input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 8, padding: '5px 10px 5px 26px', fontSize: '0.78rem', outline: 'none', width: 150 }}
                        />
                    </div>

                    {/* Actions */}
                    <button onClick={handleExport}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '5px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Share2 size={13} /> Exportar
                    </button>
                    <button
                        onClick={() => openNewEvent(toDateStr(currentDate))}
                        style={{ background: '#7c3aed', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <Plus size={14} /> Nuevo
                    </button>
                </header>

                {/* Calendar body */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {loading || loadingSmartPlan ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#555' }}>
                            {loadingSmartPlan ? (
                                <>
                                    <div className="spinner-mini" style={{ width: 36, height: 36 }} />
                                    <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '1rem' }}>IA analizando mejor momento...</div>
                                    <div style={{ fontSize: '0.82rem', color: '#555' }}>Revisando tu estrategia e historial para el hueco perfecto.</div>
                                </>
                            ) : (
                                <div style={{ fontSize: '0.9rem' }}>Sincronizando calendario...</div>
                            )}
                        </div>
                    ) : isMobile ? (
                        <div className="cal-mobile-v2" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {viewMode === 'month' && <div className="mobile-month-section">{renderMobileMonthGrid()}</div>}
                            <div className="mobile-agenda-section">
                                <div className="agenda-day-header">
                                    {viewMode === 'week' ? 'Vista Semanal'
                                        : selectedDate ? new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(selectedDate + 'T00:00:00'))
                                        : 'Selecciona un día'}
                                </div>
                                {renderMobileAgenda()}
                            </div>
                            <button className="mobile-fab" onClick={() => handleDayClick(selectedDate || todayStr())}><Plus size={28} /></button>
                        </div>
                    ) : viewMode === 'week' ? renderWeekView()
                      : viewMode === 'month' ? (
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {renderMonthView()}
                        </div>
                      ) : renderDayView()
                    }
                </div>
            </div>

            {/* ── Detail Panel ── */}
            {isPanelOpen && (
                <aside style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
                    background: '#111116', borderLeft: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', flexDirection: 'column', zIndex: 100,
                    boxShadow: '-8px 0 30px rgba(0,0,0,0.4)',
                    animation: 'slideInPanel 0.25s cubic-bezier(0.16,1,0.3,1)',
                }}>
                    {/* Panel header */}
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <button onClick={handleClosePanel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', padding: 2 }}><X size={18} /></button>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={() => setSheetItem({ id: selectedEvent?.id, titulo: tempTitle, platform: tempPlatform, status: tempStatus, script_full_text: tempNotes, content: { titulo_angulo: tempTitle, hook: '', cta: '' } })}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 7, color: '#a78bfa', padding: '4px 9px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                    <Edit3 size={12} /> Editor completo
                                </button>
                                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', padding: 2 }} title="Compartir"><Share2 size={15} /></button>
                                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', padding: 2 }} title="Opciones"><MoreVertical size={15} /></button>
                            </div>
                        </div>
                        <textarea
                            placeholder="Título de la publicación..."
                            value={tempTitle}
                            onChange={e => { setTempTitle(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                            onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '1.4rem', fontWeight: 800, resize: 'none', overflow: 'hidden', minHeight: 36, lineHeight: 1.3, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Panel body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                        {/* Open full editor link */}
                        {selectedEvent && (
                            <button onClick={() => router.push(`/dashboard/idea/${linkedScript?.id || selectedEvent?.reference_id || selectedEvent?.id}`)}
                                style={{ width: '100%', marginBottom: 16, background: 'rgba(124,58,237,0.1)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', gap: 7 }}>
                                <Edit3 size={14} /> Abrir editor completo
                            </button>
                        )}

                        {/* Properties */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }}>
                            {[
                                {
                                    icon: <Globe size={13} />, label: 'Plataforma',
                                    input: <select value={tempPlatform} onChange={e => setTempPlatform(e.target.value)} style={propSelectStyle}>
                                        <option value="General">General</option>
                                        <option value="TikTok">TikTok</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="LinkedIn">LinkedIn</option>
                                    </select>
                                },
                                {
                                    icon: <CalendarIcon size={13} />, label: 'Fecha',
                                    input: <input type="date" value={selectedDate || ''} onChange={e => setSelectedDate(e.target.value)} style={propInputStyle} />
                                },
                                {
                                    icon: <CheckCircle2 size={13} />, label: 'Estado',
                                    input: <select value={tempStatus} onChange={e => setTempStatus(e.target.value)} style={propSelectStyle}>
                                        <option value="idea">Idea</option>
                                        <option value="prep">En preparación</option>
                                        <option value="rec">En grabación</option>
                                        <option value="pub">Publicado</option>
                                    </select>
                                },
                                {
                                    icon: <Clock size={13} />, label: 'Horario',
                                    input: <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input type="time" value={tempStartTime} onChange={e => setTempStartTime(e.target.value)} style={{ ...propInputStyle, width: 90 }} />
                                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>–</span>
                                        <input type="time" value={tempEndTime} onChange={e => setTempEndTime(e.target.value)} style={{ ...propInputStyle, width: 90 }} />
                                    </div>
                                },
                            ].map(({ icon, label, input }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 100, color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', flexShrink: 0 }}>
                                        {icon} {label}
                                    </div>
                                    <div style={{ flex: 1 }}>{input}</div>
                                </div>
                            ))}

                            {/* Color picker */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 100, color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', flexShrink: 0 }}>
                                    <Palette size={13} /> Color
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {THEME_COLORS.map(color => (
                                        <div key={color.id} onClick={async () => {
                                            setTempColor(color.id);
                                            if (selectedEvent?.id) {
                                                if (selectedEvent.is_slot) await supabase.from('content_slots').update({ slot_color: color.id }).eq('id', selectedEvent.id);
                                                else await supabase.from('calendar_events').update({ color: color.id }).eq('id', selectedEvent.id);
                                                setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, color: color.id } : ev));
                                            }
                                        }}
                                            style={{ width: 18, height: 18, borderRadius: '50%', background: color.hex, cursor: 'pointer', boxSizing: 'border-box', border: tempColor === color.id ? '2px solid #fff' : '2px solid transparent', transition: 'border 0.15s, transform 0.15s', transform: tempColor === color.id ? 'scale(1.2)' : 'scale(1)' }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <textarea
                            placeholder="Notas, objetivos o guion..."
                            value={tempNotes}
                            onChange={e => setTempNotes(e.target.value)}
                            style={{ width: '100%', minHeight: 100, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#ccc', borderRadius: 10, padding: '12px', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 16 }}
                        />

                        {/* Linked script preview */}
                        {loadingScript ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: '0.82rem' }}>
                                <div className="spinner-mini" style={{ margin: '0 auto 8px' }} />Cargando guion...
                            </div>
                        ) : linkedScript ? (
                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 12 }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <BookOpen size={14} color="#7c3aed" />
                                    <span style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c4b5fd' }}>Guion Vinculado</span>
                                </div>
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <ScriptBlock label="GANCHO" value={linkedScript.content?.hook || linkedScript.content?.gancho || linkedScript.gancho || ''} onChange={v => { const nc = { ...(linkedScript.content||{}) }; nc.gancho = v; nc.hook = v; setLinkedScript({ ...linkedScript, content: nc }); }} />
                                    {(() => {
                                        const des = linkedScript.content?.desarrollo || linkedScript.desarrollo || linkedScript.content?.puntos || linkedScript.puntos;
                                        const arr = Array.isArray(des) ? des : (typeof des === 'string' ? des.split('\n').filter(Boolean) : ['']);
                                        const final = arr.length > 0 ? arr : [''];
                                        return (
                                            <div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>DESARROLLO</div>
                                                {final.map((p, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                                        <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: '0.85rem', marginTop: 10 }}>{i+1}.</span>
                                                        <textarea value={String(p).replace(/^\d+\.\s*/,'')} onChange={e => { const nd = [...final]; nd[i] = e.target.value; const nc = { ...(linkedScript.content||{}) }; nc.desarrollo = nd; setLinkedScript({ ...linkedScript, content: nc }); }}
                                                            style={{ flex: 1, minHeight: 70, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#ccc', borderRadius: 8, padding: 10, fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                                                            placeholder={`Punto ${i+1}...`} />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                    <ScriptBlock label="CTA" value={linkedScript.content?.cta || linkedScript.content?.cierre || linkedScript.cta || ''} onChange={v => { const nc = { ...(linkedScript.content||{}) }; nc.cierre = v; nc.cta = v; setLinkedScript({ ...linkedScript, content: nc }); }} />
                                    {(() => {
                                        const copy = linkedScript.content?.copy_post || linkedScript.copy_post;
                                        if (!copy) return null;
                                        const headline = copy.titulo || copy.headline || '';
                                        const caption  = copy.descripcion_larga || copy.body || copy.caption || copy.texto || '';
                                        const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags : [];
                                        return (
                                            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>COPY DEL POST</div>
                                                <input type="text" value={headline} onChange={e => { const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.titulo = e.target.value; nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); }}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#ccc', borderRadius: 7, padding: '8px 10px', fontSize: '0.8rem', outline: 'none', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
                                                    placeholder="Título del post..." />
                                                <textarea value={caption} onChange={e => { const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.descripcion_larga = e.target.value; nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); }}
                                                    style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#ccc', borderRadius: 7, padding: '8px 10px', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', fontStyle: 'italic', boxSizing: 'border-box', marginBottom: 8 }}
                                                    placeholder="Caption..." />
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                                                    {hashtags.map((tag, idx) => (
                                                        <span key={idx} onClick={() => { const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.hashtags = hashtags.filter((_,i)=>i!==idx); nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); }}
                                                            style={{ color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(124,58,237,0.12)', padding: '2px 7px', borderRadius: 4, cursor: 'pointer' }}>#{tag}</span>
                                                    ))}
                                                </div>
                                                <input type="text" placeholder="Añadir hashtags (separados por coma)..."
                                                    onKeyDown={e => { if (e.key === 'Enter') { const tags = e.target.value.split(',').map(t => t.trim().replace('#','')).filter(Boolean); const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.hashtags = [...new Set([...hashtags, ...tags])]; nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); e.target.value = ''; } }}
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#ccc', borderRadius: 7, padding: '7px 10px', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
                                            </div>
                                        );
                                    })()}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <button onClick={() => { const hook = linkedScript.content?.hook || linkedScript.content?.gancho || ''; const des = (Array.isArray(linkedScript.content?.desarrollo) ? linkedScript.content.desarrollo : (Array.isArray(linkedScript.desarrollo) ? linkedScript.desarrollo : [])).join('\n'); const cta = linkedScript.content?.cta || linkedScript.content?.cierre || ''; navigator.clipboard.writeText(`GANCHO:\n${hook}\n\nDESARROLLO:\n${des}\n\nCTA:\n${cta}`); alert('Guion completo copiado ✓'); }}
                                            style={btnSecondarySmall}><Copy size={11} /> Copiar guion</button>
                                        <button onClick={() => { const copy = linkedScript.content?.copy_post || linkedScript.copy_post; const title = copy?.titulo || ''; const cap = copy?.descripcion_larga || copy?.body || ''; const tags = (copy?.hashtags||[]).map(t=>t.startsWith('#')?t:`#${t}`).join(' '); navigator.clipboard.writeText(`${title}\n\n${cap}\n\n${tags}`); alert('Copy de publicación copiado ✓'); }}
                                            style={btnSecondarySmall}><Share2 size={11} /> Copiar copy</button>
                                    </div>
                                    <button onClick={() => router.push(`/dashboard/idea/${linkedScript?.id || selectedEvent?.reference_id || selectedEvent?.id}`)}
                                        style={{ width: '100%', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 9, padding: '9px 0', color: '#c4b5fd', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Edit3 size={13} /> Abrir Editor Completo
                                    </button>
                                </div>
                            </div>
                        ) : selectedEvent && (
                            <div style={{ padding: 18, background: 'rgba(124,58,237,0.06)', borderRadius: 14, border: '1px solid rgba(124,58,237,0.12)', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', marginBottom: 8 }}>
                                    <Sparkles size={15} />
                                    <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>Potencia con IA</span>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
                                    {selectedEvent.has_script ? 'Este contenido ya tiene un guion generado.' : 'Convierte esta idea en un guion estructurado en un clic.'}
                                </p>
                                <button onClick={handleCreateScript}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', border: 'none', borderRadius: 9, height: 40, color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                    {selectedEvent.has_script ? 'Ver Guion Completo' : 'Crear Guion con IA'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Panel footer */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
                        {selectedEvent && (
                            <button onClick={() => handleDeleteEvent(selectedEvent.id)}
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 9, padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button onClick={handleSavePanel}
                            style={{ flex: 1, background: '#7c3aed', border: 'none', color: '#fff', borderRadius: 9, padding: '10px 0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                            <Save size={15} /> {selectedEvent ? 'Guardar cambios' : 'Crear evento'}
                        </button>
                    </div>
                </aside>
            )}

            {/* ── Context Menu ── */}
            {contextMenu && (
                <div onClick={e => e.stopPropagation()}
                    style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 0', zIndex: 3000, minWidth: 160, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                    {selectedEvents.size > 1 ? (
                        <>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '6px 14px', letterSpacing: '0.07em' }}>{selectedEvents.size} seleccionados</div>
                            <CtxItem icon={<Trash2 size={14} />} label="Eliminar seleccionados" danger onClick={handleDeleteSelected} />
                        </>
                    ) : (
                        <>
                            <CtxItem icon={<Edit3 size={14} />} label="Editar" onClick={() => { const ev = events.find(e => e.id === contextMenu.eventId); if (ev) handleEventClick({ stopPropagation: ()=>{} }, ev); setContextMenu(null); }} />
                            <CtxItem icon={<Copy size={14} />} label="Duplicar" onClick={() => handleDuplicateEvent(contextMenu.eventId)} />
                            <CtxItem icon={<ArrowRightLeft size={14} />} label="Mover fecha" onClick={() => handleMoveDate(contextMenu.eventId)} />
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                            <CtxItem icon={<Trash2 size={14} />} label="Eliminar" danger onClick={() => handleDeleteEvent(contextMenu.eventId)} />
                        </>
                    )}
                </div>
            )}

            {/* ── Bulk action bar ── */}
            {selectedEvents.size > 0 && (
                <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1a1a22', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 50px rgba(0,0,0,0.5)', borderRadius: 50, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 18, zIndex: 2000, animation: 'slideUpBar 0.3s cubic-bezier(0.18,0.89,0.32,1.28)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{selectedEvents.size} seleccionado{selectedEvents.size !== 1 ? 's' : ''}</span>
                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
                    <select value={bulkStatusChange} onChange={e => handleBulkStatusChange(e.target.value)}
                        style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '5px 10px', fontSize: '0.8rem', borderRadius: 8, outline: 'none' }}>
                        <option value="">Cambiar estado...</option>
                        <option value="idea">Idea</option>
                        <option value="prep">En preparación</option>
                        <option value="rec">En grabación</option>
                        <option value="pub">Publicado</option>
                    </select>
                    <button onClick={handleDeleteSelected}
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: 8, padding: '5px 11px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Trash2 size={14} /> Eliminar
                    </button>
                    <button onClick={() => setSelectedEvents(new Set())}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* ── Delete confirm modal ── */}
            {showDeleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}>
                    <div style={{ background: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, maxWidth: 380, width: '90%', textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                            <Trash2 size={28} />
                        </div>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: 10 }}>Eliminar eventos</h2>
                        <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 28, fontSize: '0.88rem', lineHeight: 1.6 }}>
                            Estás a punto de eliminar <strong>{selectedEvents.size}</strong> eventos de forma permanente. Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setShowDeleteConfirm(false)}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', borderRadius: 10, padding: '10px 0', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={confirmDeleteSelected}
                                style={{ flex: 1, background: '#ef4444', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                Eliminar definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SheetEditor ── */}
            {sheetItem && (
                <SheetEditor
                    sheetId={sheetItem.id || 'new'}
                    item={sheetItem}
                    onClose={() => { setSheetItem(null); loadData(); }}
                    onSave={() => { setSheetItem(null); loadData(); }}
                    userId={null}
                    activeProjectId={activeProject?.id}
                />
            )}

            {/* ── Global styles ── */}
            <style jsx>{`
                * { box-sizing: border-box; }
                .week-scroll::-webkit-scrollbar { width: 6px; }
                .week-scroll::-webkit-scrollbar-track { background: transparent; }
                .week-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
                .week-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

                @keyframes slideInPanel {
                    from { opacity: 0; transform: translateX(20px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideUpBar {
                    from { transform: translate(-50%, 40px); opacity: 0; }
                    to   { transform: translate(-50%, 0);   opacity: 1; }
                }

                /* Mobile styles preserved */
                .cal-mobile-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 8px; background: #111116; border-radius: 12px; margin-bottom: 12px; }
                .cal-mobile-day-header { text-align: center; font-size: 0.6rem; font-weight: 700; color: rgba(255,255,255,0.3); padding: 6px 0; text-transform: uppercase; }
                .cal-mobile-day { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 38px; padding-top: 4px; border-radius: 8px; position: relative; cursor: pointer; transition: background 0.15s; }
                .cal-mobile-day:hover { background: rgba(255,255,255,0.03); }
                .cal-mobile-day.selected .day-num-circle { background: #7c3aed; color: white; }
                .cal-mobile-day.today .day-num-circle { border: 2px solid #7c3aed; color: #c4b5fd; }
                .day-num-circle { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.7); }
                .event-dot { width: 5px; height: 5px; border-radius: 50%; }
                .cal-mobile-v2 { display: flex; flex-direction: column; height: 100%; }
                .mobile-month-section { padding: 10px 10px 0; }
                .mobile-agenda-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .agenda-day-header { padding: 10px 16px 6px; font-size: 0.75rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: capitalize; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .mobile-fab { position: fixed; bottom: 28px; right: 20px; width: 54px; height: 54px; border-radius: 50%; background: #7c3aed; border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 24px rgba(124,58,237,0.45); z-index: 500; }
            `}</style>
        </div>
    );
}

// ─── Small helper components ──────────────────────────────────────────────────
function ScriptBlock({ label, value, onChange }) {
    return (
        <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
            <textarea value={value} onChange={e => onChange(e.target.value)}
                style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#ccc', borderRadius: 8, padding: 10, fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                placeholder={`Escribe el ${label.toLowerCase()}...`} />
        </div>
    );
}

function CtxItem({ icon, label, danger, onClick }) {
    return (
        <div onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 14px', fontSize: '0.8rem', color: danger ? '#ef4444' : 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'background 0.15s', userSelect: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {icon} {label}
        </div>
    );
}

// ─── Shared inline style objects ─────────────────────────────────────────────
const propInputStyle = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    color: '#ddd', borderRadius: 7, padding: '5px 9px', fontSize: '0.78rem', outline: 'none',
    fontFamily: 'Inter, sans-serif', width: '100%',
};
const propSelectStyle = {
    ...propInputStyle, cursor: 'pointer',
};
const btnSecondarySmall = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '7px 0', fontSize: '0.72rem',
    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
};

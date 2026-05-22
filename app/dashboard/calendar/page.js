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
    const [viewMode, setViewMode]         = useState('month'); // 'week' | 'month' | 'day'
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
    const [toastMsg,  setToastMsg]      = useState('');

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

    const { activeProject, projectVersion } = useProject();

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    useEffect(() => {
        loadData();
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [currentDate, projectVersion]);

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
            setLoadingScript(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Try direct library match by reference_id
                if (selectedEvent.reference_id) {
                    const { data: libById } = await supabase.from('library').select('*').eq('id', selectedEvent.reference_id).single();
                    if (libById) { setLinkedScript(libById); return; }
                }

                // 2. Try by title match (reference_id = content_slot.id, not library.id)
                if (selectedEvent.title) {
                    const { data: byTitle } = await supabase.from('library')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('type', 'guion')
                        .eq('titulo', selectedEvent.title)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (byTitle?.length) { setLinkedScript(byTitle[0]); return; }

                    // 3. Partial title match (ilike)
                    const { data: byIlike } = await supabase.from('library')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('type', 'guion')
                        .ilike('titulo', `%${selectedEvent.title.slice(0, 30)}%`)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (byIlike?.length) { setLinkedScript(byIlike[0]); return; }
                }

                // 4. Fallback: content_slot script_data
                const { data: slotData } = await supabase.from('content_slots').select('*')
                    .eq('id', selectedEvent.reference_id || selectedEvent.id).single();
                if (slotData?.script_data) {
                    const sd = slotData.script_data;
                    setLinkedScript({
                        id: null,
                        titulo: slotData.idea_title || selectedEvent.title,
                        content: {
                            hook: sd.hook || '',
                            gancho: sd.hook || '',
                            desarrollo: Array.isArray(sd.desarrollo) ? sd.desarrollo : [],
                            cta: sd.cta || '',
                            copy_post: sd.copy_post || null,
                        },
                        script_full_text: slotData.script_full_text || '',
                    });
                } else {
                    setLinkedScript(null);
                }
            } catch (err) { console.error('Error loading linked script:', err); setLinkedScript(null); }
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

            // Solo calendar_events — los slots del Matrix siempre tienen un calendar_event asociado
            const { data: eventData } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', user.id)
                .gte('event_date', firstDay)
                .lte('event_date', lastDay)
                .order('event_date', { ascending: true });

            setEvents(eventData || []);
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
        setToastMsg('Guardando…');
        try {
            const { data: { user }, error: authErr } = await supabase.auth.getUser();
            if (authErr || !user) throw new Error('Sin sesión — recarga la página');

            const colorValue = tempColor || 'purple';

            if (selectedEvent?.id) {
                const { error } = await supabase.from('calendar_events')
                    .update({ title: tempTitle || 'Sin título', status: tempStatus, platform: tempPlatform, notes: tempNotes, event_date: selectedDate, color: colorValue, start_time: tempStartTime, end_time: tempEndTime })
                    .eq('id', selectedEvent.id);
                if (error) throw new Error('Error guardando: ' + error.message);
            } else {
                if (!selectedDate) throw new Error('Selecciona una fecha primero');
                const { error } = await supabase.from('calendar_events').insert({
                    user_id: user.id, title: tempTitle || 'Sin título',
                    status: tempStatus, platform: tempPlatform, notes: tempNotes,
                    event_date: selectedDate, type: 'idea', color: colorValue,
                    start_time: tempStartTime, end_time: tempEndTime,
                });
                if (error) throw new Error('Crear evento: ' + error.message);
            }

            // Guardar guion (hook/desarrollo/cta) en library si hay contenido
            if (linkedScript?.content) {
                const lc = linkedScript.content;
                const hasContent = lc.hook || lc.gancho || (lc.desarrollo?.length) || lc.cta;
                if (hasContent) {
                    const scriptPayload = {
                        content: { hook: lc.hook || lc.gancho || '', gancho: lc.gancho || lc.hook || '', desarrollo: lc.desarrollo || [], cta: lc.cta || lc.cierre || '', copy_post: lc.copy_post || null },
                        script_full_text: lc.full_text || `HOOK:\n${lc.hook||''}\n\nDESARROLLO:\n${(lc.desarrollo||[]).join('\n')}\n\nCTA:\n${lc.cta||''}`,
                        titulo: tempTitle || 'Sin título',
                        platform: tempPlatform || 'General',
                        type: 'guion',
                    };
                    if (linkedScript.id) {
                        await supabase.from('library').update(scriptPayload).eq('id', linkedScript.id);
                    } else {
                        const { data: ins } = await supabase.from('library')
                            .insert({ ...scriptPayload, user_id: user.id, goal: 'engagement' })
                            .select().single();
                        if (ins) {
                            setLinkedScript({ ...linkedScript, id: ins.id });
                            // Link calendar event → library item by real ID
                            await supabase.from('calendar_events')
                                .update({ reference_id: ins.id })
                                .eq('id', selectedEvent.id);
                        }
                    }
                }
            }

            setToastMsg('✓ Guardado');
            setTimeout(() => { setToastMsg(''); setIsPanelOpen(false); loadData(); }, 1200);
        } catch (err) {
            console.error('[Calendar save]', err.message);
            setToastMsg('❌ ' + err.message);
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
    // Events from Matrix (is_slot) always get 09:00-10:00 default → show them
    // in an "all-day" strip above the hour grid instead of stacking at 9am.
    const isAllDay = (ev) => ev.is_slot === true;

    const renderWeekView = () => {
        const weekStart = getWeekStart(currentDate);
        const weekDays  = getWeekDays(weekStart);
        const hours     = Array.from({ length: 24 }, (_, i) => i);
        const HOUR_H    = 60;
        const now       = new Date();
        const todayS    = todayStr();
        const nowMin    = now.getHours() * 60 + now.getMinutes();

        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#13131a', flexShrink: 0 }}>
                    <div style={{ width: 52 }} />
                    {weekDays.map((day, i) => {
                        const ds  = toDateStr(day);
                        const isT = ds === todayS;
                        return (
                            <div key={ds} style={{ textAlign: 'center', padding: '10px 4px', cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.05)' }} onClick={() => openNewEvent(ds)}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isT ? '#7c3aed' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{DAY_HEADERS_SHORT[i]}</div>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: isT ? '#7c3aed' : 'transparent', color: isT ? '#fff' : 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 700, fontSize: '0.9rem' }}>{day.getDate()}</div>
                            </div>
                        );
                    })}
                </div>

                {/* All-day strip for Matrix slots */}
                <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, paddingBottom: 4 }}>
                        <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.18)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Todo el día</span>
                    </div>
                    {weekDays.map((day) => {
                        const ds  = toDateStr(day);
                        const evs = eventsForDate(ds).filter(isAllDay);
                        return (
                            <div key={ds} style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', padding: '3px 3px', display: 'flex', flexDirection: 'column', gap: 2, minHeight: evs.length ? 'auto' : 24 }}>
                                {evs.slice(0, 3).map(ev => {
                                    const c = colorOf(ev.color || 'purple');
                                    return (
                                        <div key={ev.id} onClick={e => handleEventClick(e, ev)}
                                            style={{ background: c.bg, borderLeft: `2px solid ${c.solid}`, borderRadius: 3, padding: '1px 4px', fontSize: '0.63rem', fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', lineHeight: '15px' }}>
                                            {ev.title}
                                        </div>
                                    );
                                })}
                                {evs.length > 3 && <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', paddingLeft: 3, lineHeight: '13px' }}>+{evs.length - 3} más</div>}
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable hour grid — only non-slot timed events */}
                <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }} className="week-scroll">
                    <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>
                        <div style={{ gridColumn: 1, gridRow: '1 / span 24' }}>
                            {hours.map(h => (
                                <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2, boxSizing: 'border-box' }}>
                                    {h > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{String(h).padStart(2,'0')}:00</span>}
                                </div>
                            ))}
                        </div>
                        {weekDays.map((day, colIdx) => {
                            const ds      = toDateStr(day);
                            const isT     = ds === todayS;
                            const timedEvs = eventsForDate(ds).filter(e => !isAllDay(e));
                            return (
                                <div key={ds} style={{ gridColumn: colIdx + 2, position: 'relative', background: isT ? 'rgba(124,58,237,0.03)' : 'transparent', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                    {hours.map(h => (
                                        <div key={h} style={{ height: HOUR_H, borderTop: '1px solid rgba(255,255,255,0.04)', boxSizing: 'border-box', cursor: 'pointer' }}
                                            onClick={() => openNewEvent(ds, h)} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, ds)} />
                                    ))}
                                    {isT && (
                                        <div style={{ position: 'absolute', top: (nowMin / 60) * HOUR_H, left: 0, right: 0, height: 2, background: '#7c3aed', zIndex: 10, pointerEvents: 'none' }}>
                                            <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#7c3aed' }} />
                                        </div>
                                    )}
                                    {timedEvs.map((ev, evIdx) => {
                                        const [sh, sm] = (ev.start_time || '09:00').split(':').map(Number);
                                        const [eh, em] = (ev.end_time   || '10:00').split(':').map(Number);
                                        const topPx    = (sh * 60 + sm) / 60 * HOUR_H;
                                        const durMin   = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
                                        const heightPx = durMin / 60 * HOUR_H;
                                        const c        = colorOf(ev.color || 'purple');
                                        const platColors = { TikTok: '#ff0050', Instagram: '#e1306c', YouTube: '#ff0000', LinkedIn: '#0a66c2' };
                                        const platColor  = platColors[ev.platform] || c.solid;
                                        const overlap    = timedEvs.filter((o, oi) => {
                                            if (oi === evIdx) return false;
                                            const [os, osm] = (o.start_time || '09:00').split(':').map(Number);
                                            const [oe, oem] = (o.end_time   || '10:00').split(':').map(Number);
                                            return (os * 60 + osm) < (eh * 60 + em) && (oe * 60 + oem) > (sh * 60 + sm);
                                        });
                                        const colTotal  = overlap.length + 1;
                                        const colPos    = overlap.filter((o) => timedEvs.indexOf(o) < evIdx).length;
                                        const colW      = 100 / colTotal;
                                        return (
                                            <div key={ev.id}
                                                draggable={!isDragging}
                                                onDragStart={e => onDragStart(e, ev.id)}
                                                onMouseDown={e => { e.stopPropagation(); handleEventMouseDown(e, ev.id); }}
                                                onMouseEnter={() => handleEventMouseEnter(ev.id)}
                                                onClick={e => handleEventClick(e, ev)}
                                                onContextMenu={e => handleContextMenu(e, ev.id)}
                                                style={{ position: 'absolute', top: topPx + 2, left: `${colW * colPos + 0.5}%`, width: `${colW - 1}%`, height: Math.max(heightPx - 4, 20), background: c.bg, borderLeft: `3px solid ${platColor}`, borderRadius: 5, padding: '2px 5px', cursor: 'pointer', zIndex: 5 + evIdx, overflow: 'hidden', boxShadow: selectedEvents.has(ev.id) ? `0 0 0 2px ${c.solid}` : 'none', userSelect: 'none', boxSizing: 'border-box' }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', lineHeight: 1.3 }}>{ev.title}</span>
                                                {heightPx > 36 && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{(ev.start_time || '09:00').slice(0,5)}</span>}
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
            cells.push(<div key={`pad-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', minHeight: 70 }} />);
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
                    style={{ borderTop: `1px solid ${isT ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}`, minHeight: 80, padding: '5px 6px 6px', cursor: 'pointer', position: 'relative', transition: 'background 0.12s', background: isT ? 'rgba(124,58,237,0.04)' : 'transparent' }}
                    onClick={() => handleDayClick(ds)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, ds)}
                    onMouseEnter={e => { if (!isT) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={e => { if (!isT) e.currentTarget.style.background = 'transparent'; }}
                >
                    {/* Day number */}
                    <div style={{ marginBottom: 3, textAlign: 'right' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%',
                            background: isT ? '#7c3aed' : 'transparent',
                            color: isT ? '#fff' : dayEvs.length > 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
                            fontSize: '0.75rem', fontWeight: isT ? 700 : dayEvs.length > 0 ? 500 : 400,
                        }}>{d}</span>
                    </div>
                    {/* Event pills — Google Calendar style: dot + text, no bg fill */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {dayEvs.slice(0, MAX_VISIBLE).map(ev => {
                            const c = colorOf(ev.color || 'purple');
                            const platColors = { TikTok: '#ff0050', Instagram: '#e1306c', YouTube: '#ff0000', LinkedIn: '#0a66c2' };
                            const dotColor = platColors[ev.platform] || c.solid;
                            const isSel = selectedEvents.has(ev.id);
                            return (
                                <div
                                    key={ev.id}
                                    draggable
                                    onDragStart={e => { e.stopPropagation(); onDragStart(e, ev.id); }}
                                    onClick={e => { e.stopPropagation(); handleEventClick(e, ev); }}
                                    onContextMenu={e => handleContextMenu(e, ev.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        height: 17, overflow: 'hidden', cursor: 'pointer',
                                        borderRadius: 4, padding: '0 5px',
                                        background: isSel ? `${dotColor}30` : `${dotColor}18`,
                                        border: `1px solid ${dotColor}35`,
                                    }}
                                >
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.63rem', fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>
                                        {ev.title}
                                    </span>
                                </div>
                            );
                        })}
                        {overflow > 0 && (
                            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', paddingLeft: 3, lineHeight: '14px', fontWeight: 600 }}>+{overflow} más</div>
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
        const ds       = toDateStr(currentDate);
        const hours    = Array.from({ length: 24 }, (_, i) => i);
        const HOUR_H   = 60;
        const now      = new Date();
        const isT      = ds === todayStr();
        const allEvs   = eventsForDate(ds);
        const allDayEv = allEvs.filter(isAllDay);
        const timedEv  = allEvs.filter(e => !isAllDay(e));
        const nowMin   = now.getHours() * 60 + now.getMinutes();

        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {allDayEv.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                            <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.18)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Todo el día</span>
                        </div>
                        <div style={{ padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                            {allDayEv.map(ev => {
                                const c = colorOf(ev.color || 'purple');
                                return (
                                    <div key={ev.id} onClick={e => handleEventClick(e, ev)}
                                        style={{ background: c.bg, borderLeft: `3px solid ${c.solid}`, borderRadius: 5, padding: '5px 10px', fontSize: '0.82rem', fontWeight: 600, color: c.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {ev.title}
                                        {ev.platform && ev.platform !== 'General' && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{ev.platform}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                            <div style={{ position: 'absolute', top: (nowMin / 60) * HOUR_H, left: 0, right: 0, height: 2, background: '#7c3aed', zIndex: 10 }}>
                                <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#7c3aed' }} />
                            </div>
                        )}
                        {timedEv.map(ev => {
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'margin-right 0.3s', marginRight: isPanelOpen && !isMobile ? 440 : 0 }}>

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
                    <button
                        onClick={() => { setIsSelectMode(m => !m); if (isSelectMode) setSelectedEvents(new Set()); }}
                        style={{ background: isSelectMode ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSelectMode ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.12)'}`, color: isSelectMode ? '#c4b5fd' : 'rgba(255,255,255,0.65)', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, transition: 'all 0.2s' }}>
                        <CheckCircle2 size={13} /> {isSelectMode ? 'Cancelar selección' : '☑ Seleccionar varios'}
                    </button>
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
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: isMobile ? '100%' : 440,
                    background: '#0f0f13', borderLeft: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', zIndex: 100,
                    boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
                    animation: 'slideInPanel 0.25s cubic-bezier(0.16,1,0.3,1)',
                    overflowY: 'auto',
                }}>
                    {/* Panel header */}
                    <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <button onClick={handleClosePanel} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                                <X size={14} /> Cerrar
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={() => {
                                        const libId = linkedScript?.id || (selectedEvent?.has_script ? selectedEvent?.reference_id : null);
                                        const lc = linkedScript?.content || {};
                                        setSheetItem({
                                            id: libId || 'new',
                                            titulo: tempTitle,
                                            platform: tempPlatform,
                                            status: tempStatus,
                                            script_full_text: lc.script_full_text || tempNotes || lc.full_text || '',
                                            content: {
                                                titulo_angulo: tempTitle,
                                                hook: lc.hook || lc.gancho || '',
                                                gancho: lc.gancho || lc.hook || '',
                                                desarrollo: lc.desarrollo || [],
                                                cta: lc.cta || lc.cierre || '',
                                                copy_post: lc.copy_post || null,
                                                full_text: lc.full_text || '',
                                            }
                                        });
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 7, color: '#a78bfa', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                    <Edit3 size={12} /> Editor completo
                                </button>
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
                    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

                        {/* Properties grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 18 }}>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Globe size={11} /> Plataforma
                                </div>
                                <select value={tempPlatform} onChange={e => setTempPlatform(e.target.value)} style={propSelectStyle}>
                                    <option value="General">General</option>
                                    <option value="TikTok">TikTok</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                </select>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={11} /> Estado
                                </div>
                                <select value={tempStatus} onChange={e => setTempStatus(e.target.value)} style={propSelectStyle}>
                                    <option value="idea">💡 Idea</option>
                                    <option value="prep">🔧 En preparación</option>
                                    <option value="rec">🎬 En grabación</option>
                                    <option value="pub">🚀 Publicado</option>
                                </select>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CalendarIcon size={11} /> Fecha
                                </div>
                                <input type="date" value={selectedDate || ''} onChange={e => setSelectedDate(e.target.value)} style={propInputStyle} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={11} /> Horario
                                </div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                    <input type="time" value={tempStartTime} onChange={e => setTempStartTime(e.target.value)} style={{ ...propInputStyle, flex: 1 }} />
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>→</span>
                                    <input type="time" value={tempEndTime} onChange={e => setTempEndTime(e.target.value)} style={{ ...propInputStyle, flex: 1 }} />
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Palette size={11} /> Color
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {THEME_COLORS.map(color => (
                                        <button key={color.id} onClick={async () => {
                                            setTempColor(color.id);
                                            if (selectedEvent?.id) {
                                                await supabase.from('calendar_events').update({ color: color.id }).eq('id', selectedEvent.id);
                                                setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, color: color.id } : ev));
                                            }
                                        }}
                                            title={color.name}
                                            style={{ width: 28, height: 28, borderRadius: '50%', background: color.hex, cursor: 'pointer', border: tempColor === color.id ? '3px solid #fff' : '3px solid transparent', transition: 'all 0.15s', transform: tempColor === color.id ? 'scale(1.2)' : 'scale(1)', boxShadow: tempColor === color.id ? `0 0 8px ${color.hex}` : 'none', outline: 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Notas — expandido */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 18 }}>
                            <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <BookOpen size={14} color="rgba(255,255,255,0.3)" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Notas</span>
                                </div>
                                {selectedEvent && (
                                    <button onClick={() => router.push(`/dashboard/idea/${linkedScript?.id || selectedEvent?.reference_id || selectedEvent?.id}`)}
                                        style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Edit3 size={11} /> Editar
                                    </button>
                                )}
                            </div>
                            <textarea
                                placeholder="Escribe aquí ideas, objetivos, referencias o el guion completo..."
                                value={tempNotes}
                                onChange={e => setTempNotes(e.target.value)}
                                style={{ width: '100%', minHeight: 100, background: 'transparent', border: 'none', color: '#ddd', padding: '14px 16px', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.7, boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Crear / Ver guión desde idea */}
                        {selectedEvent && (
                            selectedEvent.has_script && selectedEvent.script_id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '9px', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginTop: '8px', marginBottom: '12px', cursor: 'pointer' }}
                                    onClick={() => { setSheetItem({ id: selectedEvent.script_id, titulo: tempTitle }); }}>
                                    ✓ Guión listo — Ver en editor
                                </div>
                            ) : (
                                <button onClick={() => {
                                    try {
                                        sessionStorage.setItem('from_idea_context', JSON.stringify({
                                            source_idea_id: selectedEvent.id,
                                            source_type: 'calendar',
                                            idea_title: tempTitle || selectedEvent.title || '',
                                            platform: tempPlatform || selectedEvent.platform || 'Reels',
                                            from_idea: true,
                                        }));
                                    } catch(e) {}
                                    router.push('/dashboard?mode=single&from_idea=1');
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '9px', color: '#a78bfa', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop: '8px', marginBottom: '12px' }}>
                                    📝 Crear guión para esta idea
                                </button>
                            )
                        )}

                        {/* Linked script preview */}
                        {loadingScript ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: '0.82rem' }}>
                                <div className="spinner-mini" style={{ margin: '0 auto 8px' }} />Cargando guion...
                            </div>
                        ) : linkedScript ? (
                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
                                <div style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.08), transparent)', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BookOpen size={14} color="#a78bfa" />
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c4b5fd' }}>Guion Vinculado</span>
                                    </div>
                                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>auto-guarda</span>
                                </div>
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <ScriptBlock
                                        label="⚡ Hook"
                                        color="#a78bfa"
                                        value={linkedScript.content?.hook || linkedScript.content?.gancho || linkedScript.gancho || ''}
                                        onChange={v => { const nc = { ...(linkedScript.content||{}) }; nc.gancho = v; nc.hook = v; setLinkedScript({ ...linkedScript, content: nc }); }}
                                    />
                                    <ScriptDesarrollo
                                        linkedScript={linkedScript}
                                        setLinkedScript={setLinkedScript}
                                    />
                                    <ScriptBlock
                                        label="📢 CTA"
                                        color="#34d399"
                                        value={linkedScript.content?.cta || linkedScript.content?.cierre || linkedScript.cta || ''}
                                        onChange={v => { const nc = { ...(linkedScript.content||{}) }; nc.cierre = v; nc.cta = v; setLinkedScript({ ...linkedScript, content: nc }); }}
                                    />
                                    <ScriptCopyPost
                                        linkedScript={linkedScript}
                                        setLinkedScript={setLinkedScript}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                                        <button onClick={() => {
                                            const hook = linkedScript.content?.hook || linkedScript.content?.gancho || '';
                                            const des = (Array.isArray(linkedScript.content?.desarrollo) ? linkedScript.content.desarrollo : (Array.isArray(linkedScript.desarrollo) ? linkedScript.desarrollo : [])).join('\n');
                                            const cta = linkedScript.content?.cta || linkedScript.content?.cierre || '';
                                            navigator.clipboard.writeText(`GANCHO:\n${hook}\n\nDESARROLLO:\n${des}\n\nCTA:\n${cta}`);
                                        }}
                                            style={btnSecondarySmall}><Copy size={11} /> Copiar guion</button>
                                        <button onClick={() => {
                                            const copy = linkedScript.content?.copy_post || linkedScript.copy_post;
                                            const title = copy?.titulo || copy?.headline || '';
                                            const cap = copy?.descripcion_larga || copy?.body || '';
                                            const tags = (copy?.hashtags||[]).map(t=>t.startsWith('#')?t:`#${t}`).join(' ');
                                            navigator.clipboard.writeText(`${title}\n\n${cap}\n\n${tags}`);
                                        }}
                                            style={btnSecondarySmall}><Share2 size={11} /> Copiar copy</button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Panel footer */}
                    <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
                        {selectedEvent && (
                            <button onClick={() => handleDeleteEvent(selectedEvent.id)}
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 9, padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
                                <Trash2 size={14} /> Eliminar
                            </button>
                        )}
                        <button onClick={handleSavePanel}
                            style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: 9, padding: '11px 0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
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
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', borderRadius: 14, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, zIndex: 2000, animation: 'slideUpBar 0.3s cubic-bezier(0.18,0.89,0.32,1.28)', minWidth: 360 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#c4b5fd' }}>{selectedEvents.size}</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>evento{selectedEvents.size !== 1 ? 's' : ''} seleccionado{selectedEvents.size !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                    <select value={bulkStatusChange} onChange={e => handleBulkStatusChange(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '6px 10px', fontSize: '0.78rem', borderRadius: 8, outline: 'none', cursor: 'pointer', flex: 1 }}>
                        <option value="">Cambiar estado...</option>
                        <option value="idea">Idea</option>
                        <option value="prep">En preparación</option>
                        <option value="rec">En grabación</option>
                        <option value="pub">Publicado</option>
                    </select>
                    <button onClick={handleDeleteSelected}
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', borderRadius: 9, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        <Trash2 size={14} /> Eliminar seleccionados
                    </button>
                    <button onClick={() => { setSelectedEvents(new Set()); setIsSelectMode(false); }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <X size={14} /> Cancelar
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

            {/* ── Toast ── */}
            {toastMsg && (
                <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: toastMsg.startsWith('⚠') ? '#dc2626' : '#16a34a', color: '#fff', padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 99999, whiteSpace: 'nowrap' }}>
                    {toastMsg}
                </div>
            )}

            {/* ── SheetEditor ── */}
            {sheetItem && (
                <SheetEditor
                    sheetId={sheetItem.id || 'new'}
                    item={sheetItem}
                    onClose={() => { setSheetItem(null); loadData(); const ev = selectedEvent; setSelectedEvent(null); setTimeout(() => setSelectedEvent(ev), 50); }}
                    onSave={async (saved) => {
                        setSheetItem(null);
                        if (saved) {
                            setLinkedScript(saved);
                            // Link calendar event → library item by real ID
                            if (selectedEvent?.id && saved.id) {
                                const sb = createSupabaseClient();
                                await sb.from('calendar_events')
                                    .update({ reference_id: saved.id })
                                    .eq('id', selectedEvent.id);
                            }
                        }
                        loadData();
                    }}
                    userId={null}
                    activeProjectId={activeProject?.id}
                />
            )}

            {/* ── Global styles — moved to calendar.css ── */}
        </div>
    );
}

// ─── Helper: ScriptBlock — card con borde de color ───────────────────────────
function ScriptBlock({ label, value, onChange, color = '#a78bfa' }) {
    return (
        <div style={{ background: `rgba(255,255,255,0.02)`, borderRadius: 10, border: `1px solid rgba(255,255,255,0.05)`, borderLeft: `3px solid ${color}`, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px 0', fontSize: '0.6rem', fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
            <textarea value={value} onChange={e => onChange(e.target.value)}
                style={{ width: '100%', minHeight: 65, background: 'transparent', border: 'none', color: '#ddd', padding: '8px 12px 10px', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, boxSizing: 'border-box' }}
                placeholder={`Escribe el ${label.replace(/^[^\s]*\s*/,'').toLowerCase()}...`} />
        </div>
    );
}

// ─── Helper: ScriptDesarrollo — bloques numerados ────────────────────────────
function ScriptDesarrollo({ linkedScript, setLinkedScript }) {
    const des = linkedScript.content?.desarrollo || linkedScript.desarrollo || linkedScript.content?.puntos || linkedScript.puntos;
    const arr = Array.isArray(des) ? des : (typeof des === 'string' ? des.split('\n').filter(Boolean) : ['']);
    const final = arr.length > 0 ? arr : [''];
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px 0', fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                📝 Desarrollo · {final.length} bloque{final.length !== 1 ? 's' : ''}
            </div>
            <div style={{ padding: '6px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {final.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: '0.8rem', marginTop: 8, flexShrink: 0, width: 18, textAlign: 'center' }}>{i+1}</span>
                        <textarea value={String(p).replace(/^\d+\.\s*/,'')} onChange={e => { const nd = [...final]; nd[i] = e.target.value; const nc = { ...(linkedScript.content||{}) }; nc.desarrollo = nd; setLinkedScript({ ...linkedScript, content: nc }); }}
                            style={{ flex: 1, minHeight: 55, background: 'rgba(255,255,255,0.03)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#ccc', padding: '8px 0', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, boxSizing: 'border-box' }}
                            placeholder={`Punto ${i+1}...`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Helper: ScriptCopyPost — headline + body + hashtags ─────────────────────
function ScriptCopyPost({ linkedScript, setLinkedScript }) {
    const copy = linkedScript.content?.copy_post || linkedScript.copy_post;
    if (!copy) return null;
    const headline = copy.titulo || copy.headline || '';
    const caption  = copy.descripcion_larga || copy.body || copy.caption || copy.texto || '';
    const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags : [];
    return (
        <div style={{ background: 'rgba(96,165,250,0.04)', borderRadius: 10, border: '1px solid rgba(96,165,250,0.12)', borderLeft: '3px solid #60a5fa', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px 0', fontSize: '0.6rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>📱 Copy Redes</div>
            <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="text" value={headline} onChange={e => { const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.titulo = e.target.value; ncp.headline = e.target.value; nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff', padding: '6px 0', fontSize: '0.85rem', fontWeight: 600, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                    placeholder="Título del post..." />
                <textarea value={caption} onChange={e => { const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.descripcion_larga = e.target.value; ncp.body = e.target.value; nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); }}
                    style={{ width: '100%', minHeight: 65, background: 'transparent', border: 'none', color: '#bbb', padding: '4px 0', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, boxSizing: 'border-box' }}
                    placeholder="Caption..." />
                {hashtags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {hashtags.map((tag, idx) => (
                            <span key={idx} onClick={() => { const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.hashtags = hashtags.filter((_,i)=>i!==idx); nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); }}
                                style={{ color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(124,58,237,0.12)', padding: '2px 7px', borderRadius: 4, cursor: 'pointer' }}>#{tag}</span>
                        ))}
                    </div>
                )}
                <input type="text" placeholder="Añadir hashtags (Enter para añadir)..."
                    onKeyDown={e => { if (e.key === 'Enter') { const tags = e.target.value.split(',').map(t => t.trim().replace('#','')).filter(Boolean); const nc = { ...(linkedScript.content||{}) }; const ncp = { ...(nc.copy_post||{}) }; ncp.hashtags = [...new Set([...hashtags, ...tags])]; nc.copy_post = ncp; setLinkedScript({ ...linkedScript, content: nc }); e.target.value = ''; } }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#999', padding: '4px 0', fontSize: '0.75rem', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            </div>
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

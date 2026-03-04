'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Plus,
    X,
    Save,
    Trash2,
    Search,
    BookOpen,
    Edit3,
    Clock,
    Globe
} from 'lucide-react';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState('choice'); // 'choice', 'library', 'note', 'edit'
    const [selectedDate, setSelectedDate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [type, setType] = useState('note');
    const [platform, setPlatform] = useState('General');

    const supabase = createSupabaseClient();

    useEffect(() => {
        loadData();
    }, [currentDate]);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: eventData } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', user.id)
                .gte('event_date', firstDay)
                .lte('event_date', lastDay);

            setEvents(eventData || []);

            const { data: libData } = await supabase
                .from('library')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            setLibraryItems(libData || []);
        }
        setLoading(false);
    }

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handleOpenModal = (date, event = null) => {
        setSelectedDate(date);
        if (event) {
            setEditingEvent(event);
            setTitle(event.title);
            setDesc(event.description || '');
            setType(event.type || 'note');
            setPlatform(event.platform || 'General');
            setModalStep('edit');
        } else {
            setEditingEvent(null);
            setTitle('');
            setDesc('');
            setType('note');
            setPlatform('General');
            setModalStep('choice');
        }
        setIsModalOpen(true);
    };

    const handleSaveEvent = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            user_id: user.id,
            title,
            description: desc,
            event_date: selectedDate,
            type,
            platform
        };

        if (editingEvent) {
            await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
        } else {
            await supabase.from('calendar_events').insert(payload);
        }

        setIsModalOpen(false);
        loadData();
    };

    const handleDeleteEvent = async () => {
        if (!confirm('¿Eliminar del calendario?')) return;
        await supabase.from('calendar_events').delete().eq('id', editingEvent.id);
        setIsModalOpen(false);
        loadData();
    };

    const handleImportFromLibrary = async (item) => {
        const { data: { user } } = await supabase.auth.getUser();
        const content = item.content || {};
        const displayTitle = item.titulo || content.titulo_angulo || content.titulo_idea || 'Sin título';

        await supabase.from('calendar_events').insert({
            user_id: user.id,
            title: displayTitle,
            description: item.platform || 'General',
            event_date: selectedDate,
            type: item.type,
            platform: item.platform,
            reference_id: item.id
        });

        setIsModalOpen(false);
        loadData();
    };

    const onDragStart = (e, id) => {
        e.dataTransfer.setData('eventId', id);
    };

    const onDrop = async (e, date) => {
        const id = e.dataTransfer.getData('eventId');
        if (!id) return;
        await supabase.from('calendar_events').update({ event_date: date }).eq('id', id);
        loadData();
    };

    const renderGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = daysInMonth(year, month);
        const start = firstDayOfMonth(year, month);
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

        const cells = [];
        dayNames.forEach(d => cells.push(<div key={d} className="cal-header-cell">{d}</div>));

        for (let i = 0; i < start; i++) cells.push(<div key={`b-${i}`} className="cal-cell empty"></div>);

        for (let d = 1; d <= days; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.event_date === dateStr);
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

            cells.push(
                <div
                    key={d}
                    className={`cal-cell ${isToday ? 'today' : ''}`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, dateStr)}
                    onClick={() => handleOpenModal(dateStr)}
                >
                    <div className="cal-day-num">{d}</div>
                    <div className="cal-event-container">
                        {dayEvents.slice(0, 3).map(ev => (
                            <div
                                key={ev.id}
                                draggable
                                onDragStart={e => { e.stopPropagation(); onDragStart(e, ev.id); }}
                                onClick={e => { e.stopPropagation(); handleOpenModal(dateStr, ev); }}
                                className={`cal-event ${ev.type}`}
                            >
                                {ev.title}
                            </div>
                        ))}
                        {dayEvents.length > 3 && (
                            <div className="cal-more">+{dayEvents.length - 3} más</div>
                        )}
                    </div>
                </div>
            );
        }

        return <div className="cal-grid">{cells}</div>;
    };

    return (
        <div className="calendar-page">
            <header className="cal-header">
                <div className="cal-title-section">
                    <h1>Calendario Editorial</h1>
                    <div className="cal-nav">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}><ChevronLeft /></button>
                        <span className="cal-current-month">
                            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}
                        </span>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}><ChevronRight /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="btn-today">Hoy</button>
                    </div>
                </div>
            </header>

            {renderGrid()}

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content premium-card" onClick={e => e.stopPropagation()}>
                        <header>
                            <h2>{modalStep === 'edit' ? 'Editar Evento' : 'Programar Contenido'}</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X /></button>
                        </header>

                        <div className="modal-body">
                            {modalStep === 'choice' && (
                                <div className="choice-steps">
                                    <button className="choice-card" onClick={() => setModalStep('library')}>
                                        <div className="icon"><BookOpen size={24} /></div>
                                        <div>
                                            <h3>Importar desde Biblioteca</h3>
                                            <p>Usa tus ideas y guiones ya guardados</p>
                                        </div>
                                    </button>
                                    <button className="choice-card" onClick={() => setModalStep('note')}>
                                        <div className="icon"><Edit3 size={24} /></div>
                                        <div>
                                            <h3>Crear Nota Rápida</h3>
                                            <p>Anota una idea rápida para este día</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {modalStep === 'library' && (
                                <div className="library-step">
                                    <div className="search-bar">
                                        <Search size={18} />
                                        <input
                                            placeholder="Buscar en mi biblioteca..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="lib-list">
                                        {libraryItems.filter(item =>
                                            (item.titulo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.type || '').toLowerCase().includes(searchQuery.toLowerCase())
                                        ).map(item => (
                                            <div key={item.id} className="lib-item" onClick={() => handleImportFromLibrary(item)}>
                                                <div className="lib-badge">{item.type}</div>
                                                <div className="lib-info">
                                                    <strong>{item.titulo || item.content?.titulo_angulo || 'Sin título'}</strong>
                                                    <span>{item.platform}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="back-btn" onClick={() => setModalStep('choice')}>Volver</button>
                                </div>
                            )}

                            {(modalStep === 'note' || modalStep === 'edit') && (
                                <div className="note-form">
                                    <div className="form-group">
                                        <label>Título</label>
                                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Publicar Reel sobre... " />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Tipo</label>
                                            <select value={type} onChange={e => setType(e.target.value)}>
                                                <option value="note">Nota</option>
                                                <option value="idea">Idea</option>
                                                <option value="guion">Guion</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Plataforma</label>
                                            <select value={platform} onChange={e => setPlatform(e.target.value)}>
                                                <option value="General">General</option>
                                                <option value="Instagram">Instagram</option>
                                                <option value="TikTok">TikTok</option>
                                                <option value="YouTube">YouTube</option>
                                                <option value="LinkedIn">LinkedIn</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Descripción / Notas</label>
                                        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Escribe aquí los detalles..." />
                                    </div>

                                    <div className="form-actions">
                                        {modalStep === 'edit' && (
                                            <button className="delete-btn" onClick={handleDeleteEvent}><Trash2 size={18} /></button>
                                        )}
                                        <button className="save-btn" onClick={handleSaveEvent}><Save size={18} /> Guardar</button>
                                    </div>
                                    {modalStep === 'note' && <button className="back-btn" onClick={() => setModalStep('choice')}>Volver</button>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .calendar-page { padding: 20px; color: white; background: #050505; min-height: 100vh; }
                .cal-header { margin-bottom: 30px; }
                .cal-title-section { display: flex; justify-content: space-between; align-items: center; }
                h1 { fontSize: 1.8rem; fontWeight: 900; }
                .cal-nav { display: flex; align-items: center; gap: 15px; }
                .cal-current-month { fontSize: 1.1rem; fontWeight: 700; textTransform: capitalize; minWidth: 200px; textAlign: center; }
                .cal-nav button { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 8px; borderRadius: 10px; cursor: pointer; display: flex; align-items: center; }
                .btn-today { padding: 8px 16px !important; fontSize: 0.9rem; fontWeight: 600; }

                .cal-grid { display: grid; gridTemplateColumns: repeat(7, 1fr); border: 1px solid rgba(255,255,255,0.05); borderRadius: 16px; overflow: hidden; }
                .cal-header-cell { padding: 15px; textAlign: center; fontSize: 0.75rem; fontWeight: 800; color: rgba(255,255,255,0.3); textTransform: uppercase; background: #080808; }
                .cal-cell { height: 160px; border: 1px solid rgba(255,255,255,0.05); padding: 10px; background: #080808; transition: 0.2s; cursor: pointer; }
                .cal-cell:hover { background: #0C0C0C; }
                .cal-cell.today { background: rgba(126, 206, 202, 0.03); border-color: rgba(126, 206, 202, 0.2); }
                .cal-cell.empty { background: #030303; opacity: 0.5; cursor: default; }
                .cal-day-num { fontSize: 0.9rem; fontWeight: 600; marginBottom: 8px; color: rgba(255,255,255,0.5); }
                .today .cal-day-num { color: #7ECECA; fontWeight: 900; }

                .cal-event-container { display: flex; flexDirection: column; gap: 4px; }
                .cal-event { fontSize: 0.7rem; padding: 5px 10px; borderRadius: 6px; whiteSpace: nowrap; overflow: hidden; textOverflow: ellipsis; fontWeight: 700; transition: 0.2s; }
                .cal-event:hover { filter: brightness(1.2); }
                .cal-event.note { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
                .cal-event.idea { background: rgba(157, 0, 255, 0.2); color: #B74DFF; border: 1px solid rgba(157, 0, 255, 0.2); }
                .cal-event.guion { background: rgba(126, 206, 202, 0.2); color: #7ECECA; border: 1px solid rgba(126, 206, 202, 0.2); }
                .cal-more { fontSize: 0.65rem; color: rgba(255,255,255,0.3); paddingLeft: 5px; marginTop: 2px; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; alignItems: center; justifyContent: center; zIndex: 1000; padding: 20px; }
                .modal-content { width: 100%; maxWidth: 500px; background: #0A0A0A; borderRadius: 24px; padding: 32px; border: 1px solid rgba(255,255,255,0.1); }
                .modal-content header { display: flex; justifyContent: space-between; alignItems: center; marginBottom: 24px; }
                .close-btn { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; }

                .choice-steps { display: grid; gap: 16px; }
                .choice-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; borderRadius: 16px; display: flex; alignItems: center; gap: 20px; cursor: pointer; transition: 0.2s; textAlign: left; color: white; }
                .choice-card:hover { background: rgba(255,255,255,0.06); borderColor: #7ECECA; transform: translateY(-2px); }
                .choice-card .icon { background: rgba(126, 206, 202, 0.1); color: #7ECECA; padding: 12px; borderRadius: 12px; }
                .choice-card h3 { fontSize: 1rem; fontWeight: 800; marginBottom: 4px; }
                .choice-card p { fontSize: 0.85rem; color: rgba(255,255,255,0.5); }

                .search-bar { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); borderRadius: 12px; padding: 12px 16px; display: flex; alignItems: center; gap: 12px; marginBottom: 20px; }
                .search-bar input { background: none; border: none; color: white; width: 100%; outline: none; }
                .lib-list { maxHeight: 300px; overflowY: auto; display: grid; gap: 10px; marginBottom: 20px; }
                .lib-item { background: rgba(255,255,255,0.03); padding: 12px; borderRadius: 12px; cursor: pointer; display: flex; alignItems: center; gap: 12px; transition: 0.2s; }
                .lib-item:hover { background: rgba(255,255,255,0.08); }
                .lib-badge { fontSize: 0.6rem; fontWeight: 900; background: rgba(157, 0, 255, 0.2); color: #D8B4FF; padding: 4px 8px; borderRadius: 6px; textTransform: uppercase; }
                .lib-info strong { display: block; fontSize: 0.9rem; }
                .lib-info span { fontSize: 0.75rem; color: rgba(255,255,255,0.4); }

                .note-form { display: grid; gap: 20px; }
                .form-group label { display: block; fontSize: 0.75rem; fontWeight: 800; color: #7ECECA; marginBottom: 8px; textTransform: uppercase; }
                .form-group input, .form-group select, .form-group textarea { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px; borderRadius: 12px; outline: none; transition: 0.2s; }
                .form-group input:focus { borderColor: #7ECECA; background: rgba(255,255,255,0.08); }
                .form-row { display: grid; gridTemplateColumns: 1fr 1fr; gap: 16px; }
                .form-actions { display: flex; gap: 12px; marginTop: 10px; }
                .save-btn { flex: 1; background: var(--accent-gradient); color: white; border: none; padding: 14px; borderRadius: 12px; fontWeight: 800; cursor: pointer; display: flex; alignItems: center; justifyContent: center; gap: 10px; }
                .delete-btn { background: rgba(255,77,77,0.1); color: #FF4D4D; border: 1px solid rgba(255,77,77,0.2); padding: 14px; borderRadius: 12px; cursor: pointer; }
                .back-btn { background: none; border: none; color: rgba(255,255,255,0.4); fontSize: 0.85rem; fontWeight: 700; cursor: pointer; marginTop: 10px; textAlign: center; width: 100%; }
            `}</style>
        </div>
    );
}

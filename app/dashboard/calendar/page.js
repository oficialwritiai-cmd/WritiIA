'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Save,
    Trash2,
    Search,
    BookOpen,
    Edit3,
    Calendar as CalendarIcon,
    LayoutGrid,
    Type,
    Tag,
    Globe,
    Share2
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

    // Form states
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [type, setType] = useState('note');
    const [platform, setPlatform] = useState('General');

    const supabase = createSupabaseClient();

    useEffect(() => {
        loadData();
        const params = new URLSearchParams(window.location.search);
        const importId = params.get('import');
        if (importId) {
            handleOpenModal(new Date().toISOString().split('T')[0]);
            setModalStep('library');
            // We could auto-filter here but let's just let the user see the list first
        }
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
                    <div className="cal-cell-header">
                        <span className="cal-day-num">{d}</span>
                        <div className="cal-cell-plus"><Plus size={12} /></div>
                    </div>
                    <div className="cal-event-list">
                        {dayEvents.map((ev, idx) => {
                            if (window.innerWidth < 768 && idx >= 2) return null;
                            if (window.innerWidth >= 768 && idx >= 3) return null;

                            return (
                                <div
                                    key={ev.id}
                                    draggable
                                    onDragStart={e => { e.stopPropagation(); onDragStart(e, ev.id); }}
                                    onClick={e => { e.stopPropagation(); handleOpenModal(dateStr, ev); }}
                                    className={`cal-event-pill ${ev.type} ${ev.platform === 'General' ? '' : 'has-platform'}`}
                                >
                                    <span className="pill-dot"></span>
                                    <span className="pill-text">{ev.title}</span>
                                </div>
                            );
                        })}

                        {(window.innerWidth < 768 && dayEvents.length > 2) || (window.innerWidth >= 768 && dayEvents.length > 3) ? (
                            <div
                                className="cal-more-indicator"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Open modal restricted to this day if needed, 
                                    // but handleOpenModal with date already does show some info.
                                    // For now, let's just make it clear.
                                    handleOpenModal(dateStr);
                                }}
                            >
                                +{window.innerWidth < 768 ? dayEvents.length - 2 : dayEvents.length - 3} más
                            </div>
                        ) : null}
                    </div>
                </div>
            );
        }

        return <div className="cal-modern-grid">{cells}</div>;
    };

    return (
        <div className="cal-view-container">
            <style jsx global>{`
                .cal-view-container {
                    padding: 24px;
                    background: #000;
                    min-height: calc(100vh - 64px);
                    font-family: 'Inter', sans-serif;
                }

                .cal-top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .cal-header-info h1 {
                    font-size: 1.75rem;
                    font-weight: 900;
                    letter-spacing: -0.03em;
                    background: linear-gradient(to right, #fff, #888);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .cal-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255,255,255,0.03);
                    padding: 6px;
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .cal-month-display {
                    font-weight: 700;
                    font-size: 0.95rem;
                    color: white;
                    min-width: 160px;
                    text-align: center;
                    text-transform: capitalize;
                }

                .cal-nav-btn {
                    padding: 8px;
                    border-radius: 10px;
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    transition: 0.2s;
                }

                .cal-nav-btn:hover {
                    background: rgba(255,255,255,0.05);
                    color: white;
                }

                .cal-today-btn {
                    padding: 8px 16px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: #fff;
                    color: #000;
                    border-radius: 10px;
                    border: none;
                    cursor: pointer;
                }

                .cal-modern-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }

                .cal-header-cell {
                    background: #080808;
                    padding: 16px;
                    text-align: center;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #555;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .cal-cell {
                    background: #050505;
                    height: 140px;
                    padding: 12px;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .cal-cell:hover {
                    background: #080808;
                }

                .cal-cell.today {
                    background: radial-gradient(circle at top right, rgba(126, 206, 202, 0.08), transparent);
                }

                .cal-cell.empty {
                    background: #020202;
                    opacity: 0.4;
                    cursor: default;
                }

                .cal-cell-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .cal-day-num {
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: #444;
                }

                .today .cal-day-num {
                    color: #7ECECA;
                    font-weight: 900;
                }

                .cal-cell-plus {
                    opacity: 0;
                    color: #444;
                    transition: 0.2s;
                }

                .cal-cell:hover .cal-cell-plus {
                    opacity: 1;
                }

                .cal-event-list {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .cal-event-pill {
                    font-size: 0.7rem;
                    padding: 5px 8px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: 0.2s;
                    border: 1px solid transparent;
                }

                .cal-event-pill:hover {
                    transform: translateX(2px);
                    filter: brightness(1.2);
                }

                .cal-event-pill.note {
                    background: rgba(255,255,255,0.03);
                    color: #bbb;
                    border-color: rgba(255,255,255,0.05);
                }

                .cal-event-pill.idea {
                    background: rgba(183, 77, 255, 0.1);
                    color: #B74DFF;
                    border-color: rgba(183, 77, 255, 0.1);
                }

                .cal-event-pill.guion {
                    background: rgba(126, 206, 202, 0.1);
                    color: #7ECECA;
                    border-color: rgba(126, 206, 202, 0.1);
                }

                .pill-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .cal-more-indicator {
                    font-size: 0.65rem;
                    color: #444;
                    padding-left: 4px;
                    font-weight: 700;
                }

                /* MODAL */
                .cal-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                }

                .cal-modal {
                    width: 100%;
                    maxWidth: 480px;
                    background: #0A0A0A;
                    border-radius: 28px;
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 32px;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.8);
                }

                .cal-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .cal-modal-header h2 {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: white;
                }

                .cal-close-btn {
                    background: rgba(255,255,255,0.03);
                    border: none;
                    color: #555;
                    padding: 8px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: 0.2s;
                }

                .cal-close-btn:hover {
                    background: rgba(255,255,255,0.08);
                    color: white;
                }

                .cal-choice-grid {
                    display: grid;
                    gap: 16px;
                }

                .cal-choice-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 20px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .cal-choice-card:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: #7ECECA;
                    transform: scale(1.02);
                }

                .cal-choice-icon {
                    background: rgba(126, 206, 202, 0.1);
                    color: #7ECECA;
                    padding: 12px;
                    border-radius: 14px;
                }

                .cal-choice-info h3 {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 2px;
                    text-align: left;
                }

                .cal-choice-info p {
                    font-size: 0.8rem;
                    color: #666;
                    text-align: left;
                }

                .cal-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .cal-input-group label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: #7ECECA;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    letter-spacing: 0.05em;
                }

                .cal-input {
                    width: 100%;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 14px;
                    border-radius: 12px;
                    color: white;
                    font-size: 0.9rem;
                    outline: none;
                    transition: 0.2s;
                }

                .cal-input:focus {
                    background: rgba(255,255,255,0.05);
                    border-color: #7ECECA;
                }

                .cal-lib-search {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 0 16px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                }

                .cal-lib-search input {
                    background: none;
                    border: none;
                    padding: 14px 0;
                    color: white;
                    width: 100%;
                    outline: none;
                }

                .cal-lib-list {
                    max-height: 280px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .cal-lib-item {
                    background: rgba(255,255,255,0.02);
                    padding: 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: 0.2s;
                }

                .cal-lib-item:hover {
                    background: rgba(255,255,255,0.06);
                }

                .cal-btn-primary {
                    background: #7ECECA;
                    color: #000;
                    border: none;
                    padding: 14px;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: 0.2s;
                }

                .cal-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(126, 206, 202, 0.2);
                }

                .cal-btn-delete {
                    background: rgba(255,77,77,0.1);
                    color: #FF4D4D;
                    border: 1px solid rgba(255,77,77,0.15);
                    padding: 12px;
                    border-radius: 12px;
                    cursor: pointer;
                }
                @media (max-width: 768px) {
                    .cal-modern-grid {
                        border-radius: 12px;
                    }
                    .cal-cell {
                        height: 100px;
                        padding: 6px;
                    }
                    .cal-header-cell {
                        padding: 8px 4px;
                        font-size: 0.6rem;
                    }
                    .cal-day-num {
                        font-size: 0.7rem;
                    }
                    .cal-event-pill {
                        font-size: 0.6rem;
                        padding: 3px 6px;
                    }
                    .cal-modal {
                        padding: 24px;
                        border-radius: 20px;
                        height: 90vh;
                        overflow-y: auto;
                    }
                    .cal-choice-grid {
                        grid-template-columns: 1fr;
                    }
                    .cal-choice-card {
                        padding: 16px;
                        gap: 12px;
                    }
                    .cal-btn-primary, .cal-btn-delete {
                        padding: 18px;
                        font-size: 1rem;
                    }
                    .cal-input {
                        padding: 16px;
                        font-size: 1rem;
                    }
                }
            `}</style>

            <div className="cal-top-bar">
                <div className="cal-header-info">
                    <h1>Calendario</h1>
                </div>
                <div className="cal-controls">
                    <button className="cal-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="cal-month-display">
                        {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}
                    </div>
                    <button className="cal-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
                        <ChevronRight size={20} />
                    </button>
                    <button className="cal-today-btn" onClick={() => setCurrentDate(new Date())}>Hoy</button>
                </div>
            </div>

            {loading ? (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                    Cargando calendario...
                </div>
            ) : renderGrid()}

            {isModalOpen && (
                <div className="cal-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="cal-modal" onClick={e => e.stopPropagation()}>
                        <div className="cal-modal-header">
                            <h2>
                                {modalStep === 'edit' ? 'Editar Publicación' :
                                    modalStep === 'library' ? 'Importar de Biblioteca' : 'Nueva Publicación'}
                            </h2>
                            <button className="cal-close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="cal-modal-content">
                            {modalStep === 'choice' && (
                                <div className="cal-choice-grid">
                                    <div className="cal-choice-card" onClick={() => setModalStep('library')}>
                                        <div className="cal-choice-icon"><BookOpen size={24} /></div>
                                        <div className="cal-choice-info">
                                            <h3>Importar desde Biblioteca</h3>
                                            <p>Selecciona una idea o guion guardado anteriormente.</p>
                                        </div>
                                    </div>
                                    <div className="cal-choice-card" onClick={() => setModalStep('note')}>
                                        <div className="cal-choice-icon"><Edit3 size={24} /></div>
                                        <div className="cal-choice-info">
                                            <h3>Nota Rápida</h3>
                                            <p>Crea un recordatorio o evento rápido sin usar la biblioteca.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalStep === 'library' && (
                                <div className="cal-lib-step">
                                    <div className="cal-lib-search">
                                        <Search size={18} color="#555" />
                                        <input
                                            placeholder="Buscar contenido..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="cal-lib-list">
                                        {libraryItems
                                            .filter(it => (it.titulo || it.content?.titulo_angulo || '').toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map(item => (
                                                <div key={item.id} className="cal-lib-item" onClick={() => handleImportFromLibrary(item)}>
                                                    <div style={{ color: item.type === 'guion' ? '#7ECECA' : '#B74DFF' }}>
                                                        <LayoutGrid size={18} />
                                                    </div>
                                                    <div className="cal-lib-info">
                                                        <strong style={{ display: 'block', fontSize: '0.85rem' }}>{item.titulo || item.content?.titulo_angulo || 'Sin título'}</strong>
                                                        <span style={{ fontSize: '0.7rem', color: '#666' }}>{item.type} • {item.platform}</span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    <button onClick={() => setModalStep('choice')} style={{ border: 'none', background: 'none', color: '#666', width: '100%', marginTop: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                                        Volver
                                    </button>
                                </div>
                            )}

                            {(modalStep === 'note' || modalStep === 'edit') && (
                                <div className="cal-form">
                                    <div className="cal-input-group">
                                        <label><Type size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Título</label>
                                        <input className="cal-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Publicar carrusel sobre..." />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="cal-input-group">
                                            <label><Tag size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Tipo</label>
                                            <select className="cal-input" value={type} onChange={e => setType(e.target.value)}>
                                                <option value="note">Nota</option>
                                                <option value="idea">Idea</option>
                                                <option value="guion">Guion</option>
                                            </select>
                                        </div>
                                        <div className="cal-input-group">
                                            <label><Globe size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Plataforma</label>
                                            <select className="cal-input" value={platform} onChange={e => setPlatform(e.target.value)}>
                                                <option value="General">General</option>
                                                <option value="TikTok">TikTok</option>
                                                <option value="Instagram">Instagram</option>
                                                <option value="YouTube">YouTube</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="cal-input-group">
                                        <label><Search size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Notas Adicionales</label>
                                        <textarea className="cal-input" style={{ minHeight: '80px' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalles de la publicación..." />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                        {modalStep === 'edit' && (
                                            <button className="cal-btn-delete" onClick={handleDeleteEvent}>
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                        <button className="cal-btn-primary" style={{ flex: 1 }} onClick={handleSaveEvent}>
                                            <Save size={18} /> Guardar Cambios
                                        </button>
                                    </div>

                                    {modalStep === 'note' && (
                                        <button onClick={() => setModalStep('choice')} style={{ border: 'none', background: 'none', color: '#666', width: '100%', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                                            Volver
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

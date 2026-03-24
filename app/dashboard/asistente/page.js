'use client';
// Asistente IA (Chat Pro) — v8.9.0 (Nuclear Mobile Sidebar Fix — v1.16.0)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '@/app/components/ProjectContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Send, Mic, Calendar, Lightbulb, PenLine, Type, Sparkles, Save, X, Paperclip, ChevronDown, Menu, Plus, History, Trash2, MessageSquare } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// ── Typing Indicator ──────────────────────────────────────
function TypingIndicator() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px 16px 16px 4px', width: 'fit-content', marginBottom: '8px' }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#888', display: 'inline-block', animation: `typingPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
            ))}
        </div>
    );
}

// ── Calendar Mini Modal ───────────────────────────────────
function CalendarModal({ content, onClose, onSave }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [platform, setPlatform] = useState('Instagram');
    const [color, setColor] = useState('#7ECECA');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave({ date, platform, color, content });
        setSaving(false);
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', border: '1px solid rgba(126,206,202,0.2)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>📅 Planificar en Calendario</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px', display: 'block' }}>Fecha</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" style={{ width: '100%', padding: '10px 14px' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px', display: 'block' }}>Plataforma</label>
                        <select value={platform} onChange={e => setPlatform(e.target.value)} className="select-field" style={{ width: '100%', padding: '10px 14px' }}>
                            {['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Reels', 'X'].map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px', display: 'block' }}>Color del evento</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {['#7ECECA', '#9D00FF', '#FFD700', '#10B981', '#FF4D4D'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: color === c ? '3px solid white' : 'none', cursor: 'pointer' }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '24px', height: '48px', fontSize: '1rem' }}
                >
                    {saving ? 'Guardando...' : '📅 Añadir al Calendario'}
                </button>
            </div>
        </div>
    );
}

// ── Message Bubble ────────────────────────────────────────
function MessageBubble({ msg, onSaveIdea, onSaveScript, onPlanify, onGenerateTitles, onGenerateCopys, onGenerateScript }) {
    const isUser = msg.role === 'user';
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [saved, setSaved] = useState({});

    const handleAction = (type, fn) => {
        if (saved[type]) return;
        fn();
        setSaved(prev => ({ ...prev, [type]: true }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: '24px', animation: 'msgFadeIn 0.35s ease-out', width: '100%' }}>
            {!isUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #7ECECA, #5bb8b8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>✨</div>
                    <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600 }}>NICO IA</span>
                </div>
            )}

            <div style={{
                maxWidth: '85%',
                padding: '16px 20px',
                borderRadius: isUser ? '20px 20px 4px 20px' : '4px 20px 20px 20px',
                background: isUser
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent',
                border: isUser
                    ? '1px solid rgba(255,255,255,0.1)'
                    : 'none',
                color: 'white',
                fontSize: '1.05rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {msg.content}
            </div>

            {/* Action Buttons for AI messages */}
            {!isUser && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', maxWidth: '85%' }}>
                    <button
                        onClick={() => handleAction('idea', onSaveIdea)}
                        disabled={!!saved.idea}
                        className="action-btn"
                        style={{
                            fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            background: saved.idea ? 'rgba(126,206,202,0.1)' : 'rgba(255,255,255,0.02)', color: saved.idea ? '#7ECECA' : '#888',
                            cursor: saved.idea ? 'default' : 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Save size={14} /> {saved.idea ? 'Idea guardada' : 'Guardar Idea'}
                    </button>
                    <button
                        onClick={() => handleAction('script', onSaveScript)}
                        disabled={!!saved.script}
                        className="action-btn"
                        style={{
                            fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            background: saved.script ? 'rgba(126,206,202,0.1)' : 'rgba(255,255,255,0.02)', color: saved.script ? '#7ECECA' : '#888',
                            cursor: saved.script ? 'default' : 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <PenLine size={14} /> {saved.script ? 'Guardado' : 'Guardar Guion'}
                    </button>
                    <button
                        onClick={() => setCalendarOpen(true)}
                        className="action-btn"
                        style={{
                            fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.02)', color: '#888', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Calendar size={14} /> Calendario
                    </button>
                    <button
                        onClick={onGenerateTitles}
                        className="action-btn"
                        style={{
                            fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.02)', color: '#888', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Type size={14} /> Ir a Títulos
                    </button>
                </div>
            )}

            {calendarOpen && (
                <CalendarModal
                    content={msg.content}
                    onClose={() => setCalendarOpen(false)}
                    onSave={onPlanify}
                />
            )}
        </div>
    );
}

// ── Quick Action Cards (Empty State) ──────────────────────
const ORBITA_CARDS = [
    { title: 'Descripción YouTube', desc: 'Prepara el texto para tu video.', icon: '📝', mode: 'copys', prompt: 'Escribe la descripción de YouTube para mi último video. Céntrate en un CTA claro hacia mi Instagram.' },
    { title: 'Generar 30 ideas', desc: 'Planifica todo el mes rápido.', icon: '💡', mode: 'ideas de contenido viral', prompt: 'Dame 30 ideas de contenido corto para Reels/TikTok sobre mi nicho. Sólo títulos listos.' },
    { title: 'Reescribir guion', desc: 'Mejora el hook y estructura.', icon: '🎬', mode: 'guiones', prompt: 'Voy a pasarte un guion. Por favor, mejóralo cambiando el hook por uno más directo y ajusta la retención.' },
    { title: 'Plan semanal', desc: 'Organiza qué publicar y cuándo.', icon: '📅', mode: 'planificación de calendario', prompt: 'Ayúdame a organizar la estructura de mi contenido para esta semana (lunes a domingo).' }
];

// ── Main Page ─────────────────────────────────────────────
export default function AsistentePage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState(null);
    const [toast, setToast] = useState(null);
    const [historyLoaded, setHistoryLoaded] = useState(true);
    const [conversations, setConversations] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeys = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key.toLowerCase() === 'h') {
                setIsSidebarOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, []);

    // Get userId and Profile once
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUserId(user.id);
                supabase.from('users_profiles').select('full_name').eq('id', user.id).single().then(({ data }) => {
                    if (data?.full_name) {
                        setUserName(data.full_name.split(' ')[0]); // Use first name
                    }
                });
            }
        });
    }, []);

    // 1. Fetch conversations list
    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        const projectId = activeProject?.id || null;
        try {
            const res = await fetch(`/api/assistant/history?userId=${userId}&projectId=${projectId || 'null'}`);
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    }, [userId, activeProject?.id]);

    // 2. Load specific conversation
    const loadConversation = useCallback(async (sessionId) => {
        if (!userId || !sessionId) return;
        setHistoryLoaded(false);
        try {
            const res = await fetch(`/api/assistant/history?userId=${userId}&id=${sessionId}`);
            const data = await res.json();
            setMessages(data.messages || []);
            setCurrentSessionId(sessionId);
        } catch (err) {
            console.error('Error loading conversation:', err);
        } finally {
            setHistoryLoaded(true);
        }
    }, [userId]);

    // 3. Start New Chat
    const startNewChat = () => {
        setMessages([]);
        setCurrentSessionId(null);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    // Initial load
    useEffect(() => {
        if (!userId) return;
        setHistoryLoaded(false);
        fetchConversations().finally(() => setHistoryLoaded(true));
        // Reset state when project changes
        setMessages([]);
        setCurrentSessionId(null);
    }, [userId, activeProject?.id, fetchConversations]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const saveHistory = useCallback(async (updatedMessages, sessionId = null) => {
        if (!userId) return;
        try {
            const res = await fetch('/api/assistant/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId, 
                    projectId: activeProject?.id || null, 
                    messages: updatedMessages,
                    id: sessionId || currentSessionId
                })
            });
            const data = await res.json();
            if (data.id && !currentSessionId) {
                setCurrentSessionId(data.id);
                fetchConversations();
            }
        } catch {}
    }, [userId, activeProject?.id, currentSessionId, fetchConversations]);

    const sendMessage = async (text, mode = null) => {
        const messageText = text || input.trim();
        if (!messageText || isTyping) return;

        const userMsg = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date().toISOString() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
            const res = await fetch('/api/assistant/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    projectId: activeProject?.id || null,
                    messages: apiMessages,
                    mode,
                    userName
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'NO_CREDITS') {
                    showToast('Créditos insuficientes. Compra más créditos para continuar.', 'error');
                } else if (data.code === 'RATE_LIMIT') {
                    showToast(data.error || 'Límite alcanzado', 'error');
                } else {
                    showToast(data.error || 'Error al conectar con la IA', 'error');
                }
                setIsTyping(false);
                return;
            }

            const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply, timestamp: new Date().toISOString() };
            const finalMessages = [...newMessages, aiMsg];
            setMessages(finalMessages);
            await saveHistory(finalMessages);

        } catch (err) {
            const errMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Tuvimos un problema al conectar con la IA. Intenta de nuevo en unos segundos. 🔄', timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleSaveToLibrary = async (content, type = 'idea') => {
        if (!userId) return;
        try {
            const { error } = await supabase.from('library').insert({
                user_id: userId,
                project_id: activeProject?.id || null,
                type,
                platform: 'General',
                content: { descripcion: content, titulo_idea: content.substring(0, 80) },
                titulo: content.substring(0, 80),
                script_full_text: content,
                status: 'borrador',
                tags: ['asistente-ia']
            });
            if (error) throw error;
            showToast(type === 'idea' ? '💡 Idea guardada en Biblioteca' : '📝 Guion guardado en Biblioteca', 'success');
        } catch (err) {
            showToast('Error al guardar en Biblioteca', 'error');
        }
    };

    const handlePlanifyInCalendar = async ({ date, platform, color, content }) => {
        if (!userId) return;
        try {
            const { error } = await supabase.from('calendar_events').insert({
                user_id: userId,
                project_id: activeProject?.id || null,
                title: content.substring(0, 100),
                description: content,
                event_date: date,
                platform,
                color,
                type: 'idea',
                status: 'planned',
                source: 'assistant'
            });
            if (error) throw error;
            showToast('📅 Añadido al Calendario', 'success');
        } catch {
            showToast('Error al añadir al Calendario', 'error');
        }
    };

    const handleGenerateResource = (type, msgContent) => {
        const context = msgContent.substring(0, 200);
        if (type === 'titles') {
            window.location.href = `/dashboard/copys?prefill=${encodeURIComponent(context)}`;
        } else if (type === 'script') {
            window.location.href = `/dashboard?prefill=${encodeURIComponent(context)}`;
        }
    };

    const handleClearChat = async () => {
        if (!confirm('¿Estás seguro de que quieres empezar un nuevo chat? El historial de este chat se mantendrá guardado.')) return;
        startNewChat();
    };

    const deleteConversation = async (e, id) => {
        e.stopPropagation();
        if (!confirm('¿Borrar definitivamente esta conversación?')) return;
        try {
            await fetch(`/api/assistant/history?id=${id}`, { method: 'DELETE' });
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentSessionId === id) startNewChat();
            showToast('Conversación eliminada', 'info');
        } catch {
            showToast('Error al eliminar', 'error');
        }
    };

    const isEmpty = messages.length === 0 && historyLoaded;

    return (
        <div style={{ position: 'relative', height: 'calc(100vh - 72px)', display: 'flex', overflow: 'hidden', background: '#0a0a0a', color: '#fff' }}>
            <style>{`
                @keyframes msgFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes typingPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                .action-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .action-card:hover { 
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(126,206,202,0.3);
                    transform: translateY(-2px);
                }
                .action-btn:hover { border-color: rgba(126,206,202,0.4) !important; color: white !important; background: rgba(126,206,202,0.05) !important;}
                .send-btn:hover { background: #fff !important; color: #000 !important; }
                
                /* Orb animation */
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                    100% { transform: translateY(0px); }
                }
                @keyframes glow {
                    0% { box-shadow: 0 0 20px rgba(126,206,202,0.3); }
                    50% { box-shadow: 0 0 40px rgba(126,206,202,0.6); }
                    100% { box-shadow: 0 0 20px rgba(126,206,202,0.3); }
                }
                .loading-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-radius: 50%;
                    border-top-color: #7ECECA;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .sidebar {
                    width: 280px;
                    background: #111;
                    border-right: 1px solid rgba(255,255,255,0.08);
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .sidebar.closed {
                    width: 0;
                    border-right: none;
                    opacity: 0;
                    pointer-events: none;
                }
                @media (max-width: 1024px) {
                    .sidebar {
                        position: fixed !important;
                        top: 0 !important;
                        bottom: 0 !important;
                        left: -282px !important;
                        width: 280px !important;
                        z-index: 2147483647 !important;
                        background: #111 !important;
                        height: 100vh !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                        pointer-events: auto !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .sidebar.open {
                        left: 0 !important;
                        box-shadow: 20px 0 50px rgba(0,0,0,0.8) !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                    .sidebar.closed {
                        left: -282px !important;
                        width: 280px !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                    .chat-container {
                        padding-bottom: 120px !important;
                    }
                }
                .sidebar-item {
                    padding: 12px 16px;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #888;
                    font-size: 0.9rem;
                    transition: 0.2s;
                    margin: 4px 12px;
                }
                .sidebar-item:hover { background: rgba(255,255,255,0.05); color: white; }
                .sidebar-item.active { background: rgba(126,206,202,0.1); color: #7ECECA; border: 1px solid rgba(126,206,202,0.2); }
                
                .chat-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                }
                .input-container {
                    position: fixed;
                    bottom: 0;
                    left: 280px;
                    right: 0;
                    padding: 24px;
                    background: linear-gradient(to top, #0a0a0a 80%, transparent);
                    z-index: 50;
                    transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-container.wide {
                    left: 0;
                }
                @media (max-width: 768px) {
                    .input-container {
                        left: 0;
                        padding: 12px 16px 24px;
                        background: #0a0a0a;
                    }
                }
                @media (min-width: 1025px) {
                    .sidebar-close-btn { display: none !important; }
                }
            `}</style>
            

            <div className="chat-main" onClick={() => isSidebarOpen && window.innerWidth < 768 && setIsSidebarOpen(false)}>
                <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 60, borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                            style={{ 
                                background: isSidebarOpen ? 'rgba(126,206,202,0.1)' : 'rgba(255,255,255,0.05)', 
                                border: 'none', color: isSidebarOpen ? '#7ECECA' : 'white', 
                                padding: '8px', borderRadius: '8px', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', transition: '0.3s'
                            }}
                            title="Ver historial (Atajo: H)"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Nico Asistente</h2>
                    </div>
                </div>

                <div className="chat-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, paddingBottom: '160px' }}>
                    {isEmpty && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', animation: 'msgFadeIn 0.5s ease-out' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #7ECECA, #5bb8b8)',
                                animation: 'float 4s ease-in-out infinite, glow 3s ease-in-out infinite',
                                marginBottom: '24px'
                            }} />
                            
                            <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: '0 0 12px', textAlign: 'center' }}>
                                Hola{userName ? `, ${userName}` : ''}, soy Nico 👋
                            </h1>
                            <p style={{ color: '#888', fontSize: '1.05rem', margin: '0 0 48px', textAlign: 'center' }}>
                                Dime qué necesitas con tu contenido y yo me encargo.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', width: '100%', maxWidth: '800px' }}>
                                {ORBITA_CARDS.map((card, idx) => (
                                    <div key={idx} className="action-card" onClick={() => sendMessage(card.prompt, card.mode)}>
                                        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{card.icon}</div>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{card.title}</h3>
                                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0, lineHeight: '1.4' }}>{card.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isEmpty && (
                        <div style={{ padding: '0 24px', maxWidth: '860px', width: '100%', margin: '0 auto', flex: 1 }}>
                            {!historyLoaded ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <div className="loading-spinner" />
                                </div>
                            ) : (
                                <>
                                    {messages.map(msg => (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={msg}
                                            onSaveIdea={() => handleSaveToLibrary(msg.content, 'idea')}
                                            onSaveScript={() => handleSaveToLibrary(msg.content, 'guion')}
                                            onPlanify={(data) => handlePlanifyInCalendar({ ...data, content: msg.content })}
                                            onGenerateTitles={() => handleGenerateResource('titles', msg.content)}
                                            onGenerateCopys={() => handleGenerateResource('copys', msg.content)}
                                            onGenerateScript={() => handleGenerateResource('script', msg.content)}
                                        />
                                    ))}
                                    {isTyping && <TypingIndicator />}
                                    <div ref={messagesEndRef} style={{ height: '24px' }} />
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className={`input-container ${!isSidebarOpen ? 'wide' : ''}`}>
                    <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto' }}>
                        <div style={{
                            display: 'flex', alignItems: 'flex-end',
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '24px', padding: '8px 12px 8px 18px',
                            transition: '0.3s',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                        }}>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu pregunta o pega tu guion..."
                                rows={1}
                                style={{
                                    flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white',
                                    fontSize: '1rem', lineHeight: '1.5', resize: 'none', maxHeight: '150px',
                                    overflowY: 'auto', fontFamily: 'inherit', padding: '12px 0', alignSelf: 'center'
                                }}
                                onInput={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                                }}
                                disabled={isTyping}
                            />
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, paddingLeft: '8px', alignSelf: 'center', paddingBottom: '4px' }}>
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={isTyping || !input.trim()}
                                    className="send-btn"
                                    style={{
                                        height: '42px', width: '42px', borderRadius: '50%', border: 'none',
                                        background: !input.trim() || isTyping ? 'rgba(255,255,255,0.1)' : '#fff',
                                        color: !input.trim() || isTyping ? '#555' : '#000',
                                        cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: '0.2s', flexShrink: 0
                                    }}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#444', marginTop: '10px' }}>
                            Nico socio de marketing · Ilimitado
                        </p>
                    </div>
                </div>

                {toast && (
                    <div style={{
                        position: 'fixed', bottom: '140px', left: '50%', transform: 'translateX(-50%)',
                        background: toast.type === 'error' ? '#FF4D4D' : '#fff',
                        color: toast.type === 'error' ? 'white' : '#000',
                        padding: '12px 24px', borderRadius: '50px', fontWeight: 600, fontSize: '0.9rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 9999, whiteSpace: 'nowrap',
                        animation: 'msgFadeIn 0.3s ease-out'
                    }}>
                        {toast.msg}
                    </div>
                )}

                {/* Definitive Sidebar Fixed (Mobile) & Desktop Regular */}
                <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, position: 'relative' }}>
                        {/* Close button for mobile */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
                            className="sidebar-close-btn"
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer', zIndex: 10 }}
                        >
                            <X size={20} />
                        </button>

                        <button 
                            onClick={startNewChat}
                            style={{ background: 'white', color: 'black', border: 'none', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Plus size={18} /> Nuevo Chat
                        </button>

                        <div style={{ flex: 1, overflowY: 'auto', marginTop: '10px' }}>
                            <div style={{ padding: '0 12px', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Chats Recientes</div>
                            {conversations.map(conv => (
                                <div 
                                    key={conv.id} 
                                    className={`sidebar-item ${currentSessionId === conv.id ? 'active' : ''}`}
                                    onClick={() => { loadConversation(conv.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                                >
                                    <MessageSquare size={16} />
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#444', fontSize: '0.75rem', textAlign: 'center' }}>
                            Writi Nico v8.8.0
                        </div>
                    </div>
                </div>

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div 
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 2147483646, animation: 'msgFadeIn 0.3s' }}
                        className="mobile-overlay-only"
                    >
                        <div style={{ position: 'absolute', bottom: '100px', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 600 }}>Nico IA · v8.9.0</div>
                    </div>
                )}
                <style>{`
                    @media (min-width: 1025px) {
                        .mobile-overlay-only { display: none !important; }
                    }
                `}</style>
            </div>
        </div>
    );
}

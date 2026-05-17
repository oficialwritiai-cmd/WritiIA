'use client';
// Asistente IA (Chat Pro) — v8.9.9 (Nuclear Mobile Sidebar Fix — v1.16.8.4.1)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '@/app/components/ProjectContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Send, Mic, Calendar, Lightbulb, PenLine, Type, Sparkles, Save, X, Paperclip, ChevronDown, Menu, Plus, History, Trash2, MessageSquare, Copy, Brain } from 'lucide-react';
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

    const detectContext = (text) => {
        const t = text.toLowerCase();
        const isScript = /guion|script|escena|gancho|desarrollo|cta|diálogo|personaje|minutos|segundos|escrito/i.test(t);
        const isCalendar = /calendario|fecha|planificar|semana|mes|lunes|martes|miércoles|jueves|viernes|sábado|domingo/i.test(t);
        const isTitles = /títulos|titular|opciones de título|titulares/i.test(t);
        const isIdea = /idea|sugerencia|concepto|estrategia|viral|tendencia/i.test(t);
        
        // If nothing matches, we treat it as a general "Idea" fallback
        const hasAny = isScript || isCalendar || isTitles || isIdea;
        
        return { isScript, isCalendar, isTitles, isIdea, isDefault: !hasAny };
    };

    const ctx = detectContext(msg.content);

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
                padding: '14px 18px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                background: isUser
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))'
                    : 'rgba(255,255,255,0.03)',
                border: isUser
                    ? '1px solid rgba(124,58,237,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                color: 'white',
                fontSize: '0.95rem',
                lineHeight: '1.65',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {msg.content}
            </div>

            {/* Action Buttons for AI messages */}
            {!isUser && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', maxWidth: '85%' }}>
                    {/* Copiar siempre visible */}
                    <button onClick={() => navigator.clipboard.writeText(msg.content)}
                        style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Copy size={11} /> Copiar
                    </button>
                    {(ctx.isIdea || ctx.isDefault) && (
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
                    )}
                    {ctx.isScript && (
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
                            <PenLine size={14} /> {saved.script ? 'Guion Guardado' : 'Guardar Guion'}
                        </button>
                    )}
                    {(ctx.isCalendar || ctx.isScript) && (
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
                    )}
                    {ctx.isTitles && (
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
                    )}
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
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState('');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [toast, setToast] = useState(null);
    const [historyLoaded, setHistoryLoaded] = useState(true);
    const [conversations, setConversations] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    const [inputFocused, setInputFocused] = useState(false);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [showCommands, setShowCommands] = useState(false);

    const PLACEHOLDERS = [
        'Pega tu guión para mejorarlo...',
        '¿Sobre qué quieres crear hoy?',
        'Dame ideas para mi nicho...',
        'Reescribe este hook más agresivo...',
        'Escribe / para ver comandos rápidos',
    ];

    const SLASH_COMMANDS = [
        { cmd: '/guion', desc: 'Genera un guión completo sobre un tema' },
        { cmd: '/ideas', desc: '20 ideas virales para tu nicho' },
        { cmd: '/mejorar', desc: 'Mejora cualquier texto que pegues' },
        { cmd: '/hook', desc: '5 variantes del gancho' },
        { cmd: '/cta', desc: '5 CTAs para tu oferta' },
        { cmd: '/caption', desc: 'Caption listo para redes sociales' },
        { cmd: '/analiza', desc: 'Feedback detallado de un guión' },
    ];

    useEffect(() => {
        const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
        return () => clearInterval(t);
    }, []);

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user: sbUser } }) => {
            if (sbUser) {
                setUser(sbUser);
                setUserId(sbUser.id);
                const name = sbUser.user_metadata?.full_name?.split(' ')[0] || sbUser.email?.split('@')[0];
                if (name) setUserName(name);
            }
        });
    }, [supabase]);

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
                    id: sessionId || currentSessionId || null
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
            console.log('[Asistente] Response:', res.status, data);

            if (!res.ok) {
                console.error('[Asistente] API Error:', data);
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
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('¿Borrar definitivamente esta conversación?')) return;
        try {
            const res = await fetch(`/api/assistant/history?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Backend failed to delete');
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentSessionId === id) startNewChat();
            showToast('Conversación eliminada', 'info');
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar', 'error');
        }
    };

    const renameConversation = async (id, newTitle) => {
        if (!newTitle.trim()) return setEditingId(null);
        try {
            await fetch('/api/assistant/history', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, title: newTitle })
            });
            setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
            setEditingId(null);
            showToast('Renombrado', 'success');
        } catch {
            showToast('Error al renombrar', 'error');
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
                @keyframes nicoGlow {
                    0%,100% { box-shadow: 0 0 10px rgba(124,58,237,0.4); }
                    50% { box-shadow: 0 0 24px rgba(14,165,233,0.55); }
                }
                @keyframes nicoPulse {
                    0%,100% { opacity:1; transform: scale(1); }
                    50% { opacity:0.4; transform: scale(0.8); }
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
                    z-index: 2147483640;
                    transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-container.wide {
                    left: 0;
                }
                @media (max-width: 768px) {
                    .input-container {
                        left: 0;
                        padding-left: 16px;
                        padding-right: 16px;
                    }
                }
                @media (min-width: 1025px) {
                    .sidebar-close-btn { display: none !important; }
                }
            `}</style>
            
            <div className="chat-main" style={{ 
                background: '#050505', 
                position: isMobile ? 'relative' : 'fixed',
                top: isMobile ? 'auto' : '0',
                left: isMobile ? 'auto' : (isSidebarOpen ? '280px' : '72px'),
                right: isMobile ? 'auto' : 0,
                bottom: isMobile ? 'auto' : 0,
                width: isMobile ? '100%' : (isSidebarOpen ? 'calc(100vw - 280px)' : 'calc(100vw - 72px)'),
                height: isMobile ? 'auto' : '100vh',
                zIndex: isMobile ? 1 : 9999,
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '72px', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050505', zIndex: 110 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="mobile-only" onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: '8px' }}>
                            <History size={20} />
                        </button>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'nicoGlow 3s ease-in-out infinite' }}>
                            <Brain size={18} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Nico</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'nicoPulse 2s infinite' }} />
                                <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 600 }}>Activo</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="chat-container" style={{ position: 'absolute', top: '72px', left: 0, right: 0, bottom: '0', overflowY: 'auto', display: 'flex', flexDirection: 'column', zIndex: 10, paddingBottom: '140px', overflowX: 'hidden' }}>
                    
                    {/* Welcome Screen */}
                    {((!messages || messages.length === 0)) && (() => {
                        const hour = new Date().getHours();
                        const subtitle = hour < 12 ? '¿Listo para crear contenido?' : hour < 20 ? '¿Qué creamos hoy?' : 'Planifiquemos mañana';
                        const WELCOME_CARDS = [
                            { icon: <PenLine size={20} color="#a78bfa" />, title: 'Crear guión', desc: 'Dime tu tema y lo tenemos en 30 seg', prompt: 'Crea un guión completo para Reels sobre: ' },
                            { icon: <Lightbulb size={20} color="#f59e0b" />, title: '20 ideas para mi nicho', desc: 'Ideas virales personalizadas', prompt: '/ideas' },
                            { icon: <Sparkles size={20} color="#34d399" />, title: 'Mejorar mi gancho', desc: 'Pega tu texto y lo potenciamos', prompt: 'Mejora este gancho: ' },
                            { icon: <MessageSquare size={20} color="#60a5fa" />, title: 'Analizar un guión', desc: 'Feedback real y concreto', prompt: '/analiza ' },
                        ];
                        return (
                        <div className="welcome-screen" style={{ padding: '80px 24px 80px', textAlign: 'center', maxWidth: '620px', margin: '0 auto', width: '100%' }}>
                            {/* Greeting */}
                            <div style={{ marginBottom: '32px' }}>
                                <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.04em', color: '#fff' }}>
                                    Hola, {userName?.split(' ')[0] || 'creador'} 👋
                                </h1>
                                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{subtitle}</p>
                            </div>

                            {/* Avatar animado */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'nicoGlow 3s ease-in-out infinite', position: 'relative' }}>
                                    <Brain size={36} color="#fff" />
                                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', border: '2px solid #050505', animation: 'nicoPulse 2s infinite' }} />
                                </div>
                            </div>

                            {/* Cards contextuales */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {WELCOME_CARDS.map((card, i) => (
                                    <button key={i} onClick={() => setInput(card.prompt)}
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '8px' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                                        {card.icon}
                                        <div>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>{card.title}</p>
                                            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.4 }}>{card.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        );
                    })()}

                    {/* Chat Messages */}
                    {((messages && messages.length > 0) || !historyLoaded) && (
                        <div style={{ padding: '0 24px', maxWidth: '860px', width: '100%', margin: '0 auto', flex: 1 }}>
                            {(!historyLoaded && (!messages || messages.length === 0)) ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                                    <div className="loading-spinner" />
                                </div>
                            ) : (
                                <>
                                    {Array.isArray(messages) && messages.map((msg, index) => (
                                        <MessageBubble
                                            key={msg.id || index}
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
                                    <div ref={messagesEndRef} style={{ height: '100px' }} />
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className={`input-container ${!isSidebarOpen ? 'wide' : ''}`} style={{ 
                    zIndex: 2147483640,
                    paddingRight: isMobile ? '80px' : '24px' // Clear space for floating widgets
                }}>
                    <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto' }}>
                        {/* Comandos / */}
                        {showCommands && input.startsWith('/') && (
                            <div style={{ background: '#1a1a24', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}>
                                {SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.split(' ')[0])).map(c => (
                                    <button key={c.cmd} onClick={() => { setInput(c.cmd + ' '); setShowCommands(false); textareaRef.current?.focus(); }}
                                        style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'center' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>{c.cmd}</span>
                                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{c.desc}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{
                            display: 'flex', alignItems: 'flex-end',
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${inputFocused ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '20px', padding: '8px 12px 8px 18px',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxShadow: inputFocused ? '0 0 0 3px rgba(124,58,237,0.12)' : '0 8px 32px rgba(0,0,0,0.4)',
                            position: 'relative',
                        }}>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => {
                                    setInput(e.target.value);
                                    setShowCommands(e.target.value.startsWith('/'));
                                }}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => { setInputFocused(false); setTimeout(() => setShowCommands(false), 150); }}
                                onKeyDown={handleKeyDown}
                                placeholder={isTyping ? 'Nico está pensando...' : PLACEHOLDERS[placeholderIdx]}
                                rows={1}
                                style={{
                                    flex: 1, background: 'none', border: 'none', outline: 'none',
                                    color: isTyping ? '#555' : 'white',
                                    fontSize: '1rem', lineHeight: '1.5', resize: 'none', maxHeight: '150px',
                                    overflowY: 'auto', fontFamily: 'inherit', padding: '12px 0', alignSelf: 'center',
                                }}
                                onInput={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                                }}
                                disabled={isTyping}
                            />
                            {isTyping && (
                                <div style={{ position: 'absolute', top: '-28px', left: '20px', fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Sparkles size={12} /> Nico está escribiendo...
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, paddingLeft: '8px', alignSelf: 'center', paddingBottom: '2px' }}>
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={isTyping || !input.trim()}
                                    style={{
                                        height: '40px', width: '40px', borderRadius: '50%', border: 'none',
                                        background: !input.trim() || isTyping ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                        color: !input.trim() || isTyping ? '#444' : '#fff',
                                        cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s', flexShrink: 0,
                                        boxShadow: (!input.trim() || isTyping) ? 'none' : '0 4px 12px rgba(124,58,237,0.4)',
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.62rem', color: 'rgba(255,255,255,0.15)', marginTop: '8px' }}>
                            Escribe <span style={{ color: '#a78bfa', fontWeight: 700 }}>/</span> para ver comandos rápidos
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
                                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '40px' }}
                                >
                                    <MessageSquare size={16} style={{ flexShrink: 0 }} />
                                    {editingId === conv.id ? (
                                        <input
                                            autoFocus
                                            value={editingTitle}
                                            onChange={e => setEditingTitle(e.target.value)}
                                            onBlur={() => renameConversation(conv.id, editingTitle)}
                                            onKeyDown={e => e.key === 'Enter' && renameConversation(conv.id, editingTitle)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '0.9rem', width: '100%', borderRadius: '4px', padding: '2px 4px' }}
                                        />
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</span>
                                            <div className="hover-actions" style={{ position: 'absolute', right: '10px', display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingId(conv.id); setEditingTitle(conv.title); }}
                                                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0 }}
                                                >
                                                    <PenLine size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => deleteConversation(e, conv.id)}
                                                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0 }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#444', fontSize: '0.75rem', textAlign: 'center' }}>
                            Writi Nico v1.17.7
                        </div>
                    </div>
                </div>

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div 
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 2147483640, animation: 'msgFadeIn 0.3s' }}
                        className="mobile-overlay-only"
                    />
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

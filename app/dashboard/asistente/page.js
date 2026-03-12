'use client';
// Asistente IA (Chat Pro) — v3.0.0

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '@/app/components/ProjectContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Send, Mic, BookOpen, Calendar, Lightbulb, PenLine, Type, Sparkles, Save, X } from 'lucide-react';

// ── Particle Canvas (space background) ────────────────────
function ParticleCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        const particles = [];
        const COUNT = 120;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.3,
                dx: (Math.random() - 0.5) * 0.25,
                dy: (Math.random() - 0.5) * 0.25,
                alpha: Math.random() * 0.6 + 0.2,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(126, 206, 202, ${p.alpha})`;
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            });
            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', opacity: 0.45 }}
        />
    );
}

// ── Typing Indicator ──────────────────────────────────────
function TypingIndicator() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 16px', background: 'rgba(126,206,202,0.06)', border: '1px solid rgba(126,206,202,0.1)', borderRadius: '16px 16px 16px 4px', width: 'fit-content', marginBottom: '8px' }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7ECECA', display: 'inline-block', animation: `typingPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: '16px', animation: 'msgFadeIn 0.35s ease-out' }}>
            {!isUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #7ECECA, #9D00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>✨</div>
                    <span style={{ fontSize: '0.75rem', color: '#7ECECA', fontWeight: 700 }}>WRITI IA</span>
                </div>
            )}

            <div style={{
                maxWidth: '78%',
                padding: '14px 18px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: isUser
                    ? 'linear-gradient(135deg, rgba(126,206,202,0.18), rgba(157,0,255,0.12))'
                    : 'rgba(255,255,255,0.04)',
                border: isUser
                    ? '1px solid rgba(126,206,202,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {msg.content}
            </div>

            {/* Action Buttons for AI messages */}
            {!isUser && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxWidth: '78%' }}>
                    <button
                        onClick={() => handleAction('idea', onSaveIdea)}
                        disabled={!!saved.idea}
                        style={{
                            fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.4)',
                            background: saved.idea ? 'rgba(16,185,129,0.2)' : 'transparent', color: saved.idea ? '#10B981' : '#888',
                            cursor: saved.idea ? 'default' : 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <Save size={12} /> {saved.idea ? '✓ Idea guardada' : 'Guardar como Idea'}
                    </button>
                    <button
                        onClick={() => handleAction('script', onSaveScript)}
                        disabled={!!saved.script}
                        style={{
                            fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(126,206,202,0.3)',
                            background: saved.script ? 'rgba(126,206,202,0.15)' : 'transparent', color: saved.script ? '#7ECECA' : '#888',
                            cursor: saved.script ? 'default' : 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <PenLine size={12} /> {saved.script ? '✓ Guardado' : 'Guardar como Guion'}
                    </button>
                    <button
                        onClick={() => setCalendarOpen(true)}
                        style={{
                            fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(157,0,255,0.4)',
                            background: 'transparent', color: '#888', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <Calendar size={12} /> Planificar
                    </button>
                    <button
                        onClick={onGenerateTitles}
                        style={{
                            fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.3)',
                            background: 'transparent', color: '#888', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <Type size={12} /> Generar Títulos
                    </button>
                    <button
                        onClick={onGenerateScript}
                        style={{
                            fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent', color: '#888', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <Sparkles size={12} /> Generar Guion
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

// ── Quick Chips ───────────────────────────────────────────
const QUICK_MODES = [
    { label: 'Ideas de contenido', icon: '💡', mode: 'ideas de contenido viral', prompt: 'Dame ideas de contenido viral para mi niche y plataforma. Dame al menos 5 ideas creativas con ángulos únicos.' },
    { label: 'Títulos y Copys', icon: '📋', mode: 'títulos y copys', prompt: 'Genera títulos virales y copys atractivos para mi próximo contenido. Usa mi tono y estilo de marca.' },
    { label: 'Guiones', icon: '🎬', mode: 'guiones', prompt: 'Ayúdame a crear un guion para un video corto. Dame la estructura completa: gancho, desarrollo y CTA.' },
    { label: 'Calendario', icon: '📅', mode: 'planificación de calendario', prompt: 'Ayúdame a planificar mi contenido para esta semana. ¿Qué debería publicar y cuándo para maximizar el engagement?' },
    { label: 'Biblioteca', icon: '📚', mode: 'biblioteca y organización', prompt: 'Revisa mi estrategia de contenido. ¿Cómo puedo mejorar mis guiones y referencias para tener más impacto?' },
];

// ── Main Page ─────────────────────────────────────────────
export default function AsistentePage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userId, setUserId] = useState(null);
    const [toast, setToast] = useState(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    // Get userId once
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, []);

    // Load history when userId or project changes
    useEffect(() => {
        if (!userId) return;
        setHistoryLoaded(false);
        setMessages([]);

        const projectId = activeProject?.id || null;
        fetch(`/api/assistant/history?userId=${userId}&projectId=${projectId || 'null'}`)
            .then(r => r.json())
            .then(data => {
                if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                } else {
                    // Welcome message
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: `¡Hola! 👋 Soy tu Asistente WRITI IA.\n\nEstoy conectado al Cerebro IA de tu proyecto **${activeProject?.name || 'activo'}** y puedo ayudarte con:\n\n💡 **Ideas de contenido** virales para tu nicho\n📋 **Títulos y copys** que generan engagement\n🎬 **Guiones completos** para Reels, TikTok y YouTube\n📅 **Planificación** de tu calendario de contenido\n\n¿Por dónde empezamos hoy?`,
                        timestamp: new Date().toISOString()
                    }]);
                }
                setHistoryLoaded(true);
            })
            .catch(() => setHistoryLoaded(true));
    }, [userId, activeProject?.id]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const saveHistory = useCallback(async (updatedMessages) => {
        if (!userId) return;
        try {
            await fetch('/api/assistant/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, projectId: activeProject?.id || null, messages: updatedMessages })
            });
        } catch {}
    }, [userId, activeProject?.id]);

    const sendMessage = async (text, mode = null) => {
        const messageText = text || input.trim();
        if (!messageText || isTyping) return;

        const userMsg = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date().toISOString() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
            const res = await fetch('/api/assistant/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    projectId: activeProject?.id || null,
                    messages: apiMessages,
                    mode
                })
            });

            const data = await res.json();

            if (data.code === 'NO_CREDITS') {
                showToast('Créditos insuficientes. Compra más créditos para continuar.', 'error');
                setIsTyping(false);
                return;
            }

            if (data.error) throw new Error(data.error);

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

    const handleQuickChip = (chip) => {
        sendMessage(chip.prompt, chip.mode);
    };

    const handleClearChat = async () => {
        if (!confirm('¿Borrar el historial de esta conversación?')) return;
        setMessages([]);
        if (userId) {
            await fetch('/api/assistant/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, projectId: activeProject?.id || null, messages: [] })
            });
        }
    };

    return (
        <div style={{ position: 'relative', height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#050505' }}>
            <ParticleCanvas />

            {/* CSS */}
            <style>{`
                @keyframes msgFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes typingPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                .chip-btn:hover { border-color: rgba(126,206,202,0.5) !important; color: #7ECECA !important; background: rgba(126,206,202,0.06) !important; }
                .action-btn:hover { border-color: rgba(126,206,202,0.5) !important; color: white !important; }
                .send-btn:hover { box-shadow: 0 0 20px rgba(126,206,202,0.6) !important; transform: scale(1.05); }
            `}</style>

            {/* Header */}
            <div style={{ position: 'relative', zIndex: 10, padding: '20px 24px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7ECECA, #9D00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 20px rgba(126,206,202,0.3)' }}>✨</div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #7ECECA, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Asistente WRITI IA
                                </h1>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
                                    Conectado al Cerebro IA de: <span style={{ color: '#7ECECA', fontWeight: 700 }}>{activeProject?.name || 'Sin proyecto'}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleClearChat}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
                    >
                        Limpiar chat
                    </button>
                </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
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
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input area */}
            <div style={{ position: 'relative', zIndex: 10, padding: '0 24px 24px', flexShrink: 0 }}>
                {/* Quick chips */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
                    {QUICK_MODES.map(chip => (
                        <button
                            key={chip.label}
                            onClick={() => handleQuickChip(chip)}
                            disabled={isTyping}
                            className="chip-btn"
                            style={{
                                flexShrink: 0, fontSize: '0.78rem', padding: '7px 14px', borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
                                color: 'rgba(255,255,255,0.65)', cursor: 'pointer', transition: '0.2s',
                                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px',
                                opacity: isTyping ? 0.5 : 1
                            }}
                        >
                            {chip.icon} {chip.label}
                        </button>
                    ))}
                </div>

                {/* Text input */}
                <div style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-end',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(126,206,202,0.2)',
                    borderRadius: '20px', padding: '12px 16px',
                    boxShadow: '0 0 40px rgba(126,206,202,0.05)',
                    transition: '0.3s'
                }}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Pregúntale a tu asistente sobre ideas, títulos, guiones, calendario…"
                        rows={1}
                        style={{
                            flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white',
                            fontSize: '0.95rem', lineHeight: '1.5', resize: 'none', maxHeight: '120px',
                            overflowY: 'auto', fontFamily: 'inherit'
                        }}
                        onInput={e => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                        disabled={isTyping}
                    />
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                            title="Dictado (próximamente)"
                            style={{ background: 'none', border: 'none', color: '#555', cursor: 'not-allowed', padding: '4px', display: 'flex', alignItems: 'center' }}
                        >
                            <Mic size={20} />
                        </button>
                        <button
                            onClick={() => sendMessage()}
                            disabled={isTyping || !input.trim()}
                            className="send-btn"
                            style={{
                                width: '40px', height: '40px', borderRadius: '12px', border: 'none',
                                background: !input.trim() || isTyping ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7ECECA, #5bb8b8)',
                                color: !input.trim() || isTyping ? '#555' : '#0a0a0a',
                                cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: '0.2s', flexShrink: 0
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
                <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#333', marginTop: '10px' }}>
                    Enter para enviar · Shift+Enter para salto de línea · 1 crédito por mensaje
                </p>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
                    background: toast.type === 'error' ? '#FF4D4D' : '#7ECECA',
                    color: toast.type === 'error' ? 'white' : '#0a0a0a',
                    padding: '12px 24px', borderRadius: '50px', fontWeight: 700,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 3000, whiteSpace: 'nowrap',
                    animation: 'msgFadeIn 0.3s ease-out'
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

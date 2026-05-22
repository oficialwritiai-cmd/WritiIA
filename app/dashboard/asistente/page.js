'use client';
// Asistente IA Nico — v9.0.0

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '@/app/components/ProjectContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Send, Lightbulb, PenLine, Sparkles, Save, X, Plus, History, Trash2, MessageSquare, Copy, Brain } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// ── Markdown parser (sin dependencias externas) ───────────────
function parseMarkdown(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // HR
        if (/^---+$/.test(line.trim())) {
            blocks.push({ type: 'hr' });
            i++; continue;
        }
        // H1
        if (/^# /.test(line)) {
            blocks.push({ type: 'h1', text: line.replace(/^# /, '') });
            i++; continue;
        }
        // H2
        if (/^## /.test(line)) {
            blocks.push({ type: 'h2', text: line.replace(/^## /, '') });
            i++; continue;
        }
        // H3
        if (/^### /.test(line)) {
            blocks.push({ type: 'h3', text: line.replace(/^### /, '') });
            i++; continue;
        }
        // Lista con - o ·
        if (/^[\-·•]\s/.test(line.trim())) {
            const items = [];
            while (i < lines.length && /^[\-·•]\s/.test(lines[i].trim())) {
                items.push(lines[i].replace(/^[\s]*[\-·•]\s/, ''));
                i++;
            }
            blocks.push({ type: 'ul', items });
            continue;
        }
        // Lista numerada
        if (/^\d+[\.\)]\s/.test(line.trim())) {
            const items = [];
            while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
                items.push(lines[i].replace(/^\d+[\.\)]\s/, ''));
                i++;
            }
            blocks.push({ type: 'ol', items });
            continue;
        }
        // Línea vacía
        if (!line.trim()) { i++; continue; }
        // Párrafo
        blocks.push({ type: 'p', text: line });
        i++;
    }
    return blocks;
}

function inlineFormat(text) {
    if (!text) return null;
    const parts = [];
    const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
    let last = 0, m;
    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push(<span key={last}>{text.slice(last, m.index)}</span>);
        if (m[2]) parts.push(<strong key={m.index} style={{ fontWeight: 700, color: '#fff' }}>{m[2]}</strong>);
        if (m[3]) parts.push(<code key={m.index} style={{ background: '#1E1B2E', color: '#a78bfa', padding: '1px 6px', borderRadius: '4px', fontSize: '0.88em', fontFamily: 'monospace' }}>{m[3]}</code>);
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
    return parts.length ? parts : text;
}

function MarkdownRenderer({ content }) {
    const blocks = parseMarkdown(content);
    return (
        <div style={{ lineHeight: 1.7, fontSize: '0.93rem', color: '#E5E7EB' }}>
            {blocks.map((b, idx) => {
                if (b.type === 'hr') return <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '14px 0' }} />;
                if (b.type === 'h1') return <h1 key={idx} style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '16px 0 8px', lineHeight: 1.3 }}>{inlineFormat(b.text)}</h1>;
                if (b.type === 'h2') return <h2 key={idx} style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '14px 0 6px', lineHeight: 1.3 }}>{inlineFormat(b.text)}</h2>;
                if (b.type === 'h3') return <h3 key={idx} style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa', margin: '12px 0 5px' }}>{inlineFormat(b.text)}</h3>;
                if (b.type === 'ul') return (
                    <ul key={idx} style={{ margin: '6px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {b.items.map((item, ii) => (
                            <li key={ii} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <span style={{ color: '#a78bfa', marginTop: '2px', flexShrink: 0, fontSize: '1rem' }}>·</span>
                                <span style={{ color: '#E5E7EB' }}>{inlineFormat(item)}</span>
                            </li>
                        ))}
                    </ul>
                );
                if (b.type === 'ol') return (
                    <ol key={idx} style={{ margin: '6px 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {b.items.map((item, ii) => (
                            <li key={ii} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <span style={{ color: '#a78bfa', marginTop: '2px', flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, minWidth: '18px' }}>{ii + 1}.</span>
                                <span style={{ color: '#E5E7EB' }}>{inlineFormat(item)}</span>
                            </li>
                        ))}
                    </ol>
                );
                if (b.type === 'p') return <p key={idx} style={{ margin: '4px 0', color: '#E5E7EB' }}>{inlineFormat(b.text)}</p>;
                return null;
            })}
        </div>
    );
}

// ── Typing Indicator animado ──────────────────────────────────
const TYPING_MSGS = ['Nico está pensando...', 'Analizando tu Cerebro IA...', 'Construyendo la respuesta...'];

function TypingIndicator() {
    const [msgIdx, setMsgIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setMsgIdx(i => (i + 1) % TYPING_MSGS.length), 3000);
        return () => clearInterval(t);
    }, []);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#111118', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '4px 16px 16px 16px', width: 'fit-content', marginBottom: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                ))}
            </div>
            <span style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 500 }}>{TYPING_MSGS[msgIdx]}</span>
        </div>
    );
}

// ── Extrae ideas con 💡 del texto de respuesta ────────────────
function extractIdeas(content) {
    const lines = content.split('\n');
    const ideas = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('💡')) {
            const title = line.replace(/^💡\s*/, '').replace(/\*\*/g, '').trim();
            if (title.length > 3) ideas.push(title);
        }
    }
    return ideas;
}

// ── Message Bubble ─────────────────────────────────────────────
function MessageBubble({ msg, onSaveIdea, onSaveScript, onGenerateScript }) {
    const isUser = msg.role === 'user';
    const [saved, setSaved] = useState({});
    const [copied, setCopied] = useState(false);

    const isScript = /## GANCHO|## DESARROLLO|## CTA/i.test(msg.content);
    const ideas = !isUser ? extractIdeas(msg.content) : [];

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isUser) {
        return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', animation: 'msgFadeIn 0.3s ease-out' }}>
                <div style={{
                    maxWidth: '75%', padding: '12px 18px',
                    borderRadius: '18px 18px 4px 18px',
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(109,40,217,0.15))',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: '#f1f1f3', fontSize: '0.93rem', lineHeight: 1.65, wordBreak: 'break-word',
                }}>
                    {msg.content}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', animation: 'msgFadeIn 0.35s ease-out', width: '100%' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800 }}>N</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Nico</div>

                <div style={{ padding: '18px 22px', background: '#111118', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '4px 16px 16px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', wordBreak: 'break-word' }}>
                    <MarkdownRenderer content={msg.content} />
                </div>

                {/* Botón "Generar guión" por cada idea detectada */}
                {ideas.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                        {ideas.map((idea, i) => (
                            <button key={i} onClick={() => onGenerateScript(idea)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '10px', color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: '0.2s', textAlign: 'left' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'; }}>
                                <span>⚡</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Generar guión: {idea.length > 50 ? idea.slice(0, 50) + '...' : idea}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Acciones globales */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button onClick={handleCopy}
                        style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)', color: copied ? '#34d399' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s' }}>
                        <Copy size={10} /> {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    {isScript && (
                        <button onClick={() => { if (!saved.script) { onSaveScript(); setSaved(p => ({ ...p, script: true })); } }}
                            disabled={!!saved.script}
                            style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${saved.script ? 'rgba(126,206,202,0.3)' : 'rgba(255,255,255,0.08)'}`, background: saved.script ? 'rgba(126,206,202,0.08)' : 'rgba(255,255,255,0.03)', color: saved.script ? '#7ECECA' : 'rgba(255,255,255,0.4)', cursor: saved.script ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s' }}>
                            <PenLine size={10} /> {saved.script ? 'Guion guardado' : 'Guardar guion'}
                        </button>
                    )}
                    {!isScript && ideas.length === 0 && (
                        <button onClick={() => { if (!saved.idea) { onSaveIdea(); setSaved(p => ({ ...p, idea: true })); } }}
                            disabled={!!saved.idea}
                            style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${saved.idea ? 'rgba(126,206,202,0.3)' : 'rgba(255,255,255,0.08)'}`, background: saved.idea ? 'rgba(126,206,202,0.08)' : 'rgba(255,255,255,0.03)', color: saved.idea ? '#7ECECA' : 'rgba(255,255,255,0.4)', cursor: saved.idea ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s' }}>
                            <Save size={10} /> {saved.idea ? 'Guardado' : 'Guardar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────
export default function AsistentePage() {
    const [user, setUser]                     = useState(null);
    const [userId, setUserId]                 = useState(null);
    const [userName, setUserName]             = useState('');
    const [messages, setMessages]             = useState([]);
    const [input, setInput]                   = useState('');
    const [isTyping, setIsTyping]             = useState(false);
    const [toast, setToast]                   = useState(null);
    const [historyLoaded, setHistoryLoaded]   = useState(true);
    const [conversations, setConversations]   = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen]   = useState(false);
    const [editingId, setEditingId]           = useState(null);
    const [editingTitle, setEditingTitle]     = useState('');
    const [inputFocused, setInputFocused]     = useState(false);
    const [showCommands, setShowCommands]     = useState(false);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [isMobile, setIsMobile]             = useState(false);

    const messagesEndRef = useRef(null);
    const textareaRef    = useRef(null);
    const supabase       = createSupabaseClient();
    const { activeProject } = useProject();
    const searchParams = useSearchParams();
    const router = useRouter();

    const PLACEHOLDERS = ['Pega tu guión para mejorarlo...', '¿Sobre qué quieres crear hoy?', 'Dame ideas para mi nicho...', 'Reescribe este hook más agresivo...', 'Escribe / para ver comandos rápidos'];
    const SLASH_COMMANDS = [
        { cmd: '/guion',   desc: 'Genera un guión completo sobre un tema' },
        { cmd: '/ideas',   desc: '20 ideas virales para tu nicho' },
        { cmd: '/mejorar', desc: 'Mejora cualquier texto que pegues' },
        { cmd: '/hook',    desc: '5 variantes del gancho' },
        { cmd: '/cta',     desc: '5 CTAs para tu oferta' },
        { cmd: '/caption', desc: 'Caption listo para redes sociales' },
        { cmd: '/analiza', desc: 'Feedback detallado de un guión' },
    ];

    useEffect(() => {
        const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
        return () => clearInterval(t);
    }, []);

    // localStorage para sobrevivir recargas de pestaña
    useEffect(() => {
        try { localStorage.setItem('nico_draft_input', input); } catch {}
    }, [input]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('nico_draft_input');
            if (saved) setInput(saved);
        } catch {}
    }, []);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user: u } }) => {
            if (u) {
                setUser(u); setUserId(u.id);
                const name = u.user_metadata?.full_name?.split(' ')[0] || u.email?.split('@')[0];
                if (name) setUserName(name);
            }
        });
    }, []);

    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/assistant/history?userId=${userId}&projectId=${activeProject?.id || 'null'}`);
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch {}
    }, [userId, activeProject?.id]);

    const loadConversation = useCallback(async (sessionId) => {
        if (!userId || !sessionId) return;
        setHistoryLoaded(false);
        try {
            const res = await fetch(`/api/assistant/history?userId=${userId}&id=${sessionId}`);
            const data = await res.json();
            setMessages(data.messages || []);
            setCurrentSessionId(sessionId);
        } catch {} finally {
            setHistoryLoaded(true);
        }
    }, [userId]);

    const startNewChat = () => {
        setMessages([]); setCurrentSessionId(null);
        if (isMobile) setIsSidebarOpen(false);
    };

    useEffect(() => {
        if (!userId) return;
        setHistoryLoaded(false);
        fetchConversations().finally(() => setHistoryLoaded(true));
    }, [userId, activeProject?.id, fetchConversations]);

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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, projectId: activeProject?.id || null, messages: updatedMessages, id: sessionId || currentSessionId || null })
            });
            const data = await res.json();
            if (data.id && !currentSessionId) { setCurrentSessionId(data.id); fetchConversations(); }
        } catch {}
    }, [userId, activeProject?.id, currentSessionId, fetchConversations]);

    const sendMessage = async (text, mode = null) => {
        const messageText = text || input.trim();
        if (!messageText || isTyping) return;

        const userMsg = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date().toISOString() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages); setInput(''); setIsTyping(true);
        try { localStorage.removeItem('nico_draft_input'); } catch {}
        if (textareaRef.current) textareaRef.current.style.height = '24px';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/assistant/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ userId, projectId: activeProject?.id || null, messages: newMessages.map(m => ({ role: m.role, content: m.content })), mode, userName })
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'NO_CREDITS')  showToast('Créditos insuficientes. Compra más para continuar.', 'error');
                else if (data.code === 'RATE_LIMIT') showToast(data.error || 'Límite alcanzado', 'error');
                else showToast(data.error || 'Error al conectar con la IA', 'error');
                setIsTyping(false); return;
            }

            const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply, timestamp: new Date().toISOString() };
            const finalMessages = [...newMessages, aiMsg];
            setMessages(finalMessages);
            await saveHistory(finalMessages);
        } catch {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Tuvimos un problema al conectar con la IA. Inténtalo de nuevo. 🔄', timestamp: new Date().toISOString() }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleGenerateScript = (ideaTitle) => {
        try {
            sessionStorage.setItem('from_idea_context', JSON.stringify({
                from_idea: true,
                from_nico: true,
                idea_title: ideaTitle,
                platform: activeProject?.platform || 'Reels',
            }));
        } catch {}
        router.push('/dashboard?from_idea=1');
    };

    const handleSaveToLibrary = async (content, type = 'idea') => {
        if (!userId) return;
        try {
            const { error } = await supabase.from('library').insert({
                user_id: userId, project_id: activeProject?.id || null, type,
                platform: 'General', content: { descripcion: content, titulo_idea: content.substring(0, 80) },
                titulo: content.substring(0, 80), script_full_text: content, status: 'borrador', tags: ['asistente-ia']
            });
            if (error) throw error;
            showToast(type === 'idea' ? '💡 Idea guardada en Biblioteca' : '📝 Guion guardado en Biblioteca');
        } catch { showToast('Error al guardar en Biblioteca', 'error'); }
    };

    const deleteConversation = async (e, id) => {
        e.preventDefault(); e.stopPropagation();
        if (!confirm('¿Borrar esta conversación?')) return;
        try {
            const res = await fetch(`/api/assistant/history?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentSessionId === id) startNewChat();
            showToast('Conversación eliminada');
        } catch { showToast('Error al eliminar', 'error'); }
    };

    const renameConversation = async (id, newTitle) => {
        if (!newTitle.trim()) return setEditingId(null);
        try {
            await fetch('/api/assistant/history', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: newTitle }) });
            setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
            setEditingId(null); showToast('Renombrado');
        } catch { showToast('Error al renombrar', 'error'); }
    };

    const WELCOME_CARDS = [
        { icon: <PenLine size={18} color="#a78bfa" />, title: 'Crear guión', desc: 'Dime tu tema y lo escribimos', prompt: 'Crea un guión completo para Reels sobre: ' },
        { icon: <Lightbulb size={18} color="#f59e0b" />, title: '20 ideas para mi nicho', desc: 'Ideas virales personalizadas', prompt: '/ideas' },
        { icon: <Sparkles size={18} color="#34d399" />, title: 'Mejorar mi gancho', desc: 'Pega tu texto y lo potenciamos', prompt: 'Mejora este gancho: ' },
        { icon: <MessageSquare size={18} color="#60a5fa" />, title: 'Analizar un guión', desc: 'Feedback real y concreto', prompt: '/analiza ' },
    ];

    return (
        <>
        <style>{`
            @keyframes msgFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
            @keyframes typingBounce { 0%,100% { transform:translateY(0); opacity:0.4; } 50% { transform:translateY(-5px); opacity:1; } }
            @keyframes nicoGlow { 0%,100% { box-shadow:0 0 10px rgba(124,58,237,0.4); } 50% { box-shadow:0 0 22px rgba(14,165,233,0.5); } }
            @keyframes nicoPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
            .sidebar-item { padding:10px 14px; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:10px; color:#666; font-size:0.87rem; transition:0.15s; margin:2px 10px; }
            .sidebar-item:hover { background:rgba(255,255,255,0.05); color:#fff; }
            .sidebar-item.active { background:rgba(124,58,237,0.12); color:#a78bfa; border:1px solid rgba(124,58,237,0.2); }
            .send-btn:hover { background:#fff !important; color:#000 !important; }
            .welcome-card:hover { background:rgba(124,58,237,0.08) !important; border-color:rgba(124,58,237,0.25) !important; transform:translateY(-2px); }
        `}</style>

        {/* Wrapper: height:100% fills whatever the dashboard gives, flex row */}
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: '#070709', position: 'relative' }}>

            {/* Chat History Sidebar — inline flex column, width transitions, NO position:fixed */}
            <div style={{
                width: isSidebarOpen ? '260px' : '0px',
                minWidth: isSidebarOpen ? '260px' : '0px',
                overflow: 'hidden',
                transition: 'width 0.28s ease, min-width 0.28s ease',
                background: '#0e0e16',
                borderRight: isSidebarOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
            }}>
                <div style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden', width: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Historial</span>
                        <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                    </div>
                    <button onClick={startNewChat} style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontWeight: 600, fontSize: '0.87rem', cursor: 'pointer' }}>
                        <Plus size={16} /> Nuevo chat
                    </button>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {conversations.map(conv => (
                            <div key={conv.id} className={`sidebar-item ${currentSessionId === conv.id ? 'active' : ''}`}
                                onClick={() => { loadConversation(conv.id); if (isMobile) setIsSidebarOpen(false); }}
                                style={{ position: 'relative', paddingRight: '50px' }}>
                                <MessageSquare size={14} style={{ flexShrink: 0 }} />
                                {editingId === conv.id ? (
                                    <input autoFocus value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                                        onBlur={() => renameConversation(conv.id, editingTitle)}
                                        onKeyDown={e => e.key === 'Enter' && renameConversation(conv.id, editingTitle)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '0.87rem', width: '100%', borderRadius: '4px', padding: '2px 4px', outline: 'none' }} />
                                ) : (
                                    <>
                                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.87rem' }}>{conv.title}</span>
                                        <div style={{ position: 'absolute', right: '10px', display: 'flex', gap: '6px' }}>
                                            <button onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditingTitle(conv.title); }}
                                                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}><PenLine size={12} /></button>
                                            <button onClick={e => deleteConversation(e, conv.id)}
                                                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#333', textAlign: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>Nico v9.0</div>
                </div>
            </div>

            {/* Main chat area — fills content area without fixed positioning */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>

                {/* Header */}
                <div style={{ height: '60px', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#070709', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => setIsSidebarOpen(v => !v)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                            <History size={18} />
                        </button>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'nicoGlow 3s ease-in-out infinite' }}>
                            <Brain size={16} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Nico</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'nicoPulse 2s infinite' }} />
                                <span style={{ fontSize: '0.62rem', color: '#34d399', fontWeight: 600 }}>Activo</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => { if (confirm('¿Empezar nuevo chat?')) startNewChat(); }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={13} /> Nuevo
                    </button>
                </div>

                {/* Messages area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 0', minHeight: 0 }}>
                    <div style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '160px' }}>

                        {/* Welcome screen */}
                        {messages.length === 0 && historyLoaded && (
                            <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'nicoGlow 3s ease-in-out infinite' }}>
                                    <Brain size={32} color="#fff" />
                                </div>
                                <h1 style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
                                    Hola, {userName || 'creador'} 👋
                                </h1>
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', marginBottom: '36px' }}>¿Qué creamos hoy?</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '520px', margin: '0 auto' }}>
                                    {WELCOME_CARDS.map((card, i) => (
                                        <button key={i} className="welcome-card" onClick={() => setInput(card.prompt)}
                                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: '7px', color: '#fff' }}>
                                            {card.icon}
                                            <div>
                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{card.title}</p>
                                                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{card.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Loading */}
                        {!historyLoaded && messages.length === 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.08)', borderRadius: '50%', borderTopColor: '#7c3aed', animation: 'typingBounce 1s linear infinite' }} />
                            </div>
                        )}

                        {/* Messages */}
                        {messages.map((msg, idx) => (
                            <MessageBubble key={msg.id || idx} msg={msg}
                                onSaveIdea={() => handleSaveToLibrary(msg.content, 'idea')}
                                onSaveScript={() => handleSaveToLibrary(msg.content, 'guion')}
                                onGenerateScript={handleGenerateScript} />
                        ))}
                        {isTyping && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input */}
                <div style={{ padding: '16px 24px 20px', background: 'linear-gradient(to top, #070709 85%, transparent)', flexShrink: 0 }}>
                    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                        {/* Slash commands */}
                        {showCommands && input.startsWith('/') && (
                            <div style={{ background: '#131320', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', overflow: 'hidden', marginBottom: '6px', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}>
                                {SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.split(' ')[0])).map(c => (
                                    <button key={c.cmd} onClick={() => { setInput(c.cmd + ' '); setShowCommands(false); textareaRef.current?.focus(); }}
                                        style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a78bfa', fontWeight: 700 }}>{c.cmd}</span>
                                        <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.35)' }}>{c.desc}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div style={{
                            display: 'flex', alignItems: 'flex-end', gap: '10px',
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${inputFocused ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.07)'}`,
                            borderRadius: '18px', padding: '8px 10px 8px 18px',
                            boxShadow: inputFocused ? '0 0 0 3px rgba(124,58,237,0.1)' : '0 6px 24px rgba(0,0,0,0.3)',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}>
                            <textarea ref={textareaRef} value={input}
                                onChange={e => { setInput(e.target.value); setShowCommands(e.target.value.startsWith('/')); }}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => { setInputFocused(false); setTimeout(() => setShowCommands(false), 150); }}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
                                placeholder={isTyping ? 'Nico está pensando...' : PLACEHOLDERS[placeholderIdx]}
                                disabled={isTyping} rows={1}
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: isTyping ? '#555' : '#fff', fontSize: '0.95rem', lineHeight: 1.5, resize: 'none', maxHeight: '140px', overflowY: 'auto', fontFamily: 'inherit', padding: '10px 0', alignSelf: 'center' }}
                            />
                            <button className="send-btn" onClick={() => sendMessage()} disabled={isTyping || !input.trim()}
                                style={{ height: '38px', width: '38px', borderRadius: '50%', border: 'none', flexShrink: 0, alignSelf: 'flex-end', marginBottom: '2px', background: !input.trim() || isTyping ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: !input.trim() || isTyping ? '#444' : '#fff', cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', boxShadow: !input.trim() || isTyping ? 'none' : '0 4px 12px rgba(124,58,237,0.35)' }}>
                                <Send size={16} />
                            </button>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.6rem', color: 'rgba(255,255,255,0.12)', marginTop: '6px' }}>
                            Escribe <span style={{ color: '#a78bfa' }}>/</span> para comandos · Enter para enviar · Shift+Enter para nueva línea
                        </p>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: '#fff', padding: '10px 22px', borderRadius: '50px', fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 9999, whiteSpace: 'nowrap', animation: 'msgFadeIn 0.25s ease-out' }}>
                    {toast.msg}
                </div>
            )}
        </div>
        </>
    );
}

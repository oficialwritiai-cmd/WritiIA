'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ChevronRight, ChevronLeft, Zap, BookOpen, RotateCcw, TrendingUp, Users, Play, Layers } from 'lucide-react';
import VoiceDictation from '@/app/components/VoiceDictation';

const TONOS = ['brutal honesto', 'polémico', 'cercano', 'elegante', 'experto'];
const HOOK_ICONS = { 'historia personal': BookOpen, 'pain fuerte': Zap, 'contraintuitivo': RotateCcw, 'prueba social': TrendingUp, 'curiosidad extrema': Layers };
const HOOK_LABELS = { 'historia personal': 'Historia personal', 'pain fuerte': 'Pain fuerte', 'contraintuitivo': 'Contraintuitivo', 'prueba social': 'Prueba social', 'curiosidad extrema': 'Curiosidad' };
const PLATFORMS = ['Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn'];
const PLAT_COLORS = { Reels: '#e1306c', TikTok: '#ff0050', 'YouTube Shorts': '#ff0000', LinkedIn: '#0a66c2' };
const PROMPTS = [
    '¿Tienes una historia relacionada con este tema?',
    '¿Cuál es tu opinión más honesta sobre esto?',
    '¿Un cliente tuyo vivió algo así? Cuéntamelo.',
];
const TIPS = [
    'Los hooks en pregunta tienen 40% más retención',
    'Los primeros 3 segundos definen si te siguen viendo',
    'Los guiones con historia personal convierten 3× más',
    'Hablar de errores genera más conexión que los logros',
];

const phaseNames = ['Tu idea', 'Cuéntame más', 'Detalles', 'Generando'];

export default function ScriptWizardFlow({
    topic, setTopic,
    toneBrand, setToneBrand,
    hookType, setHookType,
    platform, setPlatform,
    quantity, setQuantity,
    experienciaReal, setExperienciaReal,
    initialPhase = 1,
    onBack, onGenerate,
}) {
    const [phase, setPhase] = useState(initialPhase); // respects voice-story jump to phase 3
    const [promptIdx, setPromptIdx]   = useState(0);
    const [tipIdx, setTipIdx]         = useState(0);
    const [dir, setDir]               = useState(1); // slide direction
    const [ideaContext, setIdeaContext] = useState(null);

    // Load idea context from sessionStorage (from calendar "Crear guión" flow)
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('from_idea_context');
            if (raw) {
                const ctx = JSON.parse(raw);
                if (ctx?.from_idea) {
                    setIdeaContext(ctx);
                    if (!topic && ctx.idea_title) setTopic(ctx.idea_title);
                    if (ctx.platform && setPlatform) setPlatform(ctx.platform);
                    setPhase(3);
                }
            }
        } catch(e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rotating prompts phase 2
    useEffect(() => {
        if (phase !== 2) return;
        const t = setInterval(() => setPromptIdx(i => (i + 1) % PROMPTS.length), 3000);
        return () => clearInterval(t);
    }, [phase]);

    // Rotating tips phase 4 (loading)
    useEffect(() => {
        const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 3500);
        return () => clearInterval(t);
    }, []);

    function goNext() { setDir(1); setPhase(p => Math.min(p + 1, 3)); }
    function goPrev() {
        if (phase === 1) { onBack(); return; }
        setDir(-1); setPhase(p => Math.max(p - 1, 1));
    }

    const canNext = phase === 1 ? topic.trim().length > 0 : true;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '520px', position: 'relative', fontFamily: "'Inter', sans-serif" }}>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                {[1,2,3].map(n => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: n < 3 ? 1 : 'none' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: phase > n ? '#a78bfa' : phase === n ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                            border: phase === n ? '2px solid rgba(124,58,237,0.5)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 800,
                            color: phase > n ? '#fff' : phase === n ? '#fff' : 'rgba(255,255,255,0.3)',
                            animation: phase === n ? 'phasePulse 2s infinite' : 'none',
                            transition: 'all 0.3s',
                            flexShrink: 0,
                        }}>
                            {phase > n ? '✓' : n}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: phase === n ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontWeight: phase === n ? 700 : 400, whiteSpace: 'nowrap' }}>
                            {phaseNames[n-1]}
                        </span>
                        {n < 3 && <div style={{ flex: 1, height: '1px', background: phase > n ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)', transition: 'background 0.3s' }} />}
                    </div>
                ))}
            </div>

            {/* ── PHASE 1 ─────────────────────────────── */}
            {phase === 1 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', animation: 'phaseIn 0.3s ease', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' }}>

                    <style>{`
                        @keyframes pulse-glow {
                            0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.3), 0 0 40px rgba(124,58,237,0.1); }
                            50% { box-shadow: 0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(124,58,237,0.2); }
                        }
                        @keyframes float-micro {
                            0%, 100% { transform: translateY(0px); }
                            50% { transform: translateY(-8px); }
                        }
                        .mic-button {
                            animation: float-micro 3s ease-in-out infinite;
                        }
                    `}</style>

                    <div style={{ marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px', textShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
                            ▓▓▓ INICIA TU SESIÓN
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: '#a78bfa', margin: '0 0 20px', fontFamily: "'Courier New', monospace", letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                            › cuéntame tu tema y generaremos tu guión
                        </p>
                    </div>

                    {/* Banner: creando desde idea del calendario */}
                    {ideaContext && (
                        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(52,211,153,0.08))', border: '2px solid rgba(124,58,237,0.4)', borderRadius: '8px', padding: '16px 20px', marginBottom: '16px', width: '100%', maxWidth: '500px' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', fontFamily: "'Courier New', monospace" }}>
                                ⚡ Idea del calendario:
                            </div>
                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 1.5 }}>
                                "{ideaContext.idea_title}"
                            </p>
                            <button onClick={() => { try { sessionStorage.removeItem('from_idea_context'); } catch(e){} setIdeaContext(null); setPhase(1); }}
                                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.5)', color: '#a78bfa', fontSize: '0.72rem', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', fontFamily: "'Courier New', monospace", fontWeight: 600, transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.target.style.background = 'rgba(124,58,237,0.3)'; e.target.style.boxShadow = '0 0 12px rgba(124,58,237,0.4)'; }}
                                onMouseOut={(e) => { e.target.style.background = 'rgba(124,58,237,0.2)'; e.target.style.boxShadow = 'none'; }}>
                                🔄 Cambiar idea
                            </button>
                        </div>
                    )}

                    {/* Input + Mic */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '600px' }}>

                        {/* Textarea */}
                        <div style={{ position: 'relative' }}>
                            <textarea
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="Ej: Por qué los coaches fracasan en redes..."
                                style={{
                                    width: '100%', minHeight: '80px', background: 'rgba(25, 8, 50, 0.5)',
                                    border: `2px solid ${topic ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)'}`,
                                    borderRadius: '6px', color: '#a78bfa', padding: '14px 56px 14px 16px',
                                    fontSize: '0.95rem', lineHeight: 1.6, resize: 'none', outline: 'none',
                                    fontFamily: "'Courier New', monospace", boxSizing: 'border-box',
                                    transition: 'all 0.2s',
                                    boxShadow: topic ? 'inset 0 0 15px rgba(124,58,237,0.1), 0 0 20px rgba(124,58,237,0.2)' : 'inset 0 0 10px rgba(124,58,237,0.05)',
                                }}
                                onFocus={(e) => { e.target.style.boxShadow = 'inset 0 0 20px rgba(124,58,237,0.15), 0 0 30px rgba(124,58,237,0.3)'; }}
                                onBlur={(e) => { e.target.style.boxShadow = topic ? 'inset 0 0 15px rgba(124,58,237,0.1), 0 0 20px rgba(124,58,237,0.2)' : 'inset 0 0 10px rgba(124,58,237,0.05)'; }}
                            />
                            <div style={{ position: 'absolute', right: '14px', bottom: '14px' }}>
                                <VoiceDictation onResult={text => setTopic(prev => prev ? `${prev} ${text}` : text)} />
                            </div>
                        </div>

                        {/* Button row */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={goNext}
                                disabled={!topic?.trim()}
                                style={{
                                    padding: '12px 28px',
                                    background: topic?.trim() ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.05)',
                                    border: '2px solid rgba(124,58,237,0.5)', borderRadius: '6px',
                                    color: '#a78bfa', cursor: topic?.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '0.85rem', fontWeight: 700,
                                    fontFamily: "'Courier New', monospace", transition: 'all 0.2s',
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                    opacity: topic?.trim() ? 1 : 0.4,
                                }}
                                onMouseOver={(e) => { if(topic?.trim()) { e.target.style.background = 'rgba(124,58,237,0.3)'; e.target.style.boxShadow = '0 0 20px rgba(124,58,237,0.4)'; }}}
                                onMouseOut={(e) => { e.target.style.background = topic?.trim() ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.05)'; e.target.style.boxShadow = 'none'; }}
                            >
                                ▶ Siguiente
                            </button>

                            <button
                                onClick={() => setTopic('')}
                                disabled={!topic?.trim()}
                                style={{
                                    padding: '12px 28px',
                                    background: 'rgba(255,77,77,0.1)', border: '2px solid rgba(255,77,77,0.4)',
                                    borderRadius: '6px', color: '#ff6b6b', cursor: topic?.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '0.85rem', fontWeight: 700,
                                    fontFamily: "'Courier New', monospace", transition: 'all 0.2s',
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                    opacity: topic?.trim() ? 1 : 0.4,
                                }}
                                onMouseOver={(e) => { if(topic?.trim()) { e.target.style.background = 'rgba(255,77,77,0.2)'; e.target.style.boxShadow = '0 0 15px rgba(255,77,77,0.3)'; }}}
                                onMouseOut={(e) => { e.target.style.background = 'rgba(255,77,77,0.1)'; e.target.style.boxShadow = 'none'; }}
                            >
                                🔄 Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Tone chips */}
                    <div style={{ width: '100%', maxWidth: '600px' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontFamily: "'Courier New', monospace" }}>
                            › Tono de marca
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                            {TONOS.map(t => (
                                <button key={t} onClick={() => setToneBrand(t)} style={{
                                    padding: '8px 14px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600,
                                    border: `2px solid ${toneBrand === t ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.2)'}`,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    background: toneBrand === t ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.05)',
                                    color: toneBrand === t ? '#a78bfa' : 'rgba(124,58,237,0.6)',
                                    boxShadow: toneBrand === t ? '0 0 15px rgba(124,58,237,0.3)' : 'none',
                                    fontFamily: "'Courier New', monospace", textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Char count */}
                    <div style={{ fontSize: '0.7rem', color: 'rgba(124,58,237,0.4)', fontFamily: "'Courier New', monospace", marginTop: '8px' }}>
                        › {topic?.length || 0} caracteres
                    </div>
                </div>
            )}

            {/* ── PHASE 2 ─────────────────────────────── */}
            {phase === 2 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', animation: 'phaseIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px', textShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
                            ▓ Tu historia
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: '#a78bfa', margin: 0, fontFamily: "'Courier New', monospace", letterSpacing: '0.1em' }}>
                            › cuenta algo real que te defina
                        </p>
                    </div>

                    {/* Rotating prompt */}
                    <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.05))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', textAlign: 'center', animation: 'phaseIn 0.4s ease', borderLeft: '3px solid #a78bfa' }} key={promptIdx}>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>
                            💭 {PROMPTS[promptIdx]}
                        </p>
                    </div>

                    {/* Textarea + voice — MATRIX STYLE */}
                    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <textarea
                            value={experienciaReal}
                            onChange={e => setExperienciaReal(e.target.value)}
                            placeholder="escribe o graba tu historia aquí..."
                            style={{
                                width: '100%', flex: 1, background: 'rgba(25, 8, 50, 0.5)',
                                border: '1px solid rgba(124,58,237,0.3)', borderRadius: '6px',
                                color: '#a78bfa', padding: '16px', fontSize: '0.95rem',
                                lineHeight: 1.7, resize: 'none', outline: 'none',
                                fontFamily: "'Courier New', monospace", boxSizing: 'border-box',
                                boxShadow: 'inset 0 0 20px rgba(124,58,237,0.05)',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.boxShadow = 'inset 0 0 20px rgba(124,58,237,0.15), 0 0 15px rgba(124,58,237,0.2)'; }}
                            onBlur={(e) => { e.target.style.boxShadow = 'inset 0 0 20px rgba(124,58,237,0.05)'; }}
                        />
                        <div style={{ position: 'absolute', right: '14px', bottom: '14px' }}>
                            <VoiceDictation onResult={text => setExperienciaReal(prev => prev ? `${prev} ${text}` : text)} />
                        </div>
                    </div>

                    {/* Buttons row — ACCIONES */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setExperienciaReal('')}
                            style={{
                                padding: '10px 18px', background: 'rgba(255, 77, 77, 0.1)',
                                border: '1px solid rgba(255,77,77,0.4)', borderRadius: '6px',
                                color: '#ff6b6b', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                fontFamily: "'Courier New', monospace", transition: 'all 0.2s',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}
                            onMouseOver={(e) => { e.target.style.background = 'rgba(255,77,77,0.2)'; e.target.style.boxShadow = '0 0 12px rgba(255,77,77,0.3)'; }}
                            onMouseOut={(e) => { e.target.style.background = 'rgba(255,77,77,0.1)'; e.target.style.boxShadow = 'none'; }}
                        >
                            🔄 Borrar
                        </button>

                        <button
                            onClick={goNext}
                            disabled={!experienciaReal?.trim()}
                            style={{
                                padding: '10px 18px',
                                background: experienciaReal?.trim() ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.05)',
                                border: '1px solid rgba(124,58,237,0.4)', borderRadius: '6px',
                                color: '#a78bfa', cursor: experienciaReal?.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '0.82rem', fontWeight: 600,
                                fontFamily: "'Courier New', monospace", transition: 'all 0.2s',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                opacity: experienciaReal?.trim() ? 1 : 0.5,
                            }}
                            onMouseOver={(e) => { if(experienciaReal?.trim()) { e.target.style.background = 'rgba(124,58,237,0.25)'; e.target.style.boxShadow = '0 0 15px rgba(124,58,237,0.4)'; }}}
                            onMouseOut={(e) => { e.target.style.background = 'rgba(124,58,237,0.15)'; e.target.style.boxShadow = 'none'; }}
                        >
                            → Avanzar
                        </button>

                        <button
                            onClick={goPrev}
                            style={{
                                padding: '10px 18px', background: 'rgba(124,58,237,0.1)',
                                border: '1px solid rgba(124,58,237,0.4)', borderRadius: '6px',
                                color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                fontFamily: "'Courier New', monospace", transition: 'all 0.2s',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}
                            onMouseOver={(e) => { e.target.style.background = 'rgba(124,58,237,0.2)'; e.target.style.boxShadow = '0 0 12px rgba(124,58,237,0.3)'; }}
                            onMouseOut={(e) => { e.target.style.background = 'rgba(124,58,237,0.1)'; e.target.style.boxShadow = 'none'; }}
                        >
                            ← Atrás
                        </button>
                    </div>

                    {/* Char count */}
                    <div style={{ fontSize: '0.7rem', color: 'rgba(124,58,237,0.5)', textAlign: 'right', fontFamily: "'Courier New', monospace" }}>
                        › {experienciaReal?.length || 0} caracteres
                    </div>
                </div>
            )}

            {/* ── PHASE 3 ─────────────────────────────── */}
            {phase === 3 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', animation: 'phaseIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                            {ideaContext ? '¡Idea lista! Elige el estilo' : initialPhase === 3 ? '¡Historia lista! Elige el estilo' : 'Casi listo'}
                        </h2>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            {ideaContext ? 'Tu idea del calendario ya está incluida — solo elige el estilo' : initialPhase === 3 ? 'Tu historia ya está incluida — solo elige el gancho y plataforma' : 'Solo 3 decisiones rápidas'}
                        </p>
                    </div>

                    {/* Banner: creando desde idea del calendario (fase 3) */}
                    {ideaContext && (
                        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 800, flexShrink: 0 }}>📝 Desde calendario</span>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                "{ideaContext.idea_title?.slice(0, 120)}{ideaContext.idea_title?.length > 120 ? '…' : ''}"
                            </p>
                        </div>
                    )}

                    {/* Banner historia incluida (solo desde voz) */}
                    {!ideaContext && initialPhase === 3 && experienciaReal && (
                        <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 800, flexShrink: 0 }}>✓ Historia grabada</span>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                "{experienciaReal.slice(0, 120)}{experienciaReal.length > 120 ? '…' : ''}"
                            </p>
                        </div>
                    )}

                    {/* Hook type grid */}
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                            Tipo de gancho
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {Object.keys(HOOK_ICONS).map(h => {
                                const Icon = HOOK_ICONS[h];
                                const active = hookType === h;
                                return (
                                    <button key={h} onClick={() => setHookType(h)} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '12px 14px', borderRadius: '10px',
                                        border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                        background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                                        color: active ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                        textAlign: 'left', transition: 'all 0.15s',
                                    }}>
                                        <Icon size={16} style={{ flexShrink: 0 }} />
                                        {HOOK_LABELS[h]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Platform */}
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                            Plataforma
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {PLATFORMS.map(p => (
                                <button key={p} onClick={() => setPlatform(p)} style={{
                                    padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                                    border: `1px solid ${platform === p ? PLAT_COLORS[p] : 'rgba(255,255,255,0.08)'}`,
                                    background: platform === p ? `${PLAT_COLORS[p]}18` : 'rgba(255,255,255,0.03)',
                                    color: platform === p ? PLAT_COLORS[p] : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                            Cantidad de guiones
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[1,2,3,4].map(q => (
                                <button key={q} onClick={() => setQuantity(q)} style={{
                                    width: '52px', height: '52px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 900,
                                    border: `2px solid ${quantity === q ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                                    background: quantity === q ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
                                    color: quantity === q ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    transform: quantity === q ? 'scale(1.08)' : 'scale(1)',
                                    boxShadow: quantity === q ? '0 0 16px rgba(124,58,237,0.3)' : 'none',
                                }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── NAV ─────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', alignItems: 'center' }}>
                <button onClick={goPrev} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '0 18px', height: '48px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                    <ChevronLeft size={16} /> Atrás
                </button>

                {phase < 3 ? (
                    <button onClick={goNext} disabled={!canNext} style={{
                        flex: 1, height: '48px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700,
                        background: canNext ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.05)',
                        border: 'none', color: canNext ? '#fff' : 'rgba(255,255,255,0.2)',
                        cursor: canNext ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s',
                    }}>
                        Siguiente <ChevronRight size={16} />
                    </button>
                ) : (
                    <button onClick={onGenerate} style={{
                        flex: 1, height: '56px', borderRadius: '10px', fontSize: '1rem', fontWeight: 800,
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        border: 'none', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                        animation: 'phasePulse 2.5s infinite',
                    }}>
                        <Zap size={18} />
                        Generar {quantity} guión{quantity > 1 ? 'es' : ''} con tu Cerebro IA
                    </button>
                )}
            </div>

            <style>{`
                @keyframes phaseIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
                @keyframes phasePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); } 50% { box-shadow: 0 0 0 8px rgba(124,58,237,0); } }
            `}</style>
        </div>
    );
}

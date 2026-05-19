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
                            background: phase > n ? '#34d399' : phase === n ? '#7c3aed' : 'rgba(255,255,255,0.08)',
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
                        {n < 3 && <div style={{ flex: 1, height: '1px', background: phase > n ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.07)', transition: 'background 0.3s' }} />}
                    </div>
                ))}
            </div>

            {/* ── PHASE 1 ─────────────────────────────── */}
            {phase === 1 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px', animation: 'phaseIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                            ¿Sobre qué quieres crear contenido hoy?
                        </h2>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            Habla o escribe — tú decides
                        </p>
                    </div>

                    {/* Banner: creando desde idea del calendario */}
                    {ideaContext && (
                        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '4px' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                📝 Creando guión para:
                            </div>
                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.4 }}>
                                "{ideaContext.idea_title}"
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                {ideaContext.platform && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>📱 {ideaContext.platform}</span>}
                            </div>
                            <button onClick={() => { try { sessionStorage.removeItem('from_idea_context'); } catch(e){} setIdeaContext(null); setPhase(1); }}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                                ✏️ Cambiar idea
                            </button>
                        </div>
                    )}

                    {/* Main textarea */}
                    <div style={{ position: 'relative' }}>
                        <textarea
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="Ej: Por qué el 90% de los coaches fracasan en redes..."
                            style={{
                                width: '100%', minHeight: '110px', background: 'rgba(124,58,237,0.06)',
                                border: `1px solid ${topic ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '16px', color: '#fff', padding: '16px 56px 16px 18px',
                                fontSize: '1rem', lineHeight: 1.6, resize: 'none', outline: 'none',
                                fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
                        />
                        <div style={{ position: 'absolute', right: '14px', bottom: '14px' }}>
                            <VoiceDictation onResult={text => setTopic(prev => prev ? `${prev} ${text}` : text)} />
                        </div>
                    </div>

                    {/* Tone chips */}
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                            Tono de marca
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {TONOS.map(t => (
                                <button key={t} onClick={() => setToneBrand(t)} style={{
                                    padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                    background: toneBrand === t ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                                    color: toneBrand === t ? '#fff' : 'rgba(255,255,255,0.55)',
                                    boxShadow: toneBrand === t ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                                }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── PHASE 2 ─────────────────────────────── */}
            {phase === 2 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', animation: 'phaseIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                            Ahora cuéntame algo tuyo
                        </h2>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            Una historia, opinión o caso real — esto hace tu guión único
                        </p>
                    </div>

                    {/* Rotating prompt */}
                    <div style={{ padding: '14px 20px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', textAlign: 'center', animation: 'phaseIn 0.4s ease' }} key={promptIdx}>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', margin: 0, fontStyle: 'italic' }}>
                            "{PROMPTS[promptIdx]}"
                        </p>
                    </div>

                    {/* Textarea + voice */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <textarea
                            value={experienciaReal}
                            onChange={e => setExperienciaReal(e.target.value)}
                            placeholder="Escribe aquí o usa el micrófono..."
                            style={{
                                width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
                                color: '#fff', padding: '16px 56px 16px 18px', fontSize: '0.92rem',
                                lineHeight: 1.65, resize: 'none', outline: 'none',
                                fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ position: 'absolute', right: '14px', bottom: '14px' }}>
                            <VoiceDictation onResult={text => setExperienciaReal(prev => prev ? `${prev} ${text}` : text)} />
                        </div>
                    </div>

                    <button onClick={goNext} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', padding: '4px' }}>
                        Saltar esta fase →
                    </button>
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

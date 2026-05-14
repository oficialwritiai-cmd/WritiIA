'use client';
import { useState } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import {
    Loader2, Sparkles, ChevronRight, ChevronLeft,
    Brain, Users, Palette, AlignLeft, HelpCircle,
    Calendar, Wand2, Info,
} from 'lucide-react';
import VoiceCapture      from './VoiceCapture';
import BrainImproveModal from './BrainImproveModal';
import SuggestionsModal  from './SuggestionsModal';

/* ─── Wizard questions ─────────────────────────────── */
const WIZARD_STEPS = [
    { id: 1, icon: AlignLeft, title: 'Negocio y Biografía',
      question: '¿Quién eres y qué haces? ¿Qué resultados has conseguido?',
      placeholder: 'Soy María, nutricionista especializada en mujeres de más de 40. Llevo 8 años ayudando a mis clientas a perder peso sin dietas drásticas…' },
    { id: 2, icon: Users, title: 'Público Objetivo',
      question: '¿Quién es tu cliente ideal? ¿Qué problemas tiene y qué desea conseguir?',
      placeholder: 'Mujeres emprendedoras de 35–55 años, estresadas, sin tiempo, que quieren más energía para su negocio y familia…' },
    { id: 3, icon: Palette, title: 'Productos y Nicho',
      question: '¿Qué vendes? ¿En qué nicho te mueves?',
      placeholder: 'Asesorías 1:1 de 3 meses, curso online de hábitos y un programa grupal. Nicho: bienestar para mujeres profesionales…' },
    { id: 4, icon: Sparkles, title: 'Estilo y Valores',
      question: '¿Qué tono quieres usar? Escribe 3–5 palabras que te definan.',
      placeholder: 'Cercana pero directa, sin excusas, motivadora. Palabras: energía, resultados, sin humo, auténtica, práctica…' },
    { id: 5, icon: Wand2, title: 'Oferta Irresistible',
      question: 'Describe tu propuesta principal en 2–3 frases.',
      placeholder: 'Ayudo a mujeres empresarias a recuperar energía y perder 5 kg en 8 semanas comiendo rico y sin horas de gimnasio…' },
];

/* ─── Shared styles ────────────────────────────────── */
const S = {
    card: {
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', padding: '22px 24px',
    },
    label: {
        display: 'block', fontSize: '0.72rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.4)', marginBottom: '8px',
    },
    textarea: {
        width: '100%', padding: '13px 15px', boxSizing: 'border-box',
        background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', color: '#fff', fontSize: '0.9rem',
        resize: 'vertical', outline: 'none', fontFamily: 'inherit',
        lineHeight: 1.65, transition: 'border-color 0.2s',
    },
    hint: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', marginTop: '6px', lineHeight: 1.5 },
    btnPrimary: {
        display: 'inline-flex', alignItems: 'center', gap: '9px',
        background: '#7c3aed', color: '#fff', border: 'none',
        borderRadius: '13px', padding: '13px 26px',
        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
        transition: 'background 0.2s ease',
    },
    btnSecondary: {
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(255,255,255,0.09)', borderRadius: '11px',
        padding: '11px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    },
    btnGhost: {
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'transparent', color: '#a78bfa',
        border: '1px solid rgba(167,139,250,0.28)', borderRadius: '9px',
        padding: '7px 13px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

/* ─── Textarea with counter + AI button ────────────── */
function SmartTextarea({ label, value, onChange, placeholder, rows = 5, hint, countLabel, recommended, onSuggest }) {
    const count = value.split('\n').filter(l => l.trim()).length;
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={S.label}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {recommended && (
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', fontWeight: 600 }}>
                            Recomendado: {recommended}
                        </span>
                    )}
                    {countLabel && (
                        <span style={{ fontSize: '0.72rem', color: count > 0 ? '#a78bfa' : 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                            {count} {countLabel}
                        </span>
                    )}
                </div>
            </div>
            <textarea
                value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} rows={rows}
                style={S.textarea}
                onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                {hint && <p style={S.hint}>{hint}</p>}
                {onSuggest && (
                    <button onClick={onSuggest} style={{ ...S.btnGhost, marginLeft: 'auto' }}>
                        <Sparkles size={12} /> Generar sugerencias con IA
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Horizon card ─────────────────────────────────── */
function HorizonCard({ val, label, desc, pieces, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            flex: 1, padding: '16px 18px', borderRadius: '14px',
            border: `1.5px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
            background: active ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.025)',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Calendar size={15} color={active ? '#a78bfa' : 'rgba(255,255,255,0.3)'} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{label}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)', margin: 0 }}>{desc}</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', fontWeight: 600 }}>{pieces}</p>
        </button>
    );
}

/* ─── Section header ───────────────────────────────── */
function SectionHeader({ icon: Icon, title, subtitle, color = '#a78bfa', action }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={color} strokeWidth={1.8} />
                </div>
                <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{title}</h3>
                    {subtitle && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

/* ════════════════════════════════════════════════════ */
export default function SessionStep1Brain() {
    const { state, dispatch, debouncedSave, completeStep } = useSession();
    const { brain, contentPillars, sessionFAQs, timeHorizon, brainSaved, projectId } = state;
    const supabase = createSupabaseClient();

    /* Wizard (no-brain path) */
    const [wizardStep, setWizardStep] = useState(1);
    const [answers, setAnswers]       = useState({ step1:'', step2:'', step3:'', step4:'', step5:'' });
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError]     = useState('');

    /* Context fields */
    const [pillarsText, setPillarsText] = useState(contentPillars.join('\n'));
    const [faqsText, setFaqsText]       = useState(sessionFAQs.join('\n'));
    const [horizon, setHorizon]         = useState(timeHorizon);

    /* Modals */
    const [improveBrainOpen, setImproveBrainOpen]   = useState(false);
    const [improveCtxOpen, setImproveCtxOpen]       = useState(false);
    const [suggestPillarsOpen, setSuggestPillarsOpen] = useState(false);
    const [suggestFaqsOpen, setSuggestFaqsOpen]     = useState(false);

    /* Voice success banner */
    const [voiceBanner, setVoiceBanner] = useState('');

    /* Brain fields (editable in review mode) */
    const [bioText,      setBioText]      = useState(brain?.biography  || '');
    const [audienceText, setAudienceText] = useState(brain?.audience   || '');
    const [styleText,    setStyleText]    = useState(brain?.style_words || '');

    /* ── Helpers ─────────────────────────────────── */
    function handlePillarsChange(val) {
        setPillarsText(val);
        const arr = val.split('\n').map(s => s.trim()).filter(Boolean);
        dispatch({ type: 'SET_PILLARS', payload: arr });
        debouncedSave({ content_pillars: arr });
    }
    function handleFaqsChange(val) {
        setFaqsText(val);
        const arr = val.split('\n').map(s => s.trim()).filter(Boolean);
        dispatch({ type: 'SET_FAQS', payload: arr });
        debouncedSave({ session_faqs: arr });
    }
    function handleHorizonChange(val) {
        setHorizon(val);
        dispatch({ type: 'SET_TIME_HORIZON', payload: val });
        debouncedSave({ time_horizon: val });
    }

    /* Brain field changes (review mode) */
    function handleBrainFieldChange(field, val) {
        if (field === 'bio')      { setBioText(val);      dispatch({ type: 'SET_BRAIN', payload: { ...brain, biography: val } }); }
        if (field === 'audience') { setAudienceText(val); dispatch({ type: 'SET_BRAIN', payload: { ...brain, audience: val } }); }
        if (field === 'style')    { setStyleText(val);    dispatch({ type: 'SET_BRAIN', payload: { ...brain, style_words: val } }); }
        debouncedSave();
    }

    /* VoiceCapture callback */
    function handleVoiceBrain(suggested) {
        if (suggested.bio)      { setBioText(suggested.bio);           dispatch({ type: 'SET_BRAIN', payload: { ...brain, biography: suggested.bio } }); }
        if (suggested.audience) { setAudienceText(suggested.audience); dispatch({ type: 'SET_BRAIN', payload: { ...brain, audience: suggested.audience } }); }
        if (suggested.style)    { setStyleText(suggested.style);       dispatch({ type: 'SET_BRAIN', payload: { ...brain, style_words: suggested.style } }); }
        if (suggested.pillars?.length) {
            const merged = [...new Set([...contentPillars, ...suggested.pillars])];
            setPillarsText(merged.join('\n'));
            dispatch({ type: 'SET_PILLARS', payload: merged });
        }
        if (suggested.faqs?.length) {
            const merged = [...new Set([...sessionFAQs, ...suggested.faqs])];
            setFaqsText(merged.join('\n'));
            dispatch({ type: 'SET_FAQS', payload: merged });
        }
        setVoiceBanner('✅ Hemos rellenado tu Cerebro IA con lo que contaste. Revisa y ajusta si quieres.');
        setTimeout(() => setVoiceBanner(''), 8000);
    }

    /* Improve brain callback */
    function handleApplyBrainImprove(improved) {
        if (improved.bio)      { setBioText(improved.bio);           dispatch({ type: 'SET_BRAIN', payload: { ...brain, biography: improved.bio } }); }
        if (improved.audience) { setAudienceText(improved.audience); dispatch({ type: 'SET_BRAIN', payload: { ...brain, audience: improved.audience } }); }
        if (improved.style)    { setStyleText(improved.style);       dispatch({ type: 'SET_BRAIN', payload: { ...brain, style_words: improved.style } }); }
        debouncedSave();
    }

    /* Improve context callback */
    function handleApplyCtxImprove(improved) {
        if (improved.pillars) { setPillarsText(improved.pillars); handlePillarsChange(improved.pillars); }
        if (improved.faqs)    { setFaqsText(improved.faqs);       handleFaqsChange(improved.faqs); }
    }

    /* Suggestions callback */
    function handleAddSuggestions(type, items) {
        if (type === 'pillars') {
            const current = pillarsText.split('\n').map(s=>s.trim()).filter(Boolean);
            const merged  = [...new Set([...current, ...items])];
            handlePillarsChange(merged.join('\n'));
        } else {
            const current = faqsText.split('\n').map(s=>s.trim()).filter(Boolean);
            const merged  = [...new Set([...current, ...items])];
            handleFaqsChange(merged.join('\n'));
        }
    }

    /* Generate brain (wizard) */
    async function handleGenerateBrain() {
        setGenerating(true); setGenError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');
            const res = await fetch('/api/generate-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, userId: user.id, projectId }),
            });
            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al generar el Cerebro IA.'); }
            const { brain: newBrain } = await res.json();
            await supabase.from('project_brains').upsert({ ...newBrain, project_id: projectId });
            dispatch({ type: 'SET_BRAIN', payload: newBrain });
            setBioText(newBrain.biography || '');
            setAudienceText(newBrain.audience || '');
            setStyleText(newBrain.style_words || '');
        } catch (e) { setGenError(e.message); }
        finally { setGenerating(false); }
    }

    /* Confirm & advance */
    async function handleConfirm() {
        const pillarsArr = pillarsText.split('\n').map(s => s.trim()).filter(Boolean);
        const faqsArr    = faqsText.split('\n').map(s => s.trim()).filter(Boolean);
        dispatch({ type: 'SET_PILLARS',      payload: pillarsArr });
        dispatch({ type: 'SET_FAQS',         payload: faqsArr });
        dispatch({ type: 'SET_TIME_HORIZON', payload: horizon });
        await completeStep(1, { content_pillars: pillarsArr, session_faqs: faqsArr, time_horizon: horizon });
    }

    /* ── Context section (shared: review + last wizard step) ── */
    const ContextSection = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Pillars */}
            <div style={{ ...S.card }}>
                <SectionHeader
                    icon={AlignLeft}
                    title="Pilares de contenido"
                    subtitle="Los temas recurrentes de los que hablas"
                    color="#a78bfa"
                    action={
                        <button style={S.btnGhost} onClick={() => setSuggestPillarsOpen(true)}>
                            <Sparkles size={12} /> Sugerir con IA
                        </button>
                    }
                />
                <SmartTextarea
                    value={pillarsText}
                    onChange={handlePillarsChange}
                    placeholder={'Mentalidad emprendedora\nProductividad con IA\nMarketing de atracción\nVentas sin estrés'}
                    rows={5}
                    hint="Un pilar por línea. Determinarán los temas de tus ideas."
                    countLabel="pilares"
                    recommended="3–5"
                />
            </div>

            {/* FAQs */}
            <div style={{ ...S.card }}>
                <SectionHeader
                    icon={HelpCircle}
                    title="Preguntas frecuentes de tus clientes"
                    subtitle="Lo que te preguntan y que puedes resolver con contenido"
                    color="#34d399"
                    action={
                        <button style={{ ...S.btnGhost, color: '#34d399', borderColor: 'rgba(52,211,153,0.28)' }} onClick={() => setSuggestFaqsOpen(true)}>
                            <Sparkles size={12} /> Sugerir con IA
                        </button>
                    }
                />
                <SmartTextarea
                    value={faqsText}
                    onChange={handleFaqsChange}
                    placeholder={'¿Por dónde empiezo a vender online?\n¿Cuánto tarda en verse resultados?\n¿Necesito muchos seguidores para vender?'}
                    rows={5}
                    hint="Una pregunta por línea. Son la fuente de las ideas más útiles."
                    countLabel="preguntas"
                    recommended="5–10"
                />
            </div>

            {/* Horizon */}
            <div style={{ ...S.card }}>
                <SectionHeader
                    icon={Calendar}
                    title="Horizonte de planificación"
                    subtitle="¿Cuántas piezas quieres preparar en esta sesión?"
                    color="#fbbf24"
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                    <HorizonCard val="2weeks" label="2 semanas" desc="Ideal para empezar o probar" pieces="~6–8 piezas" active={horizon === '2weeks'} onClick={() => handleHorizonChange('2weeks')} />
                    <HorizonCard val="1month" label="1 mes completo" desc="El ritmo habitual de WRITI" pieces="~12–16 piezas" active={horizon === '1month'} onClick={() => handleHorizonChange('1month')} />
                </div>
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════
       REVIEW MODE — brain ya existe
    ════════════════════════════════════════════════ */
    if (brainSaved && brain) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header */}
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.02em' }}>
                        🧠 Tu Cerebro IA
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                        Revisa y ajusta en un momento — luego generamos tus ideas.
                    </p>
                </div>

                {/* Voice banner */}
                {voiceBanner && (
                    <div style={{ padding: '12px 16px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', fontSize: '0.83rem', color: '#34d399' }}>
                        {voiceBanner}
                    </div>
                )}

                {/* Voice capture */}
                <VoiceCapture
                    projectId={projectId}
                    onBrainSuggested={handleVoiceBrain}
                />

                {/* Bloque 1: Cerebro IA */}
                <div style={{ ...S.card }}>
                    <SectionHeader
                        icon={Brain}
                        title="Tu Cerebro IA"
                        subtitle="Biografía, audiencia y estilo de comunicación"
                        color="#a78bfa"
                        action={
                            <button style={S.btnGhost} onClick={() => setImproveBrainOpen(true)}>
                                <Wand2 size={12} /> Mejorar con IA
                            </button>
                        }
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            { field: 'bio',      label: 'Biografía / Historia', val: bioText,      set: v => handleBrainFieldChange('bio', v),      rows: 4, placeholder: 'Quién eres, qué haces, qué resultados tienes…' },
                            { field: 'audience', label: 'Tu audiencia ideal',   val: audienceText, set: v => handleBrainFieldChange('audience', v), rows: 3, placeholder: 'Quién te compra, qué problema tiene, qué desea…' },
                            { field: 'style',    label: 'Estilo y palabras clave', val: styleText, set: v => handleBrainFieldChange('style', v),    rows: 2, placeholder: 'Cercana, directa, sin excusas. Palabras: energía, resultados…' },
                        ].map(({ field, label, val, set, rows, placeholder }) => (
                            <div key={field}>
                                <label style={S.label}>{label}</label>
                                <textarea
                                    value={val}
                                    onChange={e => set(e.target.value)}
                                    placeholder={placeholder}
                                    rows={rows}
                                    style={S.textarea}
                                    onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.4)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bloque 2: Contexto sesión */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                            Contexto de esta sesión
                        </h3>
                        <button style={S.btnGhost} onClick={() => setImproveCtxOpen(true)}>
                            <Wand2 size={12} /> Mejorar con IA
                        </button>
                    </div>
                    {ContextSection}
                </div>

                {/* Confirm */}
                <div style={{ paddingTop: '8px' }}>
                    <button
                        onClick={handleConfirm}
                        style={S.btnPrimary}
                        onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                    >
                        Confirmar y generar ideas <ChevronRight size={18} />
                    </button>
                    <p style={{ ...S.hint, marginTop: '10px' }}>
                        <Info size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Los pilares y FAQs se guardan automáticamente mientras escribes.
                    </p>
                </div>

                {/* Modals */}
                <BrainImproveModal
                    isOpen={improveBrainOpen}
                    onClose={() => setImproveBrainOpen(false)}
                    target="brain"
                    currentData={{ bio: bioText, audience: audienceText, style: styleText }}
                    onApply={handleApplyBrainImprove}
                />
                <BrainImproveModal
                    isOpen={improveCtxOpen}
                    onClose={() => setImproveCtxOpen(false)}
                    target="context"
                    currentData={{ pillars: pillarsText, faqs: faqsText }}
                    onApply={handleApplyCtxImprove}
                />
                <SuggestionsModal
                    isOpen={suggestPillarsOpen}
                    onClose={() => setSuggestPillarsOpen(false)}
                    type="pillars"
                    brain={brain}
                    existing={pillarsText.split('\n').filter(Boolean)}
                    onAdd={items => handleAddSuggestions('pillars', items)}
                />
                <SuggestionsModal
                    isOpen={suggestFaqsOpen}
                    onClose={() => setSuggestFaqsOpen(false)}
                    type="faqs"
                    brain={brain}
                    existing={faqsText.split('\n').filter(Boolean)}
                    onAdd={items => handleAddSuggestions('faqs', items)}
                />
            </div>
        );
    }

    /* ════════════════════════════════════════════════
       WIZARD MODE — no brain
    ════════════════════════════════════════════════ */
    const cw = WIZARD_STEPS.find(s => s.id === wizardStep);
    const stepKey = `step${wizardStep}`;
    const isLast  = wizardStep === WIZARD_STEPS.length;
    const WizIcon = cw.icon;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.02em' }}>
                    🧠 Crea tu Cerebro IA
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    5 preguntas rápidas para que las ideas y guiones suenen como tú, no como una IA genérica.
                </p>
            </div>

            {/* Voice option */}
            <VoiceCapture
                projectId={projectId}
                onBrainSuggested={brain => {
                    if (brain.bio)      setAnswers(p => ({ ...p, step1: brain.bio }));
                    if (brain.audience) setAnswers(p => ({ ...p, step2: brain.audience }));
                    if (brain.style)    setAnswers(p => ({ ...p, step4: brain.style }));
                    setVoiceBanner('✅ Hemos pre-rellenado las respuestas con tu voz. Revísalas y ajusta.');
                }}
            />
            {voiceBanner && (
                <div style={{ padding: '11px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '11px', fontSize: '0.82rem', color: '#34d399' }}>
                    {voiceBanner}
                </div>
            )}

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '5px' }}>
                {WIZARD_STEPS.map(s => (
                    <div key={s.id} style={{
                        height: '3px', flex: 1, borderRadius: '2px',
                        background: s.id <= wizardStep ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>

            {/* Current question */}
            <div style={{ ...S.card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <WizIcon size={16} color="#a78bfa" strokeWidth={1.8} />
                    </div>
                    <div>
                        <span style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Pregunta {wizardStep} de 5
                        </span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '1px' }}>{cw.title}</h3>
                    </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '14px', lineHeight: 1.6 }}>
                    {cw.question}
                </p>
                <textarea
                    key={wizardStep}
                    value={answers[stepKey]}
                    onChange={e => setAnswers(prev => ({ ...prev, [stepKey]: e.target.value }))}
                    placeholder={cw.placeholder}
                    rows={6}
                    autoFocus
                    style={S.textarea}
                    onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
            </div>

            {/* Navigation */}
            {!isLast && (
                <div style={{ display: 'flex', gap: '10px' }}>
                    {wizardStep > 1 && (
                        <button onClick={() => setWizardStep(w => w - 1)} style={S.btnSecondary}>
                            <ChevronLeft size={16} /> Atrás
                        </button>
                    )}
                    <button
                        onClick={() => setWizardStep(w => w + 1)}
                        style={S.btnPrimary}
                        onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                        onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                    >
                        Siguiente <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Last step: context + generate */}
            {isLast && (
                <>
                    <div>
                        <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Contexto de esta sesión
                        </h3>
                        {ContextSection}
                    </div>

                    {genError && (
                        <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', color: '#f87171', fontSize: '0.85rem' }}>
                            {genError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={() => setWizardStep(w => w - 1)} style={S.btnSecondary}>
                            <ChevronLeft size={16} /> Atrás
                        </button>
                        <button
                            onClick={handleGenerateBrain}
                            disabled={generating}
                            style={{
                                ...S.btnPrimary,
                                background: generating ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
                                color: generating ? '#555' : '#fff',
                                cursor: generating ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {generating
                                ? <><Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} /> Generando Cerebro IA…</>
                                : <><Sparkles size={17} /> Generar Cerebro IA y continuar</>
                            }
                        </button>
                    </div>
                    <p style={S.hint}>Cuesta 2 créditos. Podrás ajustarlo en cualquier momento.</p>

                    {/* Suggestions modals */}
                    <SuggestionsModal isOpen={suggestPillarsOpen} onClose={() => setSuggestPillarsOpen(false)} type="pillars" brain={{}} existing={pillarsText.split('\n').filter(Boolean)} onAdd={items => handleAddSuggestions('pillars', items)} />
                    <SuggestionsModal isOpen={suggestFaqsOpen}    onClose={() => setSuggestFaqsOpen(false)}    type="faqs"    brain={{}} existing={faqsText.split('\n').filter(Boolean)}    onAdd={items => handleAddSuggestions('faqs', items)} />
                </>
            )}

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

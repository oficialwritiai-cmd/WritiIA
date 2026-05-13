'use client';
import { useState } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const WIZARD_STEPS = [
    {
        id: 1, title: 'Negocio y Biografía',
        question: '¿Quién eres y qué haces? ¿Qué resultados has conseguido o qué experiencia tienes?',
        placeholder: 'Ej: Soy María, nutricionista especializada en mujeres de más de 40. Llevo 8 años ayudando a mis clientas a perder peso sin dietas drásticas...',
    },
    {
        id: 2, title: 'Público Objetivo',
        question: '¿Quién es tu cliente ideal? ¿Qué problemas principales tiene y qué desea conseguir?',
        placeholder: 'Ej: Mujeres emprendedoras de 35-55 años que sienten que no tienen tiempo, están estresadas y quieren más energía para su negocio y familia...',
    },
    {
        id: 3, title: 'Productos y Nicho',
        question: '¿Qué productos o servicios vendes? ¿En qué nicho o industria te mueves?',
        placeholder: 'Ej: Vendo asesorías 1:1 de 3 meses, un curso online de hábitos saludables y un programa grupal. Mi nicho es bienestar para mujeres profesionales...',
    },
    {
        id: 4, title: 'Estilo y Valores',
        question: '¿Qué tono quieres usar? Escribe 3-5 palabras que definan tu estilo.',
        placeholder: 'Ej: Cercana pero directa, sin excusas, motivadora. Palabras: energía, resultados, sin humo, auténtica, práctica...',
    },
    {
        id: 5, title: 'Oferta Irresistible',
        question: 'Describe tu propuesta principal: ¿qué prometes, en cuánto tiempo y para quién? Escríbela en 2-3 frases.',
        placeholder: 'Ej: Ayudo a mujeres empresarias a recuperar energía y perder 5 kilos en 8 semanas comiendo rico y sin pasar horas en el gimnasio...',
    },
];

// ── Shared: Pilares + FAQs + Horizonte ─────────────────────────────────────
function SessionContextFields({ pillarsText, faqsText, horizon, onPillarsChange, onFaqsChange, onHorizonChange }) {
    return (
        <div style={{ marginTop: '32px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', color: '#7ECECA' }}>
                Contexto de esta sesión
            </h3>

            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Pilares de contenido (3–5, uno por línea)</label>
                <textarea
                    value={pillarsText}
                    onChange={e => onPillarsChange(e.target.value)}
                    placeholder={'Mentalidad emprendedora\nProductividad con IA\nMarketing de atracción\nVentas sin estrés'}
                    rows={5}
                    style={textareaStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={hintStyle}>Los pilares determinan de qué hablas cada semana.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Preguntas frecuentes de tus clientes (una por línea)</label>
                <textarea
                    value={faqsText}
                    onChange={e => onFaqsChange(e.target.value)}
                    placeholder={'¿Por dónde empiezo a vender online?\n¿Cuánto tarda en verse resultados?\n¿Necesito muchos seguidores para vender?'}
                    rows={5}
                    style={textareaStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={hintStyle}>Las FAQs generan las ideas más útiles para tu audiencia.</p>
            </div>

            <div>
                <label style={labelStyle}>Horizonte de planificación</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                        { val: '2weeks', label: '2 semanas', desc: '~6–8 piezas' },
                        { val: '1month', label: '1 mes',     desc: '~12–16 piezas' },
                    ].map(({ val, label, desc }) => (
                        <button key={val} onClick={() => onHorizonChange(val)} style={{
                            flex: 1, padding: '12px 16px', borderRadius: '12px',
                            fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                            background: horizon === val ? 'rgba(126,206,202,0.12)' : 'rgba(255,255,255,0.03)',
                            border: `1.5px solid ${horizon === val ? '#7ECECA' : 'rgba(255,255,255,0.1)'}`,
                            color: horizon === val ? '#7ECECA' : '#777',
                            textAlign: 'left', lineHeight: 1.4,
                        }}>
                            <div>{label}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>{desc}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function SessionStep1Brain() {
    const { state, dispatch, debouncedSave, completeStep } = useSession();
    const { brain, contentPillars, sessionFAQs, timeHorizon, brainSaved, projectId } = state;
    const supabase = createSupabaseClient();

    // Wizard state (no-brain path)
    const [wizardStep, setWizardStep] = useState(1);
    const [answers, setAnswers]       = useState({ step1: '', step2: '', step3: '', step4: '', step5: '' });
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError]     = useState('');

    // Editable context fields
    const [pillarsText, setPillarsText] = useState(contentPillars.join('\n'));
    const [faqsText, setFaqsText]       = useState(sessionFAQs.join('\n'));
    const [horizon, setHorizon]         = useState(timeHorizon);

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

    async function handleGenerateBrain() {
        setGenerating(true);
        setGenError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            const res = await fetch('/api/generate-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, userId: user.id, projectId }),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                return;
            }
            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || 'Error al generar el Cerebro IA.');
            }

            const { brain: newBrain } = await res.json();

            // Upsert to project_brains
            await supabase.from('project_brains').upsert({
                ...newBrain,
                project_id: projectId,
            });

            dispatch({ type: 'SET_BRAIN', payload: newBrain });
            // brainSaved is now true → component re-renders into review mode
        } catch (e) {
            console.error('[Step1] generateBrain error:', e);
            setGenError(e.message);
        } finally {
            setGenerating(false);
        }
    }

    async function handleConfirm() {
        const pillarsArr = pillarsText.split('\n').map(s => s.trim()).filter(Boolean);
        const faqsArr    = faqsText.split('\n').map(s => s.trim()).filter(Boolean);
        dispatch({ type: 'SET_PILLARS',      payload: pillarsArr });
        dispatch({ type: 'SET_FAQS',         payload: faqsArr });
        dispatch({ type: 'SET_TIME_HORIZON', payload: horizon });
        await completeStep(1, {
            content_pillars: pillarsArr,
            session_faqs:    faqsArr,
            time_horizon:    horizon,
        });
    }

    // ── REVIEW MODE (brain already exists) ─────────────────────────────────
    if (brainSaved && brain) {
        return (
            <div>
                <h2 style={h2Style}>🧠 Tu Cerebro IA</h2>
                <p style={subtitleStyle}>Revisa y ajusta en 1–2 minutos, luego genera tus ideas.</p>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '4px' }}>
                    {[
                        { label: 'Biografía / Historia', value: brain.biography },
                        { label: 'Tu audiencia ideal',   value: brain.audience },
                        { label: 'Estilo y palabras clave', value: brain.style_words },
                    ].filter(f => f.value).map(({ label, value }) => (
                        <div key={label} style={brainCardStyle}>
                            <div style={brainLabelStyle}>{label}</div>
                            <div style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: 1.65 }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                <SessionContextFields
                    pillarsText={pillarsText}
                    faqsText={faqsText}
                    horizon={horizon}
                    onPillarsChange={handlePillarsChange}
                    onFaqsChange={handleFaqsChange}
                    onHorizonChange={handleHorizonChange}
                />

                <div style={{ marginTop: '32px' }}>
                    <button onClick={handleConfirm} style={primaryBtnStyle}>
                        Confirmar y generar ideas <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    // ── WIZARD MODE (no brain) ──────────────────────────────────────────────
    const currentWizardData = WIZARD_STEPS.find(s => s.id === wizardStep);
    const stepKey = `step${wizardStep}`;
    const isLastWizardStep = wizardStep === WIZARD_STEPS.length;

    return (
        <div>
            <h2 style={h2Style}>🧠 Crea tu Cerebro IA</h2>
            <p style={subtitleStyle}>
                5 preguntas rápidas para que las ideas y guiones suenen como tú — no como una IA genérica.
            </p>

            {/* Wizard progress dots */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
                {WIZARD_STEPS.map(s => (
                    <div key={s.id} style={{
                        height: '4px', flex: 1, borderRadius: '2px',
                        background: s.id <= wizardStep ? '#7ECECA' : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.78rem', color: '#7ECECA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Pregunta {wizardStep} de 5
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '8px 0 4px' }}>
                    {currentWizardData.title}
                </h3>
                <p style={{ color: '#888', fontSize: '0.92rem', marginBottom: '16px' }}>
                    {currentWizardData.question}
                </p>
            </div>

            <textarea
                key={wizardStep}
                value={answers[stepKey]}
                onChange={e => setAnswers(prev => ({ ...prev, [stepKey]: e.target.value }))}
                placeholder={currentWizardData.placeholder}
                rows={6}
                autoFocus
                style={{ ...textareaStyle, marginBottom: '20px' }}
                onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />

            {/* Navigation */}
            {!isLastWizardStep && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {wizardStep > 1 && (
                        <button onClick={() => setWizardStep(w => w - 1)} style={secondaryBtnStyle}>
                            <ChevronLeft size={18} /> Atrás
                        </button>
                    )}
                    <button onClick={() => setWizardStep(w => w + 1)} style={primaryBtnStyle}>
                        Siguiente <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Last wizard step: show context fields + generate button */}
            {isLastWizardStep && (
                <>
                    <SessionContextFields
                        pillarsText={pillarsText}
                        faqsText={faqsText}
                        horizon={horizon}
                        onPillarsChange={handlePillarsChange}
                        onFaqsChange={handleFaqsChange}
                        onHorizonChange={handleHorizonChange}
                    />

                    {genError && (
                        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#EF4444', marginBottom: '20px', fontSize: '0.88rem' }}>
                            {genError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                        <button onClick={() => setWizardStep(w => w - 1)} style={secondaryBtnStyle}>
                            <ChevronLeft size={18} /> Atrás
                        </button>
                        <button onClick={handleGenerateBrain} disabled={generating} style={{
                            ...primaryBtnStyle,
                            background: generating ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #10B981, #059669)',
                            color: generating ? '#666' : 'white',
                            cursor: generating ? 'not-allowed' : 'pointer',
                        }}>
                            {generating
                                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generando Cerebro IA...</>
                                : <><Sparkles size={18} /> Generar Cerebro IA y continuar</>
                            }
                        </button>
                    </div>
                    <p style={{ ...hintStyle, marginTop: '12px' }}>
                        Cuesta 2 créditos. Después lo podrás ajustar en cualquier momento.
                    </p>
                </>
            )}

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

// ── Shared styles ─────────────────────────────────────────────────────────
const h2Style = { fontSize: '1.65rem', fontWeight: 900, marginBottom: '8px' };
const subtitleStyle = { color: '#888', marginBottom: '28px', lineHeight: 1.6 };
const labelStyle = {
    display: 'block', fontSize: '0.78rem', color: '#aaa',
    marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
};
const hintStyle = { fontSize: '0.75rem', color: '#555', marginTop: '6px' };
const textareaStyle = {
    width: '100%', padding: '14px 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', color: 'white', fontSize: '0.95rem', resize: 'vertical',
    outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.2s',
};
const primaryBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '10px',
    background: 'var(--accent-gradient)', color: 'black',
    border: 'none', borderRadius: '14px', padding: '14px 28px',
    fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer',
};
const secondaryBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'rgba(255,255,255,0.05)', color: '#888',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    padding: '12px 20px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
};
const brainCardStyle = {
    padding: '14px 16px', background: 'rgba(126,206,202,0.04)',
    border: '1px solid rgba(126,206,202,0.12)', borderRadius: '12px',
};
const brainLabelStyle = {
    fontSize: '0.72rem', color: '#7ECECA', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px',
};

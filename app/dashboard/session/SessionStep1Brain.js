'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { RestoreBanner, AutosaveIndicator } from '@/hooks/usePersistedState';
import { createSupabaseClient } from '@/lib/supabase';
import {
    Loader2, Sparkles, ChevronRight, ChevronLeft,
    Brain, Users, Palette, AlignLeft, HelpCircle,
    Calendar, Wand2, Mic, Info, Package,
} from 'lucide-react';
import VoiceModal        from './VoiceModal';
import BrainImproveModal from './BrainImproveModal';
import SuggestionsModal  from './SuggestionsModal';
import BrandAudit        from './BrandAudit';

/* ─── Block definitions ─────────────────────────────── */
const BLOCKS = [
    {
        id: 'bio', icon: Brain, color: '#a78bfa', label: 'Biografía',
        title: 'Tu historia y negocio',
        desc: '¿Quién eres? ¿Qué haces? ¿Qué resultados o experiencia tienes?',
        placeholder: 'Soy María, nutricionista especializada en mujeres de +40. Llevo 8 años ayudando a mis clientas a perder peso sin dietas drásticas. He acompañado a más de 200 mujeres a recuperar energía y confianza.',
        field: 'bio',
    },
    {
        id: 'audience', icon: Users, color: '#34d399', label: 'Audiencia',
        title: 'Tu cliente ideal',
        desc: '¿Quién es tu cliente ideal? ¿Qué problema tiene y qué desea conseguir?',
        placeholder: 'Mujeres emprendedoras de 35–55 años, estresadas, sin tiempo, que quieren perder peso y recuperar energía sin pasar horas en el gimnasio ni hacer dietas estrictas.',
        field: 'audience',
    },
    {
        id: 'offer', icon: Package, color: '#fbbf24', label: 'Oferta',
        title: 'Tu oferta y propuesta de valor',
        desc: '¿Qué vendes exactamente? ¿Qué problema principal resuelves? ¿Qué objeciones tiene tu cliente?',
        placeholder: 'Vendo asesorías 1:1 de 3 meses y un curso online de hábitos. Resuelvo: "no tengo tiempo". Objeción más común: "ya lo he intentado y no funciona". Promesa: perder 5 kg en 8 semanas comiendo rico.',
        field: 'offer',
    },
    {
        id: 'style', icon: Palette, color: '#f472b6', label: 'Estilo',
        title: 'Tono y estilo de comunicación',
        desc: '¿Cómo hablas con tus clientes? Escribe 3–5 palabras que te definan.',
        placeholder: 'Cercana pero directa, sin excusas, motivadora. Palabras: energía, resultados, sin humo, auténtica, práctica.',
        field: 'style',
    },
    {
        id: 'pillars', icon: AlignLeft, color: '#60a5fa', label: 'Pilares',
        title: 'Pilares de contenido',
        desc: 'Los temas recurrentes de los que hablas. Un pilar por línea.',
        placeholder: 'Hábitos saludables sin obsesión\nProductividad para mujeres\nMindset y autoestima\nNutrición práctica',
        field: 'pillars', isTextLines: true, recommended: '3–5',
    },
    {
        id: 'faqs', icon: HelpCircle, color: '#fb923c', label: 'FAQs',
        title: 'Preguntas frecuentes de tus clientes',
        desc: 'Lo que te preguntan antes de comprarte. Una pregunta por línea.',
        placeholder: '¿Por dónde empiezo?\n¿Cuánto tarda en verse resultados?\n¿Necesito seguir una dieta estricta?\n¿Puedo hacerlo si trabajo todo el día?',
        field: 'faqs', isTextLines: true, recommended: '5–10',
    },
];

/* ─── Shared styles ────────────────────────────────── */
const S = {
    card: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '24px', transition: 'border-color 0.2s' },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', marginBottom: '7px' },
    textarea: { width: '100%', padding: '13px 15px', boxSizing: 'border-box', background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.65, transition: 'border-color 0.2s' },
    hint: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', marginTop: '6px' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '9px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '13px', padding: '13px 26px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' },
    btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '11px', padding: '11px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
    btnGhost: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.28)', borderRadius: '9px', padding: '7px 13px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
};

/* ─── Block progress indicator ──────────────────────── */
function BlockProgress({ blocks, currentIdx, onGoto }) {
    return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
            {blocks.map((b, i) => {
                const Icon = b.icon;
                const isCurrent = i === currentIdx;
                const isDone = i < currentIdx;
                return (
                    <button
                        key={b.id}
                        onClick={() => onGoto(i)}
                        title={b.label}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: isCurrent ? '5px 12px' : '5px 8px',
                            borderRadius: '100px', border: 'none', cursor: 'pointer',
                            background: isCurrent ? b.color + '18' : isDone ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                            outline: isCurrent ? `1.5px solid ${b.color}50` : isDone ? '1.5px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.06)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Icon size={12} color={isCurrent ? b.color : isDone ? '#34d399' : 'rgba(255,255,255,0.3)'} />
                        {isCurrent && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.color, whiteSpace: 'nowrap' }}>{b.label}</span>}
                    </button>
                );
            })}
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginLeft: '4px' }}>
                {currentIdx + 1}/{blocks.length}
            </span>
        </div>
    );
}

/* ─── Single Block editor ────────────────────────────── */
function BlockEditor({ block, value, onChange, onVoiceResult, onImprove, onSuggest, projectId }) {
    const Icon = block.icon;
    const lines = value ? value.split('\n').filter(l => l.trim()).length : 0;

    return (
        <div style={{ ...S.card, borderColor: `${block.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0, background: block.color + '18', border: `1px solid ${block.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color={block.color} strokeWidth={1.8} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{block.title}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{block.desc}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
                    {/* Voice button */}
                    <button
                        onClick={() => onVoiceResult(block.id)}
                        style={{ ...S.btnGhost, color: block.color, borderColor: block.color + '30', gap: '5px' }}
                        title="Grabar con voz"
                    >
                        <Mic size={13} /> Voz
                    </button>
                    {/* Improve / Suggest */}
                    {block.isTextLines && onSuggest ? (
                        <button onClick={onSuggest} style={S.btnGhost}>
                            <Sparkles size={12} /> Sugerir
                        </button>
                    ) : (
                        <button onClick={onImprove} style={S.btnGhost}>
                            <Wand2 size={12} /> Mejorar
                        </button>
                    )}
                </div>
            </div>

            <div style={{ position: 'relative' }}>
                {block.isTextLines && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px', gap: '8px' }}>
                        {block.recommended && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '100px', background: block.color + '15', border: `1px solid ${block.color}25`, color: block.color, fontWeight: 600 }}>
                                Recomendado: {block.recommended}
                            </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: lines > 0 ? block.color : 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                            {lines} {block.id === 'pillars' ? 'pilares' : 'preguntas'}
                        </span>
                    </div>
                )}
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={block.placeholder}
                    rows={block.isTextLines ? 5 : 4}
                    style={S.textarea}
                    onFocus={e => e.target.style.borderColor = block.color + '50'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────── */
export default function SessionStep1Brain() {
    const { state, dispatch, debouncedSave, completeStep } = useSession();
    const { brain, contentPillars, sessionFAQs, timeHorizon, brainSaved, projectId } = state;
    const supabase = createSupabaseClient();

    /* Block navigation */
    const [blockIdx, setBlockIdx] = useState(0);
    const currentBlock = BLOCKS[blockIdx];

    /* Fields state — persiste en sessionStorage para no perder ediciones */
    const FIELDS_KEY = `cerebro_fields_${projectId || 'global'}`;
    const [showRestore, setShowRestore] = useState(false);
    const [autosaving, setAutosaving]   = useState(false);

    const defaultFields = {
        bio:      brain?.biography        || '',
        audience: brain?.audience         || '',
        offer:    brain?.products_services || '',
        style:    brain?.style_words      || '',
        pillars:  contentPillars.join('\n'),
        faqs:     sessionFAQs.join('\n'),
    };

    const [fields, setFields] = useState(() => {
        try {
            const raw = sessionStorage.getItem(FIELDS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const age = Date.now() - (parsed.ts || 0);
                if (age < 2 * 3600 * 1000 && parsed.v?.bio !== undefined) return parsed.v;
            }
        } catch {}
        return defaultFields;
    });

    // Detecta si hay borrador guardado distinto del estado inicial
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FIELDS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const hasDraft = parsed.v?.bio && parsed.v.bio !== (brain?.biography || '');
            if (hasDraft) setShowRestore(true);
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Guarda fields en sessionStorage en cada cambio
    const setFieldsAndSave = (updater) => {
        setFields(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            try { sessionStorage.setItem(FIELDS_KEY, JSON.stringify({ v: next, ts: Date.now() })); } catch {}
            setAutosaving(true);
            setTimeout(() => setAutosaving(false), 1500);
            return next;
        });
    };

    /* Horizon */
    const [horizon, setHorizon] = useState(timeHorizon);

    /* Modals */
    const [voiceOpen, setVoiceOpen]   = useState(false);
    const [voiceField, setVoiceField] = useState('all');
    const [improveConfig, setImproveConfig] = useState(null); // { target, currentData, customFields }
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [suggestType, setSuggestType] = useState('pillars');

    /* Banner */
    const [banner, setBanner]   = useState('');
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError]     = useState('');

    /* Wizard (no-brain) */
    const [wizardStep, setWizardStep] = useState(1);
    const [answers, setAnswers]       = useState({ step1:'', step2:'', step3:'', step4:'', step5:'' });

    /* Debounced save to project_brains in Supabase (1.5s after last keystroke) */
    const brainSaveTimer = useRef(null);
    function debouncedBrainSave(updatedFields) {
        clearTimeout(brainSaveTimer.current);
        brainSaveTimer.current = setTimeout(async () => {
            if (!projectId) return;
            try {
                const pillarsArr = fields.pillars.split('\n').map(s => s.trim()).filter(Boolean);
                const faqsArr    = fields.faqs.split('\n').map(s => s.trim()).filter(Boolean);
                await supabase.from('project_brains').upsert({
                    project_id:        projectId,
                    biography:         updatedFields.bio      || '',
                    audience:          updatedFields.audience  || '',
                    products_services: updatedFields.offer     || '',
                    style_words:       updatedFields.style     || '',
                    content_pillars:   pillarsArr,
                    session_faqs:      faqsArr,
                });
            } catch (e) { console.error('[debouncedBrainSave]', e); }
        }, 1500);
    }

    function updateField(key, val) {
        setFieldsAndSave(prev => {
            const next = { ...prev, [key]: val };

            if (key === 'pillars') {
                const arr = val.split('\n').map(s => s.trim()).filter(Boolean);
                dispatch({ type: 'SET_PILLARS', payload: arr });
                debouncedSave({ content_pillars: arr });
            } else if (key === 'faqs') {
                const arr = val.split('\n').map(s => s.trim()).filter(Boolean);
                dispatch({ type: 'SET_FAQS', payload: arr });
                debouncedSave({ session_faqs: arr });
            } else {
                dispatch({ type: 'SET_BRAIN', payload: {
                    ...brain,
                    biography:         next.bio,
                    audience:          next.audience,
                    products_services: next.offer,
                    style_words:       next.style,
                }});
                // Save brain to Supabase so it survives page refresh
                debouncedBrainSave(next);
            }

            return next;
        });
    }

    function handleVoiceResult(transcript, brainSuggested) {
        const b = brainSuggested || {};
        const updates = {};
        if (b.bio)      updates.bio      = b.bio;
        if (b.audience) updates.audience = b.audience;
        if (b.style)    updates.style    = b.style;
        if (b.offer)    updates.offer    = b.offer;
        if (b.pillars?.length) {
            const merged = [...new Set([...fields.pillars.split('\n').filter(Boolean), ...b.pillars])];
            updates.pillars = merged.join('\n');
        }
        if (b.faqs?.length) {
            const merged = [...new Set([...fields.faqs.split('\n').filter(Boolean), ...b.faqs])];
            updates.faqs = merged.join('\n');
        }

        // Fallback garantizado: si Claude no extrajo nada pero hay transcript,
        // meter el texto crudo en el campo objetivo
        if (!Object.keys(updates).length && transcript?.trim()) {
            const fieldMap = { bio:'bio', audience:'audience', style:'style', offer:'offer', pillars:'pillars', faqs:'faqs', all:'bio' };
            const target = fieldMap[voiceField] || 'bio';
            if (target === 'pillars' || target === 'faqs') {
                const lines = transcript.split(/[.?!;\n]+/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 8);
                const existing = fields[target].split('\n').filter(Boolean);
                updates[target] = [...new Set([...existing, ...lines])].join('\n');
            } else {
                updates[target] = transcript.trim();
            }
        }

        if (Object.keys(updates).length) {
            setFieldsAndSave(prev => ({ ...prev, ...updates }));
            // Sync context
            const newPillars = (updates.pillars || fields.pillars).split('\n').map(s=>s.trim()).filter(Boolean);
            const newFaqs    = (updates.faqs || fields.faqs).split('\n').map(s=>s.trim()).filter(Boolean);
            dispatch({ type: 'SET_PILLARS', payload: newPillars });
            dispatch({ type: 'SET_FAQS',    payload: newFaqs });
            dispatch({ type: 'SET_BRAIN',   payload: { ...brain, biography: updates.bio || fields.bio, audience: updates.audience || fields.audience, products_services: updates.offer || fields.offer, style_words: updates.style || fields.style } });
            setBanner('✅ Hemos rellenado tu Cerebro IA con lo que contaste. Revisa y ajusta.');
            setTimeout(() => setBanner(''), 7000);
        }
    }

    function handleApplyImprove(improved) {
        // improved may have any subset of field keys
        const validKeys = ['bio', 'audience', 'offer', 'style', 'pillars', 'faqs'];
        Object.entries(improved).forEach(([k, v]) => {
            if (validKeys.includes(k) && v) updateField(k, v);
        });
    }

    function handleAddSuggestions(items) {
        const key = suggestType;
        const current = fields[key].split('\n').map(s=>s.trim()).filter(Boolean);
        const merged  = [...new Set([...current, ...items])];
        updateField(key, merged.join('\n'));
    }

    function handleHorizonChange(val) {
        setHorizon(val);
        dispatch({ type: 'SET_TIME_HORIZON', payload: val });
        debouncedSave({ time_horizon: val });
    }

    async function handleGenerateBrain() {
        setGenerating(true); setGenError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');
            const res = await fetch('/api/generate-brain', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, userId: user.id, projectId }),
            });
            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error.'); }
            const { brain: nb } = await res.json();
            await supabase.from('project_brains').upsert({ ...nb, project_id: projectId });
            dispatch({ type: 'SET_BRAIN', payload: nb });
            setFieldsAndSave(prev => ({ ...prev, bio: nb.biography||'', audience: nb.audience||'', style: nb.style_words||'' }));
        } catch (e) { setGenError(e.message); }
        finally { setGenerating(false); }
    }

    async function handleConfirm() {
        const pillarsArr = fields.pillars.split('\n').map(s=>s.trim()).filter(Boolean);
        const faqsArr    = fields.faqs.split('\n').map(s=>s.trim()).filter(Boolean);

        // Save ALL fields to context before advancing
        const updatedBrain = {
            ...(brain || {}),
            biography:         fields.bio      || '',
            audience:          fields.audience  || '',
            products_services: fields.offer     || '',
            style_words:       fields.style     || '',
        };
        dispatch({ type: 'SET_BRAIN',        payload: updatedBrain });
        dispatch({ type: 'SET_PILLARS',      payload: pillarsArr });
        dispatch({ type: 'SET_FAQS',         payload: faqsArr });
        dispatch({ type: 'SET_TIME_HORIZON', payload: horizon });

        // Persist brain + pillars + FAQs to Supabase so they survive navigation
        if (projectId) {
            try {
                await supabase.from('project_brains').upsert({
                    ...updatedBrain,
                    project_id:       projectId,
                    content_pillars:  pillarsArr,
                    session_faqs:     faqsArr,
                });
            } catch (e) { console.error('[handleConfirm] brain upsert:', e); }
        }

        await completeStep(1, { content_pillars: pillarsArr, session_faqs: faqsArr, time_horizon: horizon });
    }

    const isLastBlock  = blockIdx === BLOCKS.length - 1;
    const isFirstBlock = blockIdx === 0;

    /* Guarda TODOS los campos al navegar entre bloques */
    async function saveCurrentBlock() {
        // Always sync brain fields to context
        const updatedBrain = {
            ...(brain || {}),
            biography:         fields.bio      || '',
            audience:          fields.audience  || '',
            products_services: fields.offer     || '',
            style_words:       fields.style     || '',
        };
        dispatch({ type:'SET_BRAIN', payload: updatedBrain });

        // Sync pillars + faqs
        const pillarsArr = fields.pillars.split('\n').map(s=>s.trim()).filter(Boolean);
        const faqsArr    = fields.faqs.split('\n').map(s=>s.trim()).filter(Boolean);
        dispatch({ type:'SET_PILLARS', payload: pillarsArr });
        dispatch({ type:'SET_FAQS',    payload: faqsArr });

        // Persist to Supabase
        if (projectId) {
            try {
                await supabase.from('project_brains').upsert({ ...updatedBrain, project_id: projectId });
            } catch (e) { console.error('[saveCurrentBlock brain]', e); }
        }
        debouncedSave({ content_pillars: pillarsArr, session_faqs: faqsArr });
    }

    /* ── REVIEW MODE ──────────────────────────────────── */
    if (brainSaved && brain) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Fast-track banner — skip directly to ideas if brain is ready */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.04))',
                    border: '1px solid rgba(52,211,153,0.25)',
                    borderRadius: '16px', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '16px', flexWrap: 'wrap',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🧠</span>
                        <div>
                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399', marginBottom: '2px' }}>
                                Tu Cerebro IA está activo y listo
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                No necesitas rellenarlo de nuevo. Puedes ir directo a generar ideas.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleConfirm}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: '#10b981', color: '#fff', border: 'none',
                            borderRadius: '12px', padding: '12px 22px',
                            fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'background 0.2s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                    >
                        ⚡ Saltar directo a Ideas
                    </button>
                </div>
                <div>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                        🧠 Tu Cerebro IA
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.38)' }}>
                        Revisa y ajusta bloque a bloque — luego generamos tus ideas.
                    </p>
                </div>

                {banner && (
                    <div style={{ padding: '11px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '11px', fontSize: '0.82rem', color: '#34d399' }}>
                        {banner}
                    </div>
                )}

                {/* Block progress nav */}
                <BlockProgress blocks={BLOCKS} currentIdx={blockIdx} onGoto={setBlockIdx} />

                {/* Current block editor */}
                <BlockEditor
                    block={currentBlock}
                    value={fields[currentBlock.field]}
                    onChange={v => updateField(currentBlock.field, v)}
                    onVoiceResult={fieldId => { setVoiceField(fieldId); setVoiceOpen(true); }}
                    onImprove={() => {
                        if (currentBlock.isTextLines) {
                            // Pilares / FAQs → improve context
                            setImproveConfig({
                                target: 'context',
                                currentData: { pillars: fields.pillars, faqs: fields.faqs },
                                customFields: null,
                            });
                        } else {
                            // Bio, Audiencia, Oferta, Estilo → improve campo individual
                            setImproveConfig({
                                target: 'field',
                                currentData: {
                                    fieldKey:   currentBlock.field,
                                    fieldLabel: currentBlock.title,
                                    value:      fields[currentBlock.field] || '',
                                },
                                customFields: [{ key: currentBlock.field, label: currentBlock.title }],
                            });
                        }
                    }}
                    onSuggest={currentBlock.isTextLines ? () => { setSuggestType(currentBlock.id); setSuggestOpen(true); } : null}
                    projectId={projectId}
                />

                {/* Block navigation */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => { saveCurrentBlock(); setBlockIdx(i => Math.max(0, i-1)); }} disabled={isFirstBlock} style={{ ...S.btnSecondary, opacity: isFirstBlock ? 0.3 : 1 }}>
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    {!isLastBlock ? (
                        <button onClick={() => { saveCurrentBlock(); setBlockIdx(i => i+1); }} style={S.btnPrimary}
                            onMouseEnter={e=>e.currentTarget.style.background='#6d28d9'} onMouseLeave={e=>e.currentTarget.style.background='#7c3aed'}>
                            Siguiente bloque <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button onClick={() => setBlockIdx(i => i+1)} style={{ ...S.btnSecondary, display: 'none' }} />
                    )}
                </div>

                {/* Auditoría de marca + confirmar (siempre visible al final) */}
                {isLastBlock && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                        {/* Auditoría */}
                        <BrandAudit fields={fields} projectId={projectId} />

                        {/* Horizonte */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[
                                { val: '2weeks', label: '2 semanas', desc: '~6–8 piezas', icon: '⚡' },
                                { val: '1month', label: '1 mes completo', desc: '~12–16 piezas', icon: '📅' },
                            ].map(({ val, label, desc, icon }) => (
                                <button key={val} onClick={() => handleHorizonChange(val)} style={{
                                    flex: 1, padding: '14px 16px', borderRadius: '13px', cursor: 'pointer', textAlign: 'left',
                                    border: `1.5px solid ${horizon===val ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                    background: horizon===val ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.025)',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: horizon===val ? '#fff' : '#aaa', marginBottom: '4px' }}>{icon} {label}</div>
                                    <div style={{ fontSize: '0.72rem', color: horizon===val ? '#a78bfa' : '#555' }}>{desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Confirmar */}
                        <button onClick={handleConfirm} style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '16px' }}
                            onMouseEnter={e=>e.currentTarget.style.background='#6d28d9'} onMouseLeave={e=>e.currentTarget.style.background='#7c3aed'}>
                            <Sparkles size={18} /> Confirmar y generar ideas
                        </button>
                        <p style={{ ...S.hint, textAlign: 'center' }}>
                            <Info size={12} style={{ display:'inline', marginRight:'4px', verticalAlign:'middle' }} />
                            Los campos se guardan automáticamente mientras escribes.
                        </p>
                    </div>
                )}

                {/* Modals */}
                <VoiceModal
                    isOpen={voiceOpen}
                    onClose={() => setVoiceOpen(false)}
                    fieldHint={voiceField}
                    projectId={projectId}
                    onResult={handleVoiceResult}
                />
                <BrainImproveModal
                    isOpen={!!improveConfig}
                    onClose={() => setImproveConfig(null)}
                    target={improveConfig?.target || 'field'}
                    currentData={improveConfig?.currentData || {}}
                    customFields={improveConfig?.customFields || null}
                    onApply={handleApplyImprove}
                />
                <SuggestionsModal
                    isOpen={suggestOpen}
                    onClose={() => setSuggestOpen(false)}
                    type={suggestType}
                    brain={{
                        biography:         fields.bio      || brain?.biography     || '',
                        audience:          fields.audience  || brain?.audience      || '',
                        products_services: fields.offer     || brain?.products_services || '',
                        style_words:       fields.style     || brain?.style_words   || '',
                    }}
                    existing={(fields[suggestType]||'').split('\n').filter(Boolean)}
                    onAdd={handleAddSuggestions}
                />
            </div>
        );
    }

    /* ── WIZARD MODE (no brain) ───────────────────────── */
    const wizSteps = [
        { id:1, label:'Negocio y Bio', q:'¿Quién eres y qué haces? ¿Qué resultados has conseguido?', ph:'Soy María, nutricionista de mujeres de +40. Llevo 8 años…', key:'step1' },
        { id:2, label:'Audiencia', q:'¿Quién es tu cliente ideal? ¿Qué problema tiene y qué desea?', ph:'Mujeres emprendedoras de 35–55, sin tiempo, que quieren perder peso sin sacrificios…', key:'step2' },
        { id:3, label:'Oferta', q:'¿Qué vendes? ¿Qué problema resuelves? ¿Cuáles son las objeciones más comunes?', ph:'Vendo asesorías 1:1 y curso online. Problema: "no tengo tiempo". Objeción: "ya lo intenté"…', key:'step3' },
        { id:4, label:'Estilo', q:'¿Qué tono usas? Escribe 3–5 palabras que te definan.', ph:'Cercana pero directa. Palabras: energía, resultados, sin humo, auténtica…', key:'step4' },
        { id:5, label:'Pilares y FAQs', q:'Anota tus pilares de contenido (uno por línea) y las preguntas frecuentes que te hace tu audiencia.', ph:'Pilares:\nHábitos saludables\nProductividad femenina\n\nFAQs:\n¿Por dónde empiezo?\n¿Cuánto tarda en verse…', key:'step5' },
    ];
    const cw = wizSteps.find(s=>s.id===wizardStep);
    const isLast = wizardStep === wizSteps.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Banner restauración */}
            {showRestore && (
                <RestoreBanner
                    message="Tienes cambios sin guardar en el Cerebro IA"
                    onRestore={() => setShowRestore(false)}
                    onDiscard={() => {
                        try { sessionStorage.removeItem(FIELDS_KEY); } catch {}
                        setFields(defaultFields);
                        setShowRestore(false);
                    }}
                />
            )}
            <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    🧠 Activa tu Cerebro IA
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 }}>
                    5 preguntas rápidas para que WRITI genere contenido en tu voz, no en la de una IA genérica.
                </p>
                <AutosaveIndicator saving={autosaving} />
            </div>

            {/* Voice option */}
            <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>¿Prefieres hablar?</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)' }}>Cuéntanos de tu negocio y WRITI rellena tu Cerebro IA al instante.</p>
                </div>
                <button
                    onClick={() => { setVoiceField('all'); setVoiceOpen(true); }}
                    style={{ ...S.btnGhost, flexShrink: 0, color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', padding: '9px 16px' }}
                >
                    <Mic size={14} /> Grabar
                </button>
            </div>

            {banner && (
                <div style={{ padding: '11px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '11px', fontSize: '0.82rem', color: '#34d399' }}>
                    {banner}
                </div>
            )}

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '5px' }}>
                {wizSteps.map(s => (
                    <div key={s.id} style={{ height: '3px', flex: 1, borderRadius: '2px', background: s.id <= wizardStep ? '#7c3aed' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
                ))}
            </div>

            {/* Question card */}
            <div style={{ ...S.card, borderColor: 'rgba(167,139,250,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '100px', padding: '3px 10px' }}>
                        {cw.label} · {wizardStep}/5
                    </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', marginBottom: '14px', lineHeight: 1.65 }}>{cw.q}</p>
                <textarea
                    key={wizardStep}
                    value={answers[cw.key]}
                    onChange={e => setAnswers(prev => ({ ...prev, [cw.key]: e.target.value }))}
                    placeholder={cw.ph}
                    rows={6}
                    autoFocus
                    style={S.textarea}
                    onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {wizardStep > 1 && (
                    <button onClick={() => setWizardStep(w=>w-1)} style={S.btnSecondary}>
                        <ChevronLeft size={16} /> Atrás
                    </button>
                )}
                {!isLast ? (
                    <button onClick={() => setWizardStep(w=>w+1)} style={S.btnPrimary}
                        onMouseEnter={e=>e.currentTarget.style.background='#6d28d9'} onMouseLeave={e=>e.currentTarget.style.background='#7c3aed'}>
                        Siguiente <ChevronRight size={16} />
                    </button>
                ) : (
                    <button onClick={handleGenerateBrain} disabled={generating} style={{ ...S.btnPrimary, background: generating ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#10b981,#059669)', color: generating ? '#555' : '#fff', cursor: generating ? 'not-allowed' : 'pointer' }}
                        onMouseEnter={e=>{ if(!generating) e.currentTarget.style.opacity='0.9'; }} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                        {generating ? <><Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }} /> Generando…</> : <><Sparkles size={17} /> Generar Cerebro IA</>}
                    </button>
                )}
            </div>
            {genError && <div style={{ padding:'12px 16px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'12px', color:'#f87171', fontSize:'0.85rem' }}>{genError}</div>}
            {isLast && <p style={S.hint}>Cuesta 2 créditos. Podrás ajustarlo después.</p>}

            {/* Voice modal in wizard mode */}
            <VoiceModal
                isOpen={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                fieldHint={voiceField}
                projectId={projectId}
                onResult={(t, b) => {
                    if (b?.bio)      setAnswers(p=>({...p, step1: b.bio}));
                    if (b?.audience) setAnswers(p=>({...p, step2: b.audience}));
                    if (b?.offer)    setAnswers(p=>({...p, step3: b.offer}));
                    if (b?.style)    setAnswers(p=>({...p, step4: b.style}));
                    handleVoiceResult(t, b);
                }}
            />
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

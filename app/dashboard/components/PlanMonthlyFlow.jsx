'use client';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Loader } from 'lucide-react';
import VoiceDictation from '@/app/components/VoiceDictation';

const PROMPTS_PAIN = [
    'Tu cliente siente miedo a...',
    'El problema más urgente es...',
    'Están frustrados porque...',
    'No pueden permitirse...',
    'Tienen pánico a...',
];

export default function PlanMonthlyFlow({
    // Step data
    planPlatforms, setPlanPlatforms,
    planFrequency, setPlanFrequency,
    businessOffer, setBusinessOffer,
    ticketPrice, setTicketPrice,
    targetAudienceType, setTargetAudienceType,
    mainPainPoint, setMainPainPoint,

    // Config
    PLATAFORMAS, FRECUENCIAS, AUDIENCIAS_PLAN,

    // AI refinement
    handleImproveField, polishingField, aiRefineInstructions, setAiRefineInstructions,

    // Navigation
    onBack, onComplete,
}) {
    const [step, setStep] = useState(0);
    const [promptIdx, setPromptIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setPromptIdx(i => (i + 1) % PROMPTS_PAIN.length), 3500);
        return () => clearInterval(t);
    }, []);

    const steps = [
        { title: 'Plataformas', subtitle: '¿Dónde vendes?' },
        { title: 'Frecuencia', subtitle: '¿Cuánto contenido?' },
        { title: 'Tu oferta', subtitle: '¿Qué vendes?' },
        { title: 'Precio', subtitle: 'Ticket medio (opcional)' },
        { title: 'Audiencia', subtitle: '¿Quién es tu cliente?' },
        { title: 'El problema', subtitle: 'Cuéntamelo tú' },
    ];

    const canAdvance = () => {
        if (step === 0) return planPlatforms.length > 0;
        if (step === 1) return planFrequency;
        if (step === 2) return businessOffer.trim().length > 0;
        if (step === 3) return true; // precio es opcional
        if (step === 4) return targetAudienceType;
        if (step === 5) return mainPainPoint.trim().length > 0;
        return false;
    };

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const progressPercent = ((step + 1) / steps.length) * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '600px', position: 'relative' }}>
            {/* Progress bar */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                        Paso {step + 1} de {steps.length}
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        {Math.round(progressPercent)}%
                    </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '40px', textAlign: 'center', animation: 'fadeInDown 0.4s ease' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                    {steps[step].title}
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    {steps[step].subtitle}
                </p>
            </div>

            {/* STEP 0: PLATFORMS */}
            {step === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px', animation: 'slideInRight 0.4s ease', marginBottom: '48px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {PLATAFORMAS.map(p => (
                            <button
                                key={p}
                                onClick={() => {
                                    if (planPlatforms.includes(p)) {
                                        setPlanPlatforms(planPlatforms.filter(x => x !== p));
                                    } else {
                                        setPlanPlatforms([...planPlatforms, p]);
                                    }
                                }}
                                style={{
                                    padding: '20px 24px',
                                    borderRadius: '16px',
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    border: planPlatforms.includes(p) ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)',
                                    background: planPlatforms.includes(p) ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                                    color: planPlatforms.includes(p) ? '#a78bfa' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textAlign: 'left',
                                    transform: planPlatforms.includes(p) ? 'translateX(8px)' : 'translateX(0)',
                                }}
                            >
                                {planPlatforms.includes(p) ? '✓ ' : ''}{p}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 1: FREQUENCY */}
            {step === 1 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px', animation: 'slideInRight 0.4s ease', marginBottom: '48px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {FRECUENCIAS.map(f => (
                            <button
                                key={f}
                                onClick={() => setPlanFrequency(f)}
                                style={{
                                    padding: '20px 24px',
                                    borderRadius: '16px',
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    border: planFrequency === f ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.1)',
                                    background: planFrequency === f ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.03)',
                                    color: planFrequency === f ? '#4ade80' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textAlign: 'left',
                                    transform: planFrequency === f ? 'translateX(8px)' : 'translateX(0)',
                                }}
                            >
                                {planFrequency === f ? '✓ ' : ''}{f}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: OFFER */}
            {step === 2 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', animation: 'slideInRight 0.4s ease', marginBottom: '48px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Ej: Mentoría 1:1, Curso de IA, Pack de 10 videos..."
                            value={businessOffer}
                            onChange={(e) => setBusinessOffer(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '20px 24px',
                                paddingRight: '70px',
                                borderRadius: '16px',
                                fontSize: '1.05rem',
                                border: '2px solid rgba(255,206,86,0.4)',
                                background: 'rgba(255,206,86,0.05)',
                                color: '#fff',
                                outline: 'none',
                                transition: 'all 0.3s',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(255,206,86,0.8)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,206,86,0.4)'}
                            autoFocus
                        />
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                            <VoiceDictation
                                onResult={text => setBusinessOffer(prev => prev ? `${prev} ${text}` : text)}
                                style={{ width: '44px', height: '44px' }}
                            />
                        </div>
                    </div>
                    {businessOffer.length >= 2 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Instrucción (ej: hazlo más agresivo...)"
                                value={aiRefineInstructions['businessOffer'] || ''}
                                onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, businessOffer: e.target.value }))}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    outline: 'none',
                                    flex: 1,
                                }}
                            />
                            <button
                                onClick={() => handleImproveField(businessOffer, setBusinessOffer, 'businessOffer', aiRefineInstructions['businessOffer'])}
                                disabled={polishingField === 'businessOffer'}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,206,86,0.3)',
                                    background: 'rgba(255,206,86,0.1)',
                                    color: '#fed84f',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {polishingField === 'businessOffer' ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {aiRefineInstructions['businessOffer'] ? 'Aplicar' : 'Mejorar'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: PRICE */}
            {step === 3 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', animation: 'slideInRight 0.4s ease', marginBottom: '48px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Ej: 49€, 1500€, Suscripción 20€/mes..."
                            value={ticketPrice}
                            onChange={(e) => setTicketPrice(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '20px 24px',
                                paddingRight: '70px',
                                borderRadius: '16px',
                                fontSize: '1.05rem',
                                border: '2px solid rgba(59,130,246,0.4)',
                                background: 'rgba(59,130,246,0.05)',
                                color: '#fff',
                                outline: 'none',
                                transition: 'all 0.3s',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.8)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
                            autoFocus
                        />
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                            <VoiceDictation
                                onResult={text => setTicketPrice(prev => prev ? `${prev} ${text}` : text)}
                                style={{ width: '44px', height: '44px' }}
                            />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                        Este campo es opcional — continúa aunque dejes vacío
                    </p>
                </div>
            )}

            {/* STEP 4: AUDIENCE */}
            {step === 4 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px', animation: 'slideInRight 0.4s ease', marginBottom: '48px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {AUDIENCIAS_PLAN.map(a => (
                            <button
                                key={a}
                                onClick={() => setTargetAudienceType(a)}
                                style={{
                                    padding: '18px 24px',
                                    borderRadius: '16px',
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    border: targetAudienceType === a ? '2px solid #a855f7' : '2px solid rgba(255,255,255,0.1)',
                                    background: targetAudienceType === a ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                                    color: targetAudienceType === a ? '#d8b4fe' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textAlign: 'left',
                                    transform: targetAudienceType === a ? 'translateX(8px)' : 'translateX(0)',
                                }}
                            >
                                {targetAudienceType === a ? '✓ ' : ''}{a}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 5: PAIN POINT */}
            {step === 5 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px', animation: 'slideInRight 0.4s ease', marginBottom: '48px' }}>
                    <div
                        key={promptIdx}
                        style={{
                            display: 'inline-block',
                            background: 'rgba(236,72,153,0.15)',
                            border: '1px solid rgba(236,72,153,0.4)',
                            borderRadius: '12px',
                            padding: '12px 18px',
                            animation: 'fadeInUp 0.4s ease',
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            💭 {PROMPTS_PAIN[promptIdx]}
                        </span>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <textarea
                            placeholder="Habla o escribe..."
                            value={mainPainPoint}
                            onChange={(e) => setMainPainPoint(e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: '180px',
                                padding: '20px 24px',
                                borderRadius: '16px',
                                fontSize: '1.05rem',
                                border: '2px solid rgba(236,72,153,0.4)',
                                background: 'rgba(236,72,153,0.05)',
                                color: '#fff',
                                outline: 'none',
                                fontFamily: 'inherit',
                                resize: 'none',
                                transition: 'all 0.3s',
                                paddingRight: '70px',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(236,72,153,0.8)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(236,72,153,0.4)'}
                            autoFocus
                        />
                        <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
                            <VoiceDictation
                                onResult={text => setMainPainPoint(prev => prev ? `${prev} ${text}` : text)}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                }}
                            />
                        </div>
                    </div>

                    {mainPainPoint.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Instrucción para mejorar..."
                                value={aiRefineInstructions['mainPainPoint'] || ''}
                                onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, mainPainPoint: e.target.value }))}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    outline: 'none',
                                    flex: 1,
                                }}
                            />
                            <button
                                onClick={() => handleImproveField(mainPainPoint, setMainPainPoint, 'mainPainPoint', aiRefineInstructions['mainPainPoint'])}
                                disabled={polishingField === 'mainPainPoint'}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(236,72,153,0.3)',
                                    background: 'rgba(236,72,153,0.1)',
                                    color: '#ec4899',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {polishingField === 'mainPainPoint' ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {aiRefineInstructions['mainPainPoint'] ? 'Aplicar' : 'Mejorar'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '32px' }}>
                <button
                    onClick={() => step === 0 ? onBack() : setStep(step - 1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                    <ChevronLeft size={18} /> Atrás
                </button>

                <button
                    onClick={handleNext}
                    disabled={!canAdvance()}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: canAdvance() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(124,58,237,0.2)',
                        color: canAdvance() ? '#fff' : 'rgba(255,255,255,0.3)',
                        cursor: canAdvance() ? 'pointer' : 'not-allowed',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                    }}
                >
                    {step === steps.length - 1 ? 'Completar' : 'Siguiente'} <ChevronRight size={18} />
                </button>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Loader, ChevronRight } from 'lucide-react';
import VoiceDictation from '@/app/components/VoiceDictation';

const AUDIENCIAS_PLAN = ['Emprendedores', 'Coaches/Consultores', 'Profesionales', 'Creadores', 'Empresas B2B'];
const ESTILOS = [
    'Menciona tu problema principal en una frase',
    'Describe quién es tu cliente ideal',
    'Cuéntame sus miedos más grandes',
    'Qué hace diferente a tu solución',
    'Cuál es su mayor frustración ahora',
];

export default function PlanMonthlyStep1({
    planPlatforms, setPlanPlatforms,
    planFrequency, setPlanFrequency,
    businessOffer, setBusinessOffer,
    ticketPrice, setTicketPrice,
    targetAudienceType, setTargetAudienceType,
    mainPainPoint, setMainPainPoint,
    PLATAFORMAS, FRECUENCIAS,
    handleImproveField, polishingField, aiRefineInstructions, setAiRefineInstructions,
    onNext, onBack,
}) {
    const [promptIdx, setPromptIdx] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setPromptIdx(i => (i + 1) % ESTILOS.length), 4000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px' }}>
                    Construyamos tu mes
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    4 pasos. 20 minutos. Un mes listo para grabar.
                </p>
            </div>

            {/* Plataformas Card */}
            <div style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: '16px',
                padding: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '1.4rem' }}>📱</span>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Plataformas
                    </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: planPlatforms.includes(p) ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)',
                                background: planPlatforms.includes(p) ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.03)',
                                color: planPlatforms.includes(p) ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Frecuencia Card */}
            <div style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '16px',
                padding: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '1.4rem' }}>⚡</span>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Frecuencia semanal
                    </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {FRECUENCIAS.map(f => (
                        <button
                            key={f}
                            onClick={() => setPlanFrequency(f)}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: planFrequency === f ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.15)',
                                background: planFrequency === f ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.03)',
                                color: planFrequency === f ? '#4ade80' : 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {f.split(' ')[0]}× por semana
                        </button>
                    ))}
                </div>
            </div>

            {/* Business Info Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Offer Card */}
                <div style={{
                    background: 'rgba(251,146,60,0.08)',
                    border: '1px solid rgba(251,146,60,0.25)',
                    borderRadius: '16px',
                    padding: '20px',
                }}>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 12px', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        🎁 ¿Qué vendes?
                    </h3>
                    <input
                        className="input-field"
                        placeholder="Ej: Mentoría 1:1, Curso IA..."
                        value={businessOffer}
                        onChange={(e) => setBusinessOffer(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(251,146,60,0.3)',
                            color: '#fff',
                            padding: '10px 14px',
                            borderRadius: '10px',
                        }}
                    />
                </div>

                {/* Price Card */}
                <div style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: '16px',
                    padding: '20px',
                }}>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 12px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        💰 Precio (Opcional)
                    </h3>
                    <input
                        className="input-field"
                        placeholder="Ej: 49€, 1500€..."
                        value={ticketPrice}
                        onChange={(e) => setTicketPrice(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            color: '#fff',
                            padding: '10px 14px',
                            borderRadius: '10px',
                        }}
                    />
                </div>

                {/* Audience Type Card */}
                <div style={{
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.25)',
                    borderRadius: '16px',
                    padding: '20px',
                }}>
                    <h3 style={{ fontSize: '0.82rem', fontWeight: 800, margin: '0 0 12px', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        👥 Tipo de audiencia
                    </h3>
                    <select
                        className="select-field"
                        value={targetAudienceType}
                        onChange={(e) => setTargetAudienceType(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(168,85,247,0.3)',
                            color: '#fff',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            width: '100%',
                        }}
                    >
                        {AUDIENCIAS_PLAN.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                {/* Placeholder for symmetry */}
                <div style={{ opacity: 0, pointerEvents: 'none' }} />
            </div>

            {/* Pain Point Card - LARGE WITH MIC */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(124,58,237,0.1))',
                border: '1px solid rgba(236,72,153,0.3)',
                borderRadius: '20px',
                padding: '32px',
                position: 'relative',
            }}>
                {/* Rotating Prompt */}
                <div
                    key={promptIdx}
                    style={{
                        display: 'inline-block',
                        background: 'rgba(236,72,153,0.15)',
                        border: '1px solid rgba(236,72,153,0.4)',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        marginBottom: '16px',
                        animation: 'fadeInUp 0.4s ease',
                    }}
                >
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        💭 {ESTILOS[promptIdx]}
                    </span>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>
                    Tu problema nº1 (Voz o texto)
                </h3>

                <div style={{ position: 'relative' }}>
                    <textarea
                        className="textarea-field"
                        placeholder="Di o escribe el mayor problema de tu audiencia..."
                        value={mainPainPoint}
                        onChange={(e) => setMainPainPoint(e.target.value)}
                        rows={4}
                        style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '2px solid rgba(236,72,153,0.3)',
                            borderRadius: '14px',
                            color: '#fff',
                            padding: '16px',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            width: '100%',
                            boxSizing: 'border-box',
                            paddingRight: '60px',
                        }}
                    />

                    {/* Mic Button - BIG */}
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                        <VoiceDictation
                            onResult={text => setMainPainPoint(prev => prev ? `${prev} ${text}` : text)}
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'rgba(236,72,153,0.25)',
                                border: '2px solid rgba(236,72,153,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        />
                    </div>
                </div>

                {/* Char count */}
                <div style={{ fontSize: '0.7rem', color: 'rgba(236,72,153,0.5)', marginTop: '8px', textAlign: 'right' }}>
                    {mainPainPoint.length} caracteres
                </div>

                {/* AI Polish Button */}
                {mainPainPoint.length >= 2 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                        <input
                            className="input-field"
                            style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.05)' }}
                            placeholder="Instrucción (ej: hazlo más agresivo...)"
                            value={aiRefineInstructions['mainPainPoint'] || ''}
                            onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, mainPainPoint: e.target.value }))}
                        />
                        <button
                            onClick={() => handleImproveField(mainPainPoint, setMainPainPoint, 'mainPainPoint', aiRefineInstructions['mainPainPoint'])}
                            disabled={polishingField === 'mainPainPoint'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                fontWeight: 700, cursor: polishingField === 'mainPainPoint' ? 'default' : 'pointer',
                                background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)',
                                color: '#ec4899', transition: '0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {polishingField === 'mainPainPoint' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {aiRefineInstructions['mainPainPoint'] ? 'Aplicar' : 'Mejorar'}
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                    onClick={onBack}
                    style={{
                        flex: 1,
                        padding: '12px 20px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                >
                    ← Volver
                </button>
                <button
                    onClick={() => {
                        if (planPlatforms.length === 0) { alert('Selecciona al menos una plataforma.'); return; }
                        onNext();
                    }}
                    style={{
                        flex: 2,
                        padding: '12px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                    }}
                >
                    Siguiente <ChevronRight size={16} />
                </button>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

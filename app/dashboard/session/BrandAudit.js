'use client';
import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Zap, Target, TrendingUp, Users, Star, ArrowRight } from 'lucide-react';

/**
 * BrandAudit — auditoría rápida de marca con IA
 * Se muestra al final del bloque de FAQs cuando el usuario tiene datos suficientes.
 */
export default function BrandAudit({ fields, projectId, onComplete }) {
    const [status, setStatus]   = useState('idle');  // idle | loading | done | error
    const [audit, setAudit]     = useState(null);
    const [expanded, setExpanded] = useState(true);
    const [errMsg, setErrMsg]   = useState('');

    const hasEnoughData = (fields.bio || fields.audience) && (fields.pillars || fields.faqs);

    async function runAudit() {
        setStatus('loading');
        setErrMsg('');
        try {
            const res = await fetch('/api/optimize-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: 'brand_audit',
                    data: {
                        bio:      fields.bio      || '',
                        audience: fields.audience || '',
                        offer:    fields.offer    || '',
                        style:    fields.style    || '',
                        pillars:  fields.pillars  || '',
                        faqs:     fields.faqs     || '',
                    },
                    projectId: projectId || null,
                    lang: 'es',
                }),
            });
            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); setStatus('idle'); return; }
            if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Error al generar auditoría.'); }
            const data = await res.json();
            setAudit(data.audit || {});
            setStatus('done');
        } catch (e) {
            setErrMsg(e.message);
            setStatus('error');
        }
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(167,139,250,0.04) 100%)',
            border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: '20px',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', cursor: status === 'done' ? 'pointer' : 'default' }}
                 onClick={() => status === 'done' && setExpanded(e => !e)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Star size={20} color="#a78bfa" strokeWidth={1.8} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                            Auditoría de Marca IA
                        </h3>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                            Análisis rápido de tu posicionamiento y oportunidades de contenido
                        </p>
                    </div>
                </div>
                {status === 'done' && (
                    <div style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                )}
            </div>

            {/* Body */}
            {(status === 'idle' || status === 'error') && (
                <div style={{ padding: '0 24px 20px' }}>
                    {!hasEnoughData ? (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                            Rellena al menos Biografía + Audiencia o Pilares para activar la auditoría.
                        </p>
                    ) : (
                        <>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: '16px' }}>
                                WRITI analizará tu Cerebro IA completo y te dará: posicionamiento, fortalezas, oportunidades de contenido y un quick-win para esta semana.
                            </p>
                            {errMsg && <p style={{ fontSize: '0.78rem', color: '#f87171', marginBottom: '12px' }}>{errMsg}</p>}
                            <button
                                onClick={runAudit}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: '#7c3aed', color: '#fff', border: 'none',
                                    borderRadius: '12px', padding: '11px 22px',
                                    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                            >
                                <Sparkles size={15} /> Generar auditoría de marca
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>· 1 crédito</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {status === 'loading' && (
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={20} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Analizando tu marca y generando insights…</p>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                </div>
            )}

            {status === 'done' && audit && expanded && (
                <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Posicionamiento */}
                    {audit.positioning && (
                        <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '14px', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Target size={15} color="#a78bfa" />
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tu posicionamiento único</span>
                            </div>
                            <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0 }}>{audit.positioning}</p>
                        </div>
                    )}

                    {/* Grid: Fortalezas + Oportunidades */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="audit-grid">
                        {audit.strengths?.length > 0 && (
                            <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                                    <Zap size={13} color="#34d399" />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fortalezas</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {audit.strengths.map((s, i) => (
                                        <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {audit.opportunities?.length > 0 && (
                            <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                                    <TrendingUp size={13} color="#fbbf24" />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Oportunidades</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {audit.opportunities.map((o, i) => (
                                        <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{o}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Ángulos de contenido */}
                    {audit.contentAngles?.length > 0 && (
                        <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '12px', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                                <Sparkles size={13} color="#60a5fa" />
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ángulos de contenido que funcionarán</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                {audit.contentAngles.map((a, i) => (
                                    <span key={i} style={{ fontSize: '0.78rem', padding: '5px 11px', borderRadius: '100px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: 'rgba(255,255,255,0.75)' }}>
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audience insight */}
                    {audit.audienceInsight && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                <Users size={13} color="rgba(255,255,255,0.4)" />
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Insight de audiencia</span>
                            </div>
                            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{audit.audienceInsight}"</p>
                        </div>
                    )}

                    {/* Quick win */}
                    {audit.quickWin && (
                        <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ArrowRight size={16} color="#a78bfa" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                                    Quick win · acción para esta semana
                                </p>
                                <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{audit.quickWin}</p>
                            </div>
                        </div>
                    )}

                    {/* CTA continuar */}
                    {onComplete && (
                        <div style={{ paddingTop: '6px' }}>
                            <button
                                onClick={onComplete}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: '#7c3aed', color: '#fff', border: 'none',
                                    borderRadius: '12px', padding: '12px 24px',
                                    fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                            >
                                Continuar a las ideas <ArrowRight size={16} />
                            </button>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: '8px' }}>
                                Tu Cerebro IA está listo. Ahora generamos ideas específicas para tu nicho.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @media (max-width: 600px) { .audit-grid { grid-template-columns: 1fr !important; } }
            `}</style>
        </div>
    );
}

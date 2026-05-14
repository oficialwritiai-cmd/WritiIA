'use client';
import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Zap, Target, TrendingUp, Users, Star, ArrowRight, Download, RefreshCw, BookOpen } from 'lucide-react';

export default function BrandAudit({ fields, projectId }) {
    const [status, setStatus]   = useState('idle');
    const [audit, setAudit]     = useState(null);
    const [expanded, setExpanded] = useState(true);
    const [errMsg, setErrMsg]   = useState('');
    const [saved, setSaved]     = useState(false);
    const supabase = createSupabaseClient();

    const hasData = !!(fields.bio || fields.audience || fields.pillars);

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
                        bio:      (fields.bio      || '').slice(0, 500),
                        audience: (fields.audience  || '').slice(0, 400),
                        offer:    (fields.offer     || '').slice(0, 400),
                        style:    (fields.style     || '').slice(0, 200),
                        pillars:  (fields.pillars   || '').slice(0, 300),
                        faqs:     (fields.faqs      || '').slice(0, 300),
                    },
                    projectId: projectId || null,
                    lang: 'es',
                }),
            });

            if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); setStatus('idle'); return; }
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || `Error ${res.status}`);
            }

            const data = await res.json();
            console.log('[BrandAudit] raw data:', data);

            const a = data.audit || {};
            // Normalize: some fields might come as strings instead of arrays
            if (typeof a.strengths    === 'string') a.strengths    = a.strengths.split('\n').filter(Boolean);
            if (typeof a.opportunities === 'string') a.opportunities = a.opportunities.split('\n').filter(Boolean);
            if (typeof a.contentAngles === 'string') a.contentAngles = a.contentAngles.split('\n').filter(Boolean);

            if (!a.positioning && !a.strengths?.length && !a.quickWin && !a.audienceInsight) {
                throw new Error('No se generó análisis. Asegúrate de tener Biografía o Pilares rellenados e inténtalo de nuevo.');
            }

            setAudit(a);
            setStatus('done');

            // Auto-save audit to project_brains.learning_notes so the algorithm can use it
            if (projectId) {
                try {
                    const auditText = [
                        `=== AUDITORÍA DE MARCA (${new Date().toLocaleDateString('es-ES')}) ===`,
                        a.positioning ? `Posicionamiento: ${a.positioning}` : '',
                        a.strengths?.length ? `Fortalezas: ${a.strengths.join(' · ')}` : '',
                        a.opportunities?.length ? `Oportunidades: ${a.opportunities.join(' · ')}` : '',
                        a.contentAngles?.length ? `Ángulos de contenido: ${a.contentAngles.join(' · ')}` : '',
                        a.audienceInsight ? `Insight audiencia: ${a.audienceInsight}` : '',
                        a.quickWin ? `Quick win: ${a.quickWin}` : '',
                        '=========================',
                    ].filter(Boolean).join('\n');

                    await supabase.from('project_brains')
                        .update({ learning_notes: auditText })
                        .eq('project_id', projectId);
                    setSaved(true);
                } catch (e) {
                    console.error('[BrandAudit] save error:', e);
                }
            }
        } catch (e) {
            console.error('[BrandAudit]', e);
            setErrMsg(e.message);
            setStatus('error');
        }
    }

    function exportPDF() {
        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Auditoría de Marca — WRITI.AI</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:40px;color:#1a1a2e;background:#fff;line-height:1.6}
  h1{color:#7c3aed;font-size:1.8rem;margin-bottom:4px}
  .sub{color:#666;font-size:0.9rem;margin-bottom:32px}
  h2{color:#7c3aed;font-size:1rem;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 8px;border-bottom:2px solid #e8e0ff;padding-bottom:6px}
  p{margin:8px 0;color:#2d2d4e;font-size:0.95rem}
  ul{margin:6px 0;padding-left:20px}
  li{color:#2d2d4e;font-size:0.93rem;margin-bottom:4px}
  .chip{display:inline-block;background:#f3eeff;color:#7c3aed;border-radius:20px;padding:4px 12px;margin:3px;font-size:0.82rem;font-weight:600}
  .quickwin{background:#f3eeff;border-left:4px solid #7c3aed;padding:14px 18px;border-radius:0 10px 10px 0;margin-top:8px}
  .footer{margin-top:40px;color:#aaa;font-size:0.78rem;border-top:1px solid #eee;padding-top:12px}
  @media print{body{margin:20px}button{display:none}}
</style>
</head><body>
<h1>🔮 Auditoría de Marca</h1>
<p class="sub">Generado por WRITI.AI · ${new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}</p>

${audit?.positioning ? `<h2>Tu posicionamiento único</h2><p>${audit.positioning}</p>` : ''}

${audit?.strengths?.length ? `<h2>Fortalezas</h2><ul>${audit.strengths.map(s=>`<li>${s}</li>`).join('')}</ul>` : ''}

${audit?.opportunities?.length ? `<h2>Oportunidades</h2><ul>${audit.opportunities.map(o=>`<li>${o}</li>`).join('')}</ul>` : ''}

${audit?.contentAngles?.length ? `<h2>Ángulos de contenido</h2><p>${audit.contentAngles.map(a=>`<span class="chip">${a}</span>`).join(' ')}</p>` : ''}

${audit?.audienceInsight ? `<h2>Insight de audiencia</h2><p><em>"${audit.audienceInsight}"</em></p>` : ''}

${audit?.quickWin ? `<h2>Quick win · Esta semana</h2><div class="quickwin">${audit.quickWin}</div>` : ''}

<p class="footer">WRITI.AI — Sistema de planificación de contenido con IA</p>
<script>window.onload=()=>window.print()</script>
</body></html>`);
        win.document.close();
    }

    return (
        <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(167,139,250,0.04))', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '20px', overflow: 'hidden' }}>

            {/* Header */}
            <div
                style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', cursor: status === 'done' ? 'pointer' : 'default' }}
                onClick={() => status === 'done' && setExpanded(e => !e)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Star size={20} color="#a78bfa" strokeWidth={1.8} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Auditoría de Marca IA</h3>
                            {saved && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '100px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <BookOpen size={10} /> Guardado en Cerebro IA
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Posicionamiento, fortalezas y quick-win de esta semana</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {status === 'done' && (
                        <button
                            onClick={e => { e.stopPropagation(); exportPDF(); }}
                            title="Exportar PDF"
                            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 600 }}
                        >
                            <Download size={13} /> PDF
                        </button>
                    )}
                    {status === 'done' && (expanded ? <ChevronUp size={18} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={18} color="rgba(255,255,255,0.3)" />)}
                </div>
            </div>

            {/* Idle */}
            {(status === 'idle' || status === 'error') && (
                <div style={{ padding: '0 24px 20px' }}>
                    {!hasData ? (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Rellena al menos Biografía o Pilares para activar la auditoría.</p>
                    ) : (
                        <>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: '14px' }}>
                                WRITI analiza todo tu Cerebro IA y te devuelve posicionamiento, fortalezas, oportunidades de contenido y un quick-win para esta semana.
                            </p>
                            {errMsg && <p style={{ fontSize: '0.78rem', color: '#f87171', marginBottom: '12px' }}>{errMsg}</p>}
                            <button
                                onClick={runAudit}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 22px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                            >
                                {status === 'error' ? <><RefreshCw size={14} /> Reintentar auditoría</> : <><Sparkles size={15} /> Generar auditoría · 1 crédito</>}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Loading */}
            {status === 'loading' && (
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={20} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Analizando tu marca completa…</p>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                </div>
            )}

            {/* Done */}
            {status === 'done' && audit && expanded && (
                <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {audit.positioning && (
                        <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                                <Target size={14} color="#a78bfa" />
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Posicionamiento único</span>
                            </div>
                            <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0 }}>{audit.positioning}</p>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }} className="audit-grid">
                        {audit.strengths?.length > 0 && (
                            <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Zap size={12} color="#34d399" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Fortalezas</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {audit.strengths.map((s, i) => <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{s}</li>)}
                                </ul>
                            </div>
                        )}
                        {audit.opportunities?.length > 0 && (
                            <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <TrendingUp size={12} color="#fbbf24" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Oportunidades</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {audit.opportunities.map((o, i) => <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{o}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {audit.contentAngles?.length > 0 && (
                        <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '12px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Sparkles size={12} color="#60a5fa" />
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ángulos de contenido</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {audit.contentAngles.map((a, i) => (
                                    <span key={i} style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '100px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: 'rgba(255,255,255,0.75)' }}>{a}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {audit.audienceInsight && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <Users size={12} color="rgba(255,255,255,0.35)" />
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Insight de audiencia</span>
                            </div>
                            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{audit.audienceInsight}"</p>
                        </div>
                    )}

                    {audit.quickWin && (
                        <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '12px' }}>
                            <ArrowRight size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>Quick win · esta semana</p>
                                <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{audit.quickWin}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@media (max-width:600px){.audit-grid{grid-template-columns:1fr!important}}`}</style>
        </div>
    );
}

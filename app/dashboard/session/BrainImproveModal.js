'use client';
import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';

/**
 * BrainImproveModal — llama a /api/optimize-brain, muestra un preview
 * del texto mejorado y permite "Reemplazar todo" o "Mantener como está".
 *
 * Props:
 *  isOpen        boolean
 *  onClose       () => void
 *  target        'brain' | 'context'
 *  currentData   { bio, audience, style } | { pillars: string, faqs: string }
 *  onApply       (improved) => void  — recibe el objeto mejorado
 */
export default function BrainImproveModal({ isOpen, onClose, target = 'brain', currentData = {}, customFields = null, onApply }) {
    const [status, setStatus] = useState('idle'); // idle | loading | done | error
    const [improved, setImproved] = useState(null);
    const [errMsg, setErrMsg]     = useState('');

    if (!isOpen) return null;

    async function runOptimize() {
        setStatus('loading');
        setErrMsg('');
        try {
            // For target: 'field', currentData already has the right shape
            const res = await fetch('/api/optimize-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target, data: currentData, lang: 'es' }),
            });
            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                throw new Error('Sin créditos. Añade más para usar Mejorar con IA.');
            }
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || 'Error al optimizar.');
            }
            const result = await res.json();
            setImproved(result.improved);
            setStatus('done');
        } catch (e) {
            setErrMsg(e.message);
            setStatus('error');
        }
    }

    function handleApply() {
        onApply?.(improved);
        handleClose();
    }

    function handleClose() {
        setStatus('idle');
        setImproved(null);
        setErrMsg('');
        onClose();
    }

    const fields = customFields || (
        target === 'brain'   ? [{ key:'bio', label:'Biografía' }, { key:'audience', label:'Audiencia ideal' }, { key:'style', label:'Estilo y palabras clave' }] :
        target === 'context' ? [{ key:'pillars', label:'Pilares de contenido' }, { key:'faqs', label:'FAQs de clientes' }] :
        target === 'field'   ? [{ key: currentData.fieldKey, label: currentData.fieldLabel || currentData.fieldKey }] :
        []
    );

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, backdropFilter: 'blur(6px)' }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '600px', maxHeight: '85vh',
                background: '#161620', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px', zIndex: 9001,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={17} color="#a78bfa" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>Mejorar con IA</p>
                            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                                {target === 'brain'  ? 'Cerebro IA — bio, audiencia, estilo'
                                 : target === 'field' ? (currentData.fieldLabel || 'Campo individual')
                                 : 'Contexto — pilares y FAQs'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {status === 'idle' && (
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '20px' }}>
                                WRITI analizará lo que escribiste y lo reformulará con frases más claras, sin texto relleno y listas para generar contenido. Siempre podrás revisar antes de aplicar.
                            </p>
                            {/* Preview current */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                                {fields.map(({ key, label }) => {
                                    // For target: 'field', value is in currentData.value
                                    const val = target === 'field' ? currentData.value : currentData[key];
                                    return val ? (
                                    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '11px', padding: '12px 14px' }}>
                                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>{label}</p>
                                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0 }}>{val}</p>
                                    </div>
                                ) : (
                                    <div key={key} style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '11px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic' }}>campo vacío — la IA lo generará</span>
                                    </div>
                                );
                                })}
                            </div>
                            <button
                                onClick={runOptimize}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: '#7c3aed', color: '#fff', border: 'none',
                                    borderRadius: '12px', padding: '12px 22px',
                                    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
                            >
                                <Sparkles size={15} /> Mejorar con IA
                            </button>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Loader2 size={32} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite', marginBottom: '14px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Analizando y mejorando el texto…</p>
                        </div>
                    )}

                    {status === 'done' && improved && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={17} color="#34d399" />
                                <p style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>Versión mejorada lista — revisa antes de aplicar</p>
                            </div>

                            {fields.map(({ key, label }) => {
                                const original = target === 'field' ? currentData.value : currentData[key];
                                const newVal   = improved[key];
                                if (!newVal && !original) return null;

                                return (
                                    <div key={key}>
                                        {/* ── VERSIÓN MEJORADA (siempre arriba y destacada) ── */}
                                        {newVal && (
                                            <div style={{
                                                background: 'rgba(52,211,153,0.06)',
                                                border: '1px solid rgba(52,211,153,0.25)',
                                                borderRadius: '14px', padding: '16px',
                                                marginBottom: '8px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: '100px' }}>
                                                        ✓ Versión mejorada
                                                    </span>
                                                    {label && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>— {label}</span>}
                                                </div>
                                                <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0, fontWeight: 500 }}>
                                                    {newVal}
                                                </p>
                                            </div>
                                        )}

                                        {/* ── TEXTO ACTUAL (tachado / gris) ── */}
                                        {original && (
                                            <div style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '12px', padding: '12px 14px',
                                            }}>
                                                <span style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>
                                                    Texto actual (será reemplazado)
                                                </span>
                                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0, textDecoration: newVal ? 'line-through' : 'none' }}>
                                                    {original.length > 200 ? original.slice(0, 200) + '…' : original}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ padding: '14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.83rem', color: '#f87171' }}>{errMsg}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(status === 'done' || status === 'error') && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', flexShrink: 0 }}>
                        {status === 'done' && (
                            <button
                                onClick={handleApply}
                                style={{ flex: 1, height: '42px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '11px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
                            >
                                <CheckCircle2 size={15} /> Reemplazar todo
                            </button>
                        )}
                        <button
                            onClick={status === 'error' ? runOptimize : handleClose}
                            style={{ flex: status === 'done' ? 0 : 1, height: '42px', paddingInline: '20px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '11px', fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            {status === 'error' ? <><RefreshCw size={14} /> Reintentar</> : 'Mantener como está'}
                        </button>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </>
    );
}

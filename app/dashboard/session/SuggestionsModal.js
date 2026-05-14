'use client';
import { useState } from 'react';
import { X, Sparkles, Loader2, Plus, Check } from 'lucide-react';

/**
 * SuggestionsModal — genera sugerencias de pilares o FAQs con IA
 * y permite añadirlas sin borrar lo que el usuario ya escribió.
 *
 * Props:
 *  isOpen        boolean
 *  onClose       () => void
 *  type          'pillars' | 'faqs'
 *  brain         objeto del cerebro IA (bio, audience, style)
 *  existing      string[]  — lo que ya tiene el usuario
 *  onAdd         (items: string[]) => void  — añade al texto existente
 */
export default function SuggestionsModal({ isOpen, onClose, type = 'pillars', brain = {}, existing = [], onAdd }) {
    const [status, setStatus]         = useState('idle');
    const [suggestions, setSuggestions] = useState([]);
    const [selected, setSelected]     = useState(new Set());
    const [errMsg, setErrMsg]         = useState('');

    if (!isOpen) return null;

    async function generate() {
        setStatus('loading');
        setErrMsg('');
        setSuggestions([]);
        setSelected(new Set());
        try {
            const res = await fetch('/api/optimize-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: 'suggestions',
                    type,
                    brain,
                    existing,
                    lang: 'es',
                }),
            });
            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                throw new Error('Sin créditos. Añade más para generar sugerencias.');
            }
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || 'Error generando sugerencias.');
            }
            const data = await res.json();
            setSuggestions(data.suggestions || []);
            setStatus('done');
        } catch (e) {
            setErrMsg(e.message);
            setStatus('error');
        }
    }

    function toggle(item) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(item) ? next.delete(item) : next.add(item);
            return next;
        });
    }

    function handleAdd() {
        onAdd?.([...selected]);
        handleClose();
    }

    function handleClose() {
        setStatus('idle');
        setSuggestions([]);
        setSelected(new Set());
        setErrMsg('');
        onClose();
    }

    const isPillars = type === 'pillars';
    const title     = isPillars ? 'Sugerencias de pilares' : 'Sugerencias de FAQs';
    const hint      = isPillars
        ? 'Pilares temáticos basados en tu Cerebro IA. Selecciona los que quieres añadir.'
        : 'Preguntas frecuentes que tu audiencia haría basándose en tu negocio.';

    return (
        <>
            <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, backdropFilter: 'blur(6px)' }} />
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '520px', maxHeight: '80vh',
                background: '#161620', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px', zIndex: 9001,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={15} color="#a78bfa" />
                        </div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{title}</p>
                    </div>
                    <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
                    {status === 'idle' && (
                        <div>
                            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '20px' }}>{hint}</p>
                            {existing.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '8px' }}>
                                        Lo que ya tienes ({existing.length})
                                    </p>
                                    {existing.map((e, i) => (
                                        <div key={i} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            {e}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={generate}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '11px', padding: '11px 20px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Sparkles size={14} /> Generar sugerencias con IA
                            </button>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div style={{ textAlign: 'center', padding: '36px 0' }}>
                            <Loader2 size={28} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem' }}>Generando sugerencias personalizadas…</p>
                        </div>
                    )}

                    {status === 'done' && (
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>
                                Selecciona las que quieras añadir — no se borrará lo que ya tienes.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {suggestions.map((s, i) => {
                                    const isSelected = selected.has(s);
                                    const isExisting = existing.includes(s);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => !isExisting && toggle(s)}
                                            disabled={isExisting}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                background: isSelected ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${isSelected ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                                borderRadius: '10px', padding: '10px 14px',
                                                cursor: isExisting ? 'default' : 'pointer',
                                                opacity: isExisting ? 0.45 : 1,
                                                transition: 'all 0.15s ease', width: '100%', textAlign: 'left',
                                            }}
                                        >
                                            <div style={{
                                                width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                                                background: isSelected ? '#7c3aed' : isExisting ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)',
                                                border: `1px solid ${isSelected ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                                                {isExisting && <Check size={12} color="#34d399" strokeWidth={3} />}
                                            </div>
                                            <span style={{ fontSize: '0.83rem', color: isExisting ? 'rgba(255,255,255,0.35)' : '#fff', flex: 1 }}>
                                                {s}
                                                {isExisting && <span style={{ fontSize: '0.7rem', color: '#34d399', marginLeft: '8px' }}>ya incluido</span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ padding: '14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px' }}>
                            <p style={{ fontSize: '0.83rem', color: '#f87171', marginBottom: '12px' }}>{errMsg}</p>
                            <button onClick={generate} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '9px', padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Reintentar
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {status === 'done' && selected.size > 0 && (
                    <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                        <button
                            onClick={handleAdd}
                            style={{ width: '100%', height: '42px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '11px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
                        >
                            <Plus size={15} /> Añadir {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
                        </button>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </>
    );
}

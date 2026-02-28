import { useState, useRef } from 'react';
import { Loader2, Sparkles, Undo2 } from 'lucide-react';

export default function AIPolishedTextarea({
    value,
    onChange,
    placeholder,
    className = "",
    style = {},
    rows = 4
}) {
    const [isPolishing, setIsPolishing] = useState(false);
    const [originalText, setOriginalText] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handlePolish = async () => {
        if (!value || value.length < 20) return;

        setIsPolishing(true);
        try {
            const res = await fetch('/api/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: value }),
            });

            if (!res.ok) throw new Error('Error al mejorar el texto');

            const data = await res.json();

            // Save original text BEFORE replacing
            setOriginalText(value);

            // Update parent state
            onChange({ target: { value: data.polishedText } });

            showToast('Texto mejorado ✓', 'success');
        } catch (error) {
            console.error(error);
            showToast('No se pudo mejorar el texto. Inténtalo de nuevo.', 'error');
        } finally {
            setIsPolishing(false);
        }
    };

    const handleUndo = () => {
        if (originalText !== null) {
            onChange({ target: { value: originalText } });
            setOriginalText(null);
        }
    };

    const handleChange = (e) => {
        // If user manually types after a polish, hide the undo button to prevent accidental overrides
        if (originalText !== null) {
            setOriginalText(null);
        }
        onChange(e);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <textarea
                className={className}
                style={{ ...style, paddingBottom: value.length >= 20 ? '40px' : style.paddingBottom }} // Leave room for button
                rows={rows}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                disabled={isPolishing}
            />

            {/* Polish Button inside the textarea (bottom right) */}
            {value && value.length >= 20 && !isPolishing && (
                <button
                    onClick={handlePolish}
                    style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        background: 'transparent',
                        border: '1px solid #7ECECA',
                        color: '#7ECECA',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: '0.2s',
                        zIndex: 10
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(126, 206, 202, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <Sparkles size={12} /> Mejorar con IA
                </button>
            )}

            {/* Loading State inside the textarea */}
            {isPolishing && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        background: 'transparent',
                        border: '1px solid rgba(126, 206, 202, 0.5)',
                        color: 'rgba(126, 206, 202, 0.8)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 10
                    }}
                >
                    <Loader2 size={12} className="spin" /> Mejorando...
                </div>
            )}

            {/* Undo Button (Outside, below the textarea) */}
            {originalText !== null && (
                <button
                    onClick={handleUndo}
                    style={{
                        marginTop: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '4px',
                        transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    <Undo2 size={10} /> Deshacer mejora
                </button>
            )}

            {/* Transient Mini Toast */}
            {toast && (
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '0',
                    background: toast.type === 'success' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                    color: toast.type === 'success' ? '#00ff00' : '#ff4d4d',
                    border: `1px solid ${toast.type === 'success' ? '#00ff00' : '#ff4d4d'}`,
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    animation: 'fadeInOut 3s forwards'
                }}>
                    {toast.msg}
                </div>
            )}

            <style jsx>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(5px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-5px); }
                }
            `}</style>
        </div>
    );
}

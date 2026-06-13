import { useState, useRef } from 'react';
import { Loader2, Sparkles, Undo2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

export default function AIPolishedTextarea({
    value,
    onChange,
    placeholder,
    className = "",
    style = {},
    rows = 4
}) {
    const [isPolishing, setIsPolishing] = useState(false);
    const [instruction, setInstruction] = useState('');
    const [originalText, setOriginalText] = useState(null);
    const [toast, setToast] = useState(null);
    const supabase = createSupabaseClient();

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handlePolish = async () => {
        if (!value || value.length < 2) return;

        setIsPolishing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/polish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`,
                },
                body: JSON.stringify({
                    text: value,
                    instruction: instruction // Pass the custom instruction
                }),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                return;
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al mejorar el texto');
            }

            const data = await res.json();

            // Save original text BEFORE replacing
            setOriginalText(value);

            // Update parent state
            onChange({ target: { value: data.polishedText } });

            showToast('Texto mejorado ✓', 'success');
            setInstruction(''); // Clear instruction after use

            // Refresh credits balance in header
            window.dispatchEvent(new CustomEvent('refresh-profile'));
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
        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
                className={className}
                style={{ ...style }} 
                rows={rows}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                disabled={isPolishing}
            />

            {/* AI Control Bar */}
            {value && value.length >= 2 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                        className="input-field"
                        style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                        placeholder="Instrucción (ej: hazlo más profesional...)"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        disabled={isPolishing}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isPolishing) {
                                handlePolish();
                            }
                        }}
                    />
                    <button
                        onClick={handlePolish}
                        disabled={isPolishing}
                        style={{
                            background: 'rgba(126, 206, 202, 0.08)',
                            border: '1px solid rgba(126, 206, 202, 0.2)',
                            color: '#7ECECA',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: isPolishing ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: '0.2s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isPolishing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {isPolishing ? 'Mejorando...' : (instruction ? 'Aplicar' : 'Mejorar')}
                    </button>
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

import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Mic, MicOff, Undo2, X, Send } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

export default function BrainField({
    label,
    icon,
    placeholder,
    value,
    onChange,
    fieldKey,
    brainContext,
    rows = 6,
    className = "",
    style = {},
    apiEndpoint = '/api/improve-brain-field'
}) {
    const [isPolishing, setIsPolishing] = useState(false);
    const [originalText, setOriginalText] = useState(null);
    const [toast, setToast] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [instruction, setInstruction] = useState('');

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

    const menuRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = 'es-ES'; // Default to Spanish

                rec.onresult = (event) => {
                    let finalTranscript = '';
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        // Append to existing value
                        const newValue = value ? `${value} ${finalTranscript}`.trim() : finalTranscript.trim();
                        onChange({ target: { value: newValue } });
                    }
                };

                rec.onerror = (event) => {
                    console.error('Speech recognition error', event.error);
                    setIsRecording(false);
                    if (event.error === 'not-allowed') {
                        showToast('Permiso denegado. Activa el micrófono en tu navegador.', 'error');
                    } else if (event.error !== 'no-speech') {
                        showToast('Error en el micrófono: ' + event.error, 'error');
                    }
                };

                rec.onend = () => {
                    setIsRecording(false);
                };

                setRecognition(rec);
            } else {
                setHasSpeechSupport(false);
            }
        }
    }, [value, onChange]);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleRecording = () => {
        if (!recognition) return;

        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
        } else {
            try {
                recognition.start();
                setIsRecording(true);
                showToast('Escuchando...', 'success');
            } catch (err) {
                console.error("Audio start error:", err);
                setIsRecording(false);
            }
        }
    };

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handlePolish = async () => {
        if (!value || value.length < 2) {
            showToast('Escribe un poco más para que la IA pueda mejorar.', 'error');
            return;
        }

        setIsPolishing(true);
        setShowMenu(false);
        try {
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    fieldKey,
                    currentText: value,
                    instruction,
                    brainContext
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
            onChange({ target: { value: data.improvedText } });

            showToast('Campo mejorado ✓', 'success');
            setInstruction('');

            // Optional: trigger refresh if you have a global listener
            window.dispatchEvent(new CustomEvent('refresh-profile'));
        } catch (error) {
            console.error(error);
            showToast('No se pudo mejorar. Inténtalo de nuevo.', 'error');
        } finally {
            setIsPolishing(false);
        }
    };

    const handleUndo = () => {
        if (originalText !== null) {
            onChange({ target: { value: originalText } });
            setOriginalText(null);
            showToast('Cambios deshechos', 'success');
        }
    };

    const handleChange = (e) => {
        if (originalText !== null) setOriginalText(null);
        onChange(e);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* Header/Label area passed via props or rendered here? We render label in parent usually, 
                but since we want the Sparkles button top right, let's include the header rendering here if provided */}

            {label && (
                <div className="field-header">
                    <div className="field-label-group">
                        {icon && <span className="field-icon">{icon}</span>}
                        <h3 className="field-title">{label}</h3>
                    </div>

                    <div className="field-actions" ref={menuRef}>
                        <button
                            className="improve-btn"
                            onClick={() => setShowMenu(!showMenu)}
                            disabled={isPolishing}
                        >
                            {isPolishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            <span className="improve-btn-text">{isPolishing ? 'Mejorando...' : 'Mejorar con IA'}</span>
                        </button>

                        {/* Mini Chat Popover */}
                        {showMenu && (
                            <div className="ai-popover">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Instrucción a la IA (Opcional)</span>
                                    <button onClick={() => setShowMenu(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={16} /></button>
                                </div>
                                <textarea
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder="Ej: Hazlo más cercano, recorta a 3 frases, usa tono rebelde..."
                                    rows={3}
                                    className="popover-textarea"
                                />
                                <button
                                    onClick={handlePolish}
                                    className="apply-improve-btn"
                                >
                                    <Sparkles size={16} /> Aplicar Mejora
                                </button>
                                <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                                    Si dejas el texto vacío, la IA lo optimizará automáticamente según tu contexto.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ position: 'relative' }}>
                <textarea
                    className={className}
                    style={{ ...style, paddingRight: hasSpeechSupport ? '45px' : '16px' }}
                    rows={rows}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    disabled={isPolishing}
                />

                {/* Microphone Button */}
                {hasSpeechSupport && (
                    <button
                        onClick={toggleRecording}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isRecording ? 'rgba(239, 68, 68, 0.4)' : 'transparent'}`,
                            color: isRecording ? '#EF4444' : '#888',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Dictar por voz"
                    >
                        {isRecording ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
                    </button>
                )}
            </div>

            {/* Undo Button */}
            {originalText !== null && (
                <button
                    onClick={handleUndo}
                    style={{
                        marginTop: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: '0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <Undo2 size={12} /> Deshacer mejora de IA
                </button>
            )}

            {/* Transient Mini Toast */}
            {toast && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    zIndex: 200,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'fadeInOut 3s forwards'
                }}>
                    {toast.msg}
                </div>
            )}

            <style jsx>{`
                .field-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .field-label-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .field-icon {
                    font-size: 1.4rem;
                }
                .field-title {
                    font-size: 1.1rem;
                    margin: 0;
                }
                .field-actions {
                    position: relative;
                }
                .improve-btn {
                    background: transparent;
                    border: 1px solid #7ECECA;
                    color: #7ECECA;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: 0.2s;
                }
                .improve-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .ai-popover {
                    position: absolute;
                    top: calc(100% + 10px);
                    right: 0;
                    width: 300px;
                    background: #1A1A1A;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                    z-index: 100;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    animation: fadeIn 0.2s ease-out;
                }
                .popover-textarea {
                    width: 100%;
                    background: #0D0D0D;
                    border: 1px solid #333;
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    margin-bottom: 12px;
                    resize: none;
                    outline: none;
                }
                .apply-improve-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                @media (max-width: 768px) {
                    .field-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    .field-actions {
                        width: 100%;
                    }
                    .improve-btn {
                        width: 100%;
                        justify-content: center;
                        padding: 10px;
                    }
                    .ai-popover {
                        width: calc(100vw - 40px);
                        right: -10vw; /* Attempt to center or align better */
                        max-width: 320px;
                    }
                    .textarea-field {
                        min-height: 150px !important;
                        font-size: 1rem !important;
                    }
                }

                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -40%); }
                    10% { opacity: 1; transform: translate(-50%, -50%); }
                    90% { opacity: 1; transform: translate(-50%, -50%); }
                    100% { opacity: 0; transform: translate(-50%, -60%); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

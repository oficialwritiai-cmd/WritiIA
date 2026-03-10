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
    style = {}
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
        if (!value || value.length < 10) {
            showToast('Escribe un poco más para que la IA pueda mejorar.', 'error');
            return;
        }

        setIsPolishing(true);
        setShowMenu(false);
        try {
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            const res = await fetch('/api/improve-brain-field', {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {icon && <span style={{ fontSize: '1.4rem' }}>{icon}</span>}
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{label}</h3>
                    </div>

                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            disabled={isPolishing}
                            style={{
                                background: showMenu ? 'rgba(126, 206, 202, 0.2)' : 'transparent',
                                border: '1px solid #7ECECA',
                                color: '#7ECECA',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: isPolishing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: '0.2s',
                                opacity: isPolishing ? 0.6 : 1
                            }}
                        >
                            {isPolishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isPolishing ? 'Mejorando...' : 'Mejorar con IA'}
                        </button>

                        {/* Mini Chat Popover */}
                        {showMenu && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 10px)',
                                right: 0,
                                width: '300px',
                                background: '#1A1A1A',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '16px',
                                zIndex: 100,
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                animation: 'fadeIn 0.2s ease-out'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Instrucción a la IA (Opcional)</span>
                                    <button onClick={() => setShowMenu(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={16} /></button>
                                </div>
                                <textarea
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    placeholder="Ej: Hazlo más cercano, recorta a 3 frases, usa tono rebelde..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        background: '#0D0D0D',
                                        border: '1px solid #333',
                                        color: 'white',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        marginBottom: '12px',
                                        resize: 'none',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handlePolish}
                                    style={{
                                        width: '100%',
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
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

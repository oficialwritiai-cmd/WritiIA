'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, AlertCircle, RefreshCw } from 'lucide-react';

export default function VoiceDictation({
    onResult,
    placeholder = "Dictar",
    isTextArea = false,
    size = 20
}) {
    const [isSupported, setIsSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState('');
    const [showGuidance, setShowGuidance] = useState(false);
    const [permissionState, setPermissionState] = useState('unknown'); // 'granted', 'denied', 'prompt'
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check permission status if API is available
        if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'microphone' }).then(result => {
                setPermissionState(result.state);
                result.onchange = () => setPermissionState(result.state);
            });
        }

        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                setIsSupported(true);
                const recognition = new SpeechRecognition();
                recognition.lang = 'es-ES';
                recognition.continuous = false;
                recognition.interimResults = false;

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    onResult(transcript);
                    setIsRecording(false);
                };

                recognition.onerror = (event) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error === 'not-allowed') {
                        setError('Permiso bloqueado.');
                        setShowGuidance(true);
                    } else if (event.error === 'no-speech') {
                        setError('No se detectó voz.');
                    } else {
                        setError('Error: ' + event.error);
                    }
                    setIsRecording(false);
                    setTimeout(() => setError(''), 5000);
                };

                recognition.onend = () => {
                    setIsRecording(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, [onResult]);

    const toggleRecording = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            setError('');
            try {
                // Try to get stream to trigger browser prompt
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // If successful, stop the stream immediately
                stream.getTracks().forEach(track => track.stop());

                recognitionRef.current?.start();
                setIsRecording(true);
                setPermissionState('granted');
            } catch (err) {
                console.error("Microphone permission error:", err);
                if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                    setPermissionState('denied');
                    setShowGuidance(true);
                } else if (err.name === 'NotFoundError') {
                    setError('Sin micrófono.');
                    alert('No se detectó ningún micrófono.');
                } else {
                    setError('Error de acceso.');
                }
            }
        }
    };

    if (!isSupported) return null;

    return (
        <>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={toggleRecording}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isRecording ? '8px' : '0px',
                        background: isRecording ? 'rgba(255, 77, 77, 0.15)' :
                            permissionState === 'denied' ? 'rgba(255, 77, 77, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                        border: isRecording ? '1px solid #FF4D4D' :
                            permissionState === 'denied' ? '1px solid rgba(255, 77, 77, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: isRecording ? '20px' : '8px',
                        padding: isRecording ? '6px 14px' : '6px',
                        cursor: 'pointer',
                        color: isRecording ? '#FF4D4D' :
                            permissionState === 'denied' ? '#FF4D4D' : 'var(--text-muted)',
                        transition: 'all 0.2s ease',
                    }}
                    title={permissionState === 'denied' ? "Micrófono bloqueado - Pulsa para ver cómo arreglarlo" : (isRecording ? "Detener" : "Dictar por voz")}
                >
                    {isRecording ? (
                        <>
                            <span className="mic-pulse-animation"></span>
                            <Square size={size - 4} fill="#FF4D4D" color="#FF4D4D" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Escuchando...</span>
                        </>
                    ) : (
                        <Mic size={size} style={{ opacity: permissionState === 'denied' ? 0.5 : 1 }} />
                    )}
                </button>

                {error && !showGuidance && (
                    <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                        backgroundColor: '#FF4D4D', color: 'white', fontSize: '0.65rem',
                        padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', zIndex: 10
                    }}>
                        {error}
                    </div>
                )}
            </div>

            {/* GUIDANCE MODAL */}
            {showGuidance && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    backdropFilter: 'blur(8px)', padding: '20px'
                }}>
                    <div style={{
                        background: '#151515', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px', maxWidth: '450px', width: '100%',
                        padding: '32px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <button
                            onClick={() => setShowGuidance(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px', height: '64px', background: 'rgba(255, 77, 77, 0.1)',
                                borderRadius: '50%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <AlertCircle size={32} color="#FF4D4D" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px' }}>Micrófono Bloqueado</h2>
                            <p style={{ color: '#aaa', fontSize: '0.95rem' }}>El navegador no volverá a preguntarte hasta que lo desbloquees manualmente:</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>1</div>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>Busca en la barra de arriba (URL) un icono de <b>cámara/micro con una X roja</b> o el icono del <b>candado 🔒</b>.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>2</div>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>Haz clic en él y selecciona <b>"Permitir siempre"</b> o <b>"Permitir"</b>.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>3</div>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>Pulsa el botón <b>Recargar</b> para activar el cambio.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setShowGuidance(false);
                                    setTimeout(() => toggleRecording({ preventDefault: () => { }, stopPropagation: () => { } }), 300);
                                }}
                                style={{
                                    flex: 1, height: '56px', background: 'rgba(255,255,255,0.05)',
                                    color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                                    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                REINTENTAR
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    flex: 2, height: '56px', background: 'var(--accent-gradient)',
                                    color: 'black', border: 'none', borderRadius: '16px',
                                    fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                <RefreshCw size={20} /> RECARGAR AHORA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .mic-pulse-animation {
                    width: 8px; height: 8px; border-radius: 50%;
                    background-color: #FF4D4D; animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(255, 77, 77, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
                }
            `}</style>
        </>
    );
}


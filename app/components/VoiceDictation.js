'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, X, AlertCircle, RefreshCw, ShieldAlert, Copy, Settings, Monitor, Lock } from 'lucide-react';

export default function VoiceDictation({
    onResult,
    placeholder = "Dictar",
    isTextArea = false,
    size = 20
}) {
    const [isSupported, setIsSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState('');
    const [rawError, setRawError] = useState('');
    const [showGuidance, setShowGuidance] = useState(false);
    const [isSecure, setIsSecure] = useState(true);
    const [permissionState, setPermissionState] = useState('unknown');
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSecure(window.isSecureContext);

            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'microphone' }).then(result => {
                    setPermissionState(result.state);
                    result.onchange = () => setPermissionState(result.state);
                }).catch(() => { });
            }

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
                    console.error("Speech error:", event.error);
                    setRawError(event.error);
                    if (event.error === 'not-allowed') {
                        setError('Permiso bloqueado.');
                        setShowGuidance(true);
                    } else if (event.error === 'no-speech') {
                        setError('No se detectó voz.');
                    } else {
                        setError('Error: ' + event.error);
                    }
                    setIsRecording(false);
                };

                recognition.onend = () => setIsRecording(false);
                recognitionRef.current = recognition;
            }
        }
    }, [onResult]);

    const toggleRecording = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        if (!isSecure) {
            setRawError('NOT_SECURE_CONTEXT');
            setShowGuidance(true);
            return;
        }

        setError('');
        setRawError('');
        try {
            // Trigger browser prompt
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            recognitionRef.current?.start();
            setIsRecording(true);
            setPermissionState('granted');
        } catch (err) {
            console.error("Mic Error:", err);
            const errName = err.name || err.message || 'UnknownError';
            setRawError(errName);
            if (errName === 'NotAllowedError' || errName === 'SecurityError') {
                setPermissionState('denied');
                setShowGuidance(true);
            } else if (errName === 'NotFoundError') {
                setError('Sin micro.');
                alert('No se detectó micrófono físico.');
            } else {
                setError('Error acceso.');
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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

            {/* MODAL DE EMERGENCIA - GUÍA DEFINITIVA v1.15.5 */}
            {showGuidance && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    backdropFilter: 'blur(10px)', padding: '20px'
                }}>
                    <div style={{
                        background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '32px', maxWidth: '520px', width: '100%',
                        maxHeight: '90vh', overflowY: 'auto',
                        padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <button
                            onClick={() => setShowGuidance(false)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{
                                width: '64px', height: '64px', background: 'rgba(255, 77, 77, 0.1)',
                                borderRadius: '50%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <ShieldAlert size={32} color="#FF4D4D" />
                            </div>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '8px' }}>Bloqueo de Sistema Detectado</h2>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Si ya diste permiso en el buscador y sigue fallando, el problema es de <b>Windows</b>:</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>1</div>
                                <div>
                                    <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Abre Inicio -> Configuración ⚙️</p>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>En tu ordenador Windows.</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>2</div>
                                <div>
                                    <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Privacidad -> Micrófono</p>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Busca la sección de Micrófono en el menú izquierdo.</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,77,77,0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,77,77,0.3)' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>3</div>
                                <div>
                                    <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Activa "Permitir que las apps accedan"</p>
                                    <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>Baja hasta abajo y activa también: **"Permitir que las aplicaciones de escritorio accedan al micrófono"**.</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                                <div style={{ background: '#FF4D4D', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 900 }}>4</div>
                                <div>
                                    <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>Recarga Writi</p>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Pulsa el botón de abajo para terminar.</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => { setShowGuidance(false); toggleRecording(); }}
                                style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                REINTENTAR
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    flex: 2, padding: '16px', background: 'var(--accent-gradient)',
                                    color: 'black', border: 'none', borderRadius: '16px',
                                    fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                <RefreshCw size={20} /> RECARGAR AHORA
                            </button>
                        </div>

                        {rawError && (
                            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.7rem', color: '#444' }}>
                                Error detectado: <code>{rawError}</code>
                                <button onClick={() => { navigator.clipboard.writeText(rawError); alert('Error copiado!'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', marginLeft: '5px' }}>
                                    <Copy size={12} />
                                </button>
                            </div>
                        )}
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

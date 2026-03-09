'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

export default function VoiceDictation({
    onResult,
    placeholder = "Dictar",
    isTextArea = false,
    size = 20
}) {
    const [isSupported, setIsSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Only run on client
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                setIsSupported(true);
                const recognition = new SpeechRecognition();
                recognition.lang = 'es-ES'; // Spanish default
                recognition.continuous = false; // Stop when the user stops talking
                recognition.interimResults = false; // Return final result only

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    onResult(transcript);
                    setIsRecording(false);
                };

                recognition.onerror = (event) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error === 'not-allowed') {
                        setError('Permiso denegado. Permite el micrófono en el icono 🔒 del navegador.');
                    } else if (event.error === 'no-speech') {
                        setError('No se detectó voz.');
                    } else {
                        setError('Error al escuchar (' + event.error + ')');
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
        e.preventDefault(); // Prevent form submission or bubbling
        e.stopPropagation();

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            setError('');
            try {
                // Explicitly request microphone permission to trigger the browser prompt
                await navigator.mediaDevices.getUserMedia({ audio: true });
                recognitionRef.current?.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Microphone permission error:", err);
                if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                    setError('Permiso bloqueado. Haz clic en el icono 🔒 de la URL.');
                } else if (err.name === 'NotFoundError') {
                    setError('No se encontró micrófono.');
                } else {
                    setError('Error al acceder al micrófono.');
                }
                setTimeout(() => setError(''), 5000);
            }
        }
    };

    // If browser doesn't support Web Speech API, render nothing.
    if (!isSupported) return null;

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
                type="button"
                onClick={toggleRecording}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isRecording ? '6px' : '0px',
                    background: isRecording ? 'rgba(255, 77, 77, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: isRecording ? '1px solid #FF4D4D' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: isRecording ? '20px' : '8px',
                    padding: isRecording ? '6px 12px' : '6px',
                    cursor: 'pointer',
                    color: isRecording ? '#FF4D4D' : 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                }}
                title={isRecording ? "Grabando... pulsa para parar" : "Dictar por voz"}
            >
                {isRecording ? (
                    <>
                        <span className="mic-pulse-animation"></span>
                        <Square size={size - 4} fill="#FF4D4D" color="#FF4D4D" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#FF4D4D', whiteSpace: 'nowrap' }}>
                            Escuchando...
                        </span>
                    </>
                ) : (
                    <Mic size={size} />
                )}
            </button>
            {error && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FF4D4D',
                    color: 'white',
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: 10
                }}>
                    {error}
                </div>
            )}
            <style jsx>{`
                .mic-pulse-animation {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #FF4D4D;
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.4); }
                    70% { box-shadow: 0 0 0 6px rgba(255, 77, 77, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
                }
            `}</style>
        </div>
    );
}

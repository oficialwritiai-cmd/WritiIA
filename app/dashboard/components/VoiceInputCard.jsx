'use client';
import { useState, useEffect, useRef } from 'react';

export default function VoiceInputCard({
    value,
    onChange,
    placeholder = "Di algo...",
    borderColor = 'rgba(236,72,153,0.4)',
    bgColor = 'rgba(236,72,153,0.05)',
}) {
    const [isListening, setIsListening] = useState(false);
    const [interim, setInterim] = useState('');
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'es-ES';
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onstart = () => {
                    setIsListening(true);
                    setInterim('');
                };

                recognition.onresult = (event) => {
                    let interimText = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            onChange(prev => prev ? `${prev} ${transcript}` : transcript);
                        } else {
                            interimText += transcript;
                        }
                    }
                    setInterim(interimText);
                };

                recognition.onend = () => {
                    setIsListening(false);
                    setInterim('');
                };

                recognition.onerror = () => {
                    setIsListening(false);
                    setInterim('');
                };

                recognitionRef.current = recognition;
            }
        }
    }, [onChange]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setInterim('');
            recognitionRef.current?.start();
        }
    };

    const displayText = value || interim || placeholder;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            {/* JARVIS-style Microphone */}
            <div style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Outer ring - pulsing */}
                {isListening && (
                    <>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '2px solid rgba(236,72,153,0.5)',
                            animation: 'scanPulse 1.5s ease-in-out infinite',
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: -8,
                            borderRadius: '50%',
                            border: '1px solid rgba(236,72,153,0.2)',
                            animation: 'scanPulse 2s ease-in-out infinite 0.2s',
                        }} />
                    </>
                )}

                {/* Main button */}
                <button
                    onClick={toggleListening}
                    style={{
                        position: 'relative',
                        width: '100px',
                        height: '100px',
                        borderRadius: '20px',
                        border: isListening ? '3px solid #ec4899' : '2px solid rgba(236,72,153,0.5)',
                        background: isListening
                            ? 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(236,72,153,0.15))'
                            : 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.08))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isListening
                            ? '0 0 20px rgba(236,72,153,0.4), inset 0 0 20px rgba(236,72,153,0.1)'
                            : '0 0 10px rgba(236,72,153,0.2), inset 0 0 10px rgba(236,72,153,0.05)',
                    }}
                >
                    {/* Mic icon */}
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isListening ? '#ec4899' : 'rgba(236,72,153,0.6)'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            filter: isListening ? 'drop-shadow(0 0 8px rgba(236,72,153,0.6))' : 'none',
                            animation: isListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
                        }}
                    >
                        <path d="M12 1a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>

                    {/* Recording indicator */}
                    {isListening && (
                        <div style={{
                            position: 'absolute',
                            width: '12px',
                            height: '12px',
                            background: '#ec4899',
                            borderRadius: '50%',
                            top: '8px',
                            right: '8px',
                            animation: 'blink 1s infinite',
                        }} />
                    )}
                </button>
            </div>

            {/* Status text */}
            <p style={{
                fontSize: '0.9rem',
                color: isListening ? '#ec4899' : 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                margin: 0,
                fontWeight: isListening ? 700 : 400,
                animation: isListening ? 'fadeInOut 1.5s ease-in-out infinite' : 'none',
            }}>
                {isListening ? '🎙️ Escuchando...' : 'Toca para grabar'}
            </p>

            {/* Transcription display - editable */}
            <div style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '14px',
                background: bgColor,
                border: `2px solid ${borderColor}`,
                minHeight: '60px',
                display: 'flex',
                alignItems: 'flex-start',
                position: 'relative',
            }}>
                <textarea
                    value={displayText}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: interim ? 'rgba(236,72,153,0.7)' : '#fff',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'none',
                        minHeight: '60px',
                        fontStyle: interim ? 'italic' : 'normal',
                    }}
                />
                {interim && (
                    <span style={{
                        position: 'absolute',
                        right: '20px',
                        bottom: '16px',
                        fontSize: '0.75rem',
                        color: 'rgba(236,72,153,0.5)',
                        fontStyle: 'italic',
                        animation: 'fadeInOut 1.5s ease-in-out infinite',
                    }}>
                        Transcribiendo...
                    </span>
                )}
            </div>

            <style>{`
                @keyframes scanPulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 0.5;
                    }
                }
                @keyframes micPulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.15);
                    }
                }
                @keyframes blink {
                    0%, 49%, 100% {
                        opacity: 1;
                    }
                    50%, 99% {
                        opacity: 0.3;
                    }
                }
                @keyframes fadeInOut {
                    0%, 100% {
                        opacity: 0.3;
                    }
                    50% {
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

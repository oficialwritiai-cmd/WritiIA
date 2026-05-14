'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

// Preguntas guía que rotan mientras el usuario habla
const GUIDE_PROMPTS = {
    bio: [
        '¿Cómo te llamas y a qué te dedicas?',
        '¿Cuántos años llevas en esto?',
        '¿Qué resultados concretos has conseguido con tus clientes?',
        '¿Qué te hace diferente a otros en tu sector?',
        '¿Cuál es tu mayor logro profesional hasta ahora?',
    ],
    audience: [
        '¿Quién es tu cliente ideal? Describe su perfil (edad, situación...)',
        '¿Cuál es el problema principal que tiene?',
        '¿Qué desea conseguir? ¿Cuál es su gran sueño?',
        '¿Qué le impide lograrlo? ¿Cuáles son sus miedos?',
        '¿Qué lenguaje usa? ¿Cómo describe su problema con sus propias palabras?',
    ],
    offer: [
        '¿Qué vendes exactamente? Descríbelo en detalle.',
        '¿Cuál es el resultado principal que prometes?',
        '¿En cuánto tiempo consiguen ese resultado?',
        '¿Cuáles son las objeciones más comunes antes de comprarte?',
        '¿Por qué tu oferta es irresistible comparada con otras opciones?',
    ],
    style: [
        '¿Cómo hablas con tus clientes? ¿Eres cercano, directo, formal?',
        'Di 3 a 5 palabras que te definan como comunicador.',
        '¿Qué NO quieres que diga tu contenido?',
        '¿Qué tono tiene tu comunidad? ¿Serio, divertido, motivador?',
    ],
    pillars: [
        '¿De qué temas hablas cada semana en redes?',
        'Nombra 3 a 5 temas que siempre aparecen en tu contenido.',
        '¿Qué enseñas a tu audiencia que más valoran?',
        '¿Sobre qué te preguntan más en comentarios o DMs?',
    ],
    faqs: [
        '¿Qué te preguntan antes de comprarte?',
        '¿Qué dudas tienen sobre tu método o programa?',
        '¿Qué miedos o excusas tienen tus clientes potenciales?',
        '¿Qué preguntas recibes más en redes o mensajes?',
        '¿Qué creen que es difícil y en realidad no lo es?',
    ],
    all: [
        '¿Quién eres y a qué te dedicas?',
        '¿Quién es tu cliente ideal y qué problema tiene?',
        '¿Qué vendes y qué resultado concreto prometes?',
        '¿Cómo es tu estilo de comunicación?',
        '¿De qué temas hablas en tu contenido habitualmente?',
    ],
};

const GUIDE_TEXTS = {
    bio:      'Cuéntame quién eres, qué haces y qué resultados has conseguido.',
    audience: 'Describe a tu cliente ideal, su problema y lo que desea.',
    offer:    'Cuéntame qué vendes, qué resultado prometes y las objeciones habituales.',
    style:    'Describe tu tono y 3-5 palabras que te definan.',
    pillars:  'Di los temas principales de los que hablas cada semana.',
    faqs:     'Dime las preguntas que más te hace tu audiencia.',
    all:      'Cuéntame de tu negocio, cliente ideal, oferta y estilo de comunicación.',
};

const FIELD_LABELS = {
    bio: 'Biografía', audience: 'Audiencia', offer: 'Oferta',
    style: 'Estilo', pillars: 'Pilares', faqs: 'FAQs', all: 'Cerebro IA',
};

export default function VoiceModal({ isOpen, onClose, fieldHint = 'all', projectId, onResult }) {
    const [status, setStatus]           = useState('idle');
    const [seconds, setSeconds]         = useState(0);
    const [volume, setVolume]           = useState(0);
    const [liveText, setLiveText]       = useState('');
    const [finalText, setFinalText]     = useState('');
    const [errMsg, setErrMsg]           = useState('');
    const [useFallback, setUseFallback] = useState(false);
    const [promptIdx, setPromptIdx]     = useState(0); // índice de la pregunta activa

    const recognitionRef = useRef(null);
    const timerRef       = useRef(null);
    const promptTimerRef = useRef(null); // rota preguntas guía cada 6s
    const analyserRef    = useRef(null);
    const rafRef         = useRef(null);
    const streamRef      = useRef(null);
    const accTextRef     = useRef('');

    useEffect(() => {
        if (!isOpen) { reset(); }
    }, [isOpen]);

    function reset() {
        clearInterval(timerRef.current);
        clearInterval(promptTimerRef.current);
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        try { recognitionRef.current?.stop(); } catch (_) {}
        recognitionRef.current = null;
        accTextRef.current = '';
        setStatus('idle');
        setSeconds(0);
        setVolume(0);
        setLiveText('');
        setFinalText('');
        setErrMsg('');
        setPromptIdx(0);
    }

    const trackVolume = useCallback(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setVolume(Math.min(1, avg / 70));
        rafRef.current = requestAnimationFrame(trackVolume);
    }, []);

    async function startMicVisual() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            analyserRef.current = analyser;
            trackVolume();
        } catch (_) {}
    }

    async function startRecording() {
        setErrMsg('');
        setLiveText('');
        setFinalText('');
        accTextRef.current = '';

        // Check SpeechRecognition support
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            // Fallback: manual textarea
            setUseFallback(true);
            setStatus('recording');
            setPromptIdx(0);
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
            const prompts = GUIDE_PROMPTS[fieldHint] || GUIDE_PROMPTS.all;
            promptTimerRef.current = setInterval(() => setPromptIdx(i => (i + 1) % prompts.length), 6000);
            await startMicVisual();
            return;
        }

        try {
            await startMicVisual();
        } catch (_) {}

        const recognition = new SR();
        recognitionRef.current = recognition;
        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (e) => {
            let interim = '';
            let finalChunk = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    finalChunk += t + ' ';
                } else {
                    interim += t;
                }
            }
            if (finalChunk) {
                accTextRef.current += finalChunk;
                setFinalText(accTextRef.current);
            }
            setLiveText(accTextRef.current + interim);
        };

        recognition.onerror = (e) => {
            console.error('[SpeechRecognition] error:', e.error);
            if (e.error === 'not-allowed') {
                setErrMsg('Permiso de micrófono denegado. Haz clic en el 🔒 de la URL y permite el micrófono.');
                setStatus('error');
                return;
            }
            if (e.error === 'no-speech') return; // timeout silencioso, ignorar
            if (e.error === 'network') {
                // Network error: switch to fallback textarea
                setUseFallback(true);
                setLiveText('');
                return;
            }
        };

        recognition.onend = () => {
            // Auto-restart only if still recording (not stopped by user)
            if (recognitionRef.current === recognition) {
                try { recognition.start(); } catch (_) {}
            }
        };

        try {
            recognition.start();
            setStatus('recording');
            setPromptIdx(0);
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

            // Rota preguntas guía cada 6 segundos
            const prompts = GUIDE_PROMPTS[fieldHint] || GUIDE_PROMPTS.all;
            promptTimerRef.current = setInterval(() => {
                setPromptIdx(i => (i + 1) % prompts.length);
            }, 6000);
        } catch (e) {
            setErrMsg('No se pudo iniciar el reconocimiento de voz: ' + e.message);
            setStatus('error');
        }
    }

    async function stopRecording() {
        clearInterval(timerRef.current);
        clearInterval(promptTimerRef.current);
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        setVolume(0);
        setStatus('processing');

        const recognition = recognitionRef.current;
        recognitionRef.current = null; // prevent auto-restart in onend

        if (!recognition) {
            // Fallback: use whatever text we have in state
            const t = liveText.trim() || finalText.trim();
            await sendToBackend(t);
            return;
        }

        // Override onend — fires AFTER all final recognition results are delivered
        recognition.onend = async () => {
            const transcript = accTextRef.current.trim() || liveText.trim() || finalText.trim();
            if (!transcript) {
                setErrMsg('No se detectó texto. Habla más fuerte o usa el campo de texto.');
                setStatus('error');
                return;
            }
            await sendToBackend(transcript);
        };

        try { recognition.stop(); } catch (_) {
            // If stop fails, read what we have
            const t = accTextRef.current.trim() || liveText.trim();
            await sendToBackend(t);
        }
    }

    async function sendToBackend(transcript) {
        if (!transcript?.trim()) {
            setErrMsg('No escribiste nada. Escribe lo que quieras contarnos.');
            setStatus('error');
            return;
        }

        setStatus('processing');
        try {
            const fd = new FormData();
            fd.append('audio', new Blob([], { type: 'audio/webm' }), 'empty.webm');
            fd.append('transcript', transcript);
            if (projectId)  fd.append('projectId', projectId);
            if (fieldHint)  fd.append('fieldHint', fieldHint);

            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 25000);
            const res = await fetch('/api/brain-from-voice', { method: 'POST', body: fd, signal: ctrl.signal });
            clearTimeout(t);

            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                console.error('[VoiceModal] API error:', res.status, e);
                throw new Error(e.error || `Error ${res.status} del servidor.`);
            }

            const data = await res.json();
            console.log('[VoiceModal] result:', data);

            onResult?.(data.transcript || transcript, data.brain || {});
            setStatus('done');
        } catch (e) {
            console.error('[VoiceModal] sendToBackend error:', e);
            setErrMsg(e.name === 'AbortError' ? 'Tiempo agotado. Intenta de nuevo.' : e.message);
            setStatus('error');
        }
    }

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    if (!isOpen) return null;

    const isRecording  = status === 'recording';
    const isProcessing = status === 'processing';
    const isDone       = status === 'done';
    const isError      = status === 'error';

    const pulseScale = 1 + volume * 0.45;
    const r1 = 1 + volume * 0.8;
    const r2 = 1 + volume * 1.35;

    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9500,
                background: 'rgba(4, 2, 18, 0.93)',
                backdropFilter: 'blur(20px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
            }}>
                <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', position: 'relative' }}>

                    {/* Close */}
                    {!isRecording && !isProcessing && (
                        <button onClick={onClose} style={{ position: 'absolute', top: '-4px', right: '0', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.5)', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={17} />
                        </button>
                    )}

                    {/* Field badge */}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: '100px', padding: '4px 14px' }}>
                        {FIELD_LABELS[fieldHint] || 'Cerebro IA'}
                    </span>

                    {/* Orb */}
                    {!useFallback && (
                        <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isRecording && <>
                                <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', border: '1px solid rgba(167,139,250,0.12)', transform: `scale(${r2})`, transition: 'transform 0.07s linear' }} />
                                <div style={{ position: 'absolute', width: '128px', height: '128px', borderRadius: '50%', border: '1px solid rgba(167,139,250,0.2)', transform: `scale(${r1})`, transition: 'transform 0.07s linear' }} />
                            </>}
                            <button
                                onClick={status === 'idle' ? startRecording : isRecording ? stopRecording : undefined}
                                disabled={isProcessing || isDone}
                                style={{
                                    width: '96px', height: '96px', borderRadius: '50%', border: 'none',
                                    cursor: (isProcessing || isDone) ? 'default' : 'pointer',
                                    background: isRecording ? 'radial-gradient(circle at 38% 32%, rgba(239,68,68,0.95), #991b1b)'
                                        : isDone ? 'radial-gradient(circle at 38% 32%, rgba(52,211,153,0.95), #047857)'
                                        : isError ? 'radial-gradient(circle at 38% 32%, rgba(248,113,113,0.9), #991b1b)'
                                        : 'radial-gradient(circle at 38% 32%, rgba(167,139,250,0.95), #5b21b6)',
                                    boxShadow: isRecording
                                        ? `0 0 ${24 + volume * 50}px rgba(239,68,68,${0.3 + volume * 0.35})`
                                        : isDone ? '0 0 32px rgba(52,211,153,0.35)'
                                        : '0 0 32px rgba(109,40,217,0.35)',
                                    transform: `scale(${isRecording ? pulseScale : 1})`,
                                    transition: isRecording ? 'transform 0.07s linear, box-shadow 0.07s linear' : 'all 0.3s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {isProcessing ? <Loader2 size={30} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} />
                                    : isDone ? <CheckCircle2 size={30} color="#fff" />
                                    : isRecording ? (
                                        <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: '#fff' }} />
                                    ) : (
                                        <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
                                            <rect x="8" y="0" width="14" height="24" rx="7" fill="white"/>
                                            <path d="M3 18c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                                            <line x1="15" y1="30" x2="15" y2="36" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                                            <line x1="9" y1="36" x2="21" y2="36" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                                        </svg>
                                    )
                                }
                            </button>
                        </div>
                    )}

                    {/* Timer */}
                    {isRecording && !useFallback && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'blink 1s step-end infinite' }} />
                            <span style={{ fontSize: '1.3rem', fontWeight: 300, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>{fmt(seconds)}</span>
                        </div>
                    )}

                    {/* Live transcript */}
                    {isRecording && !useFallback && (liveText || finalText) && (
                        <div style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', maxHeight: '120px', overflowY: 'auto' }}>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                                "{liveText || finalText}"
                            </p>
                        </div>
                    )}

                    {/* Fallback textarea */}
                    {(useFallback || (isError && !errMsg.includes('micrófono'))) && status !== 'done' && status !== 'processing' && (
                        <div style={{ width: '100%' }}>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', textAlign: 'center' }}>
                                Escribe lo que quieres contarnos y WRITI lo procesará:
                            </p>
                            <textarea
                                autoFocus
                                value={liveText}
                                onChange={e => setLiveText(e.target.value)}
                                placeholder={GUIDE_TEXTS[fieldHint] || GUIDE_TEXTS.all}
                                rows={5}
                                style={{ width: '100%', padding: '13px 15px', boxSizing: 'border-box', background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.88rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.65, transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(167,139,250,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                            <button
                                onClick={() => sendToBackend(liveText)}
                                disabled={!liveText.trim()}
                                style={{ marginTop: '12px', width: '100%', height: '44px', background: liveText.trim() ? '#7c3aed' : 'rgba(255,255,255,0.05)', color: liveText.trim() ? '#fff' : '#555', border: 'none', borderRadius: '11px', fontWeight: 700, fontSize: '0.87rem', cursor: liveText.trim() ? 'pointer' : 'not-allowed' }}
                            >
                                Procesar con IA →
                            </button>
                        </div>
                    )}

                    {/* Guide text (idle) */}
                    {status === 'idle' && !useFallback && (
                        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
                            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>Pulsa para empezar a grabar</p>
                            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, fontStyle: 'italic' }}>
                                "{GUIDE_TEXTS[fieldHint] || GUIDE_TEXTS.all}"
                            </p>
                        </div>
                    )}

                    {/* Teleprompter — preguntas guía rotando */}
                    {isRecording && !useFallback && (() => {
                        const prompts = GUIDE_PROMPTS[fieldHint] || GUIDE_PROMPTS.all;
                        return (
                            <div style={{ width: '100%', maxWidth: '440px' }}>
                                {/* Pregunta activa */}
                                <div style={{
                                    padding: '14px 18px',
                                    background: 'rgba(167,139,250,0.1)',
                                    border: '1px solid rgba(167,139,250,0.3)',
                                    borderRadius: '14px',
                                    marginBottom: '8px',
                                    animation: 'fadePrompt 0.4s ease',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>🎯</span>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', lineHeight: 1.5, margin: 0 }}>
                                            {prompts[promptIdx]}
                                        </p>
                                    </div>
                                </div>

                                {/* Próximas preguntas (dim) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {prompts.slice(promptIdx + 1, promptIdx + 3).map((p, i) => (
                                        <div key={i} style={{
                                            padding: '8px 14px',
                                            background: 'rgba(255,255,255,0.025)',
                                            borderRadius: '10px',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                        }}>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>Siguiente:</span>
                                            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.4 }}>{p}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Indicador de progreso de preguntas */}
                                <div style={{ display: 'flex', gap: '4px', marginTop: '10px', justifyContent: 'center' }}>
                                    {prompts.map((_, i) => (
                                        <div key={i} style={{
                                            width: i === promptIdx ? '18px' : '5px',
                                            height: '4px', borderRadius: '2px',
                                            background: i === promptIdx ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                                            transition: 'all 0.3s ease',
                                        }} />
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '6px' }}>
                                    La pregunta cambia automáticamente cada 6 segundos
                                </p>
                            </div>
                        );
                    })()}

                    {/* Stop button (recording) */}
                    {isRecording && !useFallback && (
                        <button onClick={stopRecording} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '11px', padding: '10px 22px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                            Parar y procesar →
                        </button>
                    )}

                    {/* Processing */}
                    {isProcessing && (
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
                            Analizando tu historia y creando tu Cerebro IA…
                        </p>
                    )}

                    {/* Done */}
                    {isDone && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>✅ ¡Cerebro IA creado!</p>
                            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>Los campos se han rellenado con lo que contaste. Revísalos y ajusta.</p>
                            <button onClick={onClose} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                Ver los campos →
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {isError && errMsg && (
                        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                            <p style={{ fontSize: '0.88rem', color: '#f87171', marginBottom: '16px', lineHeight: 1.5 }}>{errMsg}</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={() => { setStatus('idle'); setErrMsg(''); setUseFallback(false); }} style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '9px 18px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
                                    Reintentar
                                </button>
                                <button onClick={() => { setStatus('recording'); setErrMsg(''); setUseFallback(true); }} style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '10px', padding: '9px 18px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
                                    Escribir en su lugar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
                @keyframes fadePrompt{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
            `}</style>
        </>
    );
}

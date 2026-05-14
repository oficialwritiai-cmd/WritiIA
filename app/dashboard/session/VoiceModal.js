'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Square, Loader2, CheckCircle2 } from 'lucide-react';

const GUIDE_TEXTS = {
    bio:      'Cuéntame quién eres y qué haces. ¿Qué resultados has conseguido? ¿Cuánto tiempo llevas en esto?',
    audience: 'Describe a tu cliente ideal. ¿Qué problema tiene? ¿Qué desea conseguir? ¿Cuál es su mayor miedo?',
    style:    'Describe cómo hablas con tus clientes. ¿Eres cercano, directo, formal? ¿Qué palabras te definen?',
    pillars:  'Cuéntame los temas principales sobre los que hablas. ¿Sobre qué hablas cada semana en redes?',
    faqs:     'Dime las preguntas que más te hace tu audiencia. ¿Qué cosas te preguntan antes de comprarte?',
    all:      'Cuéntame de qué va tu negocio, quién es tu cliente ideal, qué vendes y qué resultados prometes. Habla como si se lo explicaras a un cliente nuevo.',
};

const FIELD_LABELS = {
    bio: 'Biografía', audience: 'Audiencia', style: 'Estilo',
    pillars: 'Pilares', faqs: 'FAQs', all: 'Cerebro IA',
};

export default function VoiceModal({ isOpen, onClose, fieldHint = 'all', projectId, onResult }) {
    const [status, setStatus]       = useState('idle'); // idle | recording | processing | done | error
    const [seconds, setSeconds]     = useState(0);
    const [errMsg, setErrMsg]       = useState('');
    const [volume, setVolume]       = useState(0);   // 0–1

    const mrRef       = useRef(null);
    const streamRef   = useRef(null);
    const chunksRef   = useRef([]);
    const timerRef    = useRef(null);
    const analyserRef = useRef(null);
    const rafRef      = useRef(null);

    // Cleanup on unmount / close
    useEffect(() => {
        if (!isOpen) {
            cleanup();
            setStatus('idle');
            setSeconds(0);
            setErrMsg('');
            setVolume(0);
        }
    }, [isOpen]);

    function cleanup() {
        clearInterval(timerRef.current);
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        mrRef.current = null;
        streamRef.current = null;
        chunksRef.current = [];
    }

    const trackVolume = useCallback(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setVolume(Math.min(1, avg / 80));
        rafRef.current = requestAnimationFrame(trackVolume);
    }, []);

    async function startRecording() {
        setErrMsg('');
        setSeconds(0);
        chunksRef.current = [];
        try {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('Tu navegador no soporta grabación.');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio analyser for waveform
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const src = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                src.connect(analyser);
                analyserRef.current = analyser;
                trackVolume();
            } catch (_) {}

            let mimeType = '';
            for (const mt of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', '']) {
                if (!mt || MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
            }
            const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mrRef.current = mr;
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.start(200);

            setStatus('recording');
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } catch (e) {
            const msg = e?.name === 'NotAllowedError'
                ? 'Permiso de micrófono denegado. Haz clic en el 🔒 de la URL y permite el micrófono.'
                : e?.name === 'NotFoundError' ? 'No se encontró micrófono.'
                : e.message || 'Error al iniciar grabación.';
            setErrMsg(msg);
            setStatus('error');
        }
    }

    async function stopRecording() {
        clearInterval(timerRef.current);
        cancelAnimationFrame(rafRef.current);
        setVolume(0);

        const mr = mrRef.current;
        if (!mr || mr.state === 'inactive') { setStatus('idle'); return; }

        setStatus('processing');

        const fallback = setTimeout(() => {
            setErrMsg('Tiempo de espera agotado. Inténtalo de nuevo.');
            setStatus('error');
        }, 25000);

        mr.onstop = async () => {
            clearTimeout(fallback);
            streamRef.current?.getTracks().forEach(t => t.stop());
            await processAudio();
        };
        mr.stop();
    }

    async function processAudio() {
        if (!chunksRef.current.length) {
            setErrMsg('No se grabó audio. Mantén pulsado mientras hablas.');
            setStatus('error');
            return;
        }
        try {
            const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
            const fd = new FormData();
            fd.append('audio', blob, 'voice.webm');
            if (projectId) fd.append('projectId', projectId);
            if (fieldHint)  fd.append('fieldHint', fieldHint);

            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 22000);
            const res = await fetch('/api/brain-from-voice', { method: 'POST', body: fd, signal: ctrl.signal });
            clearTimeout(t);

            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                console.error('[VoiceModal] API error:', res.status, e);
                throw new Error(e.error || `Error ${res.status} del servidor.`);
            }
            const data = await res.json();
            console.log('[VoiceModal] API result:', data);
            onResult?.(data.transcript || '', data.brain || {});
            setStatus('done');
        } catch (e) {
            console.error('[VoiceModal] processAudio error:', e);
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

    const pulseScale = 1 + volume * 0.5;
    const ringScale1 = 1 + volume * 0.8;
    const ringScale2 = 1 + volume * 1.3;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={isRecording ? undefined : (isDone || isError) ? onClose : undefined}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9500,
                    background: 'rgba(5, 2, 20, 0.92)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px',
                }}
            >
                <div style={{
                    width: '100%', maxWidth: '540px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '32px', position: 'relative',
                }} onClick={e => e.stopPropagation()}>

                    {/* Close button */}
                    {!isRecording && !isProcessing && (
                        <button onClick={onClose} style={{
                            position: 'absolute', top: '-8px', right: '0',
                            background: 'rgba(255,255,255,0.07)', border: 'none',
                            color: 'rgba(255,255,255,0.5)', width: '36px', height: '36px',
                            borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <X size={18} />
                        </button>
                    )}

                    {/* Field label */}
                    <div style={{ textAlign: 'center' }}>
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: '#a78bfa',
                            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                            borderRadius: '100px', padding: '4px 12px',
                        }}>
                            {FIELD_LABELS[fieldHint] || 'Cerebro IA'}
                        </span>
                    </div>

                    {/* Mic orb */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', width: '200px' }}>
                        {/* Outer ring 2 */}
                        {isRecording && (
                            <div style={{
                                position: 'absolute', width: '200px', height: '200px', borderRadius: '50%',
                                border: '1px solid rgba(167,139,250,0.15)',
                                transform: `scale(${ringScale2})`,
                                transition: 'transform 0.08s linear',
                                animation: volume < 0.05 ? 'ring-idle 3s ease-in-out infinite' : 'none',
                            }} />
                        )}
                        {/* Outer ring 1 */}
                        {isRecording && (
                            <div style={{
                                position: 'absolute', width: '160px', height: '160px', borderRadius: '50%',
                                border: '1px solid rgba(167,139,250,0.25)',
                                transform: `scale(${ringScale1})`,
                                transition: 'transform 0.08s linear',
                            }} />
                        )}
                        {/* Main orb */}
                        <button
                            onClick={status === 'idle' ? startRecording : isRecording ? stopRecording : undefined}
                            disabled={isProcessing || isDone}
                            style={{
                                width: '110px', height: '110px', borderRadius: '50%',
                                border: 'none', cursor: (isProcessing || isDone) ? 'default' : 'pointer',
                                background: isRecording
                                    ? `radial-gradient(circle at 40% 35%, rgba(239,68,68,0.9), rgba(185,28,28,1))`
                                    : isDone
                                    ? 'radial-gradient(circle at 40% 35%, rgba(52,211,153,0.9), rgba(5,150,105,1))'
                                    : isError
                                    ? 'radial-gradient(circle at 40% 35%, rgba(248,113,113,0.9), rgba(185,28,28,1))'
                                    : 'radial-gradient(circle at 40% 35%, rgba(167,139,250,0.9), rgba(109,40,217,1))',
                                boxShadow: isRecording
                                    ? `0 0 ${30 + volume * 60}px rgba(239,68,68,${0.3 + volume * 0.4}), 0 0 60px rgba(239,68,68,0.15)`
                                    : isDone
                                    ? '0 0 40px rgba(52,211,153,0.4)'
                                    : '0 0 40px rgba(124,58,237,0.35)',
                                transform: `scale(${isRecording ? pulseScale : 1})`,
                                transition: isRecording ? 'transform 0.08s linear, box-shadow 0.08s linear' : 'all 0.3s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            {isProcessing
                                ? <Loader2 size={36} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} />
                                : isDone
                                ? <CheckCircle2 size={36} color="#fff" />
                                : isRecording
                                ? <Square size={28} color="#fff" fill="#fff" />
                                : (
                                    <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                                        <rect x="10" y="0" width="16" height="28" rx="8" fill="white" />
                                        <path d="M4 20c0 7.732 6.268 14 14 14s14-6.268 14-14" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                                        <line x1="18" y1="34" x2="18" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                        <line x1="11" y1="42" x2="25" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                )
                            }
                        </button>
                    </div>

                    {/* Timer */}
                    {isRecording && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'blink 1s step-end infinite' }} />
                            <span style={{ fontSize: '1.4rem', fontWeight: 300, color: '#fff', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
                                {fmt(seconds)}
                            </span>
                        </div>
                    )}

                    {/* Status text */}
                    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                        {status === 'idle' && (
                            <>
                                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '10px', lineHeight: 1.3 }}>
                                    Pulsa para empezar a grabar
                                </p>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, fontStyle: 'italic' }}>
                                    "{GUIDE_TEXTS[fieldHint] || GUIDE_TEXTS.all}"
                                </p>
                            </>
                        )}
                        {isRecording && (
                            <>
                                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
                                    Escuchando… pulsa el cuadrado para parar
                                </p>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, fontStyle: 'italic' }}>
                                    "{GUIDE_TEXTS[fieldHint] || GUIDE_TEXTS.all}"
                                </p>
                            </>
                        )}
                        {isProcessing && (
                            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                Transcribiendo y creando tu Cerebro IA…
                            </p>
                        )}
                        {isDone && (
                            <>
                                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>
                                    ¡Listo! Hemos generado tu Cerebro IA
                                </p>
                                <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                                    Los campos se han rellenado con lo que contaste. Revísalos y ajusta lo que necesites.
                                </p>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: '#7c3aed', color: '#fff', border: 'none',
                                        borderRadius: '12px', padding: '12px 28px',
                                        fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
                                    }}
                                >
                                    Ver los campos →
                                </button>
                            </>
                        )}
                        {isError && (
                            <>
                                <p style={{ fontSize: '0.88rem', color: '#f87171', marginBottom: '16px', lineHeight: 1.5 }}>
                                    {errMsg}
                                </p>
                                <button
                                    onClick={() => { setStatus('idle'); setErrMsg(''); }}
                                    style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '9px 20px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Intentar de nuevo
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes ring-idle {
                    0%,100%{transform:scale(1);opacity:0.3}
                    50%{transform:scale(1.08);opacity:0.6}
                }
            `}</style>
        </>
    );
}

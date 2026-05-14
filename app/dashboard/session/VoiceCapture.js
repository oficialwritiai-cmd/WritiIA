'use client';
import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * VoiceCapture — graba audio del micrófono, lo envía a /api/brain-from-voice
 * y llama onTranscribed(text) / onBrainSuggested(brain) con el resultado.
 */
export default function VoiceCapture({ onTranscribed, onBrainSuggested, projectId }) {
    const [status, setStatus]     = useState('idle'); // idle | recording | processing | done | error
    const [errorMsg, setErrorMsg] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef        = useRef([]);

    async function startRecording() {
        setStatus('recording');
        setErrorMsg('');
        try {
            // Check API availability
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Tu navegador no soporta grabación de audio. Usa Chrome o Edge.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Pick best supported mimeType — don't force one that may throw
            let mimeType = '';
            for (const mt of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', '']) {
                if (mt === '' || MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
            }

            const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => processAudio(stream);
            mr.start();
            mediaRecorderRef.current = mr;
        } catch (e) {
            setStatus('error');
            // Show actual error to help debug
            const msg = e?.name === 'NotAllowedError'
                ? 'Permiso denegado. Haz clic en el candado de la barra de direcciones y permite el micrófono.'
                : e?.name === 'NotFoundError'
                ? 'No se encontró micrófono. Conecta uno e intenta de nuevo.'
                : e?.name === 'NotSupportedError'
                ? 'Tu navegador no soporta grabación. Usa Chrome o Edge.'
                : `Error: ${e?.message || e}`;
            setErrorMsg(msg);
        }
    }

    function stopRecording() {
        mediaRecorderRef.current?.stop();
        setStatus('processing');
    }

    async function processAudio(stream) {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        try {
            const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', blob, 'voice.webm');
            if (projectId) formData.append('projectId', projectId);

            const res = await fetch('/api/brain-from-voice', { method: 'POST', body: formData });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error || 'Error procesando el audio.');
            }
            const data = await res.json();

            // data.transcript (string) + data.brain (object with bio/audience/style/pillars/faqs)
            if (data.transcript) onTranscribed?.(data.transcript);
            if (data.brain)      onBrainSuggested?.(data.brain);
            setStatus('done');
        } catch (e) {
            setStatus('error');
            setErrorMsg(e.message);
        }
    }

    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';
    const isDone = status === 'done';

    return (
        <div style={{
            background: isRecording ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${isRecording ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '16px', padding: '20px 24px',
            transition: 'all 0.3s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Mic button */}
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    style={{
                        width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                        border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isRecording ? '#ef4444' : isDone ? 'rgba(52,211,153,0.15)' : 'rgba(167,139,250,0.15)',
                        color: isRecording ? '#fff' : isDone ? '#34d399' : '#a78bfa',
                        transition: 'all 0.2s ease',
                        animation: isRecording ? 'pulse-mic 1.2s ease-in-out infinite' : 'none',
                    }}
                >
                    {isProcessing ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : isDone    ? <CheckCircle2 size={20} />
                        : isRecording ? <MicOff size={20} />
                        : <Mic size={20} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>
                        {isRecording   ? '🔴 Grabando… pulsa para parar'
                         : isProcessing ? 'Transcribiendo y analizando…'
                         : isDone       ? '✅ ¡Listo! Hemos rellenado tu Cerebro IA'
                         : '🎙️ Grabar explicación de voz'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                        {isRecording   ? 'Habla sobre tu negocio y cliente ideal. Sin prisa.'
                         : isProcessing ? 'Tardará unos segundos…'
                         : isDone       ? 'Revisa los campos abajo y ajusta lo que necesites.'
                         : '¿Prefieres hablar? Cuenta de qué va tu negocio y quién es tu cliente ideal.'}
                    </p>
                </div>

                {!isRecording && !isProcessing && !isDone && (
                    <button
                        onClick={startRecording}
                        style={{
                            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(167,139,250,0.12)', color: '#a78bfa',
                            border: '1px solid rgba(167,139,250,0.25)', borderRadius: '10px',
                            padding: '9px 16px', fontSize: '0.78rem', fontWeight: 700,
                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.12)'}
                    >
                        <Mic size={13} /> Grabar
                    </button>
                )}

                {isDone && (
                    <button
                        onClick={() => setStatus('idle')}
                        style={{
                            flexShrink: 0, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '9px', padding: '8px 14px', color: 'rgba(255,255,255,0.4)',
                            fontSize: '0.75rem', cursor: 'pointer',
                        }}
                    >
                        Grabar otra
                    </button>
                )}
            </div>

            {errorMsg && (
                <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '10px', paddingLeft: '64px' }}>
                    {errorMsg}
                </p>
            )}

            <style>{`
                @keyframes pulse-mic { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 10px rgba(239,68,68,0)} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
}

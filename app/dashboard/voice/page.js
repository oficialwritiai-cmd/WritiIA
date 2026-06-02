'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, ChevronLeft, Zap, RefreshCw, Edit3 } from 'lucide-react';

const PROMPTS = [
    '"Esta semana un cliente me dijo que..."',
    '"El error más grande que cometí fue..."',
    '"Lo que nadie te cuenta sobre..."',
    '"Antes pensaba X, ahora sé que..."',
    '"El momento en que todo cambió fue..."',
];

const TIPS = [
    'Habla con naturalidad, como si le contaras a un amigo',
    'Los detalles específicos hacen los guiones más auténticos',
    'No te preocupes por la perfección — la IA adapta tu voz',
];

export default function VoiceStoryPage() {
    const router = useRouter();

    // Phase: 'record' | 'confirm'
    const [phase, setPhase]           = useState('record');
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript]   = useState('');
    const [interim, setInterim]         = useState('');
    const [editedText, setEditedText]   = useState('');
    const [promptIdx, setPromptIdx]     = useState(0);
    const [tipIdx, setTipIdx]           = useState(0);
    const [error, setError]             = useState('');
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const accRef         = useRef('');

    // Rotate prompts
    useEffect(() => {
        const t = setInterval(() => setPromptIdx(i => (i + 1) % PROMPTS.length), 3000);
        return () => clearInterval(t);
    }, []);

    // Rotate tips
    useEffect(() => {
        const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4000);
        return () => clearInterval(t);
    }, []);

    const isRecordingRef = useRef(false); // ref para onend/onerror (evita stale closure)

    // Init SpeechRecognition
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setIsSupported(false); return; }

        const r = new SR();
        r.lang = 'es-ES';
        r.continuous = true;   // desktop; iOS lo ignora y aborta — onend lo reinicia
        r.interimResults = true;

        r.onresult = (e) => {
            let final = '';
            let interimText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
                else interimText += e.results[i][0].transcript;
            }
            if (final) { accRef.current += final; setTranscript(accRef.current); }
            setInterim(interimText);
        };

        r.onerror = (e) => {
            // 'aborted' y 'no-speech' son normales en iOS — no mostrar error
            if (e.error === 'no-speech' || e.error === 'aborted') return;
            setError('Micrófono no disponible: ' + e.error);
            isRecordingRef.current = false;
            setIsRecording(false);
        };

        r.onend = () => {
            setInterim('');
            // iOS Safari no soporta continuous=true: aborta y dispara onend.
            // Si el usuario todavía está grabando, reiniciar automáticamente.
            if (isRecordingRef.current) {
                try { r.start(); } catch (_) {}
            } else {
                setIsRecording(false);
            }
        };

        recognitionRef.current = r;
        return () => { isRecordingRef.current = false; try { r.abort(); } catch(_) {} };
    }, []);

    async function startRecording() {
        setError('');
        // No llamar getUserMedia antes — en iOS compite con SpeechRecognition por el mic
        // SpeechRecognition gestiona el permiso de micrófono internamente
        try {
            accRef.current = transcript;
            isRecordingRef.current = true;
            setIsRecording(true);
            recognitionRef.current?.start();
        } catch(e) {
            isRecordingRef.current = false;
            setIsRecording(false);
            setError('No se pudo iniciar el micrófono. Permite el acceso en el navegador.');
        }
    }

    function stopRecording() {
        isRecordingRef.current = false;
        setIsRecording(false);
        setInterim('');
        try { recognitionRef.current?.stop(); } catch(_) {}
    }

    function finishRecording() {
        stopRecording();
        const full = (accRef.current + interim).trim();
        if (full.length < 10) { setError('Habla un poco más para continuar.'); return; }
        setEditedText(full);
        setPhase('confirm');
    }

    function generateFromStory() {
        const story = editedText.trim();
        if (!story) return;
        // Store in sessionStorage — keeps text private, not in URL or browser history
        try { sessionStorage.setItem('writi_voice_story', story); } catch(e) {}
        router.push('/dashboard?mode=voice-story');
    }

    const displayText = transcript + (interim ? interim : '');

    return (
        <div style={{
            minHeight: '100vh', background: 'linear-gradient(135deg, #000a05 0%, #0a0f0e 50%, #050010 100%)', color: '#fff',
            fontFamily: "'Courier New', monospace",
            display: 'flex', flexDirection: 'column',
        }}>

            <style>{`
                @keyframes matrix-glow {
                    0%, 100% { text-shadow: 0 0 10px rgba(52,211,153,0.4), 0 0 20px rgba(52,211,153,0.2); }
                    50% { text-shadow: 0 0 20px rgba(52,211,153,0.6), 0 0 40px rgba(52,211,153,0.3); }
                }
                @keyframes mic-pulse-red {
                    0%, 100% { box-shadow: 0 0 30px rgba(255,77,77,0.4), 0 0 60px rgba(255,77,77,0.2), inset 0 0 20px rgba(255,77,77,0.1); }
                    50% { box-shadow: 0 0 50px rgba(255,77,77,0.6), 0 0 100px rgba(255,77,77,0.3), inset 0 0 30px rgba(255,77,77,0.2); }
                }
                @keyframes mic-pulse-green {
                    0%, 100% { box-shadow: 0 0 30px rgba(52,211,153,0.4), 0 0 60px rgba(52,211,153,0.2), inset 0 0 20px rgba(52,211,153,0.1); }
                    50% { box-shadow: 0 0 50px rgba(52,211,153,0.6), 0 0 100px rgba(52,211,153,0.3), inset 0 0 30px rgba(52,211,153,0.2); }
                }
                @keyframes blink { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0.3; } }
            `}</style>

            {/* Back button */}
            <div style={{ padding: '20px 24px', flexShrink: 0 }}>
                <button onClick={() => router.push('/dashboard/home')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '8px 12px', borderRadius: '4px', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.target.style.background = 'rgba(52,211,153,0.15)'; e.target.style.boxShadow = '0 0 12px rgba(52,211,153,0.3)'; }}
                    onMouseOut={(e) => { e.target.style.background = 'rgba(52,211,153,0.08)'; e.target.style.boxShadow = 'none'; }}>
                    ← Volver
                </button>
            </div>

            {/* ── PHASE: RECORD ──────────────────────────────── */}
            {phase === 'record' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '36px' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '12px', color: '#34d399', animation: 'matrix-glow 3s ease-in-out infinite' }}>
                            ▓▓▓ GRABA TU HISTORIA
                        </h1>
                        {/* Rotating prompt */}
                        <p key={promptIdx} style={{ fontSize: '0.95rem', color: '#34d399', animation: 'fadeIn 0.4s ease', maxWidth: '420px', lineHeight: 1.6, fontStyle: 'italic', opacity: 0.8 }}>
                            {PROMPTS[promptIdx]}
                        </p>
                    </div>

                    {/* Mic button — GIANT PULSING */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            style={{
                                width: '140px', height: '140px', borderRadius: '50%',
                                background: isRecording ? 'rgba(255,77,77,0.1)' : 'rgba(52,211,153,0.08)',
                                border: `4px solid ${isRecording ? '#ff6b6b' : '#34d399'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                animation: isRecording ? 'mic-pulse-red 1.2s infinite' : 'mic-pulse-green 2s ease-in-out infinite',
                                transition: 'all 0.3s',
                            }}
                        >
                            {isRecording
                                ? <Square size={56} color="#ff6b6b" fill="#ff6b6b" />
                                : <Mic size={56} color="#34d399" />
                            }
                        </button>

                        <p style={{ fontSize: '0.9rem', color: isRecording ? '#ff6b6b' : '#34d399', fontWeight: 700, textAlign: 'center', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {isRecording ? '● Grabando... pulsa para pausar' : '▶ Pulsa para hablar'}
                        </p>
                        {isRecording && <p style={{ fontSize: '0.7rem', color: 'rgba(255,77,77,0.6)', animation: 'blink 1s infinite', fontFamily: "'Courier New'" }}>escuchando tu voz...</p>}
                    </div>

                    {/* Transcript display — MATRIX STYLE */}
                    {(displayText || isRecording) && (
                        <div style={{ width: '100%', maxWidth: '620px', background: 'rgba(0,30,15,0.5)', border: '2px solid rgba(52,211,153,0.4)', borderRadius: '6px', padding: '20px 24px', minHeight: '100px', boxShadow: 'inset 0 0 20px rgba(52,211,153,0.08), 0 0 30px rgba(52,211,153,0.15)' }}>
                            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#34d399', margin: 0, fontFamily: "'Courier New'" }}>
                                {transcript}
                                {interim && <span style={{ color: 'rgba(52,211,153,0.5)' }}>{interim}</span>}
                                {isRecording && !displayText && <span style={{ color: 'rgba(52,211,153,0.4)', animation: 'blink 1s infinite' }}>▌ </span>}
                            </p>
                        </div>
                    )}

                    {error && (
                        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>⚠ {error}</p>
                    )}

                    {/* Continue button */}
                    {displayText && (
                        <button onClick={finishRecording}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.5)', color: '#34d399', borderRadius: '6px', padding: '14px 28px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 25px rgba(52,211,153,0.3)', transition: 'all 0.2s', fontFamily: "'Courier New'", textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            onMouseOver={(e) => { e.target.style.background = 'rgba(52,211,153,0.25)'; e.target.style.boxShadow = '0 0 40px rgba(52,211,153,0.5)'; }}
                            onMouseOut={(e) => { e.target.style.background = 'rgba(52,211,153,0.15)'; e.target.style.boxShadow = '0 0 25px rgba(52,211,153,0.3)'; }}>
                            ▶ Avanzar →
                        </button>
                    )}
                    {isRecording && (
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                            Habla con naturalidad — no hay respuesta incorrecta
                        </p>
                    )}

                    {/* Rotating tip */}
                    <p key={tipIdx} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', animation: 'fadeIn 0.4s ease', maxWidth: '360px' }}>
                        💡 {TIPS[tipIdx]}
                    </p>

                    {!isSupported && (
                        <p style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>
                            Tu navegador no soporta grabación de voz. Usa Chrome o Edge.
                        </p>
                    )}
                </div>
            )}

            {/* ── PHASE: CONFIRM ─────────────────────────────── */}
            {phase === 'confirm' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '28px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '12px', color: '#34d399', animation: 'matrix-glow 3s ease-in-out infinite' }}>
                            ▓ HISTORIA GRABADA
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: "'Courier New'", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            ✏️ Edita tu texto
                        </p>
                    </div>

                    {/* Editable transcript — MATRIX */}
                    <div style={{ width: '100%', maxWidth: '660px', background: 'rgba(0,30,15,0.6)', border: '2px solid rgba(52,211,153,0.4)', borderRadius: '6px', padding: '2px', boxShadow: 'inset 0 0 20px rgba(52,211,153,0.08), 0 0 30px rgba(52,211,153,0.15)' }}>
                        <textarea
                            value={editedText}
                            onChange={e => setEditedText(e.target.value)}
                            style={{
                                width: '100%', minHeight: '140px', background: 'rgba(0,10,5,0.7)',
                                border: 'none', outline: 'none', color: '#34d399',
                                fontSize: '1rem', lineHeight: 1.8, resize: 'vertical',
                                padding: '18px 20px', fontFamily: "'Courier New', monospace",
                                boxSizing: 'border-box', transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.background = 'rgba(0,10,5,0.9)'; }}
                            onBlur={(e) => { e.target.style.background = 'rgba(0,10,5,0.7)'; }}
                        />
                    </div>

                    {/* Char count */}
                    <div style={{ fontSize: '0.7rem', color: 'rgba(52,211,153,0.4)', fontFamily: "'Courier New'" }}>
                        › {editedText?.length || 0} caracteres
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button onClick={() => { setPhase('record'); accRef.current = ''; setTranscript(''); setInterim(''); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,77,77,0.1)', border: '2px solid rgba(255,77,77,0.4)', color: '#ff6b6b', borderRadius: '6px', padding: '12px 20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Courier New'", textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.target.style.background = 'rgba(255,77,77,0.2)'; e.target.style.boxShadow = '0 0 15px rgba(255,77,77,0.3)'; }}
                            onMouseOut={(e) => { e.target.style.background = 'rgba(255,77,77,0.1)'; e.target.style.boxShadow = 'none'; }}>
                            🔄 Grabar de nuevo
                        </button>

                        <button onClick={generateFromStory} disabled={!editedText.trim()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: editedText.trim() ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.05)', border: '2px solid rgba(52,211,153,0.5)', color: '#34d399', borderRadius: '6px', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 700, cursor: editedText.trim() ? 'pointer' : 'not-allowed', opacity: editedText.trim() ? 1 : 0.5, boxShadow: editedText.trim() ? '0 0 25px rgba(52,211,153,0.3)' : 'none', fontFamily: "'Courier New'", textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { if(editedText.trim()) { e.target.style.background = 'rgba(52,211,153,0.3)'; e.target.style.boxShadow = '0 0 40px rgba(52,211,153,0.5)'; }}}
                            onMouseOut={(e) => { e.target.style.background = editedText.trim() ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.05)'; e.target.style.boxShadow = editedText.trim() ? '0 0 25px rgba(52,211,153,0.3)' : 'none'; }}>
                            ▶ Generar guiones
                        </button>
                    </div>

                    <p style={{ fontSize: '0.7rem', color: 'rgba(52,211,153,0.35)', textAlign: 'center', fontFamily: "'Courier New'", maxWidth: '500px' }}>
                        › se generarán guiones adaptados a tu voz y cerebro ía
                    </p>
                </div>
            )}

            <style>{`
                @keyframes micPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 20px rgba(239,68,68,0); } }
                @keyframes micIdle  { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 0 12px rgba(124,58,237,0); } }
                @keyframes fadeIn   { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
                @keyframes blink    { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
            `}</style>
        </div>
    );
}

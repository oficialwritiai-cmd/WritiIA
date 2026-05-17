'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, ChevronLeft, Zap, RefreshCw, Edit3 } from 'lucide-react';

const PROMPTS = [
    'Una anécdota de un cliente que te sorprendió...',
    'Un error que cometiste y lo que aprendiste...',
    'Un resultado que conseguiste recientemente...',
    'Algo que aprendiste esta semana...',
    'Un momento en que todo salió mal y lo resolviste...',
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

    // Init SpeechRecognition
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setIsSupported(false); return; }

        const r = new SR();
        r.lang = 'es-ES';
        r.continuous = true;
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
            if (e.error !== 'no-speech') setError('Error: ' + e.error);
            setIsRecording(false);
        };

        r.onend = () => {
            setIsRecording(false);
            setInterim('');
        };

        recognitionRef.current = r;
        return () => { try { r.stop(); } catch(e) {} };
    }, []);

    async function startRecording() {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            accRef.current = transcript;
            recognitionRef.current?.start();
            setIsRecording(true);
        } catch(e) {
            setError('Sin permiso de micrófono. Actívalo en el navegador.');
        }
    }

    function stopRecording() {
        recognitionRef.current?.stop();
        setIsRecording(false);
        setInterim('');
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
        // Pass story to the generation page via URL param
        const params = new URLSearchParams({
            story: story,
            mode: 'voice-story',
        });
        router.push(`/dashboard?${params.toString()}`);
    }

    const displayText = transcript + (interim ? interim : '');

    return (
        <div style={{
            minHeight: '100vh', background: '#0c0c0e', color: '#fff',
            fontFamily: "'Inter', sans-serif",
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Back button */}
            <div style={{ padding: '20px 24px', flexShrink: 0 }}>
                <button onClick={() => router.push('/dashboard/home')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <ChevronLeft size={18} /> Volver
                </button>
            </div>

            {/* ── PHASE: RECORD ──────────────────────────────── */}
            {phase === 'record' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: '32px' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '10px' }}>
                            Cuenta tu historia
                        </h1>
                        {/* Rotating prompt */}
                        <p key={promptIdx} style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', animation: 'fadeIn 0.4s ease', maxWidth: '380px', lineHeight: 1.5 }}>
                            {PROMPTS[promptIdx]}
                        </p>
                    </div>

                    {/* Mic button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
                                border: `3px solid ${isRecording ? '#ef4444' : '#7c3aed'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: isRecording
                                    ? '0 0 0 0 rgba(239,68,68,0.4)'
                                    : '0 0 0 0 rgba(124,58,237,0.4)',
                                animation: isRecording ? 'micPulse 1.2s infinite' : 'micIdle 2s ease-in-out infinite',
                                transition: 'all 0.3s',
                            }}
                        >
                            {isRecording
                                ? <Square size={36} color="#ef4444" fill="#ef4444" />
                                : <Mic size={36} color="#a78bfa" />
                            }
                        </button>

                        <p style={{ fontSize: '0.85rem', color: isRecording ? '#ef4444' : 'rgba(255,255,255,0.35)', fontWeight: 600, textAlign: 'center' }}>
                            {isRecording ? '● Grabando... pulsa para pausar' : 'Pulsa para hablar'}
                        </p>
                    </div>

                    {/* Transcript display */}
                    {(displayText || isRecording) && (
                        <div style={{ width: '100%', maxWidth: '560px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px', minHeight: '80px' }}>
                            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#fff', margin: 0 }}>
                                {transcript}
                                {interim && <span style={{ color: 'rgba(255,255,255,0.35)' }}>{interim}</span>}
                                {isRecording && !displayText && <span style={{ color: 'rgba(255,255,255,0.25)', animation: 'blink 1s infinite' }}>Te escucho...</span>}
                            </p>
                        </div>
                    )}

                    {error && (
                        <p style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>
                    )}

                    {/* Continue button */}
                    {displayText && (
                        <button onClick={finishRecording}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: '14px', padding: '14px 28px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
                            <Zap size={18} /> Terminar y generar guiones
                        </button>
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: '28px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '8px' }}>
                            Esto es lo que contaste
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Edit3 size={14} /> Puedes editar antes de continuar
                        </p>
                    </div>

                    {/* Editable transcript */}
                    <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '16px', padding: '4px' }}>
                        <textarea
                            value={editedText}
                            onChange={e => setEditedText(e.target.value)}
                            style={{
                                width: '100%', minHeight: '160px', background: 'transparent',
                                border: 'none', outline: 'none', color: '#fff',
                                fontSize: '1rem', lineHeight: 1.75, resize: 'vertical',
                                padding: '16px 20px', fontFamily: "'Inter', sans-serif",
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button onClick={() => { setPhase('record'); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px 20px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                            <RefreshCw size={15} /> Volver a grabar
                        </button>
                        <button onClick={generateFromStory} disabled={!editedText.trim()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: '12px', padding: '13px 28px', fontSize: '0.95rem', fontWeight: 800, cursor: editedText.trim() ? 'pointer' : 'not-allowed', opacity: editedText.trim() ? 1 : 0.5, boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
                            <Zap size={18} /> Generar guiones desde esta historia
                        </button>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                        Se generarán guiones adaptados a tu voz y Cerebro IA configurado
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

'use client';

import { useState, useRef } from 'react';
import { Upload, Loader, CheckCircle, AlertCircle, X } from 'lucide-react';

const AudioUploadTranscriber = ({ onResult, size = 20 }) => {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);
    const [fileName, setFileName] = useState('');

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar formato
        const validFormats = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/m4a'];
        if (!validFormats.some(fmt => file.type.includes(fmt.split('/')[1]))) {
            setError('Formato no soportado. Usa MP3, WAV, M4A, OGG o WebM.');
            return;
        }

        // Validar tamaño (máx 25MB para Whisper)
        if (file.size > 25 * 1024 * 1024) {
            setError('Archivo muy grande. Máximo 25MB.');
            return;
        }

        setError('');
        setFileName(file.name);
        setIsTranscribing(true);
        setProgress(10);

        try {
            if (typeof window === 'undefined') {
                setError('Esta función solo funciona en el navegador');
                setIsTranscribing(false);
                return;
            }

            setProgress(30); // Cargando modelo...

            // Importar transformers SOLO en navegador, con env setup
            const { pipeline, env } = await import('@xenova/transformers');

            // Usar WebAssembly/WebGL backend (no requiere binarios nativos)
            env.allowRemoteModels = true;
            env.allowLocalModels = false;
            env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';

            // Crear instancia de Whisper
            const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                dtype: 'q8', // Cuantizado para más rápido
            });

            setProgress(60); // Transcribiendo...

            // Leer archivo como ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Decodificar audio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Convertir a mono si es necesario
            let monoAudio;
            if (audioBuffer.numberOfChannels === 1) {
                monoAudio = audioBuffer.getChannelData(0);
            } else {
                const monoContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
                const monoSource = monoContext.createBufferSource();
                monoSource.buffer = audioBuffer;
                monoSource.connect(monoContext.destination);
                monoSource.start(0);
                const monoBuffer = await monoContext.startRendering();
                monoAudio = monoBuffer.getChannelData(0);
            }

            setProgress(75); // Finalizando...

            // Transcribir
            const result = await transcriber(monoAudio, {
                language: 'spanish',
                return_timestamps: false,
            });

            const transcript = result.text;
            onResult(transcript);

            setProgress(100);
            setIsTranscribing(false);
            setFileName('');

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err) {
            console.error('Transcription error:', err);
            setError(`Error: ${err.message || 'No se pudo transcribir'}`);
            setIsTranscribing(false);
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTranscribing}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isTranscribing ? '8px' : '0px',
                        background: isTranscribing ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: isTranscribing ? '1px solid rgba(124, 58, 237, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: isTranscribing ? '20px' : '8px',
                        padding: isTranscribing ? '6px 14px' : '6px',
                        cursor: isTranscribing ? 'not-allowed' : 'pointer',
                        color: isTranscribing ? 'rgba(124, 58, 237, 0.8)' : 'var(--text-muted)',
                        transition: 'all 0.2s ease',
                        opacity: isTranscribing ? 0.7 : 1,
                    }}
                >
                    {isTranscribing ? (
                        <>
                            <Loader size={size - 4} style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                                {progress}%
                            </span>
                        </>
                    ) : (
                        <Upload size={size} />
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
                        padding: '2px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        maxWidth: '200px',
                    }}>
                        {error}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default AudioUploadTranscriber;

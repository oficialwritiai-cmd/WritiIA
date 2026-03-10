import { useState, useEffect } from 'react';
import { Loader2, Mic, MicOff, ChevronRight, ChevronLeft, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

const STEPS = [
    {
        id: 1,
        title: 'Negocio y Biografía',
        subtitle: 'Cuéntanos sobre ti',
        questions: '¿Quién eres y qué haces?\\n¿Qué resultados has conseguido o qué experiencia relevante tienes?',
        placeholder: 'Ej: Soy María, nutricionista especializada en mujeres de más de 40. Llevo 10 años ayudando a...'
    },
    {
        id: 2,
        title: 'Público Objetivo',
        subtitle: 'Tu cliente ideal',
        questions: '¿Quién es tu cliente ideal? (edad, profesión, nivel...)\\n¿Qué problemas principales tiene y qué desea conseguir?',
        placeholder: 'Ej: Mujeres emprendedoras de 35 a 50 años que no tienen tiempo para cocinar y siempre están cansadas...'
    },
    {
        id: 3,
        title: 'Productos y Nicho',
        subtitle: 'Qué vendes y dónde',
        questions: '¿Qué productos o servicios vendes? (da 2-5 ejemplos)\\n¿En qué nicho o industria te mueves?',
        placeholder: 'Ej: Vendo asesorías 1 a 1 de 3 meses, un curso online de batch cooking. Mi nicho es vida sana y productividad.'
    },
    {
        id: 4,
        title: 'Estilo y Valores',
        subtitle: 'La personalidad de tu marca',
        questions: '¿Qué tono quieres usar? (cercano, experto, rebelde...)\\nEscribe 3-5 palabras que definan tu estilo.',
        placeholder: 'Ej: Quiero sonar motivadora pero muy directa, sin excusas. Palabras: energía, resultados, sin humo.'
    },
    {
        id: 5,
        title: 'Oferta Irresistible',
        subtitle: 'Tu propuesta de valor única',
        questions: 'Describe tu oferta principal: ¿qué prometes, en cuánto tiempo y para quién?\\nSi tuvieras que explicar tu propuesta en 3 frases, ¿cuáles serían?',
        placeholder: 'Ej: Ayudo a mujeres empresarias a perder 5 kilos en 8 semanas comiendo rico y sin pasar horas en el gimnasio.'
    }
];

export default function BrainWizardModal({ isOpen, onClose, onComplete, projectId }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [answers, setAnswers] = useState({
        step1: '',
        step2: '',
        step3: '',
        step4: '',
        step5: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = 'es-ES';

                rec.onresult = (event) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (finalTranscript) {
                        const stepKey = `step${currentStep}`;
                        setAnswers(prev => ({
                            ...prev,
                            [stepKey]: prev[stepKey] ? `${prev[stepKey]} ${finalTranscript}`.trim() : finalTranscript.trim()
                        }));
                    }
                };

                rec.onerror = (event) => {
                    console.error('Speech recognition error', event.error);
                    setIsRecording(false);
                };

                rec.onend = () => {
                    setIsRecording(false);
                };

                setRecognition(rec);
            } else {
                setHasSpeechSupport(false);
            }
        }
    }, [currentStep]); // Re-bind when step changes if needed, but it should manage state cleanly

    const toggleRecording = () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
        } else {
            try {
                recognition.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Audio start error:", err);
                setIsRecording(false);
            }
        }
    };

    const handleNext = () => {
        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
        }
        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        } else {
            generateBrain();
        }
    };

    const handlePrev = () => {
        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
        }
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const generateBrain = async () => {
        setIsGenerating(true);
        setError('');

        try {
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !projectId) {
                throw new Error("Falta usuario o proyecto activo.");
            }

            const res = await fetch('/api/generate-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, userId: user.id, projectId })
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                onClose();
                return;
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al generar el Cerebro.');
            }

            const data = await res.json();
            onComplete(data.brain);
            onClose();

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    const currentStepData = STEPS.find(s => s.id === currentStep);
    const stepKey = `step${currentStep}`;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 3000, padding: '20px'
        }}>
            <div className="premium-card" style={{
                width: '100%', maxWidth: '700px',
                minHeight: '450px',
                display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden'
            }}>

                {/* Close Button */}
                {!isGenerating && (
                    <button onClick={onClose} style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'transparent', border: 'none', color: '#888',
                        cursor: 'pointer', zIndex: 10
                    }}>
                        <X size={24} />
                    </button>
                )}

                {isGenerating ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(126, 206, 202, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '24px',
                            color: '#7ECECA'
                        }}>
                            <Sparkles size={40} className="animate-pulse" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Construyendo tu Cerebro IA...</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
                            Estamos procesando tus respuestas y diseñando la identidad, tonos y ofertas irresistibles para tu marca. Esto tomará unos segundos.
                        </p>
                        <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
                            <Loader2 className="animate-spin" size={24} color="#7ECECA" />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header & Progress */}
                        <div style={{ padding: '32px 32px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ background: 'linear-gradient(135deg, #7ECECA 0%, #4A9D9A 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Crear Cerebro con IA</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Configuración Rápida en 5 pasos</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {STEPS.map(s => (
                                    <div key={s.id} style={{
                                        height: '4px', flex: 1, borderRadius: '2px',
                                        background: s.id <= currentStep ? '#7ECECA' : 'rgba(255,255,255,0.1)',
                                        transition: 'all 0.3s'
                                    }} />
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <span style={{ color: '#7ECECA', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Paso {currentStep} de {STEPS.length}
                                </span>
                                <h3 style={{ fontSize: '1.5rem', marginTop: '8px', marginBottom: '8px' }}>{currentStepData.title}</h3>
                                {currentStepData.questions.split('\\n').map((q, idx) => (
                                    <p key={idx} style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0 0 4px 0', fontWeight: 500 }}>
                                        {q}
                                    </p>
                                ))}
                            </div>

                            <div style={{ position: 'relative', flex: 1, minHeight: '160px' }}>
                                <textarea
                                    value={answers[stepKey]}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [stepKey]: e.target.value }))}
                                    placeholder={currentStepData.placeholder}
                                    style={{
                                        width: '100%', height: '100%',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        paddingRight: hasSpeechSupport ? '60px' : '16px',
                                        color: 'white',
                                        fontSize: '1.05rem',
                                        lineHeight: 1.5,
                                        resize: 'none',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#7ECECA'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                                />

                                {hasSpeechSupport && (
                                    <div style={{
                                        position: 'absolute', top: '16px', right: '16px',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                                    }}>
                                        <button
                                            onClick={toggleRecording}
                                            style={{
                                                width: '44px', height: '44px', borderRadius: '50%',
                                                background: isRecording ? '#EF4444' : 'rgba(255,255,255,0.1)',
                                                border: 'none', color: 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: '0.2s',
                                                boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none'
                                            }}
                                            title="Dictar respuesta"
                                        >
                                            {isRecording ? <Mic size={22} className="animate-pulse" /> : <Mic size={22} />}
                                        </button>
                                        {isRecording && <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>Escuchando...</span>}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div style={{ marginTop: '16px', color: '#EF4444', fontSize: '0.9rem', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                className="btn-secondary"
                                onClick={handlePrev}
                                disabled={currentStep === 1}
                                style={{ opacity: currentStep === 1 ? 0 : 1 }}
                            >
                                <ChevronLeft size={18} /> Atrás
                            </button>

                            <button
                                className="btn-primary"
                                onClick={handleNext}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: currentStep === STEPS.length ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'var(--primary)',
                                    borderColor: 'transparent'
                                }}
                            >
                                {currentStep === STEPS.length ? (
                                    <>Generar Cerebro IA <Sparkles size={18} /></>
                                ) : (
                                    <>Siguiente <ChevronRight size={18} /></>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

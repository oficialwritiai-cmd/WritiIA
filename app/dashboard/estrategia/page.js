/* app/dashboard/estrategia/page.js */
'use client';

import { useState } from 'react';
import { Target, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

// Simple stepper component
function Stepper({ current }) {
    const steps = ['Descubrimiento', 'Ideas', 'Plan'];
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '32px' }}>
            {steps.map((label, idx) => {
                const isActive = idx === current;
                const isCompleted = idx < current;
                const bg = isCompleted ? '#0A2A1A' : isActive ? '#1A1A1A' : '#2A2A2A';
                const color = isCompleted ? '#22C55E' : '#FFFFFF';
                return (
                    <div key={label} style={{ textAlign: 'center' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: bg,
                                color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600',
                                margin: '0 auto',
                            }}
                        >
                            {idx + 1}
                        </div>
                        <div style={{ marginTop: '8px', color: isActive ? '#FFFFFF' : '#AAAAAA' }}>{label}</div>
                    </div>
                );
            })}
        </div>
    );
}

export default function EstrategiaPage() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        objetivo: '',
        lanzamiento: '',
        objecion: '',
        historia: '',
        tipos: [],
        plataformas: [],
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setForm((prev) => {
                const arr = prev[name];
                if (checked) arr.push(value);
                else arr.splice(arr.indexOf(value), 1);
                return { ...prev, [name]: arr };
            });
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        // Simulate AI call
        await new Promise((r) => setTimeout(r, 2000));
        console.log('Form submitted', form);
        setLoading(false);
        setStep(1);
    };

    const renderStepContent = () => {
        if (step === 0) {
            return (
                <div style={{ maxWidth: '800px', margin: '0 auto', color: '#FFFFFF' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Sesión de Descubrimiento</h1>
                    <p style={{ marginBottom: '1.5rem', color: '#CCCCCC' }}>
                        Responde estas preguntas para que la IA diseñe una estrategia de contenido completamente personalizada para ti.
                    </p>
                    {/* Brain status badge */}
                    {/* In a real app, replace the placeholder condition with actual brain data */}
                    {false ? (
                        <div style={{ background: '#0A2A1A', color: '#22C55E', padding: '8px 12px', borderRadius: '6px', marginBottom: '1rem' }}>
                            ✓ Cerebro IA activo — tus ideas sonarán como tú
                        </div>
                    ) : (
                        <div style={{ background: '#2A2000', color: '#EAB308', padding: '8px 12px', borderRadius: '6px', marginBottom: '1rem' }}>
                            Tu Cerebro IA está vacío. Cuanto más lo completes, mejores ideas obtendrás.{' '}
                            <a href="/dashboard/knowledge" style={{ color: '#EAB308', textDecoration: 'underline' }}>
                                Completar ahora →
                            </a>
                        </div>
                    )}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                        <label>
                            <span style={{ display: 'block', marginBottom: '4px' }}>¿Qué quieres conseguir con tu contenido en los próximos 30 días?</span>
                            <textarea
                                name="objetivo"
                                placeholder="Ej: Quiero ganar 500 seguidores y conseguir 5 clientes nuevos para mi servicio de diseño."
                                value={form.objetivo}
                                onChange={handleChange}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1A1A1A', color: '#FFF' }}
                            />
                        </label>
                        <label>
                            <span style={{ display: 'block', marginBottom: '4px' }}>¿Tienes algún lanzamiento, oferta o evento especial próximo?</span>
                            <textarea
                                name="lanzamiento"
                                placeholder="Ej: En 3 semanas lanzo un curso de fotografía por 197€. Quiero calentarlo con contenido previo."
                                value={form.lanzamiento}
                                onChange={handleChange}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1A1A1A', color: '#FFF' }}
                            />
                        </label>
                        <label>
                            <span style={{ display: 'block', marginBottom: '4px' }}>¿Cuál es la mayor objeción o duda que tiene tu cliente antes de comprarte?</span>
                            <textarea
                                name="objecion"
                                placeholder="Ej: Dicen que es muy caro o que ya lo pueden hacer solos sin ayuda."
                                value={form.objecion}
                                onChange={handleChange}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1A1A1A', color: '#FFF' }}
                            />
                        </label>
                        <label>
                            <span style={{ display: 'block', marginBottom: '4px' }}>¿Cuál es la historia tuya que más engancha cuando la cuentas?</span>
                            <textarea
                                name="historia"
                                placeholder="Ej: Pasé de ganar 800€/mes a 5K en 6 meses trabajando solo 4 horas al día."
                                value={form.historia}
                                onChange={handleChange}
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#1A1A1A', color: '#FFF' }}
                            />
                        </label>
                        {/* Multi-select chips – simplified as checkboxes */}
                        <div>
                            <span style={{ display: 'block', marginBottom: '4px' }}>¿Qué tipo de contenido quieres potenciar?</span>
                            {['Ganar seguidores', 'Generar ventas directas', 'Crear autoridad en mi nicho', 'Educar a mi audiencia', 'Viralidad y alcance masivo'].map((opt) => (
                                <label key={opt} style={{ marginRight: '12px' }}>
                                    <input
                                        type="checkbox"
                                        name="tipos"
                                        value={opt}
                                        checked={form.tipos.includes(opt)}
                                        onChange={handleChange}
                                    />{' '}
                                    {opt}
                                </label>
                            ))}
                        </div>
                        <div>
                            <span style={{ display: 'block', marginBottom: '4px' }}>¿En qué plataformas quieres publicar?</span>
                            {['Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn', 'X'].map((plat) => (
                                <label key={plat} style={{ marginRight: '12px' }}>
                                    <input
                                        type="checkbox"
                                        name="plataformas"
                                        value={plat}
                                        checked={form.plataformas.includes(plat)}
                                        onChange={handleChange}
                                    />{' '}
                                    {plat}
                                </label>
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: '#7ECECA',
                                color: '#000',
                                padding: '12px 24px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                width: '100%',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            Analizar y generar ideas →
                        </button>
                    </form>
                </div>
            );
        }
        // Placeholder for other steps
        if (step === 1) {
            return <div style={{ color: '#FFF' }}><h2>Banco de Ideas Estratégicas (TODO)</h2></div>;
        }
        if (step === 2) {
            return <div style={{ color: '#FFF' }}><h2>Plan Mensual Ejecutable (TODO)</h2></div>;
        }
    };

    return (
        <div style={{ background: '#050505', minHeight: '100vh', padding: '32px' }}>
            <Stepper current={step} />
            {renderStepContent()}
            {step > 0 && (
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    {step > 0 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            style={{
                                background: '#333',
                                color: '#FFF',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <ArrowLeft size={16} /> Atrás
                        </button>
                    )}
                    {step < 2 && (
                        <button
                            onClick={() => setStep(step + 1)}
                            style={{
                                background: '#7ECECA',
                                color: '#000',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            Siguiente <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

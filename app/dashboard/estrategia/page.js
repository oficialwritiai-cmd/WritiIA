/* app/dashboard/estrategia/page.js */
'use client';

import { useState, useEffect } from 'react';
import {
    Target, ArrowRight, ArrowLeft, Loader2, Sparkles,
    CheckCircle2, TrendingUp, Calendar, Brain, Search,
    Layers, Zap, MessageSquare, Plus, Save
} from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Simple stepper component
function Stepper({ current }) {
    const steps = ['Descubrimiento', 'Banco de Ideas', 'Plan Mensual'];
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '40px' }}>
            {steps.map((label, idx) => {
                const isActive = idx === current;
                const isCompleted = idx < current;

                return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: isCompleted ? 'rgba(34, 197, 94, 0.1)' : isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: isCompleted ? '#22C55E' : isActive ? '#000' : 'rgba(255,255,255,0.3)',
                                border: isCompleted ? '1px solid rgba(34, 197, 94, 0.2)' : isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                transition: '0.3s'
                            }}
                        >
                            {isCompleted ? <CheckCircle2 size={20} /> : idx + 1}
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: isActive ? '#FFF' : 'rgba(255,255,255,0.3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function EstrategiaPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [brainActive, setBrainActive] = useState(false);
    const [ideas, setIdeas] = useState([]);
    const [selectedIdeaIds, setSelectedIdeaIds] = useState(new Set());
    const [form, setForm] = useState({
        objective: '',
        launch: '',
        objection: '',
        story: '',
        types: [],
        platforms: [],
    });

    const supabase = createSupabaseClient();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: prof } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                setProfile(prof);

                const { data: brain } = await supabase.from('brand_brain').select('id').eq('user_id', user.id).single();
                setBrainActive(!!brain);
            }
        }
        loadProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setForm((prev) => {
                const arr = [...prev[name]];
                if (checked) arr.push(value);
                else {
                    const idx = arr.indexOf(value);
                    if (idx > -1) arr.splice(idx, 1);
                }
                return { ...prev, [name]: arr };
            });
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleGenerateIdeas = async () => {
        if (!form.objective || form.platforms.length === 0) {
            setError('Por favor completa el objetivo y selecciona al menos una plataforma.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/estrategia/generate-ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    userId: profile?.id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al generar ideas');

            setIdeas(data.ideas || []);
            setStep(1);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleIdeaSelection = (id) => {
        const newSelected = new Set(selectedIdeaIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIdeaIds(newSelected);
    };

    const handleGoToPlan = () => {
        if (selectedIdeaIds.size === 0) {
            alert('Selecciona al menos una idea para crear tu plan.');
            return;
        }
        setStep(2);
    };

    const handleGenerateScriptForIdea = (idea) => {
        const params = new URLSearchParams();
        params.set('mode', 'single');
        params.set('topic', `${idea.titulo_idea}\n${idea.descripcion}`);
        params.set('platform', idea.plataforma);
        params.set('goal', idea.objetivo);
        params.set('source_type', 'strategy');
        router.push(`/dashboard?${params.toString()}`);
    };

    const renderDiscovery = () => (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Target size={32} color="var(--accent)" />
                    Sesión de Descubrimiento
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '1.1rem' }}>
                    Diseñaremos tu estrategia basándonos en tus objetivos reales para los próximos 30 días.
                </p>

                {brainActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', borderRadius: '12px', marginBottom: '32px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.9rem', fontWeight: 700 }}>
                        <Brain size={18} /> ✓ Cerebro IA Activo — tus ideas sonarán a ti
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', borderRadius: '12px', marginBottom: '32px', border: '1px solid rgba(234, 179, 8, 0.2)', fontSize: '0.9rem', fontWeight: 700 }}>
                        <Brain size={18} /> Cerebro IA incompleto. <a href="/dashboard/knowledge" style={{ color: '#EAB308', textDecoration: 'underline', marginLeft: '4px' }}>Complétalo para mejores resultados →</a>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Preguntas de texto */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>¿Qué quieres conseguir con tu contenido en los próximos 30 días?</label>
                        <textarea
                            name="objective"
                            className="textarea-field"
                            placeholder="Ej: Ganar 500 seguidores y conseguir 5 clientes..."
                            value={form.objective}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>¿Tienes algún lanzamiento u oferta próxima?</label>
                        <textarea
                            name="launch"
                            className="textarea-field"
                            placeholder="Ej: Lanzamiento de curso el día 20..."
                            value={form.launch}
                            onChange={handleChange}
                            rows={2}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>¿Cuál es la mayor objeción de tus clientes?</label>
                        <textarea
                            name="objection"
                            className="textarea-field"
                            placeholder="Ej: Es muy caro, no tengo tiempo..."
                            value={form.objection}
                            onChange={handleChange}
                            rows={2}
                        />
                    </div>

                    {/* Chips Multiselección */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Tipo de contenido a potenciar:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Ganar seguidores', 'Ventas directas', 'Autoridad', 'Educar', 'Viralidad'].map(opt => (
                                <label key={opt} style={{ cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="types"
                                        value={opt}
                                        checked={form.types.includes(opt)}
                                        onChange={handleChange}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        background: form.types.includes(opt) ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                        color: form.types.includes(opt) ? '#000' : 'rgba(255,255,255,0.5)',
                                        border: '1px solid ' + (form.types.includes(opt) ? 'var(--accent)' : 'rgba(255,255,255,0.1)'),
                                        transition: '0.2s'
                                    }}>
                                        {opt}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Plataformas:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn', 'X'].map(p => (
                                <label key={p} style={{ cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="platforms"
                                        value={p}
                                        checked={form.platforms.includes(p)}
                                        onChange={handleChange}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        background: form.platforms.includes(p) ? '#FFF' : 'rgba(255,255,255,0.05)',
                                        color: form.platforms.includes(p) ? '#000' : 'rgba(255,255,255,0.5)',
                                        border: '1px solid ' + (form.platforms.includes(p) ? '#FFF' : 'rgba(255,255,255,0.1)'),
                                        transition: '0.2s'
                                    }}>
                                        {p}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateIdeas}
                        disabled={loading}
                        className="btn-primary"
                        style={{ height: '64px', fontSize: '1.1rem', fontWeight: 900, marginTop: '20px' }}
                    >
                        {loading ? <Loader2 className="spin" /> : <><Sparkles size={20} /> Analizar y generar banco de ideas →</>}
                    </button>
                    {error && <p style={{ color: '#FF4D4D', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
                </div>
            </div>
        </div>
    );

    const renderIdeas = () => (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>Banco de Ideas Estratégicas</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Selecciona las mejores ideas para crear tu plan mensual de contenido.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => setSelectedIdeaIds(new Set(ideas.map(i => i.id || i.titulo_idea)))}>Seleccionar todas</button>
                    <button className="btn-primary" style={{ padding: '12px 24px' }} onClick={handleGoToPlan}>
                        Crear plan con ({selectedIdeaIds.size}) seleccionadas →
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                {ideas.map((idea, idx) => {
                    const id = idea.id || idea.titulo_idea;
                    const isSelected = selectedIdeaIds.has(id);
                    return (
                        <div
                            key={idx}
                            onClick={() => toggleIdeaSelection(id)}
                            className="premium-card"
                            style={{
                                padding: '24px',
                                background: isSelected ? 'rgba(126, 206, 202, 0.05)' : '#0D0D0D',
                                border: isSelected ? '1px solid var(--accent)' : '1px solid #1E1E1E',
                                cursor: 'pointer',
                                transition: '0.2s',
                                position: 'relative'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    border: '2px solid ' + (isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.1)'),
                                    background: isSelected ? 'var(--accent)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {isSelected && <CheckCircle2 size={16} color="#000" />}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF' }}>{idea.plataforma}</span>
                                {idea.potencial === 'alto' && <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}>Potencial Alto</span>}
                            </div>

                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px', paddingRight: '30px' }}>{idea.titulo_idea}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>{idea.descripcion}</p>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>¿Por qué funcionará?</span>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{idea.por_que_funciona}</p>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleGenerateScriptForIdea(idea); }}
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem', gap: '6px' }}
                                >
                                    <Sparkles size={14} /> Guión
                                </button>
                                <button
                                    className="btn-secondary"
                                    style={{ padding: '8px', fontSize: '0.8rem' }}
                                    onClick={(e) => { e.stopPropagation(); }}
                                >
                                    <Save size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderPlan = () => {
        const selectedIdeas = ideas.filter(i => selectedIdeaIds.has(i.id || i.titulo_idea));
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px' }}>Tu Estrategia Mensual Lista.</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Hemos distribuido tus {selectedIdeas.length} ideas seleccionadas a lo largo del mes.</p>
                </div>

                <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px 32px', borderBottom: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 700 }}>Marzo 2026</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 700 }}>{selectedIdeas.length} publicaciones</span>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => router.push('/dashboard/calendar')}>
                            Ver en Calendario Full →
                        </button>
                    </div>

                    <div style={{ background: '#080808' }}>
                        {selectedIdeas.map((idea, idx) => (
                            <div key={idx} style={{
                                padding: '24px 32px',
                                borderBottom: idx === selectedIdeas.length - 1 ? 'none' : '1px solid #1A1A1A',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '32px'
                            }}>
                                <div style={{ minWidth: '60px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', display: 'block' }}>DÍA</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{Math.floor(idx * (30 / selectedIdeas.length)) + 1}</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>{idea.plataforma}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Objetivo: {idea.objetivo}</span>
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{idea.titulo_idea}</h4>
                                </div>

                                <div>
                                    <button
                                        onClick={() => handleGenerateScriptForIdea(idea)}
                                        className="btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '8px 16px', background: 'transparent', border: '1px solid #2A2A2A' }}
                                    >
                                        Generar Guión →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <button className="btn-secondary" style={{ padding: '16px 32px' }} onClick={() => setStep(0)}>
                        Reiniciar Proceso de Estrategia
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ background: '#050505', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <Stepper current={step} />

                {step === 0 && renderDiscovery()}
                {step === 1 && renderIdeas()}
                {step === 2 && renderPlan()}

                {step > 0 && (
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => setStep(step - 1)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'rgba(255,255,255,0.4)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 700
                            }}
                        >
                            <ArrowLeft size={16} /> Volver al paso anterior
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .premium-card {
                    background: #0D0D0D;
                    border: 1px solid #1E1E1E;
                    border-radius: 20px;
                    transition: 0.3s;
                }
                .premium-card:hover {
                    border-color: #2A2A2A;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

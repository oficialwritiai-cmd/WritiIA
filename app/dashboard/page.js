'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const PLATAFORMAS = ['Reels', 'TikTok', 'LinkedIn', 'X'];
const TONOS = ['Profesional', 'Cercano', 'Inspiracional', 'Directo', 'Divertido'];

const SUGGESTED_TRENDS = [
    { name: 'Nicho Marketing', icon: '📈', grow: '+12.5%', color: '#9D00FF' },
    { name: 'IA Generativa', icon: '🤖', grow: '+45.2%', color: '#00F3FF' },
    { name: 'Productividad', icon: '⏳', grow: '+8.1%', color: '#FF007A' },
];

export default function DashboardPage() {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Reels');
    const [tone, setTone] = useState('Profesional');
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const supabase = createSupabaseClient();

    const loadingMessages = [
        "Escaneando tendencias...",
        "Calculando ángulos virales...",
        "Aplicando marcos AIDA...",
        "Finalizando guiones..."
    ];

    useEffect(() => {
        if (loading) {
            const timer = setInterval(() => {
                setLoadingPhase(prev => (prev + 1) % loadingMessages.length);
            }, 2500);
            return () => clearInterval(timer);
        }
    }, [loading]);

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                if (data) {
                    setProfile(data);
                    if (data.default_tone) setTone(data.default_tone);
                }
            }
        }
        loadProfile();
    }, []);

    async function handleGenerate() {
        if (!topic.trim()) {
            setError('Por favor, escribe un tema.');
            return;
        }
        setLoading(true);
        setError('');
        setScripts([]);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic.trim(),
                    platform,
                    tone,
                    brandName: profile?.brand_name || '',
                    brandContext: profile?.brand_context || null
                }),
            });

            if (!res.ok) throw new Error('Error al generar guiones');
            const data = await res.json();
            setScripts(data.scripts || []);
        } catch (err) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Header Section */}
            <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Recomendado para hoy
                </p>
                <h1 style={{ fontSize: '2.2rem', marginBottom: '24px' }}>Top Tendencias Virales</h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {SUGGESTED_TRENDS.map((trend, i) => (
                        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${trend.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                {trend.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{trend.name}</p>
                                <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>{trend.grow}</p>
                            </div>
                            <div style={{ color: trend.color }}>↗</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Creator Section - Stakent Style */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '30px 40px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Laboratorio de Guiones</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Crea contenido de alto impacto con IA estratégica.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {PLATAFORMAS.map(p => (
                            <button
                                key={p}
                                onClick={() => setPlatform(p)}
                                className={`sidebar-btn ${platform === p ? 'active' : ''}`}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: platform === p ? '1px solid var(--accent)' : '1px solid var(--border)',
                                    background: platform === p ? 'rgba(157, 0, 255, 0.1)' : 'transparent'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    {/* Left Side: Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <span className="script-label">Tema del guión</span>
                            <textarea
                                className="textarea-field"
                                rows={6}
                                placeholder="Sobre qué quieres escribir hoy..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                style={{ background: '#0B0B0F', border: '1px solid var(--border)' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <span className="script-label">Tono de voz</span>
                                <select className="select-field" value={tone} onChange={(e) => setTone(e.target.value)} style={{ background: '#0B0B0F' }}>
                                    {TONOS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="btn-primary" onClick={handleGenerate} disabled={loading} style={{ width: '100%' }}>
                                    {loading ? 'Procesando...' : '✨ Generar Pro'}
                                </button>
                            </div>
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>

                    {/* Right Side: Quick Stats/Insights (Placeholder) */}
                    <div style={{ background: '#0B0B0F', borderRadius: 'var(--radius-md)', padding: '30px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚀</div>
                        <h3 style={{ marginBottom: '10px' }}>Potencia tu Alcance</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
                            Nuestra IA analiza más de 500 variables de retención para asegurar que tu contenido destaque.
                        </p>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{loadingMessages[loadingPhase]}</p>
                </div>
            )}

            {!loading && scripts.length > 0 && (
                <div style={{ display: 'grid', gap: '24px' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Estrategias Generadas</h2>
                    {scripts.map((script, idx) => (
                        <div key={idx} className="card" style={{ padding: '0', overflow: 'hidden', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ padding: '20px 30px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="badge-accent">VIRALIDAD: {script.insights?.viralidad}%</span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn-secondary" onClick={() => {/* copy logic */ }}>Copiar</button>
                                    <button className="btn-secondary" onClick={() => {/* save logic */ }}>Guardar</button>
                                </div>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <span className="script-label">HOOK / GANCHO</span>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: '1.4' }}>{script.gancho}</p>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <span className="script-label">RETENCIÓN / DESARROLLO</span>
                                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {script.desarrollo.map((d, i) => (
                                            <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                                                <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{i + 1}</span> {d}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <span className="script-label">CTA / CONVERSIÓN</span>
                                    <p style={{ fontWeight: 700 }}>{script.cta}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

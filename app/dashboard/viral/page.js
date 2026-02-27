'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

export default function ViralPage() {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [ideas, setIdeas] = useState([]);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const supabase = createSupabaseClient();

    const loadingMessages = [
        "Analizando tendencias globales...",
        "Identificando vacíos de contenido...",
        "Calculando potencial viral...",
        "Generando estrategias..."
    ];

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                if (data) setProfile(data);
            }
        }
        loadProfile();
    }, []);

    useEffect(() => {
        if (loading) {
            const timer = setInterval(() => {
                setLoadingPhase(prev => (prev + 1) % loadingMessages.length);
            }, 2500);
            return () => clearInterval(timer);
        }
    }, [loading]);

    async function handleGenerate(e) {
        e.preventDefault();
        if (!topic) return;

        setLoading(true);
        setError('');
        setIdeas([]);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    mode: 'viral',
                    brandContext: profile?.brand_context || null
                }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setIdeas(data.ideas || []);
        } catch (err) {
            setError(err.message || 'Error al conectar');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Análisis Predictivo
                </p>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>Motor Viral SEO</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Detecta ángulos disruptivos y objetivos de tráfico masivo para cualquier nicho.
                </p>
            </div>

            <div className="card" style={{ padding: '40px', marginBottom: '40px' }}>
                <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Escribe un tema o nicho (Ej: Inversiones, Real Estate)..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            style={{ background: '#0B0B0F', height: '56px' }}
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '180px' }}>
                        {loading ? 'Analizando...' : 'Generar Estrategia'}
                    </button>
                </form>
                {error && <div className="error-message">{error}</div>}
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                    <p style={{ fontWeight: 700 }}>{loadingMessages[loadingPhase]}</p>
                </div>
            )}

            {ideas.length > 0 && (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {ideas.map((idea, idx) => (
                        <div key={idx} className="card" style={{ padding: '30px', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span className="badge-accent">ESTRATEGIA #{idx + 1}</span>
                            </div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>{idea.objetivo}</h3>

                            <div style={{ background: '#0B0B0F', padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border)' }}>
                                <span className="script-label" style={{ color: 'var(--accent)' }}>GANCHO DISRUPTIVO:</span>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', lineHeight: '1.4' }}>"{idea.gancho}"</p>
                            </div>

                            <div>
                                <span className="script-label">ANÁLISIS DE TENDENCIA:</span>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{idea.explicacion}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

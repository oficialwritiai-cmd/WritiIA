'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Sparkles, Save, PenLine, Loader2, CheckCircle2, TrendingUp, Search } from 'lucide-react';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';

const PLATFORMS = ['Reels', 'TikTok', 'Shorts', 'YouTube', 'Blog / SEO'];
const GOALS = ['Ganar seguidores', 'Generar leads/ventas', 'Viralidad pura', 'Autoridad'];
const QUANTITIES = [10, 20, 30];

export default function IdeasViralesPage() {
    const [contextInfo, setContextInfo] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState(['Reels', 'TikTok']);
    const [useGoogleTrends, setUseGoogleTrends] = useState(true);
    const [useTikTokTrends, setUseTikTokTrends] = useState(true);
    const [goal, setGoal] = useState('Viralidad pura');
    const [quantity, setQuantity] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ideas, setIdeas] = useState([]);
    const [savedIdeasIds, setSavedIdeasIds] = useState(new Set());
    const [profile, setProfile] = useState(null);

    const supabase = createSupabaseClient();
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                setProfile(data);
            }
        };
        fetchProfile();
    }, []);

    const togglePlatform = (p) => {
        if (selectedPlatforms.includes(p)) {
            setSelectedPlatforms(selectedPlatforms.filter(pl => pl !== p));
        } else {
            setSelectedPlatforms([...selectedPlatforms, p]);
        }
    };

    const handleGenerateIdeas = async () => {
        if (!contextInfo.trim()) {
            setError('Por favor, indica tu nicho o producto.');
            return;
        }
        if (selectedPlatforms.length === 0) {
            setError('Debes seleccionar al menos una plataforma.');
            return;
        }

        setLoading(true);
        setError('');
        setIdeas([]);

        try {
            const res = await fetch('/api/generate-ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: contextInfo.trim(),
                    platforms: selectedPlatforms,
                    useSEO: useGoogleTrends,
                    useTikTok: useTikTokTrends,
                    goal,
                    count: quantity,
                    userId: profile?.id
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al generar las ideas virales.');

            setIdeas(data.ideas || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveIdea = async (idea, index) => {
        if (!profile?.id) return;

        try {
            const { data, error: insertError } = await supabase.from('viral_ideas').insert({
                user_id: profile.id,
                plataforma: idea.plataforma,
                tipo_idea: idea.tipo_idea,
                titulo_idea: idea.titulo_idea,
                descripcion: idea.descripcion,
                objetivo: idea.objetivo
            }).select().single();

            if (insertError) throw insertError;

            // Actualizar localmente el Set para que el botón muestre "Guardado"
            setSavedIdeasIds(prev => {
                const newSet = new Set(prev);
                newSet.add(index);
                return newSet;
            });

            // Adjuntar ID para usar al convertir a guion
            const newIdeas = [...ideas];
            newIdeas[index].id = data.id;
            setIdeas(newIdeas);

        } catch (err) {
            alert('Error al guardar: ' + err.message);
        }
    };

    const handleConvertToScript = (idea) => {
        // Redirigir al dashboard con parámetros en la URL
        // El dashboard debe leer estos query params para auto-poblar y saber que viene de "ideas"
        const params = new URLSearchParams();
        params.set('mode', 'single');
        params.set('topic', `${idea.titulo_idea}\n${idea.descripcion}`);
        params.set('platform', idea.plataforma.includes('Reels') ? 'Reels' : (idea.plataforma.includes('TikTok') ? 'TikTok' : 'Reels')); // Fallback a Reels si es mezclado
        params.set('goal', idea.objetivo);
        params.set('source_type', 'ideas');
        if (idea.id) {
            params.set('source_reference_id', idea.id);
        }

        router.push(`/dashboard?${params.toString()}`);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '80px' }}>
            {/* Encabezado */}
            <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Sparkles size={36} color="#B74DFF" />
                    Ideas de contenido virales
                </h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Descubre ideas recientes y altamente virales basadas en tu nicho, tendencias actuales y lo que ya está funcionando.
                </p>
            </div>

            {/* Formulario */}
            <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Contexto rápido */}
                    <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>
                            ¿Sobre qué nicho o producto quieres ideas?
                        </p>
                        <AIPolishedTextarea
                            className="textarea-field"
                            value={contextInfo}
                            onChange={(e) => setContextInfo(e.target.value)}
                            placeholder="Ej: perder grasa para mujeres de 30-45, SaaS para agencias, trading para principiantes..."
                            style={{ minHeight: '100px', fontSize: '1.05rem' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        {/* Selector de plataforma */}
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Plataformas (Multiselección)</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {PLATFORMS.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => togglePlatform(p)}
                                        className={selectedPlatforms.includes(p) ? 'btn-primary' : 'btn-secondary'}
                                        style={{ padding: '8px 16px', fontSize: '0.8rem', background: selectedPlatforms.includes(p) ? '#B74DFF' : 'rgba(255,255,255,0.05)', boxShadow: 'none' }}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Objetivo */}
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Objetivo Principal</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {GOALS.map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setGoal(g)}
                                        className={goal === g ? 'btn-primary' : 'btn-secondary'}
                                        style={{ padding: '8px 16px', fontSize: '0.8rem', background: goal === g ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', boxShadow: 'none' }}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        {/* Origen de tendencias */}
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Origen de tendencias</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={useGoogleTrends}
                                        onChange={(e) => setUseGoogleTrends(e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: '#B74DFF' }}
                                    />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Search size={16} color="#7ECECA" />
                                        Usar tendencias de Google / SEO (últimos 30 días)
                                    </span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={useTikTokTrends}
                                        onChange={(e) => setUseTikTokTrends(e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: '#B74DFF' }}
                                    />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={16} color="#FF007A" />
                                        Usar patrones virales de TikTok / Reels (últimas semanas)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Cantidad de ideas */}
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Cantidad de Ideas Híper Específicas</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {QUANTITIES.map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setQuantity(q)}
                                        className={quantity === q ? 'btn-primary' : 'btn-secondary'}
                                        style={{ padding: '8px 24px', fontSize: '0.9rem', background: quantity === q ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', boxShadow: 'none' }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Botón generar */}
                    <button
                        onClick={handleGenerateIdeas}
                        disabled={loading}
                        className="btn-primary"
                        style={{ height: '64px', fontSize: '1.2rem', fontWeight: 800, marginTop: '16px', background: 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)' }}
                    >
                        {loading ? <Loader2 className="spin" size={24} /> : 'Generar ideas virales →'}
                    </button>
                    {error && <p style={{ color: '#FF4D4D', textAlign: 'center' }}>{error}</p>}
                </div>
            </div>

            {/* Listado de Ideas */}
            {ideas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Resultados: {ideas.length} ideas para tu nicho</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                        {ideas.map((idea, idx) => (
                            <div key={idx} className="premium-card" style={{ padding: '24px', background: '#101010', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                    <span className="badge" style={{ background: 'rgba(157, 0, 255, 0.15)', color: '#D8B4FF' }}>{idea.plataforma}</span>
                                    <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>{idea.tipo_idea}</span>
                                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>{idea.objetivo}</span>
                                </div>

                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px', lineHeight: '1.3' }}>
                                    {idea.titulo_idea}
                                </h3>

                                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5', flex: 1, marginBottom: '24px' }}>
                                    {idea.descripcion}
                                </p>

                                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                                    <button
                                        onClick={() => handleConvertToScript(idea)}
                                        className="btn-primary"
                                        style={{ flex: 1, padding: '10px 0', fontSize: '0.85rem' }}
                                    >
                                        <PenLine size={16} /> Convertir a guion
                                    </button>

                                    <button
                                        onClick={() => handleSaveIdea(idea, idx)}
                                        disabled={savedIdeasIds.has(idx)}
                                        className="btn-secondary"
                                        style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: savedIdeasIds.has(idx) ? 'rgba(126, 206, 202, 0.1)' : '', color: savedIdeasIds.has(idx) ? '#7ECECA' : '', borderColor: savedIdeasIds.has(idx) ? 'rgba(126, 206, 202, 0.3)' : '' }}
                                    >
                                        {savedIdeasIds.has(idx) ? <><CheckCircle2 size={16} /> Guardado</> : <><Save size={16} /> Guardar</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

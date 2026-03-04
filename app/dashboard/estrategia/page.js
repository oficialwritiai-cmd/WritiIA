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
    const [selectedIdeasForPlan, setSelectedIdeasForPlan] = useState([]);
    const [savingToCalendar, setSavingToCalendar] = useState(false);
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
            console.log('[Estrategia] Response:', data);
            
            if (!res.ok) throw new Error(data.error || 'Error al generar ideas');
            
            if (!data.ideas) {
                throw new Error('No se recibieron ideas. Verifica que el Cerebro IA esté configurado.');
            }

            // ULTRA ROBUST PARSING
            let ideasData = data.ideas;
            console.log('[Estrategia] Raw data type:', typeof ideasData);
            console.log('[Estrategia] Raw data:', ideasData);
            
            // Step 1: If it's a string, aggressively extract JSON
            if (typeof ideasData === 'string') {
                // Remove any text before/after the JSON array
                let cleanStr = ideasData;
                
                // Find where JSON array starts
                const firstBracket = cleanStr.indexOf('[');
                const firstBrace = cleanStr.indexOf('{');
                let startIdx = -1;
                
                if (firstBracket !== -1 && firstBrace !== -1) {
                    startIdx = Math.min(firstBracket, firstBrace);
                } else if (firstBracket !== -1) {
                    startIdx = firstBracket;
                } else if (firstBrace !== -1) {
                    startIdx = firstBrace;
                }
                
                if (startIdx !== -1) {
                    cleanStr = cleanStr.substring(startIdx);
                }
                
                // Find where JSON array ends
                let endIdx = -1;
                let bracketCount = 0;
                let inString = false;
                
                for (let i = 0; i < cleanStr.length; i++) {
                    const char = cleanStr[i];
                    if (char === '"' && cleanStr[i-1] !== '\\') inString = !inString;
                    if (!inString) {
                        if (char === '[') bracketCount++;
                        if (char === ']') bracketCount--;
                        if (bracketCount === 0 && cleanStr[i] === ']') {
                            endIdx = i + 1;
                            break;
                        }
                    }
                }
                
                if (endIdx !== -1) {
                    cleanStr = cleanStr.substring(0, endIdx);
                }
                
                try {
                    ideasData = JSON.parse(cleanStr);
                    console.log('[Estrategia] Parsed from string successfully');
                } catch (e) {
                    console.error('[Estrategia] Failed to parse:', e.message);
                    ideasData = [];
                }
            }
            
            // Step 2: Ensure it's an array
            if (!Array.isArray(ideasData)) {
                if (ideasData && typeof ideasData === 'object') {
                    ideasData = [ideasData];
                } else {
                    ideasData = [];
                }
            }

            // Step 3: Filter out invalid ideas (must have at least titulo or descripcion)
            ideasData = ideasData.filter(idea => 
                idea && (
                    idea.titulo_idea || 
                    idea.titulo || 
                    idea.descripcion ||
                    idea.plataforma
                )
            );

            console.log('[Estrategia] Final ideas count:', ideasData.length);

            if (ideasData.length === 0) {
                throw new Error('No se pudieron parsear las ideas. Intenta de nuevo.');
            }

            setIdeas(ideasData);
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
        
        // Filtrar ideas seleccionadas - con protección
        let ideasArray = ideas;
        if (typeof ideas === 'string') {
            try {
                ideasArray = JSON.parse(ideas);
                if (!Array.isArray(ideasArray)) ideasArray = [ideasArray];
            } catch (e) {
                ideasArray = [];
            }
        }
        
        if (!Array.isArray(ideasArray)) {
            ideasArray = [];
        }
        
        const selectedIdeas = ideasArray.filter(i => {
            const id = i?.id || i?.titulo_idea || i?.titulo || String(ideasArray.indexOf(i));
            return selectedIdeaIds.has(id);
        });
        
        if (selectedIdeas.length === 0) {
            alert('Selecciona al menos una idea para crear tu plan.');
            return;
        }
        
        setSelectedIdeasForPlan(selectedIdeas);
        setStep(2);
    };

    const handleSendToCalendar = async () => {
        if (selectedIdeasForPlan.length === 0) {
            alert('No hay ideas para enviar al calendario.');
            return;
        }
        
        setSavingToCalendar(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión');
            
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            
            const { data: planData, error: planError } = await supabase
                .from('content_plans')
                .insert({
                    user_id: user.id,
                    month,
                    year,
                    frequency: `${selectedIdeasForPlan.length} publicaciones`,
                    platforms: [...new Set(selectedIdeasForPlan.map(i => i.plataforma))],
                    focus: 'plan_mensual'
                })
                .select()
                .single();
            
            if (planError) throw planError;
            
            const slotsToInsert = selectedIdeasForPlan.map((idea, idx) => ({
                plan_id: planData.id,
                user_id: user.id,
                day_number: Math.floor(idx * (30 / selectedIdeasForPlan.length)) + 1,
                platform: idea.plataforma || 'Reels',
                content_type: idea.tipo || idea.tipo_contenido || 'viral',
                idea_title: idea.titulo_idea || idea.titulo || 'Sin título',
                goal: idea.objetivo || 'engagement'
            }));
            
            const { data: slotData, error: slotError } = await supabase
                .from('content_slots')
                .insert(slotsToInsert)
                .select();
            
            if (slotError) throw slotError;
            
            const { saveToLibrary } = await import('@/lib/library');
            for (const idea of selectedIdeasForPlan) {
                await saveToLibrary({
                    userId: user.id,
                    type: 'idea_plan_mensual',
                    platform: idea.plataforma || 'Reels',
                    goal: idea.objetivo || 'engagement',
                    content: {
                        titulo_idea: idea.titulo_idea || idea.titulo || 'Sin título',
                        descripcion: idea.descripcion || '',
                        plataforma: idea.plataforma || 'Reels',
                        objetivo: idea.objetivo || 'engagement',
                        tipo_contenido: idea.tipo || idea.tipo_contenido || 'viral'
                    },
                    metadata: { plan_id: planData.id, source: 'estrategia' },
                    tags: [idea.plataforma, idea.tipo, idea.objetivo].filter(Boolean)
                });
            }
            
            alert(`✓ ${selectedIdeasForPlan.length} ideas guardadas en el plan mensual y biblioteca`);
            router.push('/dashboard/calendar');
        } catch (err) {
            console.error('[Estrategia] Error sending to calendar:', err);
            alert('Error al enviar al calendario: ' + err.message);
        } finally {
            setSavingToCalendar(false);
        }
    };

    const handleGenerateScriptForIdea = (idea) => {
        // Validate idea has required data
        if (!idea) {
            alert('Error: No se pudo obtener la idea. Intenta de nuevo.');
            return;
        }
        
        const titulo = idea.titulo_idea || idea.titulo || '';
        const desc = idea.descripcion || '';
        const plataforma = idea.plataforma || 'Reels';
        const objetivo = idea.objetivo || 'engagement';
        
        if (!titulo) {
            alert('Error: La idea no tiene título válido.');
            return;
        }
        
        console.log('[Estrategia] Generating script for idea:', { titulo, plataforma, objetivo });
        
        const params = new URLSearchParams();
        params.set('mode', 'single');
        params.set('topic', encodeURIComponent(`${titulo}\n${desc}`));
        params.set('platform', encodeURIComponent(plataforma));
        params.set('goal', encodeURIComponent(objetivo));
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
                        {loading ? <Loader2 className="animate-spin" style={{ display: 'inline-block' }} /> : <><Sparkles size={20} /> Analizar y generar banco de ideas →</>}
                    </button>
                    {error && <p style={{ color: '#FF4D4D', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
                </div>
            </div>
        </div>
    );

    const renderIdeas = () => {
        console.log('[Estrategia] renderIdeas - ideas state:', ideas);
        
        // PROTECCIÓN: Asegurar que ideas es siempre un array de objetos
        let ideasList = [];
        
        if (typeof ideas === 'string') {
            // Si es string, intentar parsear
            try {
                const parsed = JSON.parse(ideas);
                ideasList = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                console.error('[Estrategia] Error parsing ideas string:', e);
                ideasList = [];
            }
        } else if (Array.isArray(ideas)) {
            ideasList = ideas;
        } else if (ideas && typeof ideas === 'object') {
            // Si es un solo objeto, envolverlo en array
            ideasList = [ideas];
        }
        
        console.log('[Estrategia] ideasList after parse:', ideasList.length);
        
        // Filtrar ideas inválidas - solo verificar que sea objeto y no sea null
        ideasList = ideasList.filter(idea => idea && typeof idea === 'object');
        
        console.log('[Estrategia] ideasList after filter:', ideasList.length);
        
        return (
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>Banco de Ideas Estratégicas</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Selecciona las mejores ideas para crear tu plan mensual de contenido.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button className="btn-secondary" onClick={() => setSelectedIdeaIds(new Set(ideasList.map((i, idx) => i?.id || i?.titulo_idea || i?.titulo || String(idx)).filter(Boolean)))}>
                            Seleccionar todas
                        </button>
                        <button className="btn-primary" style={{ padding: '12px 24px' }} onClick={handleGoToPlan} disabled={selectedIdeaIds.size === 0}>
                            Crear plan con ({selectedIdeaIds.size}) seleccionadas →
                        </button>
                    </div>
                </div>

                {ideasList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>No hay ideas generadas aún.</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginTop: '8px' }}>Completa el formulario y genera ideas estratégicas.</p>
                    </div>
                ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(1, 1fr)',
                        gap: '16px'
                    }}>
                        {ideasList.map((idea, idx) => {
                            // PROTECCIÓN: Si no es un objeto, skip
                            if (!idea || typeof idea !== 'object') {
                                return null;
                            }
                            
                            // Extract fields with fallbacks
                            const id = idea?.id || idea?.titulo_idea || idea?.titulo || String(idx);
                            const isSelected = selectedIdeaIds.has(id);
                            const titulo = idea?.titulo_idea || idea?.titulo || idea?.title || 'Idea sin título';
                            const desc = idea?.descripcion || idea?.description || '';
                            
                            const truncateDesc = (text, maxLen = 100) => {
                                if (!text) return '';
                                return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
                            };
                            
                            return (
                                <div
                                    key={idx}
                                    onClick={() => toggleIdeaSelection(id)}
                                    className="premium-card"
                                    style={{
                                        padding: '18px',
                                        background: isSelected ? 'linear-gradient(145deg, rgba(126, 206, 202, 0.1) 0%, #0a0a0a 100%)' : 'linear-gradient(145deg, #151515 0%, #0c0c0c 100%)',
                                        border: isSelected ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        borderRadius: '14px',
                                        boxShadow: isSelected ? '0 4px 20px rgba(126, 206, 202, 0.2)' : '0 2px 8px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '14px', 
                                        right: '14px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '5px',
                                        border: '2px solid ' + (isSelected ? '#7ECECA' : 'rgba(255,255,255,0.15)'),
                                        background: isSelected ? '#7ECECA' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {isSelected && <CheckCircle2 size={12} color="#000" />}
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '0', flexWrap: 'wrap' }}>
                                        <span className="badge" style={{ background: 'rgba(157, 0, 255, 0.12)', color: '#D8B4FF', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '20px' }}>
                                            {idea?.plataforma || 'Reels'}
                                        </span>
                                        <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.12)', color: '#7ECECA', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '20px' }}>
                                            {idea?.tipo || 'viral'}
                                        </span>
                                        {idea?.potencial === 'alto' && (
                                            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '20px' }}>
                                                Alto
                                            </span>
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0', paddingRight: '28px', lineHeight: '1.3', color: '#fff' }}>
                                        {titulo}
                                    </h3>

                                    {desc && (
                                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0', lineHeight: '1.45', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                            {desc}
                                        </p>
                                    )}

                                    {idea?.por_que_funciona && (
                                        <div style={{ background: 'rgba(255,255,255,0.025)', padding: '10px', borderRadius: '8px', marginTop: 'auto', borderLeft: '2px solid #7ECECA' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#7ECECA', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                Por qué funciona
                                            </span>
                                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', lineHeight: '1.3', margin: 0 }}>
                                                {truncateDesc(idea.por_que_funciona, 60)}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleGenerateScriptForIdea(idea); }}
                                        className="btn-primary"
                                        style={{ 
                                            width: '100%', 
                                            padding: '8px 0', 
                                            fontSize: '0.7rem',
                                            background: 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)',
                                            borderRadius: '8px',
                                            marginTop: '8px'
                                        }}
                                    >
                                        <Sparkles size={11} style={{ marginRight: '4px' }} /> Generar Guion
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderPlan = () => {
        const selectedIdeas = selectedIdeasForPlan;
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px' }}>Tu Estrategia Mensual Lista.</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Hemos distribuido tus {selectedIdeas.length} ideas seleccionadas a lo largo del mes.</p>
                </div>

                <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px 32px', borderBottom: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 700 }}>Marzo 2026</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 700 }}>{selectedIdeas.length} publicaciones</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                className="btn-secondary" 
                                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)', border: 'none' }}
                                onClick={handleSendToCalendar}
                                disabled={savingToCalendar}
                            >
                                {savingToCalendar ? <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px', display: 'inline' }} /> : <Calendar size={16} style={{ marginRight: '8px', display: 'inline' }} />}
                                {savingToCalendar ? 'Guardando...' : 'Enviar al Calendario'}
                            </button>
                            <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => router.push('/dashboard/calendar')}>
                                Ver Calendario →
                            </button>
                        </div>
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

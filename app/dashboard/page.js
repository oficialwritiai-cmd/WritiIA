'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2, Sparkles } from 'lucide-react';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';

const SUGGESTED_TRENDS = [
    { name: 'Nicho Marketing', icon: '📈', grow: '+12.5%', color: '#9D00FF' },
    { name: 'IA Generativa', icon: '🤖', grow: '+45.2%', color: '#00F3FF' },
    { name: 'Productividad', icon: '⏳', grow: '+8.1%', color: '#FF007A' },
];

const PLATAFORMAS = ['Reels', 'TikTok', 'LinkedIn', 'X', 'YouTube Shorts'];
const TONOS = ['Profesional', 'Cercano', 'Inspiracional', 'Directo', 'Educativo', 'Provocador'];
const OBJETIVOS = ['Ganar seguidores', 'Generar ventas', 'Crear autoridad', 'Entretener', 'Educar', 'Viralizar'];
const FRECUENCIAS = ['3 publicaciones por semana', '4 publicaciones por semana', '5 publicaciones por semana', '7 publicaciones por semana'];
const ENFOQUES = ['Educar', 'Crear autoridad', 'Generar ventas', 'Mezcla equilibrada'];

export default function DashboardPage() {
    const [generationMode, setGenerationMode] = useState('single'); // 'single' | 'plan'

    // States for 'single' mode
    const [step, setStep] = useState(1); // 1: Form, 2: Loading, 3: Results
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Reels');
    const [tone, setTone] = useState('Profesional');
    const [goal, setGoal] = useState('Viralizar');
    const [quantity, setQuantity] = useState(5);
    const [ideas, setIdeas] = useState('');
    const [scripts, setScripts] = useState([]);

    // States for 'plan' mode
    const [planPlatforms, setPlanPlatforms] = useState(['Reels']);
    const [planFrequency, setPlanFrequency] = useState('3 publicaciones por semana');
    const [planFocus, setPlanFocus] = useState('Mezcla equilibrada');
    const [planSlots, setPlanSlots] = useState([]);
    const [generatingSlotId, setGeneratingSlotId] = useState(null);

    const [loadingPhase, setLoadingPhase] = useState(0);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [hasBrain, setHasBrain] = useState(false);

    const supabase = createSupabaseClient();
    const router = useRouter();

    const singleLoadingSteps = [
        "Leyendo tu Cerebro IA...",
        "Analizando el tema y la plataforma...",
        "Identificando los mejores ángulos virales...",
        `Redactando ${quantity} guiones con tu voz...`,
        "Revisando calidad y originalidad..."
    ];

    const planLoadingSteps = [
        "Leyendo tu Cerebro IA...",
        "Analizando tu objetivo mensual...",
        "Distribuyendo temas por semanas...",
        "Asignando plataformas y ángulos...",
        "Generando estructura de 30 días..."
    ];

    const loadingSteps = generationMode === 'single' ? singleLoadingSteps : planLoadingSteps;

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                setProfile(profileData);

                const { data: brainData } = await supabase.from('brand_brain').select('id').eq('user_id', user.id).single();
                setHasBrain(!!brainData);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        if (step === 2) {
            let current = 0;
            setLoadingPhase(0);
            const interval = setInterval(() => {
                if (current < loadingSteps.length - 1) {
                    current++;
                    setLoadingPhase(current);
                }
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [step, generationMode]);

    async function handleGenerateSingle() {
        if (!topic.trim()) {
            setError('Por favor, indica sobre qué quieres crear contenido.');
            return;
        }
        setStep(2);
        setError('');

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic.trim(),
                    platform,
                    tone,
                    goal,
                    count: quantity,
                    ideas,
                    userId: profile?.id
                }),
            });

            if (!res.ok) throw new Error('Error al generar guiones');
            const data = await res.json();
            setScripts(data.scripts || []);
            setStep(3);
        } catch (err) {
            setError(err.message);
            setStep(1);
        }
    }

    async function handleGeneratePlan() {
        if (!topic.trim()) {
            setError('Por favor, describe tu marca y objetivos para el mes.');
            return;
        }
        if (planPlatforms.length === 0) {
            setError('Debes seleccionar al menos una plataforma.');
            return;
        }
        setStep(2);
        setError('');

        try {
            const res = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: topic.trim(),
                    platforms: planPlatforms,
                    frequency: planFrequency,
                    focus: planFocus,
                    tone,
                    context: ideas,
                    userId: profile?.id
                }),
            });

            if (!res.ok) throw new Error('Error al generar el plan de contenido');
            const data = await res.json();
            setPlanSlots(data.slots || []);
            setStep(3);
        } catch (err) {
            setError(err.message);
            setStep(1);
        }
    }

    const [stats, setStats] = useState({ generated: 0, saved: 0, monthGenerations: 0, estimatedCost: 0 });

    useEffect(() => {
        if (!profile?.id) return;
        const fetchStats = async () => {
            const userId = profile.id;
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count: gen } = await supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            const { count: sav } = await supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_saved', true);
            const { count: mon } = await supabase.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('action', ['generate_scripts', 'generate_plan']).gte('created_at', startOfMonth.toISOString());
            const { data: usage } = await supabase.from('usage_logs').select('cost_eur').eq('user_id', userId).gte('created_at', startOfMonth.toISOString());
            const cost = usage?.reduce((acc, curr) => acc + (Number(curr.cost_eur) || 0), 0) || 0;

            setStats({ generated: gen || 0, saved: sav || 0, monthGenerations: mon || 0, estimatedCost: cost });
        };
        fetchStats();
        const chan = supabase.channel('ui-stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_logs', filter: `user_id=eq.${profile.id}` }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts', filter: `user_id=eq.${profile.id}` }, fetchStats)
            .subscribe();
        return () => supabase.removeChannel(chan);
    }, [profile?.id]);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        const btn = document.getElementById(`copy-${id}`);
        if (btn) {
            const oldText = btn.innerText;
            btn.innerText = '✓ Copiado';
            setTimeout(() => { btn.innerText = oldText; }, 2000);
        }
    };

    const saveScript = async (script) => {
        const { error } = await supabase.from('scripts').insert({
            user_id: profile.id,
            content: script.gancho + '\n\n' + script.desarrollo.join('\n') + '\n\n' + script.cta,
            platform,
            is_saved: true
        });
        if (!error) alert('Guardado en biblioteca');
    };

    const handleTogglePlatform = (p) => {
        if (planPlatforms.includes(p)) {
            setPlanPlatforms(planPlatforms.filter(pl => pl !== p));
        } else {
            setPlanPlatforms([...planPlatforms, p]);
        }
    };

    const handleGenerateSlotScript = async (slot) => {
        setGeneratingSlotId(slot.id);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: slot.idea_title,
                    platform: slot.platform,
                    tone: tone,
                    goal: slot.goal,
                    count: 1, // Generate only 1 script
                    ideas: `Enfoque: ${slot.content_type}`,
                    userId: profile?.id
                }),
            });

            if (!res.ok) throw new Error('Error al generar el guión individual');
            const data = await res.json();
            const generatedScript = data.scripts[0];

            // Subir a BD
            const fullContent = generatedScript.gancho + '\n\n' + generatedScript.desarrollo.join('\n') + '\n\n' + generatedScript.cta;
            const insertPayload = {
                user_id: profile.id,
                content: fullContent,
                platform: slot.platform,
                topic: slot.idea_title,
                tone: tone,
                is_saved: true
            };

            // If the slot had a scheduled date, transfer it to the script
            if (slot.scheduled_date) {
                insertPayload.scheduled_date = slot.scheduled_date;
            }

            const { data: insertedScript, error: scriptErr } = await supabase.from('scripts').insert(insertPayload).select().single();

            if (scriptErr) throw scriptErr;

            // Update local slot status
            const { error: slotErr } = await supabase.from('content_slots').update({
                has_script: true,
                script_id: insertedScript.id
            }).eq('id', slot.id);

            if (slotErr) throw slotErr;

            setPlanSlots(planSlots.map(s => {
                if (s.id === slot.id) return { ...s, has_script: true, script_id: insertedScript.id };
                return s;
            }));

        } catch (err) {
            alert(err.message);
        } finally {
            setGeneratingSlotId(null);
        }
    };

    const handleScheduleSlot = async (slotId, dateValue) => {
        try {
            const { error: slotErr } = await supabase.from('content_slots').update({
                scheduled_date: dateValue
            }).eq('id', slotId);

            if (slotErr) throw slotErr;

            setPlanSlots(planSlots.map(s => {
                if (s.id === slotId) return { ...s, scheduled_date: dateValue };
                return s;
            }));

            // If there's an associated script, update it too
            const slot = planSlots.find(s => s.id === slotId);
            if (slot && slot.script_id) {
                await supabase.from('scripts').update({ scheduled_date: dateValue }).eq('id', slot.script_id);
            }

            alert('Añadido al calendario ✅');
        } catch (err) {
            alert('Error al programar: ' + err.message);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header / Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {[
                    { label: 'Generaciones Realizadas', val: stats.monthGenerations, sub: 'Mes actual', color: '#9D00FF' },
                    { label: 'Guiones Guardados', val: stats.saved, sub: 'Total histórico', color: '#F59E0B' },
                    { label: 'Coste Estimado', val: `€${stats.estimatedCost.toFixed(2)}`, sub: 'IA actual', color: '#7ECECA' },
                ].map((s, i) => (
                    <div key={i} className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</p>
                        <h3 style={{ fontSize: '2rem', marginBottom: '4px' }}>{s.val}</h3>
                        <p style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600 }}>{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Mode Switcher */}
            {step === 1 && (
                <div style={{ display: 'flex', gap: '8px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', width: 'fit-content', margin: '0 auto 10px' }}>
                    <button
                        onClick={() => { setGenerationMode('single'); setTopic(''); }}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, transition: '0.2s', background: generationMode === 'single' ? '#7ECECA' : 'transparent', color: generationMode === 'single' ? '#000' : 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Guiones de un tema
                    </button>
                    <button
                        onClick={() => { setGenerationMode('plan'); setTopic(''); }}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, transition: '0.2s', background: generationMode === 'plan' ? '#7ECECA' : 'transparent', color: generationMode === 'plan' ? '#000' : 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <CalendarDays size={18} /> Plan mensual de contenido
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '40px', fontWeight: 800 }}>
                        {generationMode === 'single' ? 'Nuevo Proyecto Viral' : 'Tu Planificador Mensual de Contenido'}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                        {/* Tema / Descripción general */}
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>
                                {generationMode === 'single' ? '¿Sobre qué quieres crear contenido hoy?' : 'Describe tu marca y lo que quieres conseguir este mes'}
                            </p>
                            <AIPolishedTextarea
                                className="textarea-field"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={generationMode === 'single' ? "Ej: Cómo ganar 1.000 seguidores en 30 días sin pagar ads" : "Ej: Soy coach de negocios para emprendedores digitales y quiero ganar autoridad y vender mi nuevo programa de mentoría."}
                                style={{ minHeight: '120px', fontSize: '1.1rem' }}
                            />
                        </div>

                        {generationMode === 'single' ? (
                            <>
                                {/* Opciones Modo Single */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Plataforma</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {PLATAFORMAS.map(p => (
                                                <button key={p} onClick={() => setPlatform(p)} className={platform === p ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: platform === p ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Tono de Comunicación</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {TONOS.map(t => (
                                                <button key={t} onClick={() => setTone(t)} className={tone === t ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: tone === t ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{t}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Objetivo del Contenido</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {OBJETIVOS.map(o => (
                                                <button key={o} onClick={() => setGoal(o)} className={goal === o ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: goal === o ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{o}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Cantidad de Guiones</p>
                                        <input type="range" min="5" max="10" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', accentColor: '#7ECECA' }} />
                                        <p style={{ textAlign: 'center', marginTop: '10px', fontWeight: 800, color: '#7ECECA' }}>{quantity} guiones</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Opciones Modo Plan Mensual */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Plataformas (Multiselección)</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {PLATAFORMAS.map(p => (
                                                <button key={p} onClick={() => handleTogglePlatform(p)} className={planPlatforms.includes(p) ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: planPlatforms.includes(p) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Frecuencia de Publicación</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {FRECUENCIAS.map(f => (
                                                <button key={f} onClick={() => setPlanFrequency(f)} className={planFrequency === f ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: planFrequency === f ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{f.split(' ')[0]} x Sem</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Enfoque Principal del Mes</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {ENFOQUES.map(e => (
                                                <button key={e} onClick={() => setPlanFocus(e)} className={planFocus === e ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: planFocus === e ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{e}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Tono de Comunicación</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {TONOS.map(t => (
                                                <button key={t} onClick={() => setTone(t)} className={tone === t ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '0.8rem', background: tone === t ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)' }}>{t}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>{generationMode === 'single' ? 'Ideas o Ángulos (opcional)' : 'Ideas o campañas específicas para este mes (opcional)'}</p>
                            <input
                                className="input-field"
                                value={ideas}
                                onChange={(e) => setIdeas(e.target.value)}
                                placeholder={generationMode === 'single' ? "Ej: Hablar del error más común, dar una lista de pasos..." : "Ej: Lanzamiento de un curso, promover oferta, destacar testimonios"}
                            />
                        </div>

                        {/* Brain Status */}
                        <div style={{ padding: '20px', borderRadius: '16px', background: hasBrain ? 'rgba(126, 206, 202, 0.05)' : 'rgba(245, 158, 11, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {hasBrain ? <CheckCircle2 color="#7ECECA" /> : <AlertCircle color="#F59E0B" />}
                                <div>
                                    <p style={{ fontWeight: 700, color: hasBrain ? '#7ECECA' : '#F59E0B' }}>
                                        {hasBrain ? '✓ Cerebro IA activo — tus guiones sonarán como tú' : '⚠ Cerebro IA vacío — tus guiones serán genéricos'}
                                    </p>
                                    {!hasBrain && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Complétalo para obtener mejores resultados</p>}
                                </div>
                            </div>
                            {!hasBrain && <button onClick={() => router.push('/dashboard/knowledge')} className="btn-secondary" style={{ fontSize: '0.7rem' }}>Ir al Cerebro →</button>}
                        </div>

                        <button onClick={generationMode === 'single' ? handleGenerateSingle : handleGeneratePlan} className="btn-primary" style={{ height: '64px', fontSize: '1.2rem', fontWeight: 800 }}>
                            {generationMode === 'single' ? 'Analizar y generar guiones →' : 'Generar plan de 30 días →'}
                        </button>
                        {error && <p style={{ color: '#FF4D4D', textAlign: 'center' }}>{error}</p>}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '32px' }}>
                    <div className="loading-spinner" style={{ width: '60px', height: '60px', borderTopColor: '#7ECECA' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px' }}>
                        {loadingSteps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: i <= loadingPhase ? 1 : 0.3, transition: '0.5s' }}>
                                {i < loadingPhase ? <CheckCircle2 size={18} color="#7ECECA" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid' }}></div>}
                                <span style={{ fontSize: '0.9rem', fontWeight: i === loadingPhase ? 700 : 400 }}>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && generationMode === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Resultados Generados</h2>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setStep(1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCcw size={16} /> Regenerar</button>
                            <button onClick={() => { setStep(1); setTopic(''); setIdeas(''); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PlusCircle size={16} /> Nueva sesión</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '40px', paddingBottom: '60px' }}>
                        {scripts.map((s, i) => (
                            <div key={i} className="premium-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(126, 206, 202, 0.15)', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)' }}>
                                {/* Card Header Overlay */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 900, fontSize: '0.9rem' }}>{i + 1}</div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{s.titulo_angulo}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', border: 'none' }}>{platform}</span>
                                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>{tone}</span>
                                    </div>
                                </div>

                                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                    {/* Gancho section */}
                                    <section>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#7ECECA', letterSpacing: '0.15em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <TrendingUp size={14} /> GANCHO IRRESISTIBLE
                                        </p>
                                        <p style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: '1.2', color: 'white' }}>“{s.gancho}”</p>
                                    </section>

                                    {/* Desarrollo section */}
                                    <section>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#7ECECA', letterSpacing: '0.15em', marginBottom: '20px' }}>DESARROLLO (3 PUNTOS)</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {s.desarrollo?.map((p, pi) => (
                                                <div key={pi} style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                                                    <div style={{ marginTop: '4px', width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(126, 206, 202, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#7ECECA', flexShrink: 0 }}>{pi + 1}</div>
                                                    <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5' }}>{p}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* CTA section */}
                                    <section style={{ borderTop: '1px dashed rgba(126, 206, 202, 0.2)', paddingTop: '24px' }}>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#7ECECA', letterSpacing: '0.15em', marginBottom: '12px' }}>CALL TO ACTION</p>
                                        <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#7ECECA' }}>{s.cta}</p>
                                    </section>
                                </div>

                                {/* Footer Actions */}
                                <div style={{ padding: '20px 32px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <button id={`copy - ${i}`} onClick={() => copyToClipboard(`${s.gancho}\n\n${s.desarrollo?.join('\n')}\n\n${s.cta}`, i)} className="btn-secondary" style={{ height: '48px', fontWeight: 700 }}>
                                        <Copy size={16} /> Copiar
                                    </button>
                                    <button onClick={() => saveScript(s)} className="btn-secondary" style={{ height: '48px', fontWeight: 700 }}>
                                        <Bookmark size={16} /> Guardar
                                    </button>
                                    <button onClick={() => router.push('/dashboard/calendar')} className="btn-secondary" style={{ height: '48px', fontWeight: 700 }}>
                                        <Calendar size={16} /> Programar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && generationMode === 'plan' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>Plan de contenido a 30 días</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Haz clic en cada idea para generar su guión con un solo botón.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setStep(1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCcw size={16} /> Crear Otro Plan</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {planSlots.map((slot, i) => (
                            <div key={slot.id} className="premium-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: slot.has_script ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flex: 1 }}>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', minWidth: '60px', height: '60px' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>DÍA</span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>{slot.day_number}</span>
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>{slot.platform}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}> Objetivo: <strong style={{ color: 'white' }}>{slot.goal}</strong></span>
                                            {slot.has_script && (
                                                <span className="badge" style={{ background: 'rgba(0, 255, 0, 0.1)', color: '#00ff00', border: '1px solid #00ff00' }}>✓ Guión Listo</span>
                                            )}
                                        </div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>{slot.idea_title}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enfoque: {slot.content_type}</p>
                                    </div>

                                </div>
                                <div style={{ display: 'flex', gap: '8px', paddingLeft: '24px', borderLeft: '1px solid rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Calendar size={14} color="var(--text-secondary)" />
                                        <input
                                            type="date"
                                            value={slot.scheduled_date || ''}
                                            onChange={(e) => handleScheduleSlot(slot.id, e.target.value)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', colorScheme: 'dark' }}
                                        />
                                    </div>
                                    {!slot.has_script ? (
                                        <button
                                            onClick={() => handleGenerateSlotScript(slot)}
                                            disabled={generatingSlotId === slot.id}
                                            className="btn-primary"
                                            style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, opacity: generatingSlotId === slot.id ? 0.7 : 1 }}
                                        >
                                            {generatingSlotId === slot.id ? <><Loader2 className="spin" size={16} style={{ marginRight: '8px', display: 'inline' }} /> Generando...</> : <><Sparkles size={16} style={{ marginRight: '8px', display: 'inline' }} /> Generar Guión</>}
                                        </button>
                                    ) : (
                                        <button onClick={() => router.push('/dashboard/calendar')} className="btn-secondary" style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}>
                                            Ver Calendario →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

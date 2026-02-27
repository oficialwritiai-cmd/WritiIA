'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

// PLATAFORMAS and TONOS are now declared inside the component or after imports

const SUGGESTED_TRENDS = [
    { name: 'Nicho Marketing', icon: '📈', grow: '+12.5%', color: '#9D00FF' },
    { name: 'IA Generativa', icon: '🤖', grow: '+45.2%', color: '#00F3FF' },
    { name: 'Productividad', icon: '⏳', grow: '+8.1%', color: '#FF007A' },
];

import { PenLine, CheckCircle2, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp } from 'lucide-react';

const PLATAFORMAS = ['Reels', 'TikTok', 'LinkedIn', 'X', 'YouTube Shorts'];
const TONOS = ['Profesional', 'Cercano', 'Inspiracional', 'Directo', 'Educativo', 'Provocador'];
const OBJETIVOS = ['Ganar seguidores', 'Generar ventas', 'Crear autoridad', 'Entretener', 'Educar', 'Viralizar'];

export default function DashboardPage() {
    const [step, setStep] = useState(1); // 1: Form, 2: Loading, 3: Results
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Reels');
    const [tone, setTone] = useState('Profesional');
    const [goal, setGoal] = useState('Viralizar');
    const [quantity, setQuantity] = useState(5);
    const [ideas, setIdeas] = useState('');
    const [scripts, setScripts] = useState([]);
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [hasBrain, setHasBrain] = useState(false);

    const supabase = createSupabaseClient();
    const router = useRouter();

    const loadingSteps = [
        "Leyendo tu Cerebro IA...",
        "Analizando el tema y la plataforma...",
        "Identificando los mejores ángulos virales...",
        `Redactando ${quantity} guiones con tu voz...`,
        "Revisando calidad y originalidad..."
    ];

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
            const interval = setInterval(() => {
                if (current < loadingSteps.length - 1) {
                    current++;
                    setLoadingPhase(current);
                }
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [step]);

    async function handleGenerate() {
        if (!topic.trim()) {
            setError('Por favor, indica sobre qué quieres crear contenido.');
            return;
        }
        setStep(2);
        setError('');
        setLoadingPhase(0);

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
            const { count: mon } = await supabase.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('action', 'generate_scripts').gte('created_at', startOfMonth.toISOString());
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

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header / Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {[
                    { label: 'Guiones Generados', val: stats.generated, sub: 'Total histórico', color: '#9D00FF' },
                    { label: 'Generaciones Mes', val: stats.monthGenerations, sub: `${stats.saved} guardados`, color: '#F59E0B' },
                    { label: 'Coste Estimado', val: `€${stats.estimatedCost.toFixed(2)}`, sub: 'IA actual', color: '#7ECECA' },
                ].map((s, i) => (
                    <div key={i} className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</p>
                        <h3 style={{ fontSize: '2rem', marginBottom: '4px' }}>{s.val}</h3>
                        <p style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600 }}>{s.sub}</p>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '40px', fontWeight: 800 }}>Nuevo Proyecto Viral</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Tema */}
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>¿Sobre qué quieres crear contenido?</p>
                            <textarea
                                className="textarea-field"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ej: Cómo ganar 1.000 seguidores en 30 días sin pagar ads"
                                style={{ minHeight: '120px', fontSize: '1.1rem' }}
                            />
                        </div>

                        {/* Config Multi-Grid */}
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

                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Ideas o Ángulos (opcional)</p>
                            <input
                                className="input-field"
                                value={ideas}
                                onChange={(e) => setIdeas(e.target.value)}
                                placeholder="Ej: Hablar del error más común, dar una lista de pasos..."
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

                        <button onClick={handleGenerate} className="btn-primary" style={{ height: '64px', fontSize: '1.2rem', fontWeight: 800 }}>
                            Analizar y generar guiones →
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

            {step === 3 && (
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
                                    <button id={`copy-${i}`} onClick={() => copyToClipboard(`${s.gancho}\n\n${s.desarrollo?.join('\n')}\n\n${s.cta}`, i)} className="btn-secondary" style={{ height: '48px', fontWeight: 700 }}>
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
        </div>
    );
}

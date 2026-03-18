'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useProject } from '@/app/components/ProjectContext';
import {
    Megaphone, Loader2, Sparkles, ChevronRight, ChevronLeft,
    Copy, Bookmark, Calendar, CheckCircle2, Save, Trash2,
    Eye, EyeOff, Target, Users, Zap, Palette, Hash, ArrowRight
} from 'lucide-react';

const OFFER_TYPES = ['Producto digital', 'Servicio', 'Mentoría', 'Curso', 'App', 'eCommerce', 'SaaS', 'Otro'];
const OBJECTIVES = ['Leads', 'Ventas directas', 'Tráfico a contenido', 'Construir marca'];
const AD_STYLES = ['Historia personal', 'Testimonial / caso real', 'Directo a cámara, agresivo', 'Educativo que vende al final'];
const TONES = ['Cercano', 'Experto', 'Divertido', 'Serio', 'Rebelde'];
const QUANTITIES = [3, 5, 10, 15, 20];
const AD_PLATFORMS = ['Meta Ads (Reels/Stories)', 'YouTube Ads', 'TikTok Ads', 'LinkedIn Ads', 'X/Twitter Ads'];

export default function AdsPlanPage() {
    const supabase = createSupabaseClient();
    const { activeProject } = useProject();

    // Wizard state
    const [wizardStep, setWizardStep] = useState(1);
    const TOTAL_STEPS = 6;

    // Form fields
    const [offer, setOffer] = useState('');
    const [offerType, setOfferType] = useState('Producto digital');
    const [objective, setObjective] = useState('Ventas directas');
    const [audience, setAudience] = useState('');
    const [painPoint, setPainPoint] = useState('');
    const [differentiator, setDifferentiator] = useState('');
    const [promise, setPromise] = useState('');
    const [adStyles, setAdStyles] = useState([]);
    const [tone, setTone] = useState('Cercano');
    const [quantity, setQuantity] = useState(5);
    const [platforms, setPlatforms] = useState(['Meta Ads (Reels/Stories)']);

    // Presets
    const [presets, setPresets] = useState([]);
    const [selectedPresetId, setSelectedPresetId] = useState('');
    const [presetName, setPresetName] = useState('');
    const [savePreset, setSavePreset] = useState(false);
    const [loadingPresets, setLoadingPresets] = useState(false);

    // Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [ads, setAds] = useState([]);
    const [expandedAds, setExpandedAds] = useState(new Set());
    const [savedAdIds, setSavedAdIds] = useState(new Set());
    const [error, setError] = useState('');

    // AI field analysis
    const [analyzingField, setAnalyzingField] = useState(null);

    // Results view
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        loadPresets();
    }, [activeProject]);

    async function loadPresets() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setLoadingPresets(true);

        let query = supabase.from('ad_presets').select('*').eq('user_id', user.id);
        if (activeProject) query = query.eq('project_id', activeProject.id);

        const { data } = await query.order('created_at', { ascending: false });
        setPresets(data || []);
        setLoadingPresets(false);
    }

    function loadPreset(presetId) {
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;
        const c = preset.config || {};
        setOffer(c.offer || '');
        setOfferType(c.offerType || 'Producto digital');
        setObjective(c.objective || 'Ventas directas');
        setAudience(c.audience || '');
        setPainPoint(c.painPoint || '');
        setDifferentiator(c.differentiator || '');
        setPromise(c.promise || '');
        setAdStyles(c.adStyles || []);
        setTone(c.tone || 'Cercano');
        setQuantity(c.quantity || 5);
        setPlatforms(c.platforms || ['Meta Ads (Reels/Stories)']);
        setSelectedPresetId(presetId);
    }

    async function handleSavePreset() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const config = { offer, offerType, objective, audience, painPoint, differentiator, promise, adStyles, tone, quantity, platforms };
        const name = presetName.trim() || `Preset ${new Date().toLocaleDateString()}`;

        const { error } = await supabase.from('ad_presets').insert({
            user_id: user.id,
            project_id: activeProject?.id || null,
            name,
            config
        });

        if (!error) {
            setPresetName('');
            setSavePreset(false);
            loadPresets();
        }
    }

    async function handleDeletePreset(presetId) {
        if (!confirm('¿Eliminar este preajuste?')) return;
        await supabase.from('ad_presets').delete().eq('id', presetId);
        setSelectedPresetId('');
        loadPresets();
    }

    async function handleAnalyzeField(fieldName, fieldValue, setter) {
        if (!fieldValue.trim()) return;
        setAnalyzingField(fieldName);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/analyze-ads-field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fieldName,
                    fieldValue,
                    projectId: activeProject?.id,
                    userId: user.id
                })
            });

            const data = await res.json();
            if (data.improved) {
                setter(data.improved);
            }
        } catch (err) {
            console.error('Error analyzing field:', err);
        } finally {
            setAnalyzingField(null);
        }
    }

    async function handleGenerate() {
        setError('');
        setIsGenerating(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            const res = await fetch('/api/generate-ads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    projectId: activeProject?.id || null,
                    quantity,
                    offer,
                    offerType,
                    objective,
                    audience,
                    painPoint,
                    differentiator,
                    promise,
                    adStyles,
                    tone,
                    platforms
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'NO_CREDITS') {
                    setError('No tienes créditos suficientes. Compra más para continuar.');
                } else {
                    setError(data.error || 'Error al generar');
                }
                return;
            }

            setAds(data.ads || []);
            setShowResults(true);
            setExpandedAds(new Set());
            setSavedAdIds(new Set());

            // Save preset if requested
            if (savePreset) {
                await handleSavePreset();
            }

        } catch (err) {
            console.error('Generate error:', err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    }

    function toggleAdStyle(style) {
        setAdStyles(prev =>
            prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
        );
    }

    function togglePlatform(plat) {
        setPlatforms(prev =>
            prev.includes(plat) ? prev.filter(p => p !== plat) : [...prev, plat]
        );
    }

    function toggleExpand(adId) {
        const ns = new Set(expandedAds);
        if (ns.has(adId)) ns.delete(adId); else ns.add(adId);
        setExpandedAds(ns);
    }

    function copyAdToClipboard(ad) {
        const text = `📣 ${ad.copy_titulo}\n\n🎯 HOOK: ${ad.hook}\n\n📝 DESARROLLO:\n${ad.desarrollo.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n🔥 CIERRE: ${ad.cierre}\n\n👉 CTA: ${ad.cta}\n\n✏️ COPY: ${ad.copy_corto}\n\n${ad.hashtags.map(h => '#' + h).join(' ')}`;
        navigator.clipboard.writeText(text);
    }

    async function saveAdToLibrary(ad) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('library').insert({
                user_id: user.id,
                project_id: activeProject?.id || null,
                type: 'script',
                title: ad.copy_titulo || ad.idea,
                content: JSON.stringify(ad),
                metadata: { tipo: 'ad', plataforma: ad.plataforma, angulo: ad.angulo }
            });
            if (!error) setSavedAdIds(prev => new Set([...prev, ad.id]));
        } catch (err) {
            console.error('Save error:', err);
        }
    }

    async function saveAllToLibrary() {
        for (const ad of ads) {
            if (!savedAdIds.has(ad.id)) {
                await saveAdToLibrary(ad);
            }
        }
    }

    // --- Shared Styles ---
    const cardStyle = {
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '32px',
        transition: '0.3s'
    };

    const labelStyle = {
        fontSize: '0.7rem',
        fontWeight: 800,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '8px',
        display: 'block'
    };

    const inputStyle = {
        width: '100%',
        background: '#080808',
        border: '1px solid #1E1E1E',
        borderRadius: '12px',
        color: 'white',
        padding: '14px 16px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: '0.2s'
    };

    const chipStyle = (active) => ({
        padding: '8px 18px',
        borderRadius: '100px',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        border: active ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(126, 206, 202, 0.15)' : 'rgba(255,255,255,0.02)',
        color: active ? '#7ECECA' : 'rgba(255,255,255,0.5)',
        transition: '0.2s'
    });

    const analyzeButtonStyle = (isActive) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '0.7rem',
        fontWeight: 700,
        cursor: isActive ? 'default' : 'pointer',
        background: isActive ? 'transparent' : 'rgba(126, 206, 202, 0.08)',
        border: '1px solid rgba(126, 206, 202, 0.2)',
        color: '#7ECECA',
        transition: '0.2s',
        marginTop: '8px'
    });

    // --- Wizard Steps ---
    const renderStep = () => {
        switch (wizardStep) {
            case 1:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #7ECECA, #4db8b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Target size={24} color="#000" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>Oferta y Objetivo</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>¿Qué vendes y qué quieres lograr?</p>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>¿Qué quieres vender en estos anuncios?</label>
                            <textarea value={offer} onChange={e => setOffer(e.target.value)} placeholder="Ej: Mentoría 1:1 para lanzar tu e-commerce en 90 días..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                        </div>

                        <div>
                            <label style={labelStyle}>Tipo de oferta</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {OFFER_TYPES.map(t => (
                                    <button key={t} onClick={() => setOfferType(t)} style={chipStyle(offerType === t)}>{t}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Objetivo principal de estos anuncios</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {OBJECTIVES.map(o => (
                                    <button key={o} onClick={() => setObjective(o)} style={chipStyle(objective === o)}>{o}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={24} color="#fff" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>Público y Dolor</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>¿A quién te diriges y qué problema resuelves?</p>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>¿A quién van dirigidos estos anuncios?</label>
                            <textarea value={audience} onChange={e => setAudience(e.target.value)} placeholder="Ej: Emprendedores de 25–40 años que quieren lanzar su primer negocio online..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                            <button onClick={() => handleAnalyzeField('audience', audience, setAudience)} disabled={analyzingField === 'audience'} style={analyzeButtonStyle(analyzingField === 'audience')}>
                                {analyzingField === 'audience' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Analizar con IA
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>Principal problema / dolor de tu público</label>
                            <textarea value={painPoint} onChange={e => setPainPoint(e.target.value)} placeholder="Ej: No saben por dónde empezar, les da miedo invertir y perder dinero..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                            <button onClick={() => handleAnalyzeField('painPoint', painPoint, setPainPoint)} disabled={analyzingField === 'painPoint'} style={analyzeButtonStyle(analyzingField === 'painPoint')}>
                                {analyzingField === 'painPoint' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Analizar con IA
                            </button>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #A855F7, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={24} color="#fff" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>Diferenciador y Promesa</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>¿Por qué deberían elegirte a ti?</p>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>¿Qué hace diferente a tu producto/servicio?</label>
                            <textarea value={differentiator} onChange={e => setDifferentiator(e.target.value)} placeholder="Ej: Método probado con 200+ alumnos, acompañamiento 1:1 real, no solo vídeos grabados..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                            <button onClick={() => handleAnalyzeField('differentiator', differentiator, setDifferentiator)} disabled={analyzingField === 'differentiator'} style={analyzeButtonStyle(analyzingField === 'differentiator')}>
                                {analyzingField === 'differentiator' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Analizar con IA
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>¿Qué transformación o resultado prometes?</label>
                            <textarea value={promise} onChange={e => setPromise(e.target.value)} placeholder="Ej: En 90 días tendrás tu tienda online facturando, con un sistema automatizado de ventas..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                            <button onClick={() => handleAnalyzeField('promise', promise, setPromise)} disabled={analyzingField === 'promise'} style={analyzeButtonStyle(analyzingField === 'promise')}>
                                {analyzingField === 'promise' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Analizar con IA
                            </button>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Palette size={24} color="#000" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>Estilo del Anuncio</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>¿Cómo quieres que se sienta el anuncio?</p>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Estilos que prefieres (puedes elegir varios)</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {AD_STYLES.map(s => (
                                    <button key={s} onClick={() => toggleAdStyle(s)} style={chipStyle(adStyles.includes(s))}>{s}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Tono</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {TONES.map(t => (
                                    <button key={t} onClick={() => setTone(t)} style={chipStyle(tone === t)}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Hash size={24} color="#fff" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>Cantidad y Plataformas</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>¿Cuántos guiones y para dónde?</p>
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>¿Cuántos guiones de anuncios quieres?</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {QUANTITIES.map(q => (
                                    <button key={q} onClick={() => setQuantity(q)} style={{
                                        ...chipStyle(quantity === q),
                                        minWidth: '60px',
                                        textAlign: 'center',
                                        fontSize: '1.1rem',
                                        fontWeight: 900,
                                        padding: '14px 24px'
                                    }}>{q}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Plataformas (puedes elegir varias)</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {AD_PLATFORMS.map(p => (
                                    <button key={p} onClick={() => togglePlatform(p)} style={chipStyle(platforms.includes(p))}>{p}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 6:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #7ECECA, #4db8b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Megaphone size={24} color="#000" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', margin: 0 }}>Resumen y Generación</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Revisa y lanza la generación</p>
                            </div>
                        </div>

                        {/* Summary grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {[
                                { label: 'Oferta', value: offer || '—' },
                                { label: 'Tipo', value: offerType },
                                { label: 'Objetivo', value: objective },
                                { label: 'Público', value: audience || '—' },
                                { label: 'Dolor', value: painPoint || '—' },
                                { label: 'Diferenciador', value: differentiator || '—' },
                                { label: 'Promesa', value: promise || '—' },
                                { label: 'Estilos', value: adStyles.join(', ') || 'Mixto' },
                                { label: 'Tono', value: tone },
                                { label: 'Cantidad', value: `${quantity} guiones` },
                                { label: 'Plataformas', value: platforms.join(', ') },
                            ].map((item, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '14px 18px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(126,206,202,0.6)', textTransform: 'uppercase' }}>{item.label}</span>
                                    <p style={{ fontSize: '0.85rem', color: 'white', margin: '4px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Save preset option */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'rgba(126,206,202,0.04)', borderRadius: '12px', border: '1px solid rgba(126,206,202,0.1)' }}>
                            <input type="checkbox" checked={savePreset} onChange={e => setSavePreset(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#7ECECA' }} />
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Guardar como preajuste</span>
                                {savePreset && (
                                    <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nombre del preajuste..." style={{ ...inputStyle, marginTop: '8px', padding: '10px 14px', fontSize: '0.85rem' }} />
                                )}
                            </div>
                        </div>

                        {error && (
                            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                                {error}
                            </div>
                        )}
                    </div>
                );
        }
    };

    // --- Results View ---
    if (showResults && ads.length > 0) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                            <Megaphone size={28} color="#7ECECA" />
                            Plan de Ads — {ads.length} Guiones
                            <span style={{ fontSize: '0.65rem', padding: '3px 10px', background: 'rgba(126,206,202,0.1)', color: '#7ECECA', borderRadius: '6px', border: '1px solid rgba(126,206,202,0.2)' }}>v4.5.2</span>
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '4px' }}>Revisa, edita y guarda tus guiones de anuncios.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={saveAllToLibrary} className="btn-action-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #7ECECA', color: '#7ECECA', borderRadius: '12px', cursor: 'pointer', background: 'rgba(126,206,202,0.08)' }}>
                            <Bookmark size={16} /> Guardar Todos en Biblioteca
                        </button>
                        <button onClick={() => { setShowResults(false); setAds([]); setWizardStep(1); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: '12px', cursor: 'pointer', background: 'transparent' }}>
                            Nuevo Plan
                        </button>
                    </div>
                </div>

                {/* Ad Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {ads.map((ad, i) => {
                        const isExpanded = expandedAds.has(ad.id);
                        const isSaved = savedAdIds.has(ad.id);

                        const TIPO_COLORS = {
                            historia_personal: '#A855F7',
                            testimonial: '#F59E0B',
                            directo: '#EF4444',
                            educativo: '#10B981'
                        };

                        return (
                            <div key={ad.id} style={{
                                ...cardStyle,
                                padding: 0,
                                overflow: 'hidden',
                                border: isExpanded ? '1px solid rgba(126,206,202,0.2)' : '1px solid rgba(255,255,255,0.04)'
                            }}>
                                {/* Compact Header Row */}
                                <div onClick={() => toggleExpand(ad.id)} style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: '1rem', flexShrink: 0 }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 10px', borderRadius: '100px', background: `${TIPO_COLORS[ad.tipo_anuncio] || '#666'}20`, color: TIPO_COLORS[ad.tipo_anuncio] || '#aaa', border: `1px solid ${TIPO_COLORS[ad.tipo_anuncio] || '#666'}40`, textTransform: 'uppercase' }}>{ad.tipo_anuncio.replace('_', ' ')}</span>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', padding: '2px 10px', borderRadius: '100px' }}>{ad.plataforma}</span>
                                        </div>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.copy_titulo || ad.idea}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎣 {ad.hook}</p>
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.2)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>
                                        <ChevronRight size={20} />
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {/* Angle */}
                                            <div>
                                                <span style={{ ...labelStyle, color: 'rgba(126,206,202,0.6)' }}>ÁNGULO PERSUASIVO</span>
                                                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>{ad.angulo}</p>
                                            </div>

                                            {/* Hook */}
                                            <div>
                                                <span style={labelStyle}>HOOK / GANCHO</span>
                                                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.5 }}>{ad.hook}</p>
                                            </div>

                                            {/* Desarrollo */}
                                            <div>
                                                <span style={labelStyle}>DESARROLLO ({ad.desarrollo.length} PUNTOS)</span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {ad.desarrollo.map((d, idx) => (
                                                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.15)', minWidth: '20px', marginTop: '2px' }}>{String(idx + 1).padStart(2, '0')}</span>
                                                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{d}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Cierre */}
                                            <div>
                                                <span style={labelStyle}>CIERRE</span>
                                                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{ad.cierre}</p>
                                            </div>

                                            {/* CTA */}
                                            <div>
                                                <span style={labelStyle}>LLAMADA A LA ACCIÓN (CTA)</span>
                                                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#7ECECA', margin: 0 }}>{ad.cta}</p>
                                            </div>

                                            {/* Copy Section */}
                                            <div style={{ background: 'rgba(126,206,202,0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(126,206,202,0.1)' }}>
                                                <div>
                                                    <span style={{ ...labelStyle, color: 'rgba(126,206,202,0.6)' }}>COPY CORTO (PARA TEXTO DEL AD)</span>
                                                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', margin: '4px 0 16px' }}>{ad.copy_corto}</p>
                                                </div>
                                                <div>
                                                    <span style={{ ...labelStyle, color: 'rgba(126,206,202,0.6)' }}>TÍTULO / ENCABEZADO</span>
                                                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: '4px 0 16px' }}>{ad.copy_titulo}</p>
                                                </div>
                                                {ad.hashtags.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {ad.hashtags.map((h, hi) => (
                                                            <span key={hi} style={{ fontSize: '0.75rem', color: '#7ECECA', background: 'rgba(126,206,202,0.1)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(126,206,202,0.15)' }}>#{h}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => copyAdToClipboard(ad)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', borderRadius: '10px', cursor: 'pointer' }}>
                                                <Copy size={14} /> Copiar
                                            </button>
                                            <button onClick={() => saveAdToLibrary(ad)} disabled={isSaved} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700, background: isSaved ? 'rgba(126,206,202,0.1)' : 'rgba(255,255,255,0.03)', border: isSaved ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.08)', color: isSaved ? '#7ECECA' : 'rgba(255,255,255,0.7)', borderRadius: '10px', cursor: isSaved ? 'default' : 'pointer' }}>
                                                {isSaved ? <CheckCircle2 size={14} /> : <Bookmark size={14} />} {isSaved ? 'Guardado' : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- Wizard View ---
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
            {/* Page Title */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Megaphone size={32} color="#7ECECA" />
                    Plan Ads & Guiones
                    <span style={{ fontSize: '0.65rem', padding: '3px 10px', background: 'rgba(126,206,202,0.1)', color: '#7ECECA', borderRadius: '6px', border: '1px solid rgba(126,206,202,0.2)' }}>v4.5.2</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Crea campañas de anuncios completas con guiones, copys y títulos listos para usar.</p>
            </div>

            {/* Preset Selector */}
            {presets.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <Save size={18} color="rgba(255,255,255,0.3)" />
                    <select 
                        className="select-field"
                        value={selectedPresetId} 
                        onChange={e => { setSelectedPresetId(e.target.value); if (e.target.value) loadPreset(e.target.value); }} 
                        style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
                    >
                        <option value="">Cargar preajuste guardado...</option>
                        {presets.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {selectedPresetId && (
                        <button onClick={() => handleDeletePreset(selectedPresetId)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '8px' }}>
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
                {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 900,
                            background: wizardStep > idx + 1 ? '#7ECECA' : wizardStep === idx + 1 ? 'rgba(126,206,202,0.2)' : 'rgba(255,255,255,0.03)',
                            color: wizardStep > idx + 1 ? '#000' : wizardStep === idx + 1 ? '#7ECECA' : 'rgba(255,255,255,0.2)',
                            border: wizardStep === idx + 1 ? '2px solid #7ECECA' : '1px solid transparent',
                            transition: '0.3s'
                        }}>
                            {wizardStep > idx + 1 ? '✓' : idx + 1}
                        </div>
                        {idx < TOTAL_STEPS - 1 && (
                            <div style={{ flex: 1, height: '2px', background: wizardStep > idx + 1 ? '#7ECECA' : 'rgba(255,255,255,0.06)', transition: '0.3s' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div style={cardStyle}>
                {renderStep()}
            </div>

            {/* Nav Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button onClick={() => setWizardStep(s => Math.max(1, s - 1))} disabled={wizardStep === 1} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: wizardStep === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: wizardStep === 1 ? 'default' : 'pointer' }}>
                    <ChevronLeft size={18} /> Anterior
                </button>

                {wizardStep < TOTAL_STEPS ? (
                    <button onClick={() => setWizardStep(s => Math.min(TOTAL_STEPS, s + 1))} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, background: 'linear-gradient(135deg, #7ECECA, #4db8b2)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(126,206,202,0.3)' }}>
                        Siguiente <ChevronRight size={18} />
                    </button>
                ) : (
                    <button onClick={handleGenerate} disabled={isGenerating || !offer.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 900, background: isGenerating ? 'rgba(126,206,202,0.2)' : 'linear-gradient(135deg, #7ECECA, #4db8b2)', color: isGenerating ? '#7ECECA' : '#000', border: 'none', cursor: isGenerating ? 'default' : 'pointer', boxShadow: isGenerating ? 'none' : '0 4px 24px rgba(126,206,202,0.4)', transition: '0.3s' }}>
                        {isGenerating ? <><Loader2 size={20} className="animate-spin" /> Generando {quantity} guiones...</> : <><Sparkles size={20} /> Generar Plan de Ads ({quantity} guiones)</>}
                    </button>
                )}
            </div>
        </div>
    );
}

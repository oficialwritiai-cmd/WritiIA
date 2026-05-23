'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Sparkles, Save, Copy, CheckCircle2, Loader2, Send, Coins, Zap } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';

const PLATFORM_CHIPS = [
    { value: 'Instagram Reels', label: 'Reels', emoji: '📱' },
    { value: 'TikTok', label: 'TikTok', emoji: '🎵' },
    { value: 'YouTube', label: 'YouTube', emoji: '▶️' },
    { value: 'LinkedIn', label: 'LinkedIn', emoji: '💼' },
    { value: 'X (Twitter)', label: 'X', emoji: '✕' },
    { value: 'Instagram', label: 'Instagram', emoji: '📸' },
];

const GOAL_CHIPS = [
    { value: 'Ventas (Conversión)', label: 'Vender', emoji: '💰' },
    { value: 'Seguidores', label: 'Seguidores', emoji: '👥' },
    { value: 'Autoridad/Educación', label: 'Autoridad', emoji: '🏆' },
    { value: 'Educar', label: 'Educar', emoji: '📚' },
    { value: 'Viralidad', label: 'Viral', emoji: '🔥' },
];

const SECTION_CARDS = [
    { id: 'titulos', emoji: '🏷️', label: 'Títulos' },
    { id: 'ganchos', emoji: '🎣', label: 'Ganchos' },
    { id: 'descripciones', emoji: '📝', label: 'Descripciones' },
    { id: 'hashtags', emoji: '#️⃣', label: 'Hashtags' },
];

const PLACEHOLDERS = [
    'Ej: Cómo generé 61 guiones en un mes con IA...',
    'Ej: La app que uso para crear contenido viral...',
    'Ej: Por qué dejé ChatGPT para esto...',
    'Ej: Probé esta IA durante 30 días y esto pasó...',
    'Ej: De 0 a 10k seguidores sin mostrar mi cara...',
];

export default function CopysPage() {
    const [baseText, setBaseText] = useState('');
    const [platform, setPlatform] = useState('Instagram Reels');
    const [goal, setGoal] = useState('Ventas (Conversión)');
    const [selectedSections, setSelectedSections] = useState({
        titulos: true,
        ganchos: true,
        descripciones: true,
        hashtags: false,
        youtubeTags: false,
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [credits, setCredits] = useState(null);
    const [refiningTarget, setRefiningTarget] = useState(null);
    const [refineInstructions, setRefineInstructions] = useState({});
    const [globalRefineInstructions, setGlobalRefineInstructions] = useState({});
    const [isBulkRefining, setIsBulkRefining] = useState(null);
    const [toast, setToast] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const [focused, setFocused] = useState(false);

    const supabase = createSupabaseClient();
    const router = useRouter();
    const { activeProject } = useProject();

    useEffect(() => {
        const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data: profile } = await supabase.from('users_profiles').select('credits_balance').eq('id', user.id).single();
                if (profile && profile.credits_balance !== null && profile.credits_balance !== undefined) {
                    setCredits(profile.credits_balance);
                } else {
                    const { data: legacy } = await supabase.from('ai_credits').select('*').eq('user_id', user.id).single();
                    if (legacy) setCredits(legacy.total_credits - legacy.used_credits);
                    else setCredits(0);
                }
            }
        };
        init();
    }, [supabase]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleGenerate = async () => {
        if (!baseText.trim()) {
            showToast('Por favor ingresa un guion, idea o tema.', 'error');
            return;
        }
        setIsGenerating(true);
        setResults(null);
        setApiError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch('/api/generate-copys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text: baseText, platform, goal, userId, projectId: activeProject?.id, sections: selectedSections })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'NO_CREDITS') { router.push('/dashboard/credits'); throw new Error(data.error); }
                throw new Error(data.error || 'Error al generar copys');
            }
            if (data.result) {
                setResults(data.result);
                if (credits !== null) setCredits(prev => Math.max(0, prev - 1));
                showToast('¡Copys generados con éxito!');
            } else {
                throw new Error('La IA devolvió un resultado inesperado.');
            }
        } catch (err) {
            setApiError(err.message || 'Error de conexión.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefine = async (type, index) => {
        const instruction = refineInstructions[`${type}-${index}`] || '';
        const currentText = type === 'hashtags' ? results[type][index].join(' ') : results[type][index];
        if (!currentText) return;
        setRefiningTarget({ type, index });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    text: currentText,
                    type: type === 'descripciones' ? 'desarrollo' : (type === 'titles' ? 'titulo' : 'gancho'),
                    instruction,
                    context: `Generando variaciones para ${platform} con objetivo de ${goal}. Texto base original: ${baseText.substring(0, 100)}...`,
                    userId, projectId: activeProject?.id
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al refinar');
            setResults(prev => {
                const newRes = { ...prev };
                if (type === 'hashtags_groups') {
                    newRes[type][index] = data.refinedText.split(' ').filter(h => h.startsWith('#'));
                } else {
                    newRes[type][index] = data.refinedText;
                }
                return newRes;
            });
            setRefineInstructions(prev => ({ ...prev, [`${type}-${index}`]: '' }));
            showToast('Texto mejorado', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setRefiningTarget(null);
        }
    };

    const fetchCredits = async () => {
        if (!userId) return;
        try {
            const { data: profile } = await supabase.from('users_profiles').select('credits_balance').eq('id', userId).single();
            if (profile && profile.credits_balance !== null) setCredits(profile.credits_balance);
        } catch (e) { console.error('Error fetching credits:', e); }
    };

    const handleBulkRefine = async (type) => {
        const instruction = globalRefineInstructions[type];
        if (!instruction?.trim() || isBulkRefining || !results[type]) return;
        setIsBulkRefining(type);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const currentTexts = results[type];
            const inputTexts = type === 'hashtags_groups' ? currentTexts.map(g => Array.isArray(g) ? g.join(' ') : g) : currentTexts;
            const response = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ texts: inputTexts, type, context: goal, instruction, userId, projectId: activeProject?.id })
            });
            const res = await response.json();
            if (res.error) throw new Error(res.error);
            let refinedList = res.refinedText;
            if (typeof refinedList === 'string' && refinedList.includes('[')) {
                try { refinedList = JSON.parse(refinedList); } catch (e) { }
            }
            setResults(prev => {
                const newRes = { ...prev };
                newRes[type] = Array.isArray(refinedList) ? refinedList : [refinedList];
                return newRes;
            });
            setGlobalRefineInstructions(prev => ({ ...prev, [type]: '' }));
            showToast('Grupo actualizado correctamente');
            fetchCredits();
        } catch (err) {
            showToast(err.message || 'Error en refinamiento grupal', 'error');
        } finally {
            setIsBulkRefining(null);
        }
    };

    const handleUpdateResultValue = (type, index, value) => {
        setResults(prev => {
            const newRes = { ...prev };
            if (type === 'hashtags_groups') {
                newRes[type][index] = value.split(' ').filter(h => h.trim() !== '');
            } else {
                newRes[type][index] = value;
            }
            return newRes;
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles');
    };

    const copyAll = () => {
        if (!results) return;
        let final = '';
        if (results.titles?.length) final += `--- TÍTULOS ---\n${results.titles.join('\n')}\n\n`;
        if (results.hooks?.length) final += `--- GANCHOS ---\n${results.hooks.join('\n')}\n\n`;
        if (results.descriptions?.length) final += `--- DESCRIPCIONES ---\n${results.descriptions.join('\n\n')}\n\n`;
        if (results.hashtags_groups?.length) final += `--- HASHTAGS ---\n${results.hashtags_groups.map(s => Array.isArray(s) ? s.join(' ') : s).join('\n\n')}\n\n`;
        if (results.youtube_tags?.length) final += `--- ETIQUETAS YOUTUBE ---\n${results.youtube_tags.join(', ')}`;
        copyToClipboard(final.trim());
    };

    const exportToTxt = () => {
        if (!results) return;
        let final = '';
        if (results.titles?.length) final += `--- TÍTULOS ---\n${results.titles.join('\n')}\n\n`;
        if (results.hooks?.length) final += `--- GANCHOS ---\n${results.hooks.join('\n')}\n\n`;
        if (results.descriptions?.length) final += `--- DESCRIPCIONES ---\n${results.descriptions.join('\n\n')}\n\n`;
        if (results.hashtags_groups?.length) final += `--- HASHTAGS ---\n${results.hashtags_groups.map(s => Array.isArray(s) ? s.join(' ') : s).join('\n\n')}`;
        const blob = new Blob([final], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'copys-generados.txt';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const saveToLibraryAsCopy = async () => {
        if (!results || isSaving) return;
        setIsSaving(true);
        try {
            const firstTitle = results.titles?.[0] || 'Copys Generados';
            const firstHook = results.hooks?.[0] || '';
            const firstCopy = results.descriptions?.[0] || '';
            const firstHashtags = results.hashtags_groups?.[0] || [];
            const copyPostObj = { titulo: firstTitle, descripcion_larga: firstCopy, hashtags: firstHashtags };
            const fullTextPreview = `IDEA ORIGINAL:\n${baseText}\n\nTÍTULO: ${firstTitle}\n\nGANCHO:\n${firstHook}\n\nCOPY:\n${firstCopy}`;
            const { error } = await supabase.from('library').insert({
                user_id: userId, project_id: activeProject?.id, type: 'idea', platform, goal,
                titulo: `Copys para: ${firstTitle.substring(0, 30)}...`,
                script_full_text: fullTextPreview,
                content: { descripcion: baseText, titulos_sugeridos: results.titles || [firstTitle], ganchos_sugeridos: results.hooks || [firstHook], descripciones_sugeridas: results.descriptions || [firstCopy], hashtags_sugeridos: results.hashtags_groups || [firstHashtags], youtube_tags: results.youtube_tags || [], variaciones_extra: results, hook: firstHook, copy_post: copyPostObj, titulo_angulo: firstTitle },
                tags: ['copys', platform.toLowerCase()], status: 'borrador'
            });
            if (error) throw error;
            showToast('Guardado en Biblioteca correctamente');
        } catch (err) {
            showToast('Error al guardar en biblioteca', 'error');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const renderBlock = (type, title, items, isTextarea = false) => {
        if (!items || items.length === 0) return null;
        return (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={14} color="#a78bfa" />
                    </div>
                    {title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {items.map((item, index) => {
                        const isRefining = refiningTarget?.type === type && refiningTarget?.index === index;
                        const valueStr = type === 'hashtags_groups' && Array.isArray(item) ? item.join(' ') : (Array.isArray(item) ? item.join(', ') : item);
                        return (
                            <div key={index} style={{ background: '#0D0D14', borderRadius: '14px', border: '1px solid rgba(124,58,237,0.15)', overflow: 'hidden', transition: 'border-color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)'}
                            >
                                <div style={{ padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        {isTextarea ? (
                                            <textarea value={valueStr} onChange={e => handleUpdateResultValue(type, index, e.target.value)}
                                                style={{ width: '100%', minHeight: '80px', background: 'transparent', border: 'none', color: '#ddd', fontSize: '0.95rem', lineHeight: '1.65', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                                        ) : (
                                            <input value={valueStr} onChange={e => handleUpdateResultValue(type, index, e.target.value)}
                                                style={{ width: '100%', background: 'transparent', border: 'none', color: '#eee', fontSize: '0.95rem', outline: 'none', fontWeight: 500 }} />
                                        )}
                                    </div>
                                    <button onClick={() => copyToClipboard(valueStr)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888'; }}>
                                        <Copy size={14} />
                                    </button>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" placeholder="¿Quieres ajustarlo? Ej: hazlo más directo, añade emoji..."
                                        value={refineInstructions[`${type}-${index}`] || ''}
                                        onChange={e => setRefineInstructions(prev => ({ ...prev, [`${type}-${index}`]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleRefine(type, index)}
                                        style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', transition: 'border-color 0.15s' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
                                    <button onClick={() => handleRefine(type, index)} disabled={isRefining || !refineInstructions[`${type}-${index}`]?.trim()}
                                        style={{ padding: '8px 14px', borderRadius: '8px', background: isRefining ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.8)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: !refineInstructions[`${type}-${index}`]?.trim() && !isRefining ? 0.4 : 1, transition: 'all 0.15s' }}>
                                        {isRefining ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={13} />}
                                        Pedir cambio
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {items.length > 1 && (
                    <div style={{ background: 'rgba(124,58,237,0.05)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(124,58,237,0.12)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={13} /> Refinar todo el grupo</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="text" placeholder={`Ej: Mejora todos para que sean más curiosos...`}
                                value={globalRefineInstructions[type] || ''}
                                onChange={e => setGlobalRefineInstructions(prev => ({ ...prev, [type]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleBulkRefine(type)}
                                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '0.85rem', outline: 'none' }} />
                            <button onClick={() => handleBulkRefine(type)} disabled={isBulkRefining === type || !globalRefineInstructions[type]?.trim()}
                                style={{ padding: '10px 18px', borderRadius: '8px', background: isBulkRefining === type ? 'rgba(255,255,255,0.05)' : '#7c3aed', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.15s' }}>
                                {isBulkRefining === type ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                                Cambiar todos
                            </button>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#666', fontStyle: 'italic' }}>* Modifica los {items.length} elementos a la vez. Consume 1 crédito.</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '80px' }}>

            {/* Header */}
            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em' }}>
                    Títulos y Copys IA
                </h1>
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    Genera títulos virales y copys optimizados para cada plataforma con IA.
                </p>
            </div>

            {/* Input Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Textarea */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>¿Sobre qué quieres crear?</label>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            style={{
                                width: '100%', minHeight: '130px', background: 'rgba(0,0,0,0.35)',
                                border: `1px solid ${focused ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.07)'}`,
                                borderRadius: '14px', padding: '16px', color: '#fff',
                                fontSize: '0.97rem', lineHeight: 1.65, resize: 'vertical',
                                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
                            placeholder={PLACEHOLDERS[placeholderIdx]}
                            value={baseText}
                            onChange={e => setBaseText(e.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            maxLength={400}
                        />
                        <span style={{ position: 'absolute', bottom: '10px', right: '14px', fontSize: '0.72rem', color: baseText.length > 350 ? '#f87171' : 'rgba(255,255,255,0.25)', fontWeight: 600, pointerEvents: 'none' }}>
                            {baseText.length}/400
                        </span>
                    </div>
                </div>

                {/* Platform chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plataforma</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {PLATFORM_CHIPS.map(chip => {
                            const active = platform === chip.value;
                            return (
                                <button key={chip.value} onClick={() => {
                                    setPlatform(chip.value);
                                    if (chip.value === 'YouTube') setSelectedSections(prev => ({ ...prev, youtubeTags: true }));
                                    else setSelectedSections(prev => ({ ...prev, youtubeTags: false }));
                                }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '100px', border: `1px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)', color: active ? '#c4b5fd' : 'rgba(255,255,255,0.5)', fontSize: '0.84rem', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                                    <span>{chip.emoji}</span> {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Goal chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Objetivo</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {GOAL_CHIPS.map(chip => {
                            const active = goal === chip.value;
                            return (
                                <button key={chip.value} onClick={() => setGoal(chip.value)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '100px', border: `1px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)', color: active ? '#c4b5fd' : 'rgba(255,255,255,0.5)', fontSize: '0.84rem', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                                    <span>{chip.emoji}</span> {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section toggle cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Qué deseas generar?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        {SECTION_CARDS.map(card => {
                            const active = selectedSections[card.id];
                            return (
                                <button key={card.id} onClick={() => setSelectedSections(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 12px', borderRadius: '14px', border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}`, background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{card.emoji}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: active ? '#c4b5fd' : 'rgba(255,255,255,0.4)' }}>{card.label}</span>
                                    {active && (
                                        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {platform === 'YouTube' && (
                        <button onClick={() => setSelectedSections(prev => ({ ...prev, youtubeTags: !prev.youtubeTags }))}
                            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${selectedSections.youtubeTags ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`, background: selectedSections.youtubeTags ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)', color: selectedSections.youtubeTags ? '#c4b5fd' : 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                            ▶️ YouTube Tags SEO
                        </button>
                    )}
                </div>

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !baseText.trim() || Object.values(selectedSections).every(v => !v)}
                    style={{
                        width: '100%', padding: '18px', borderRadius: '14px', border: 'none',
                        background: isGenerating || !baseText.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                        color: isGenerating || !baseText.trim() ? 'rgba(255,255,255,0.3)' : '#fff',
                        fontSize: '1rem', fontWeight: 800, cursor: isGenerating || !baseText.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        transition: 'all 0.2s', boxShadow: !isGenerating && baseText.trim() ? '0 8px 32px rgba(124,58,237,0.35)' : 'none',
                        animation: !isGenerating && baseText.trim() ? 'btnPulse 2.5s ease-in-out infinite' : 'none',
                    }}
                    onMouseEnter={e => { if (!isGenerating && baseText.trim()) e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                    {isGenerating ? <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Zap size={20} strokeWidth={2.5} />}
                    {isGenerating ? 'Generando con IA...' : '⚡ Generar ahora'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '-8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Coins size={13} /> 1 crédito por generación
                    </span>
                    {credits !== null && (
                        <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '100px', fontWeight: 800, fontSize: '0.78rem', color: credits > 0 ? '#a78bfa' : '#f87171', border: '1px solid rgba(255,255,255,0.06)' }}>
                            Saldo: {credits}
                        </span>
                    )}
                </div>

                {apiError && (
                    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.88rem', margin: '0 0 10px' }}>{apiError}</p>
                        <button onClick={handleGenerate} style={{ padding: '6px 18px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Reintentar</button>
                    </div>
                )}
            </div>

            {/* Results */}
            {results && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

                    {/* Sticky action bar */}
                    <div style={{ position: 'sticky', top: '24px', zIndex: 100, background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', padding: '10px 20px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'pulse 2s ease-in-out infinite' }} />
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.06em', color: '#fff' }}>RESULTADOS IA</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={copyAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                                <Copy size={13} /> Copiar todo
                            </button>
                            <button onClick={saveToLibraryAsCopy} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '100px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                                {isSaving ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={13} />} Guardar
                            </button>
                        </div>
                    </div>

                    {/* Titles section — custom cards */}
                    {results.titles?.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <span style={{ fontSize: '1.1rem' }}>🏷️</span> Títulos Virales
                            </h3>
                            {results.titles.map((title, index) => {
                                const isRefining = refiningTarget?.type === 'titles' && refiningTarget?.index === index;
                                return (
                                    <div key={index} style={{ background: '#0D0D14', borderRadius: '14px', border: '1px solid rgba(124,58,237,0.15)', overflow: 'hidden', transition: 'border-color 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)'}>
                                        <div style={{ padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.15)', padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>#{index + 1}</span>
                                            <input value={title} onChange={e => handleUpdateResultValue('titles', index, e.target.value)}
                                                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 700, outline: 'none', letterSpacing: '-0.01em' }} />
                                            <button onClick={() => copyToClipboard(title)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888'; }}>
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>✨ Ajustar:</span>
                                            <input type="text" placeholder="Ej: hazlo más curioso, añade número..."
                                                value={refineInstructions[`titles-${index}`] || ''}
                                                onChange={e => setRefineInstructions(prev => ({ ...prev, [`titles-${index}`]: e.target.value }))}
                                                onKeyDown={e => e.key === 'Enter' && handleRefine('titles', index)}
                                                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '7px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', transition: 'border-color 0.15s' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'} />
                                            <button onClick={() => handleRefine('titles', index)} disabled={isRefining || !refineInstructions[`titles-${index}`]?.trim()}
                                                style={{ padding: '7px 14px', borderRadius: '8px', background: isRefining ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.8)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: !refineInstructions[`titles-${index}`]?.trim() && !isRefining ? 0.4 : 1, transition: 'all 0.15s' }}>
                                                {isRefining ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={13} />}
                                                Pedir cambio →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {renderBlock('hooks', '🎣 Ganchos de 3 Segundos', results.hooks, true)}
                    {renderBlock('descriptions', '📝 Copys y Descripciones', results.descriptions, true)}
                    {renderBlock('hashtags_groups', '#️⃣ Hashtags Sugeridos', results.hashtags_groups, false)}
                    {results.youtube_tags?.length > 0 && renderBlock('youtube_tags', '▶️ SEO YouTube (Etiquetas)', [results.youtube_tags.join(', ')], false)}
                </div>
            )}

            {toast && (
                <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#ef4444' : '#7c3aed', color: '#fff', padding: '12px 24px', borderRadius: '100px', fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999, animation: 'fadeInUp 0.3s ease-out', whiteSpace: 'nowrap' }}>
                    {toast.message}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes btnPulse { 0%, 100% { box-shadow: 0 8px 32px rgba(124,58,237,0.35); } 50% { box-shadow: 0 8px 40px rgba(124,58,237,0.55); } }
                @media (max-width: 600px) {
                    .section-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </div>
    );
}

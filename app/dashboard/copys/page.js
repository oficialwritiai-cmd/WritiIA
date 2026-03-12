'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Sparkles, Save, Copy, CheckCircle2, Loader2, Send, Download, Coins } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X (Twitter)', 'Facebook'];
const GOALS = ['Engagement (Comentarios/Likes)', 'Ventas (Conversión)', 'Atracción de Leads', 'Autoridad/Educación', 'Viralidad', 'Storytelling'];

export default function CopysPage() {
    const [baseText, setBaseText] = useState('');
    const [platform, setPlatform] = useState('Instagram');
    const [goal, setGoal] = useState('Engagement (Comentarios/Likes)');
    const [selectedSections, setSelectedSections] = useState({
        titulos: true,
        ganchos: true,
        descripciones: true,
        hashtags: true,
        youtubeTags: platform === 'YouTube'
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState(null); // { titulos, ganchos, descripciones, hashtags }
    const [apiError, setApiError] = useState(null);
    const [credits, setCredits] = useState(null);
    
    // States for refining
    const [refiningTarget, setRefiningTarget] = useState(null); // { type, index }
    const [refineInstructions, setRefineInstructions] = useState({});
    
    const [toast, setToast] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const supabase = createSupabaseClient();
    const router = useRouter();
    const { activeProject } = useProject();

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Fetch credits logic
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
            const res = await fetch('/api/generate-copys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: baseText,
                    platform,
                    goal,
                    userId,
                    projectId: activeProject?.id,
                    sections: selectedSections
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                if (data.code === 'NO_CREDITS') {
                    router.push('/dashboard/credits');
                    throw new Error(data.error);
                }
                throw new Error(data.error || 'Error al generar copys');
            }

            if (data.result) {
                console.log('[Copys IA] Generation Success:', data.result);
                setResults(data.result);
                if (credits !== null) setCredits(prev => Math.max(0, prev - 1));
                showToast('¡Copys generados con éxito!');
            } else {
                console.error('[Copys IA] Empty result object:', data);
                throw new Error('La IA devolvió un resultado inesperado.');
            }
        } catch (err) {
            console.error('[Copys IA] Generation Error:', err);
            setApiError(err.message || 'Error de conexión. Fallo en la IA.');
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
            // Reusing existing refine API, mapping concepts
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: currentText,
                    type: type === 'descripciones' ? 'desarrollo' : (type === 'titulos' ? 'titulo' : 'gancho'), 
                    instruction,
                    context: `Generando variaciones para ${platform} con objetivo de ${goal}. Texto base original: ${baseText.substring(0, 100)}...`,
                    userId,
                    projectId: activeProject?.id
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al refinar');

            // Update the results with the new text
            setResults(prev => {
                const newRes = { ...prev };
                if (type === 'hashtags_groups') {
                    // Primitive split by space for hashtags if AI returned string
                    newRes[type][index] = data.refinedText.split(' ').filter(h => h.startsWith('#'));
                } else {
                    newRes[type][index] = data.refinedText;
                }
                return newRes;
            });
            
            // Clear instruction input
            setRefineInstructions(prev => ({...prev, [`${type}-${index}`]: ''}));
            showToast('Texto mejorado', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setRefiningTarget(null);
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
        let final = "";
        if (results.titles?.length) final += `--- TÍTULOS ---\n${results.titles.join('\n')}\n\n`;
        if (results.hooks?.length) final += `--- GANCHOS ---\n${results.hooks.join('\n')}\n\n`;
        if (results.descriptions?.length) final += `--- DESCRIPCIONES ---\n${results.descriptions.join('\n\n')}\n\n`;
        if (results.hashtags_groups?.length) final += `--- HASHTAGS ---\n${results.hashtags_groups.map(set => (Array.isArray(set) ? set.join(' ') : set)).join('\n\n')}\n\n`;
        if (results.youtube_tags?.length) final += `--- ETIQUETAS YOUTUBE ---\n${results.youtube_tags.join(', ')}`;
        
        copyToClipboard(final.trim());
    };

    const exportToTxt = () => {
        if (!results) return;
        let final = "";
        if (results.titles?.length) final += `--- TÍTULOS ---\n${results.titles.join('\n')}\n\n`;
        if (results.hooks?.length) final += `--- GANCHOS ---\n${results.hooks.join('\n')}\n\n`;
        if (results.descriptions?.length) final += `--- DESCRIPCIONES ---\n${results.descriptions.join('\n\n')}\n\n`;
        if (results.hashtags_groups?.length) final += `--- HASHTAGS ---\n${results.hashtags_groups.map(set => (Array.isArray(set) ? set.join(' ') : set)).join('\n\n')}`;
        
        const blob = new Blob([final], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'copys-generados.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const saveToLibraryAsCopy = async () => {
        if (!results || isSaving) return;
        setIsSaving(true);
        
        try {
            // Build a COMPACT structured object for the library (taking only the 1st elements)
            const firstTitle = results.titles?.[0] || 'Copys Generados';
            const firstHook = results.hooks?.[0] || '';
            const firstCopy = results.descriptions?.[0] || '';
            const firstHashtags = results.hashtags_groups?.[0] || [];
            
            const copyPostObj = {
                titulo: firstTitle,
                descripcion_larga: firstCopy,
                hashtags: firstHashtags
            };

            const fullTextPreview = `IDEA ORIGINAL:\n${baseText}\n\nTÍTULO: ${firstTitle}\n\nGANCHO:\n${firstHook}\n\nCOPY:\n${firstCopy}`;

            const { error } = await supabase.from('library').insert({
                user_id: userId,
                project_id: activeProject?.id,
                type: 'idea',
                platform: platform,
                goal: goal,
                titulo: `Copys para: ${firstTitle.substring(0, 30)}...`,
                script_full_text: fullTextPreview,
                content: {
                    descripcion: baseText,
                    titulos_sugeridos: results.titles || [firstTitle], 
                    ganchos_sugeridos: results.hooks || [firstHook], 
                    descripciones_sugeridas: results.descriptions || [firstCopy], 
                    hashtags_sugeridos: results.hashtags_groups || [firstHashtags],
                    youtube_tags: results.youtube_tags || [],
                    variaciones_extra: results, 
                    hook: firstHook,
                    copy_post: copyPostObj,
                    titulo_angulo: firstTitle
                },
                tags: ['copys', platform.toLowerCase()],
                status: 'borrador'
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
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(157, 0, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={18} color="#9D00FF" />
                    </div>
                    {title}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {items.map((item, index) => {
                        const isRefining = refiningTarget?.type === type && refiningTarget?.index === index;
                        const valueStr = type === 'hashtags_groups' && Array.isArray(item) ? item.join(' ') : (Array.isArray(item) ? item.join(', ') : item);

                        return (
                            <div key={index} style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                background: 'rgba(255,255,255,0.01)', 
                                borderRadius: '20px', 
                                border: '1px solid aria(255,255,255,0.05)',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{ padding: '20px', position: 'relative' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            {isTextarea ? (
                                                <textarea 
                                                    value={valueStr}
                                                    onChange={(e) => handleUpdateResultValue(type, index, e.target.value)}
                                                    style={{ width: '100%', minHeight: '100px', background: 'transparent', border: 'none', color: '#eee', fontSize: '1rem', lineHeight: '1.6', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                                                />
                                            ) : (
                                                <input 
                                                    value={valueStr}
                                                    onChange={(e) => handleUpdateResultValue(type, index, e.target.value)}
                                                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#eee', fontSize: '1.05rem', outline: 'none', fontWeight: type === 'titles' ? 800 : 500 }}
                                                />
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(valueStr)} 
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '36px', height: '36px', borderRadius: '10px', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} 
                                            className="hover-bright"
                                            title="Copiar"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Mini Chat Refinement v2.9.0 */}
                                <div style={{ 
                                    background: 'rgba(126, 206, 202, 0.03)', 
                                    padding: '12px 20px', 
                                    borderTop: '1px solid rgba(126, 206, 202, 0.1)',
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Sparkles size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7ECECA', opacity: 0.6 }} />
                                        <input 
                                            type="text"
                                            placeholder="¿Quieres ajustar algo? (ej: hazlo más divertido, añade un emoji...)"
                                            value={refineInstructions[`${type}-${index}`] || ''}
                                            onChange={e => setRefineInstructions(prev => ({...prev, [`${type}-${index}`]: e.target.value}))}
                                            onKeyDown={e => e.key === 'Enter' && handleRefine(type, index)}
                                            style={{ 
                                                width: '100%', 
                                                background: 'rgba(0,0,0,0.2)', 
                                                border: '1px solid rgba(255,255,255,0.05)', 
                                                borderRadius: '12px', 
                                                padding: '10px 12px 10px 36px', 
                                                color: 'white', 
                                                fontSize: '0.85rem', 
                                                outline: 'none',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(126, 206, 202, 0.4)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleRefine(type, index)} 
                                        disabled={isRefining || !refineInstructions[`${type}-${index}`]?.trim()}
                                        style={{ 
                                            padding: '10px 16px',
                                            borderRadius: '12px',
                                            background: isRefining ? 'rgba(255,255,255,0.05)' : 'var(--accent-gradient)',
                                            color: 'black',
                                            border: 'none',
                                            fontWeight: 800,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s ease',
                                            opacity: (!refineInstructions[`${type}-${index}`]?.trim() && !isRefining) ? 0.5 : 1
                                        }}
                                    >
                                        {isRefining ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                        <span className="hide-mobile">{isRefining ? 'Mejorando...' : 'Pedir Cambio'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bulk Refine Chat v2.9.5 */}
                {items.length > 1 && (
                    <div style={{ 
                        marginTop: '12px',
                        background: 'rgba(157, 0, 255, 0.05)', 
                        padding: '24px', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(157, 0, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B066FF', fontSize: '0.85rem', fontWeight: 700 }}>
                            <Sparkles size={16} /> Refinar Todo el Grupo de {title}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input 
                                type="text"
                                placeholder={`Ej: Mejora todos los ${type} para que sean más curiosos...`}
                                value={globalRefineInstructions[type] || ''}
                                onChange={e => setGlobalRefineInstructions(prev => ({...prev, [type]: e.target.value}))}
                                onKeyDown={e => e.key === 'Enter' && handleBulkRefine(type)}
                                style={{ 
                                    flex: 1,
                                    background: 'rgba(0,0,0,0.3)', 
                                    border: '1px solid rgba(255,255,255,0.05)', 
                                    borderRadius: '12px', 
                                    padding: '12px 16px', 
                                    color: 'white', 
                                    fontSize: '0.9rem', 
                                    outline: 'none'
                                }}
                            />
                            <button 
                                onClick={() => handleBulkRefine(type)} 
                                disabled={isBulkRefining === type || !globalRefineInstructions[type]?.trim()}
                                style={{ 
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    background: isBulkRefining === type ? 'rgba(255,255,255,0.05)' : '#9D00FF',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: '0.2s'
                                }}
                            >
                                {isBulkRefining === type ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                <span>{isBulkRefining === type ? 'Mejorando...' : 'Cambiar Todos'}</span>
                            </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic' }}>
                            * Esto modificará los {items.length} elementos de esta sección a la vez. Consume 1 crédito.
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '80px' }}>
            
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
                    Títulos y Copys IA <span style={{ fontSize: '0.8rem', verticalAlign: 'middle', padding: '4px 8px', borderRadius: '8px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', marginLeft: '10px', border: '1px solid rgba(126, 206, 202, 0.2)' }}>v2.9.5</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
                    Genera múltiples variaciones y ajústalas a tu gusto con el nuevo **Chat de Refinamiento** integrado en cada resultado.
                </p>
            </div>

            {/* Input Section */}
            <div className="premium-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Guion, Idea o Tema Base</label>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>{baseText.length} caracteres</span>
                    </div>
                    <textarea 
                        className="input-field"
                        style={{ minHeight: '160px', padding: '20px', fontSize: '1.05rem', resize: 'vertical', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}
                        placeholder="Pega aquí tu guion o escribe la idea principal de tu contenido. La IA lo usará como base para generar todas las variaciones posibles..."
                        value={baseText}
                        onChange={(e) => setBaseText(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plataforma Principal</label>
                        <select className="select-field" value={platform} onChange={e => setPlatform(e.target.value)}>
                            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Objetivo del Post</label>
                        <select className="select-field" value={goal} onChange={e => setGoal(e.target.value)}>
                            {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(126, 206, 202, 0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(126, 206, 202, 0.1)' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7ECECA', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} /> ¿Qué deseas generar hoy?
                    </label>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'titulos', label: 'Títulos' },
                            { id: 'ganchos', label: 'Ganchos' },
                            { id: 'descripciones', label: 'Descripciones' },
                            { id: 'hashtags', label: 'Hashtags' },
                            { id: 'youtubeTags', label: 'YouTube Tags', show: platform === 'YouTube' }
                        ].map(section => {
                            if (section.show === false) return null;
                            const isChecked = selectedSections[section.id];
                            return (
                                <label key={section.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem', 
                                    color: isChecked ? 'white' : '#888',
                                    padding: '8px 16px',
                                    borderRadius: '100px',
                                    background: isChecked ? 'rgba(126, 206, 202, 0.1)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${isChecked ? 'rgba(126, 206, 202, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                                    transition: '0.2s'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked} 
                                        onChange={e => setSelectedSections(prev => ({...prev, [section.id]: e.target.checked}))}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isChecked && <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'currentColor' }} />}
                                    </div>
                                    {section.label}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !baseText.trim() || Object.values(selectedSections).every(v => !v)}
                        className="btn-primary" 
                        style={{ width: '100%', padding: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 40px rgba(126, 206, 202, 0.2)' }}
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                        {isGenerating ? 'Estratega Senior analizando...' : 'Generar Copys Maestros'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coins size={14} /> 1 Crédito por generación</span>
                        {credits !== null && (
                            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '100px', fontWeight: 800, color: credits > 0 ? '#7ECECA' : '#FF4D4D', border: '1px solid rgba(255,255,255,0.05)' }}>Saldo: {credits}</span>
                        )}
                    </div>
                </div>

                {apiError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <p style={{ color: '#F87171', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{apiError}</p>
                        <button onClick={handleGenerate} className="btn-secondary" style={{ padding: '6px 20px', fontSize: '0.85rem' }}>Reintentar</button>
                    </div>
                )}
            </div>

            {/* Results Section */}
            {results && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', animation: 'fadeInUp 0.6s ease' }}>
                    
                    {/* Floating Action Bar */}
                    <div style={{ position: 'sticky', top: '24px', zIndex: 100, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)', padding: '12px 24px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7ECECA' }}></div>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.5px' }}>RESULTADOS IA</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={copyAll} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '100px' }}>
                                <Copy size={14} /> <span className="hide-mobile">Copiar Todo</span>
                            </button>
                            <button onClick={saveToLibraryAsCopy} disabled={isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '100px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', border: '1px solid rgba(126, 206, 202, 0.3)' }}>
                                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
                                <span className="hide-mobile">Guardar</span>
                            </button>
                        </div>
                    </div>

                    {renderBlock('titles', 'Opciones de Títulos Virales', results.titles, false)}
                    {renderBlock('hooks', 'Ganchos de 3 Segundos', results.hooks, true)}
                    {renderBlock('descriptions', 'Copys y Descripciones', results.descriptions, true)}
                    {renderBlock('hashtags_groups', 'Hashtags Sugeridos', results.hashtags_groups, false)}
                    {renderBlock('youtube_tags', 'SEO YouTube (Etiquetas)', results.youtube_tags ? [results.youtube_tags.join(', ')] : null, false)}

                </div>
            )}

            {toast && (
                <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#FF4D4D' : '#7ECECA', color: toast.type === 'error' ? 'white' : 'black', padding: '14px 28px', borderRadius: '50px', fontWeight: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 1000, animation: 'fadeInUp 0.3s ease-out' }}>
                    {toast.message}
                </div>
            )}
            
            <style jsx>{`
                @media (max-width: 600px) {
                    .hide-mobile { display: none; }
                }
                .hover-bright:hover {
                    background: rgba(255,255,255,0.1) !important;
                    color: white !important;
                }
            `}</style>
        </div>
    );
}

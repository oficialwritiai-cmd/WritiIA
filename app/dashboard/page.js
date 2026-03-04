'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2, Sparkles } from 'lucide-react';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';
import GenerationProgress from '@/app/components/GenerationProgress';
import { saveToLibrary } from '@/lib/library';

const SUGGESTED_TRENDS = [
    { name: 'Nicho Marketing', icon: '📈', grow: '+12.5%', color: '#9D00FF' },
    { name: 'IA Generativa', icon: '🤖', grow: '+45.2%', color: '#00F3FF' },
    { name: 'Productividad', icon: '⏳', grow: '+8.1%', color: '#FF007A' },
];

const PLATAFORMAS = ['Reels', 'TikTok', 'LinkedIn', 'X', 'YouTube Shorts', 'YouTube', 'Instagram'];
const TONOS_MARCA = ['brutal honesto', 'elegante', 'polémico', 'cercano', 'experto', 'profesional'];
const OBJETIVOS = ['atraer leads', 'autoridad', 'venta directa', 'engagement', 'storytelling', 'educar'];
const AWARENESS_LEVELS = ['no te conoce', 'tibia', 'muy caliente'];
const HOOK_TYPES = ['historia personal', 'pain fuerte', 'contraintuitivo', 'prueba social', 'curiosidad extrema'];
const FRECUENCIAS = ['3 publicaciones por semana', '4 publicaciones por semana', '5 publicaciones por semana', '7 publicaciones por semana'];
const ENFOQUES = ['autoridad', 'historia personal', 'venta', 'comunidad', 'mezcla equilibrada'];
const CONTENT_TYPES_PLAN = ['autoridad', 'historia personal', 'venta', 'comunidad'];

export default function DashboardPage() {
    const [generationMode, setGenerationMode] = useState('single');

    // Wizard steps: 1 = marca, 2 = contexto, 3 = detalle
    const [wizardStep, setWizardStep] = useState(1);
    const [step, setStep] = useState(1); // 1: Form, 2: Loading, 3: Results
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Reels');
    const [toneBrand, setToneBrand] = useState('cercano');
    const [goal, setGoal] = useState('engagement');
    const [awareness, setAwareness] = useState('tibia');
    const [quantity, setQuantity] = useState(4);
    const [ideas, setIdeas] = useState('');
    const [scripts, setScripts] = useState([]);

    // Wizard step 3 fields
    const [victory, setVictory] = useState('');
    const [opinion, setOpinion] = useState('');
    const [story, setStory] = useState('');
    const [hookType, setHookType] = useState('curiosidad extrema');
    const [intensity, setIntensity] = useState(3);

    // Brain profile
    const [brainProfile, setBrainProfile] = useState(null);
    const [editingBrain, setEditingBrain] = useState(false);
    const [brainForm, setBrainForm] = useState({ biography: '', sells: '', helps: '', style_words: '' });

    // Plan mode states
    const [planPlatforms, setPlanPlatforms] = useState(['Reels']);
    const [planFrequency, setPlanFrequency] = useState('3 publicaciones por semana');
    const [planFocus, setPlanFocus] = useState('mezcla equilibrada');
    const [planContentTypes, setPlanContentTypes] = useState({ autoridad: 30, 'historia personal': 25, venta: 25, comunidad: 20 });
    const [planExcludeTopics, setPlanExcludeTopics] = useState('');
    const [planCampaigns, setPlanCampaigns] = useState('');
    const [planSlots, setPlanSlots] = useState([]);
    const [generatingSlotId, setGeneratingSlotId] = useState(null);

    const [loadingPhase, setLoadingPhase] = useState(0);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [aiCredits, setAiCredits] = useState({ total: 200, used: 0 });
    const [hasBrain, setHasBrain] = useState(false);
    const [improvementCounts, setImprovementCounts] = useState({});
    const [refiningBlock, setRefiningBlock] = useState(null);
    const [previousScripts, setPreviousScripts] = useState(null);
    const [selectedHook, setSelectedHook] = useState({});
    const [brainName, setBrainName] = useState('');

    const supabase = createSupabaseClient();
    const router = useRouter();

    const singleLoadingSteps = [
        "Leyendo tu Cerebro IA...",
        "Buscando ángulos interesantes...",
        "Redactando ganchos de alto impacto...",
        "Afinando CTA y desarrollo...",
    ];

    const planLoadingSteps = [
        "Leyendo tu Cerebro IA...",
        "Analizando tu objetivo mensual...",
        "Distribuyendo temas por semanas...",
        "Asignando plataformas y ángulos...",
        "Generando estructura de 30 días..."
    ];

    const loadingSteps = generationMode === 'single' ? singleLoadingSteps : planLoadingSteps;

    async function fetchCredits(userId) {
        if (!userId) return;
        const { data } = await supabase.from('ai_credits').select('*').eq('user_id', userId).single();
        if (data) {
            setAiCredits({ total: data.total_credits, used: data.used_credits });
        }
    }

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
                setProfile(profileData);

                const { data: brainData } = await supabase.from('brand_brain').select('*').eq('user_id', user.id).single();
                if (brainData) {
                    setHasBrain(true);
                    setBrainProfile(brainData);
                    setBrainName(brainData.biography ? brainData.biography.substring(0, 30) + '...' : 'Perfil');
                    setBrainForm({
                        biography: brainData.biography || '',
                        sells: brainData.products_services || '',
                        helps: brainData.audience || '',
                        style_words: brainData.style_words || ''
                    });
                }

                fetchCredits(user.id);
            }
        }
        loadData();

        // Load params from URL on initial load
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('mode') === 'single') {
                setGenerationMode('single');
                const topicParam = params.get('topic');
                const platformParam = params.get('platform');
                const goalParam = params.get('goal');
                const countParam = params.get('count');
                const forceCount = countParam ? parseInt(countParam) : null;

                console.log('[Dashboard] URL params:', { topic: topicParam, platform: platformParam, goal: goalParam, count: countParam });

                if (topicParam) setTopic(decodeURIComponent(topicParam));
                if (platformParam) setPlatform(decodeURIComponent(platformParam));
                if (goalParam) setGoal(decodeURIComponent(goalParam));
                if (forceCount) setQuantity(forceCount);
            }
        }
    }, []);

    // Land on Wizard Step 3 if coming from strategy to allow refinement
    useEffect(() => {
        if (typeof window !== 'undefined' && hasBrain) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('mode') === 'single' && params.get('topic')) {
                const savedTopic = params.get('topic');
                const savedPlatform = params.get('platform');
                const savedGoal = params.get('goal');

                if (savedTopic) setTopic(decodeURIComponent(savedTopic));
                if (savedPlatform) setPlatform(decodeURIComponent(savedPlatform));
                if (savedGoal) setGoal(decodeURIComponent(savedGoal));

                setGenerationMode('single');
                setWizardStep(3); // Land on Step 3 (Details/Hooks)
                setStep(1); // Stay on form view

                window.history.replaceState({}, document.title, '/dashboard');
            }
        }
    }, [hasBrain]);


    useEffect(() => {
        if (step === 2) {
            let current = 0;
            setLoadingPhase(0);
            const intervalMs = (generationMode === 'single' && quantity === 1) ? 3500 : 5000;
            const interval = setInterval(() => {
                if (current < loadingSteps.length - 1) {
                    current++;
                    setLoadingPhase(current);
                }
            }, intervalMs);
            return () => clearInterval(interval);
        }
    }, [step, generationMode]);

    async function handleGenerateSingle() {
        console.log('[Dashboard] handleGenerateSingle called', { topic, platform, goal, hasBrain, wizardStep });

        if (!topic?.trim()) {
            setError('Por favor, indica sobre qué quieres crear contenido.');
            return;
        }

        if (!hasBrain && wizardStep < 2) {
            setError('Por favor, completa el Paso 1 (Marca Personal) antes de generar.');
            return;
        }

        setStep(2);
        setError('');

        try {
            // Priority check for count to avoid state race conditions from strategy
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const urlCount = params.get('count');
            const finalQuantity = urlCount ? parseInt(urlCount) : (quantity || 3);

            const requestBody = {
                topic: topic.trim(),
                platform: platform || 'Reels',
                tone: toneBrand || 'Profesional',
                goal: goal || 'engagement',
                count: finalQuantity,
                ideas: ideas || '',
                userId: profile?.id,
                awareness: awareness || 'medium',
                victory: victory || '',
                opinion: opinion || '',
                story: story || '',
                hookType: hookType || 'question',
                intensity: intensity || 'medium',
                sourceType: params.get('source_type') || null,
                sourceReferenceId: params.get('source_reference_id') || null
            };
            console.log('[Dashboard] Sending request:', requestBody);

            const res = await fetch('/api/generate-scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();
            console.log('[Dashboard] Response:', data);

            if (!res.ok) throw new Error(data.error || 'No se pudo generar los guiones. Inténtalo de nuevo en unos minutos.');

            console.log('[Dashboard] handleGenerateSingle - data:', data);

            let generatedScripts = data.scripts || [];
            console.log('[Dashboard] generatedScripts:', generatedScripts, generatedScripts.length);

            if (generatedScripts.length === 0) {
                throw new Error('No se recibieron guiones de la API');
            }

            // Initialize selected hooks
            const initialSelected = {};
            generatedScripts.forEach((_, i) => { initialSelected[i] = 0; });
            setSelectedHook(initialSelected);

            const finalScripts = generatedScripts.map(s => ({
                ...s,
                titulo_guion: s.titulo_guion || s.titulo_interno || 'Sin título',
                video_duration: s.video_duration || '45-60 seg',
                desarrollo: Array.isArray(s.desarrollo) ? s.desarrollo : [],
                cierre: s.cierre || '',
                copy_post: s.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
            }));

            setScripts(finalScripts);
            setStep(3);
            // Refresh credits balance in header
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            fetchCredits(profile.id);
        } catch (err) {
            console.error('Error real en generación:', err);
            setError(err.message || 'No se pudo generar los guiones. Inténtalo de nuevo en unos minutos.');
            setStep(1);
        }
    }

    async function handleRefineBlock(scriptIndex, blockType) {
        const key = `${scriptIndex}-${blockType}`;
        const currentCount = improvementCounts[key] || 0;

        if (currentCount >= 3) {
            alert('Límite de mejoras alcanzado para este bloque.');
            return;
        }

        const available = aiCredits.total - aiCredits.used;
        if (available < 1) {
            alert('Has agotado tus créditos de IA. Actualiza tu plan o compra más créditos.');
            return;
        }

        // Save current state for "Undo"
        setPreviousScripts(JSON.parse(JSON.stringify(scripts)));
        setRefiningBlock(key);

        const script = scripts[scriptIndex];
        if (!script) {
            alert('Error: No se encontró el guion');
            return;
        }

        let text = '';
        const desarrolloArray = Array.isArray(script.desarrollo) ? script.desarrollo : [];
        if (blockType === 'gancho') text = script.gancho || '';
        else if (blockType === 'punto1') text = desarrolloArray[0] || '';
        else if (blockType === 'punto2') text = desarrolloArray[1] || '';
        else if (blockType === 'punto3') text = desarrolloArray[2] || '';
        else if (blockType === 'cta') text = script.cta || '';

        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    type: blockType === 'cta' ? 'cta' : (blockType === 'gancho' ? 'gancho' : 'desarrollo'),
                    context: `Guion sobre ${topic} para ${platform}. Ángulo: ${script.titulo_angulo}`,
                    userId: profile.id
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const updatedScripts = [...scripts];
            // Ensure desarrollo is an array
            if (!Array.isArray(updatedScripts[scriptIndex].desarrollo)) {
                updatedScripts[scriptIndex].desarrollo = ['', '', ''];
            }

            if (blockType === 'gancho') updatedScripts[scriptIndex].gancho = data.refinedText;
            else if (blockType === 'punto1') updatedScripts[scriptIndex].desarrollo[0] = data.refinedText;
            else if (blockType === 'punto2') updatedScripts[scriptIndex].desarrollo[1] = data.refinedText;
            else if (blockType === 'punto3') updatedScripts[scriptIndex].desarrollo[2] = data.refinedText;
            else if (blockType === 'cta') updatedScripts[scriptIndex].cta = data.refinedText;

            setScripts(updatedScripts);
            setImprovementCounts({ ...improvementCounts, [key]: currentCount + 1 });
            // Refresh credits balance in header
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            fetchCredits(profile.id);
        } catch (err) {
            alert('Error al mejorar: ' + err.message);
        } finally {
            setRefiningBlock(null);
        }
    }

    function handleUndo() {
        if (previousScripts) {
            setScripts(previousScripts);
            setPreviousScripts(null);
        }
    }

    function handleDownload(script) {
        const content = `GANCHO\n${script.gancho}\n\nDESARROLLO\n${script.desarrollo.join('\n')}\n\nCTA\n${script.cta}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `writi-guion.txt`;
        a.click();
    }

    async function handleSaveAll() {
        try {
            for (const s of scripts) {
                await saveScript(s, true); // Silent save
            }
            alert('Todos los guiones guardados en biblioteca ✓');
        } catch (err) {
            alert('Error al guardar todos: ' + err.message);
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

    const saveScript = async (script, silent = false) => {
        if (!profile?.id) return;

        try {
            await saveToLibrary({
                userId: profile.id,
                type: 'guion',
                platform: platform || 'General',
                goal: goal || 'engagement',
                titulo: script.titulo_guion || script.titulo_angulo || 'Sin título',
                content: {
                    video_duration: script.video_duration || '45-60 seg',
                    hook: script.hook || script.gancho || '',
                    desarrollo: Array.isArray(script.desarrollo) ? script.desarrollo : [],
                    cierre: script.cierre || '',
                    cta: script.cta || '',
                    copy_post: script.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                },
                tags: ['guion', platform, goal].filter(Boolean)
            });

            if (!silent) alert('Guardado en biblioteca ✓');
        } catch (err) {
            console.error('Error saving script:', err);
            if (!silent) alert('Error al guardar: ' + err.message);
        }
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
            const res = await fetch('/api/generate-scripts', {
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
            console.log('[Dashboard] Generate script response:', data);

            if (!data.scripts || !Array.isArray(data.scripts) || data.scripts.length === 0) {
                console.error('[Dashboard] No scripts in response:', data);
                throw new Error('No se recibió ningún guion. Intenta de nuevo.');
            }

            const generatedScript = data.scripts[0];

            if (!generatedScript) {
                throw new Error('El guion recibido está vacío. Intenta de nuevo.');
            }

            // Subir a BD
            const desarrolloStr = Array.isArray(generatedScript.desarrollo) ? generatedScript.desarrollo.join('\n') : (generatedScript.desarrollo || '');
            const fullContent = (generatedScript.gancho || '') + '\n\n' + desarrolloStr + '\n\n' + (generatedScript.cta || '');
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

    const handleBuyCredits = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Inicia sesión para continuar');
                return;
            }

            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Error al crear la sesión de pago');
            }
        } catch (err) {
            console.error('Error in buy credits:', err);
            alert(err.message);
        }
    };

    return (
        <div className="dashboard-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* BANNER DE ACTUALIZACIÓN (Solo visible si no han refrescado) */}
            <div style={{
                background: 'rgba(126, 206, 202, 0.15)',
                border: '2px solid rgba(126, 206, 202, 0.4)',
                padding: '20px 24px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                animation: 'pulse-glow 2s infinite alternate'
            }}>
                <div style={{ fontSize: '2rem' }}>✅</div>
                <div>
                    <h3 style={{ color: '#7ECECA', margin: 0, fontSize: '1rem', fontWeight: 900 }}>SISTEMA ACTUALIZADO - VERSIÓN V1.4.0 (PREMIUM SCRIPTS + COPY POST)</h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
                        {new Date().toLocaleTimeString('es-ES')} - Si no ves los campos de "LinkedIn/Copy Post", pulsa <strong>Ctrl + F5</strong> para forzar la actualización.
                    </p>
                </div>
            </div>
            {/* Header / Stats */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Sparkles size={16} color="#7ECECA" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Créditos IA: {aiCredits.total - aiCredits.used} / {aiCredits.total}</span>
                    <button onClick={handleBuyCredits} style={{ background: 'var(--accent-gradient)', color: 'black', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Comprar más</button>
                </div>
            </div>
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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

            {step === 1 && generationMode === 'single' && (
                <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                    {/* Wizard Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', gap: '16px' }}>
                        {[1, 2, 3].map(w => (
                            <div key={w} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: wizardStep >= w ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
                                    color: wizardStep >= w ? 'black' : 'rgba(255,255,255,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem'
                                }}>
                                    {wizardStep > w ? '✓' : w}
                                </div>
                                <span style={{ color: wizardStep >= w ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: wizardStep === w ? 700 : 400, fontSize: '0.85rem' }}>
                                    {w === 1 ? 'Marca' : w === 2 ? 'Contexto' : 'Detalle'}
                                </span>
                                {w < 3 && <div style={{ width: '40px', height: '2px', background: wizardStep > w ? '#7ECECA' : 'rgba(255,255,255,0.1)' }} />}
                            </div>
                        ))}
                    </div>

                    <h2 style={{ fontSize: '1.8rem', marginBottom: '32px', fontWeight: 800, textAlign: 'center' }}>
                        {wizardStep === 1 ? 'Tu Marca Personal' : wizardStep === 2 ? 'Contexto del Contenido' : 'Detalle del Guion'}
                    </h2>

                    {/* Wizard Step 1: Marca Personal */}
                    {wizardStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {hasBrain ? (
                                <div style={{ padding: '24px', background: 'rgba(126, 206, 202, 0.05)', borderRadius: '16px', border: '1px solid rgba(126, 206, 202, 0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <p style={{ fontWeight: 700, color: '#7ECECA' }}>✓ Cerebro IA configurado</p>
                                        <button onClick={() => setEditingBrain(!editingBrain)} style={{ background: 'none', border: 'none', color: '#7ECECA', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            {editingBrain ? 'Cancelar' : 'Editar'}
                                        </button>
                                    </div>
                                    {editingBrain ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <input className="input-field" placeholder="Quién eres en una frase" value={brainForm.biography} onChange={(e) => setBrainForm({ ...brainForm, biography: e.target.value })} />
                                            <input className="input-field" placeholder="Qué vendes" value={brainForm.sells} onChange={(e) => setBrainForm({ ...brainForm, sells: e.target.value })} />
                                            <input className="input-field" placeholder="A quién ayudas" value={brainForm.helps} onChange={(e) => setBrainForm({ ...brainForm, helps: e.target.value })} />
                                            <input className="input-field" placeholder="3 palabras de estilo (ej: directo, irónico, elegante)" value={brainForm.style_words} onChange={(e) => setBrainForm({ ...brainForm, style_words: e.target.value })} />
                                            <button onClick={async () => {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                await supabase.from('brand_brain').upsert({ user_id: user.id, biography: brainForm.biography, products_services: brainForm.sells, audience: brainForm.helps, style_words: brainForm.style_words }, { onConflict: 'user_id' });
                                                setHasBrain(true);
                                                setEditingBrain(false);
                                                setBrainName(brainForm.biography.substring(0, 30));
                                            }} className="btn-primary" style={{ marginTop: '8px' }}>Guardar y Continuar</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                                <div><p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Quién eres</p><p style={{ fontWeight: 600 }}>{brainProfile?.biography || '-'}</p></div>
                                                <div><p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Qué vendes</p><p style={{ fontWeight: 600 }}>{brainProfile?.products_services || '-'}</p></div>
                                                <div><p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>A quién ayudas</p><p style={{ fontWeight: 600 }}>{brainProfile?.audience || '-'}</p></div>
                                                <div><p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Estilo</p><p style={{ fontWeight: 600 }}>{brainProfile?.style_words || '-'}</p></div>
                                            </div>
                                            <button onClick={() => setWizardStep(2)} className="btn-primary" style={{ width: '100%', height: '50px', fontSize: '1rem' }}>
                                                Continuar al siguiente paso →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Completa tu perfil para que la IA genere contenido con tu voz única.</p>
                                    <input className="input-field" placeholder="Quién eres en una frase" value={brainForm.biography} onChange={(e) => setBrainForm({ ...brainForm, biography: e.target.value })} />
                                    <input className="input-field" placeholder="Qué vendes" value={brainForm.sells} onChange={(e) => setBrainForm({ ...brainForm, sells: e.target.value })} />
                                    <input className="input-field" placeholder="A quién ayudas" value={brainForm.helps} onChange={(e) => setBrainForm({ ...brainForm, helps: e.target.value })} />
                                    <input className="input-field" placeholder="3 palabras de estilo (ej: directo, irónico, elegante)" value={brainForm.style_words} onChange={(e) => setBrainForm({ ...brainForm, style_words: e.target.value })} />
                                    <button onClick={async () => {
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!brainForm.biography || !brainForm.helps) {
                                            setError('Por favor, completa al menos "Quién eres" y "A quién ayuda"');
                                            return;
                                        }
                                        await supabase.from('brand_brain').upsert({ user_id: user.id, biography: brainForm.biography, products_services: brainForm.sells, audience: brainForm.helps, style_words: brainForm.style_words }, { onConflict: 'user_id' });
                                        setHasBrain(true);
                                        setBrainName(brainForm.biography.substring(0, 30));
                                        setWizardStep(2);
                                    }} className="btn-primary" style={{ marginTop: '8px' }}>Guardar y Continuar →</button>
                                </div>
                            )}
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Este paso se completa solo una vez. Puedes editarlo después en "Cerebro IA".
                            </p>
                        </div>
                    )}

                    {/* Wizard Step 2: Contexto */}
                    {wizardStep === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Objetivo del guion</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {OBJETIVOS.map(o => (
                                        <button key={o} onClick={() => setGoal(o)} style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: goal === o ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: goal === o ? 'black' : 'white', fontWeight: goal === o ? 700 : 400 }}>{o}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Plataforma</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {PLATAFORMAS.map(p => (
                                        <button key={p} onClick={() => setPlatform(p)} style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: platform === p ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: platform === p ? 'black' : 'white', fontWeight: platform === p ? 700 : 400 }}>{p}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Nivel de awareness de tu audiencia</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {AWARENESS_LEVELS.map(a => (
                                        <button key={a} onClick={() => setAwareness(a)} style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: awareness === a ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: awareness === a ? 'black' : 'white', fontWeight: awareness === a ? 700 : 400 }}>{a === 'no te conoce' ? 'No te conoce' : a === 'tibia' ? 'Te conoce / Tibia' : 'Muy caliente'}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                <button onClick={() => setWizardStep(1)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={() => setWizardStep(3)} className="btn-primary" style={{ flex: 2 }}>Siguiente: Detalle →</button>
                            </div>
                        </div>
                    )}

                    {/* Wizard Step 3: Detalle */}
                    {wizardStep === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Sobre qué va el contenido</p>
                                <AIPolishedTextarea className="textarea-field" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: Cómo ganar 1.000 seguidores en 30 días sin pagar ads" style={{ minHeight: '100px' }} />
                            </div>
                            <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Tono de marca</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {TONOS_MARCA.map(t => (
                                            <button key={t} onClick={() => setToneBrand(t)} style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: toneBrand === t ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: toneBrand === t ? 'black' : 'white', fontWeight: toneBrand === t ? 700 : 400 }}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Tipo de gancho preferido</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {HOOK_TYPES.map(h => (
                                            <button key={h} onClick={() => setHookType(h)} style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: hookType === h ? '#9D00FF' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: hookType === h ? 700 : 400 }}>{h}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Intensidad del hook: {intensity}/5</p>
                                <input type="range" min="1" max="5" value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#9D00FF' }} />
                            </div>
                            <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Victoria/Fracaso reciente</p>
                                    <input className="input-field" placeholder="1-2 frases" value={victory} onChange={(e) => setVictory(e.target.value)} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Opinión impopular</p>
                                    <input className="input-field" placeholder="Tu opinión controversial" value={opinion} onChange={(e) => setOpinion(e.target.value)} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Caso real / Situación</p>
                                    <input className="input-field" placeholder="Cliente o situación real" value={story} onChange={(e) => setStory(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Cantidad de guiones</p>
                                <input type="range" min="1" max="4" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#7ECECA' }} />
                                <p style={{ textAlign: 'center', marginTop: '8px', fontWeight: 700, color: '#7ECECA' }}>{quantity} guiones</p>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                <button onClick={() => setWizardStep(2)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={handleGenerateSingle} className="btn-primary" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>Generar Guiones →</button>
                            </div>
                            {error && <p style={{ color: '#FF4D4D', textAlign: 'center' }}>{error}</p>}
                        </div>
                    )}
                </div>
            )}

            {/* Plan Monthly Mode */}
            {step === 1 && generationMode === 'plan' && (
                <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '32px', fontWeight: 800 }}>Tu Planificador Mensual de Contenido</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Describe tu marca y objetivos del mes</p>
                            <AIPolishedTextarea className="textarea-field" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Soy coach de negocios para emprendedores digitales y quiero ganar autoridad y vender mi nuevo programa de mentoría." style={{ minHeight: '100px' }} />
                        </div>
                        <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Plataformas</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {PLATAFORMAS.map(p => (
                                        <button key={p} onClick={() => handleTogglePlatform(p)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: planPlatforms.includes(p) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: planPlatforms.includes(p) ? 'black' : 'white' }}>{p}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Frecuencia</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {FRECUENCIAS.map(f => (
                                        <button key={f} onClick={() => setPlanFrequency(f)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: planFrequency === f ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: planFrequency === f ? 'black' : 'white' }}>{f.split(' ')[0]}xSem</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Distribución del contenido (%)</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {CONTENT_TYPES_PLAN.map(type => (
                                    <div key={type}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{type}</p>
                                        <input type="number" className="input-field" value={planContentTypes[type]} onChange={(e) => setPlanContentTypes({ ...planContentTypes, [type]: parseInt(e.target.value) || 0 })} style={{ width: '100%', textAlign: 'center' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Campañas del mes</p>
                                <input className="input-field" placeholder="Lanzamientos, promos, eventos..." value={planCampaigns} onChange={(e) => setPlanCampaigns(e.target.value)} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Temas a evitar</p>
                                <input className="input-field" placeholder="Lo que NO quieres tratar" value={planExcludeTopics} onChange={(e) => setPlanExcludeTopics(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <button onClick={() => setGenerationMode('single')} className="btn-secondary" style={{ flex: 1 }}>← Volver</button>
                            <button onClick={handleGeneratePlan} className="btn-primary" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>Generar Plan de 30 días →</button>
                        </div>
                        {error && <p style={{ color: '#FF4D4D', textAlign: 'center' }}>{error}</p>}
                    </div>
                </div>
            )}

            {step === 2 && (
                <GenerationProgress
                    steps={loadingSteps}
                    currentPhase={loadingPhase}
                    brainName={hasBrain ? (brainName || 'perfil configurado') : null}
                    subtitle="Esto suele tomar entre 15 y 30 segundos..."
                />
            )}

            {step === 3 && generationMode === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '100px' }}>
                    {/* Header Editor */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Editor de Guiones</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
                                Ajusta cada gancho, desarrollo y CTA a tu estilo. Usa IA solo donde la necesitas.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setStep(1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem' }}>
                                <RefreshCcw size={16} /> Volver
                            </button>
                            <button onClick={handleSaveAll} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700 }}>
                                Guardar todos
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {Array.isArray(scripts) && scripts.map((s, i) => (
                            <div key={i} className="premium-card" style={{
                                padding: '0',
                                background: '#101010',
                                border: '1px solid #1E1E1E',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                            }}>
                                {/* Card Header */}
                                <div style={{
                                    padding: '20px 32px',
                                    borderBottom: '1px solid #1E1E1E',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'var(--accent-gradient)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#000',
                                            fontWeight: 900,
                                            fontSize: '0.8rem'
                                        }}>
                                            #{i + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                value={s.titulo_guion || s.titulo_angulo || `Guion #${i + 1}`}
                                                onChange={(e) => {
                                                    const news = [...scripts];
                                                    news[i].titulo_guion = e.target.value;
                                                    setScripts(news);
                                                }}
                                                placeholder="Título del guion..."
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px dashed rgba(255,255,255,0.2)',
                                                    color: '#fff',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 800,
                                                    width: '100%',
                                                    outline: 'none',
                                                    padding: '4px 0'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    <Loader2 size={12} className="animate-spin" />
                                                    <input
                                                        value={s.video_duration || '45-60 seg'}
                                                        onChange={(e) => {
                                                            const news = [...scripts];
                                                            news[i].video_duration = e.target.value;
                                                            setScripts(news);
                                                        }}
                                                        style={{ background: 'transparent', border: 'none', color: 'inherit', width: '80px', fontSize: 'inherit', fontWeight: 'inherit', padding: 0, outline: 'none' }}
                                                    />
                                                </div>
                                                <span className="badge" style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    fontSize: '0.7rem',
                                                    padding: '4px 10px',
                                                    whiteSpace: 'nowrap'
                                                }}>{platform}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                    {/* GANCHO */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>GANCHO</label>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                {previousScripts && (
                                                    <button onClick={handleUndo} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Deshacer</button>
                                                )}
                                                <button
                                                    onClick={() => handleRefineBlock(i, 'gancho')}
                                                    disabled={refiningBlock === `${i}-gancho`}
                                                    title="Mejorar gancho con IA"
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: refiningBlock === `${i}-gancho` ? 'transparent' : 'rgba(126, 206, 202, 0.1)',
                                                        color: '#7ECECA',
                                                        border: refiningBlock === `${i}-gancho` ? 'none' : '1px solid rgba(126, 206, 202, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    {refiningBlock === `${i}-gancho` ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={s.hook || s.gancho || ''}
                                            disabled={refiningBlock === `${i}-gancho`}
                                            onChange={(e) => {
                                                const news = [...scripts];
                                                news[i].hook = e.target.value;
                                                news[i].gancho = e.target.value;
                                                setScripts(news);
                                            }}
                                            className="textarea-field"
                                            style={{
                                                minHeight: '80px',
                                                fontSize: '1.25rem',
                                                fontWeight: 700,
                                                background: '#080808',
                                                border: '1px solid #1E1E1E',
                                                fontFamily: 'monospace',
                                                padding: '20px',
                                                transition: '0.3s'
                                            }}
                                        />
                                        {improvementCounts[`${i}-gancho`] > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(126, 206, 202, 0.5)' }}>Versión mejorada. Mejores restantes: {3 - improvementCounts[`${i}-gancho`]}</span>}
                                    </div>

                                    {/* DESARROLLO (3 PUNTOS) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>DESARROLLO (3 PUNTOS ACCIONABLES)</label>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {Array.isArray(s.desarrollo) && [0, 1, 2].map(idx => (
                                                <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                                    <div style={{ marginTop: '14px', fontSize: '0.8rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', minWidth: '20px' }}>0{idx + 1}</div>
                                                    <div style={{ flex: 1, position: 'relative' }}>
                                                        <textarea
                                                            value={s.desarrollo[idx] || ''}
                                                            disabled={refiningBlock === `${i}-punto${idx + 1}`}
                                                            onChange={(e) => {
                                                                const news = [...scripts];
                                                                if (!Array.isArray(news[i].desarrollo)) news[i].desarrollo = ['', '', ''];
                                                                news[i].desarrollo[idx] = e.target.value;
                                                                setScripts(news);
                                                            }}
                                                            className="textarea-field"
                                                            style={{
                                                                minHeight: '60px',
                                                                fontSize: '0.95rem',
                                                                background: '#080808',
                                                                border: '1px solid #1E1E1E',
                                                                padding: '12px 48px 12px 16px'
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleRefineBlock(i, `punto${idx + 1}`)}
                                                            disabled={refiningBlock === `${i}-punto${idx + 1}`}
                                                            style={{
                                                                position: 'absolute',
                                                                right: '12px',
                                                                top: '12px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#7ECECA',
                                                                cursor: 'pointer',
                                                                opacity: 0.6
                                                            }}
                                                        >
                                                            {refiningBlock === `${i}-punto${idx + 1}` ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>LLAMADA A LA ACCIÓN (CTA)</label>
                                            <button
                                                onClick={() => handleRefineBlock(i, 'cta')}
                                                disabled={refiningBlock === `${i}-cta`}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(126, 206, 202, 0.1)',
                                                    color: '#7ECECA',
                                                    border: '1px solid rgba(126, 206, 202, 0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {refiningBlock === `${i}-cta` ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            </button>
                                        </div>
                                        <input
                                            value={s.cta}
                                            disabled={refiningBlock === `${i}-cta`}
                                            onChange={(e) => {
                                                const news = [...scripts];
                                                news[i].cta = e.target.value;
                                                setScripts(news);
                                            }}
                                            className="input-field"
                                            style={{
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                background: '#080808',
                                                border: '1px solid #1E1E1E',
                                                padding: '16px'
                                            }}
                                        />
                                    </div>

                                    {/* CIERRE */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>CIERRE / REMATE</label>
                                        <textarea
                                            value={s.cierre || ''}
                                            onChange={(e) => {
                                                const news = [...scripts];
                                                news[i].cierre = e.target.value;
                                                setScripts(news);
                                            }}
                                            className="textarea-field"
                                            style={{
                                                minHeight: '60px',
                                                fontSize: '1rem',
                                                background: '#080808',
                                                border: '1px solid #1E1E1E',
                                                padding: '16px'
                                            }}
                                        />
                                    </div>

                                    {/* COPY DEL POST */}
                                    <div style={{
                                        marginTop: '20px',
                                        padding: '32px',
                                        background: 'rgba(126, 206, 202, 0.03)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(126, 206, 202, 0.1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '24px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <PenLine size={20} color="#7ECECA" />
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7ECECA' }}>Copy para publicación</h4>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(126, 206, 202, 0.6)', marginBottom: '8px', display: 'block' }}>TÍTULO DEL POST</label>
                                            <input
                                                value={s.copy_post?.titulo || ''}
                                                onChange={(e) => {
                                                    const news = [...scripts];
                                                    if (!news[i].copy_post) news[i].copy_post = {};
                                                    news[i].copy_post.titulo = e.target.value;
                                                    setScripts(news);
                                                }}
                                                className="input-field"
                                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(126, 206, 202, 0.2)' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(126, 206, 202, 0.6)', marginBottom: '8px', display: 'block' }}>DESCRIPCIÓN LARGA / CAPTION</label>
                                            <textarea
                                                value={s.copy_post?.descripcion_larga || ''}
                                                onChange={(e) => {
                                                    const news = [...scripts];
                                                    if (!news[i].copy_post) news[i].copy_post = {};
                                                    news[i].copy_post.descripcion_larga = e.target.value;
                                                    setScripts(news);
                                                }}
                                                className="textarea-field"
                                                style={{ minHeight: '120px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(126, 206, 202, 0.2)' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(126, 206, 202, 0.6)', marginBottom: '12px', display: 'block' }}>HASHTAGS RECOMENDADOS</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {s.copy_post?.hashtags?.map((tag, tidx) => (
                                                    <span key={tidx} style={{
                                                        fontSize: '0.75rem',
                                                        background: 'rgba(126, 206, 202, 0.1)',
                                                        color: '#7ECECA',
                                                        padding: '4px 12px',
                                                        borderRadius: '100px',
                                                        border: '1px solid rgba(126, 206, 202, 0.2)'
                                                    }}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div style={{
                                    padding: '20px 32px',
                                    background: 'rgba(255,255,255,0.01)',
                                    borderTop: '1px solid #1E1E1E',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '12px'
                                }}>
                                    {[
                                        { icon: <Copy size={16} />, label: 'Copiar', action: () => copyToClipboard(`GUION: ${s.titulo_guion || s.titulo_angulo}\n\nHOOK: ${s.hook || s.gancho}\n\nDESARROLLO:\n${s.desarrollo.join('\n')}\n\nCIERRE: ${s.cierre}\n\nCTA: ${s.cta}\n\n--- COPY POST ---\n${s.copy_post?.titulo}\n\n${s.copy_post?.descripcion_larga}\n\nHashtags: ${s.copy_post?.hashtags?.map(h => '#' + h).join(' ')}`, i) },
                                        { icon: <Bookmark size={16} />, label: 'Guardar', action: () => saveScript(s) },
                                        { icon: <Calendar size={16} />, label: 'Planificar', action: () => router.push('/dashboard/calendar') },
                                        { icon: <TrendingUp size={16} />, label: 'Descargar', action: () => handleDownload(s) },
                                    ].map((btn, bidx) => (
                                        <button
                                            key={bidx}
                                            onClick={btn.action}
                                            className="btn-secondary"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '0.75rem',
                                                padding: '8px 14px',
                                                background: 'transparent',
                                                border: '1px solid #2A2A2A',
                                                color: 'rgba(255,255,255,0.6)'
                                            }}
                                        >
                                            {btn.icon} {btn.label}
                                        </button>
                                    ))}
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
                        {Array.isArray(planSlots) && planSlots.map((slot, i) => (
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
                                            {generatingSlotId === slot.id ? <><Loader2 className="animate-spin" size={16} style={{ marginRight: '8px', display: 'inline' }} /> Generando...</> : <><Sparkles size={16} style={{ marginRight: '8px', display: 'inline' }} /> Generar Guión</>}
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
            <style jsx>{`
                @keyframes pulse-glow {
                    from { box-shadow: 0 0 5px rgba(126, 206, 202, 0.1); border-color: rgba(126, 206, 202, 0.3); }
                    to { box-shadow: 0 0 20px rgba(126, 206, 202, 0.3); border-color: rgba(126, 206, 202, 0.6); }
                }
            `}</style>
        </div>
    );
}

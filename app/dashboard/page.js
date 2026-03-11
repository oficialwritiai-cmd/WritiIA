'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2, Sparkles, Search, X, Mic } from 'lucide-react';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';
import GenerationProgress from '@/app/components/GenerationProgress';
import SuccessModal from '@/app/components/SuccessModal';
import { saveToLibrary } from '@/lib/library';
import VoiceDictation from '@/app/components/VoiceDictation';
import { useProject } from '@/app/components/ProjectContext';



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
const DURACIONES = ['30 seg', '60 seg', '90 seg', '2 min', '3 min', '5 min'];

// 4) Bump to v2.6.1 - Resend Integration
// Forced cache refresh for deployment v2.6.1
export const VERSION = 'v2.6.1';




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
    const [quantity, setQuantity] = useState(2);
    const [ideas, setIdeas] = useState('');
    const [scripts, setScripts] = useState([]);

    // Wizard step 3 fields
    const [victory, setVictory] = useState('');
    const [opinion, setOpinion] = useState('');
    const [story, setStory] = useState('');
    const [hookType, setHookType] = useState('curiosidad extrema');
    const [intensity, setIntensity] = useState(3);
    const [videoDuration, setVideoDuration] = useState('60 seg');
    const [specificDetails, setSpecificDetails] = useState('');
    const [ctaIdea, setCtaIdea] = useState('');
    // Mini-chat state per script: { [scriptIndex]: { text, loading, error } }
    const [scriptChats, setScriptChats] = useState({});
    const [activeBlockChat, setActiveBlockChat] = useState(null); // 'i-blockType'
    const [blockChats, setBlockChats] = useState({}); // { 'i-blockType': 'instruction' }

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
    const [selectedSlots, setSelectedSlots] = useState(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState(null); // 'select' or 'deselect'
    const [contextMenu, setContextMenu] = useState(null); // { x, y }
    const [generatingSlotId, setGeneratingSlotId] = useState(null);
    const [libIdeas, setLibIdeas] = useState([]);
    const [selectedPlanIdeas, setSelectedPlanIdeas] = useState([]);
    const [planWizardStep, setPlanWizardStep] = useState(1);
    const [isGeneratingMassive, setIsGeneratingMassive] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: '' });
    const [extraIdeasModal, setExtraIdeasModal] = useState({ open: false, ideas: [], loading: false, form: { context: '', experienceLevel: '', productTicket: '', objections: '', examples: '' } });
    const [recommendedIdeas, setRecommendedIdeas] = useState([]);
    const [loadingRecommended, setLoadingRecommended] = useState(false);

    // Missing states restored
    const [profile, setProfile] = useState(null);
    const [aiCredits, setAiCredits] = useState({ total: 0, used: 0 });
    const [error, setError] = useState('');
    const [hasBrain, setHasBrain] = useState(false);
    const [brainName, setBrainName] = useState('');
    const [events, setEvents] = useState([]);
    const [calendarDate, setCalendarDate] = useState('');
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successModalData, setSuccessModalData] = useState({ title: '', message: '' });
    const [isPlanningLoading, setIsPlanningLoading] = useState(false);


    // Additional missing states
    const [improvementCounts, setImprovementCounts] = useState({});
    const [refiningBlock, setRefiningBlock] = useState(null);
    const [savedScriptsIds, setSavedScriptsIds] = useState(new Set());
    const [selectedHook, setSelectedHook] = useState({});
    const [plannedDate, setPlannedDate] = useState('');
    const [plannedTime, setPlannedTime] = useState('');
    const [planningScript, setPlanningScript] = useState(null);
    const [previousScripts, setPreviousScripts] = useState(null);
    const [presets, setPresets] = useState([]);
    const [loadingPresets, setLoadingPresets] = useState(false);
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const { activeProject, projectBrain, refreshBrain } = useProject();

    // -- Drag Selection Logic --
    const handleSlotMouseDown = (id) => {
        setIsDragging(true);
        const isSelected = selectedSlots.has(id);
        const newMode = isSelected ? 'deselect' : 'select';
        setDragMode(newMode);

        const newSelected = new Set(selectedSlots);
        if (newMode === 'select') newSelected.add(id);
        else newSelected.delete(id);
        setSelectedSlots(newSelected);
    };

    const handleSlotMouseEnter = (id) => {
        if (!isDragging) return;
        const newSelected = new Set(selectedSlots);
        if (dragMode === 'select') newSelected.add(id);
        else newSelected.delete(id);
        setSelectedSlots(newSelected);
    };

    const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDragMode(null);
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // -- Context Menu Logic --
    const handleContextMenu = (e, id) => {
        e.preventDefault();
        // If clicking on an unselected slot, select only that one
        if (!selectedSlots.has(id)) {
            setSelectedSlots(new Set([id]));
        }
        setContextMenu({ x: e.pageX, y: e.pageY });
    };

    const closeContextMenu = () => setContextMenu(null);

    useEffect(() => {
        window.addEventListener('click', closeContextMenu);
        return () => window.removeEventListener('click', closeContextMenu);
    }, []);

    const handleToggleSlotSelection = (id) => {
        const newSelected = new Set(selectedSlots);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedSlots(newSelected);
    };

    const handleToggleSelectAll = () => {
        if (selectedSlots.size === planSlots.length) {
            setSelectedSlots(new Set());
        } else {
            setSelectedSlots(new Set(planSlots.map(s => s.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSlots.size === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedSlots.size} ideas?`)) return;

        try {
            const idsToDelete = Array.from(selectedSlots);
            const { error } = await supabase.from('content_slots').delete().in('id', idsToDelete);
            if (error) throw error;

            setPlanSlots(prev => prev.filter(s => !selectedSlots.has(s.id)));
            setSelectedSlots(new Set());
        } catch (err) {
            console.error('Error in handleBulkDelete:', err);
            alert('Error al eliminar las ideas');
        }
    };

    const handleConfirmAndSync = async () => {
        const slotsToSync = planSlots.filter(s => selectedSlots.has(s.id));
        if (slotsToSync.length === 0) {
            alert('Selecciona al menos una idea para sincronizar');
            return;
        }
        await handleSendPlanToCalendar(slotsToSync);
        alert('¡Calendario sincronizado con éxito! ✓');
        // Optionally move to calendar or stay
    };

    useEffect(() => {
        // Clear generation results when switching project to avoid confusion
        setScripts([]);
        setStep(1);
        setTopic('');
        setIdeas('');
        setLibIdeas([]); // Clear library ideas too
        loadData();
    }, [activeProject]);

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Profile
        const { data: profileData } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
        setProfile(profileData || user);

        // Credits
        const { data: creds } = await supabase.from('ai_credits').select('*').eq('user_id', user.id).single();
        if (creds) {
            setAiCredits({ total: creds.total_credits || 0, used: creds.used_credits || 0 });
        }

        // Library Ideas - FILTERED BY PROJECT
        let query = supabase.from('library').select('*').eq('user_id', user.id).eq('type', 'idea');
        if (activeProject) {
            query = query.eq('project_id', activeProject.id);
        } else {
            query = query.is('project_id', null);
        }
        const { data: ideasData } = await query.order('created_at', { ascending: false });
        setLibIdeas(ideasData || []);
        fetchPresets(user.id);

        // Load next 30 days of events for collision avoidance
        const start = new Date().toISOString().split('T')[0];
        const end = new Date();
        end.setDate(end.getDate() + 30);
        const { data: eventData } = await supabase
            .from('calendar_events')
            .select('event_date')
            .eq('user_id', user.id)
            .gte('event_date', start)
            .lte('event_date', end.toISOString().split('T')[0]);
        setEvents(eventData || []);
    }
    const fetchPresets = async (userId) => {
        if (!userId) return;
        setLoadingPresets(true);
        try {
            let query = supabase.from('strategy_presets').select('*').eq('user_id', userId);
            if (activeProject) {
                query = query.eq('project_id', activeProject.id);
            } else {
                query = query.is('project_id', null);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setPresets(data || []);
        } catch (err) {
            console.error('Error fetching presets:', err);
        } finally {
            setLoadingPresets(false);
        }
    };

    const handleSavePreset = async () => {
        if (!newPresetName.trim()) {
            alert('Ingresa un nombre para el preajuste');
            return;
        }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('strategy_presets').insert({
                user_id: user.id,
                project_id: activeProject?.id,
                name: newPresetName,
                config: {
                    context: extraIdeasModal.form.context,
                    experienceLevel: extraIdeasModal.form.experienceLevel,
                    productTicket: extraIdeasModal.form.productTicket,
                    objections: extraIdeasModal.form.objections,
                    examples: extraIdeasModal.form.examples
                }
            });
            if (error) throw error;
            alert('✅ Preajuste guardado');
            setIsNamingModalOpen(false);
            setNewPresetName('');
            fetchPresets(user.id);
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        }
    };

    // Brain Setup (Project Scoped)
    useEffect(() => {
        if (projectBrain) {
            setBrainProfile(projectBrain);
            setHasBrain(true);
            setBrainForm({
                biography: projectBrain.biography || '',
                sells: projectBrain.products_services || '',
                helps: projectBrain.audience || '',
                style_words: projectBrain.style_words || ''
            });
        } else {
            setBrainProfile(null);
            setHasBrain(false);
        }
    }, [projectBrain]);
    const [isSuggestingAI, setIsSuggestingAI] = useState(false);
    const [suggestedReasoning, setSuggestedReasoning] = useState('');

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
                if (params.get('description')) setIdeas(decodeURIComponent(params.get('description')));
                if (forceCount) setQuantity(forceCount);
                if (params.get('date')) setCalendarDate(params.get('date'));
            }
        }
    }, [supabase, router]);

    useEffect(() => {
        if (generationMode === 'plan' && planWizardStep === 1) {
            fetchLibraryIdeas();
            if (activeProject && recommendedIdeas.length === 0) {
                fetchProactiveIdeas();
            }
        }
    }, [generationMode, planWizardStep, activeProject]);

    const fetchProactiveIdeas = async () => {
        if (!profile?.id || !activeProject) return;
        setLoadingRecommended(true);
        try {
            const res = await fetch('/api/ideas-extra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile.id,
                    projectId: activeProject.id,
                    proactive: true,
                    context: 'Generación proactiva basada en cerebro' // Dummy context for validation
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRecommendedIdeas(data.ideas || []);
            }
        } catch (err) {
            console.error('Error fetching proactive ideas:', err);
        } finally {
            setLoadingRecommended(false);
        }
    };

    const fetchLibraryIdeas = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase.from('library').select('*').eq('user_id', user.id).eq('type', 'idea');

        // Filter by project if active
        if (activeProject) {
            query = query.eq('project_id', activeProject.id);
        } else {
            query = query.is('project_id', null);
        }

        const { data } = await query.order('created_at', { ascending: false });
        setLibIdeas(data || []);
    };

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
                if (params.get('description')) setIdeas(decodeURIComponent(params.get('description')));

                setGenerationMode('single');
                setWizardStep(3); // Land on Step 3 (Details/Hooks)
                setStep(1); // Stay on form view

                // Do not clear history yet if we need source_event_id in handleSaveScript
                // window.history.replaceState({}, document.title, '/dashboard');
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

        if (wizardStep === 3 && generationMode === 'single' && !ctaIdea.trim()) {
            setError('Por favor, indica una idea para el CTA.');
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
            const finalQuantity = urlCount ? parseInt(urlCount) : (quantity || 2);

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
                intensity: intensity || 3,
                videoDuration: videoDuration || '60 seg',
                specificDetails: specificDetails || '',
                ctaIdea: ctaIdea || '',
                sourceType: params.get('source_type') || null,
                sourceReferenceId: params.get('source_reference_id') || null,
                projectId: activeProject?.id
            };
            console.log('[Dashboard] Sending request:', requestBody);

            const res = await fetch('/api/generate-scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                setStep(1);
                return;
            }

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

    async function handleRefineBlock(scriptIndex, blockType, instruction = null) {
        const key = `${scriptIndex}-${blockType}`;
        const currentCount = improvementCounts[key] || 0;

        if (currentCount >= 3) {
            alert('Límite de mejoras alcanzado para este bloque.');
            return;
        }

        const available = aiCredits.total - aiCredits.used;
        if (available < 1) {
            window.dispatchEvent(new CustomEvent('show-no-credits'));
            return;
        }

        // If no instruction provided and chat is not active, just open the chat
        // Unless it's a direct call from the mini-chat button
        if (instruction === null && activeBlockChat !== key) {
            setActiveBlockChat(key);
            return;
        }

        // Save current state for "Undo"
        setPreviousScripts(JSON.parse(JSON.stringify(scripts)));
        setRefiningBlock(key);

        const script = scripts[scriptIndex];
        if (!script) {
            alert('Error: No se encontró el guion');
            setRefiningBlock(null);
            return;
        }

        let text = '';
        const desarrolloArray = Array.isArray(script.desarrollo) ? script.desarrollo : [];
        if (blockType === 'gancho') text = script.gancho || '';
        else if (blockType.startsWith('punto')) {
            const index = parseInt(blockType.replace('punto', '')) - 1;
            text = desarrolloArray[index] || '';
        }
        else if (blockType === 'cta') text = script.cta || '';

        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    type: blockType.includes('punto') ? 'desarrollo' : blockType,
                    instruction: instruction || '',
                    context: `Guion sobre ${topic} para ${platform}. Ángulo: ${script.titulo_angulo || script.titulo_guion}`,
                    userId: profile.id,
                    projectId: activeProject?.id
                }),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                return;
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const updatedScripts = [...scripts];
            // Ensure desarrollo is an array
            if (!Array.isArray(updatedScripts[scriptIndex].desarrollo)) {
                updatedScripts[scriptIndex].desarrollo = ['', '', ''];
            }

            if (blockType === 'gancho') {
                updatedScripts[scriptIndex].gancho = data.refinedText;
                updatedScripts[scriptIndex].hook = data.refinedText;
            }
            else if (blockType === 'punto1') updatedScripts[scriptIndex].desarrollo[0] = data.refinedText;
            else if (blockType === 'punto2') updatedScripts[scriptIndex].desarrollo[1] = data.refinedText;
            else if (blockType === 'punto3') updatedScripts[scriptIndex].desarrollo[2] = data.refinedText;
            else if (blockType === 'cta') updatedScripts[scriptIndex].cta = data.refinedText;

            setScripts(updatedScripts);
            setImprovementCounts({ ...improvementCounts, [key]: currentCount + 1 });

            // Clear instruction and close chat
            setBlockChats({ ...blockChats, [key]: '' });
            setActiveBlockChat(null);

            // Refresh credits balance in header
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            if (profile?.id) fetchCredits(profile.id);
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

        // Pre-check credits: 5 (plan) + postCount (for each script)
        let postCount = 12;
        if (planFrequency === '4 publicaciones por semana') postCount = 16;
        if (planFrequency === '5 publicaciones por semana') postCount = 20;
        if (planFrequency === '7 publicaciones por semana') postCount = 28;

        const totalCost = 5 + postCount;
        const available = aiCredits.total - aiCredits.used;

        if (available < totalCost) {
            setError(`Créditos insuficientes. Necesitas ${totalCost} créditos (5 para el plan + ${postCount} para los guiones) y tienes ${available}.`);
            return;
        }

        setStep(2); // Show initial general loader
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
                    tone: toneBrand || 'Profesional',
                    videoDuration: videoDuration || '60 seg',
                    postCount: postCount,
                    userId: profile?.id,
                    selectedIdeas: selectedPlanIdeas.map(id => {
                        if (id.startsWith('extra-')) {
                            const idx = parseInt(id.replace('extra-', ''));
                            const extraIdea = extraIdeasModal.ideas[idx];
                            return extraIdea ? `${extraIdea.titulo_idea}: ${extraIdea.descripcion || ''}` : null;
                        }
                        if (id.startsWith('rec-')) {
                            const idx = parseInt(id.replace('rec-', ''));
                            const recIdea = recommendedIdeas[idx];
                            return recIdea ? `${recIdea.titulo_idea}: ${recIdea.descripcion || ''}` : null;
                        }
                        const idea = libIdeas.find(li => li.id === id);
                        return idea ? `${idea.titulo}: ${idea.content?.descripcion || ''}` : null;
                    }).filter(Boolean),
                    projectId: activeProject?.id
                }),
            });
            const data = await res.json();
            const slots = data.slots || [];

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const slotsWithDates = slots.map((slot, index) => {
                let scheduledDate = slot.scheduled_date;
                if (!scheduledDate) {
                    const slotDate = new Date(currentYear, currentMonth, today.getDate() + index);
                    scheduledDate = slotDate.toISOString().split('T')[0];
                }
                return { ...slot, scheduled_date: scheduledDate };
            });

            setPlanSlots(slotsWithDates);

            for (const slot of slotsWithDates) {
                await supabase.from('content_slots').update({
                    scheduled_date: slot.scheduled_date
                }).eq('id', slot.id);
            }

            setStep(3);
            setIsGeneratingMassive(true);
            setGenerationProgress({ current: 0, total: slotsWithDates.length, status: 'Iniciando generación masiva...' });

            const slotsWithScripts = [];
            for (let i = 0; i < slotsWithDates.length; i++) {
                const slot = slotsWithDates[i];
                setGenerationProgress({ current: i + 1, total: slotsWithDates.length, status: `Generando guion ${i + 1} de ${slotsWithDates.length}: ${slot.idea_title}` });

                try {
                    const result = await handleGenerateSlotScript(slot, true);
                    slotsWithScripts.push({
                        ...slot,
                        has_script: !!result,
                        script_id: result?.script?.id || null,
                        script_data: result?.script_data || null
                    });
                } catch (e) {
                    console.error(`Error generating script for slot ${slot.id}:`, e);
                    slotsWithScripts.push({ ...slot, has_script: false, script_id: null, script_data: null });
                }
            }

            setPlanSlots(slotsWithScripts);
            // Initially select all slots
            setSelectedSlots(new Set(slotsWithScripts.map(s => s.id)));
            setIsGeneratingMassive(false);
            setGenerationProgress({ current: slotsWithScripts.length, total: slotsWithScripts.length, status: '¡Plan generado! Revisa y confirma para sincronizar.' });

            setExtraIdeasModal({ ...extraIdeasModal, ideas: [] });

        } catch (err) {
            setError(err.message);
            setStep(1);
        }
    }

    const [stats, setStats] = useState({ generated: 0, saved: 0, monthGenerations: 0 });

    useEffect(() => {
        if (!profile?.id) return;
        const fetchStats = async () => {
            const userId = profile.id;
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            let genQuery = supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
            let savQuery = supabase.from('scripts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_saved', true);
            let monQuery = supabase.from('usage_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('action', ['generate_scripts', 'generate_plan']).gte('created_at', startOfMonth.toISOString());

            if (activeProject) {
                genQuery = genQuery.eq('project_id', activeProject.id);
                savQuery = savQuery.eq('project_id', activeProject.id);
                monQuery = monQuery.eq('project_id', activeProject.id);
            } else {
                genQuery = genQuery.is('project_id', null);
                savQuery = savQuery.is('project_id', null);
                monQuery = monQuery.is('project_id', null);
            }

            const { count: gen } = await genQuery;
            const { count: sav } = await savQuery;
            const { count: mon } = await monQuery;

            setStats({ generated: gen || 0, saved: sav || 0, monthGenerations: mon || 0 });
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

    const formatFullScript = (script) => {
        const hook = script.hook || script.gancho || '';
        const des = (Array.isArray(script.desarrollo) ? script.desarrollo : (script.puntos ? script.puntos : [])).join('\n');
        const cta = script.cta || script.cierre || '';
        const copy = script.copy_post || {};
        const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : '';

        return `TÍTULO: ${script.titulo_guion || script.titulo_angulo || 'Sin título'}\n\nGANCHO:\n${hook}\n\nDESARROLLO:\n${des}\n\nCTA:\n${cta}\n\nCOPY POST:\n${copy.descripcion_larga || ''}\n\nHASHTAGS:\n${hashtags}`;
    };

    const saveScript = async (script, silent = false) => {
        if (!profile?.id) return;

        const fullText = formatFullScript(script);

        try {
            await saveToLibrary({
                userId: profile.id,
                type: 'guion',
                platform: script.platform || platform || 'General',
                goal: script.goal || goal || 'engagement',
                titulo: script.titulo_guion || script.titulo_angulo || 'Sin título',
                script_full_text: fullText,
                content: {
                    video_duration: script.video_duration || '45-60 seg',
                    hook: script.hook || script.gancho || '',
                    desarrollo: Array.isArray(script.desarrollo) ? script.desarrollo : [],
                    cierre: script.cierre || '',
                    cta: script.cta || '',
                    copy_post: script.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                },
                tags: ['guion', script.platform || platform, script.goal || goal].filter(Boolean),
                projectId: activeProject?.id
            });


            if (!silent) alert('Guardado en biblioteca ✓');
        } catch (err) {
            console.error('Error saving script:', err);
            if (!silent) throw err;
        }
    };

    const handleSaveScript = async (scriptObj) => {
        try {
            await saveScript(scriptObj);
            setSavedScriptsIds(prev => new Set([...prev, scriptObj.id || scriptObj.titulo_guion || scriptObj.titulo_angulo]));
        } catch (err) {
            console.error('Error in handleSaveScript:', err);
        }
    };

    const handleOpenPlanner = (script) => {
        setPlanningScript(script);
        setSuggestedReasoning(''); // Reset old reasoning

        // Advanced date suggestion: avoid existing events
        const findBestDate = () => {
            const start = new Date();
            start.setDate(start.getDate() + 1); // Start from tomorrow

            // Search for the next 30 days
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(start);
                checkDate.setDate(start.getDate() + i);
                const dateStr = checkDate.toISOString().split('T')[0];

                // Check if any event already exists on this day
                const hasExisting = events && events.some(e => e.event_date === dateStr);
                if (!hasExisting) return dateStr;
            }
            return start.toISOString().split('T')[0];
        };

        setPlannedDate(findBestDate());

        // Suggest time based on platform
        let bestTime = '18:00';
        const p = (script.platform || '').toLowerCase();
        if (p.includes('linkedin')) bestTime = '08:30';
        if (p.includes('youtube')) bestTime = '11:00';
        if (p.includes('tiktok') || p.includes('instagram') || p.includes('reels')) bestTime = '20:15';
        setPlannedTime(bestTime);

        setIsPlannerModalOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAISuggestion = async () => {
        if (!planningScript || !brainProfile) return;
        setIsSuggestingAI(true);
        try {
            const res = await fetch('/api/suggest-planning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: planningScript.titulo_guion || planningScript.titulo_angulo || topic,
                    platform: planningScript.platform || platform || 'General',
                    brainProfile,
                    existingEvents: events.map(e => e.event_date),
                    projectId: activeProject?.id
                })
            });
            const data = await res.json();
            if (data.suggestedDate) {
                setPlannedDate(data.suggestedDate);
                setPlannedTime(data.suggestedTime);
                setSuggestedReasoning(data.reasoning);
            }
        } catch (err) {
            console.error('Error in handleAISuggestion:', err);
        } finally {
            setIsSuggestingAI(false);
        }
    };

    const handleConfirmPlanning = async () => {
        if (!planningScript || !plannedDate) return;
        setIsPlanningLoading(true);

        try {
            // 1. First save script to library to get a reference_id
            let scriptId = planningScript.id;

            // ALways save/update to library to ensure full data (forced save)
            const savedItem = await saveToLibrary({
                userId: profile.id,
                type: 'guion',
                platform: planningScript.platform || platform || 'General',
                goal: planningScript.goal || goal || 'engagement',
                titulo: planningScript.titulo_guion || planningScript.titulo_angulo || 'Sin título',
                content: {
                    video_duration: planningScript.video_duration || '45-60 seg',
                    hook: planningScript.hook || planningScript.gancho || '',
                    desarrollo: Array.isArray(planningScript.desarrollo) ? planningScript.desarrollo : (planningScript.puntos ? planningScript.puntos : []),
                    cierre: planningScript.cierre || '',
                    cta: planningScript.cta || planningScript.cierre || '',
                    copy_post: planningScript.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                },
                tags: ['guion', planningScript.platform || platform, 'planificado'].filter(Boolean),
                projectId: activeProject?.id
            });
            scriptId = savedItem.id;

            // 2. Insert into calendar_events with 'En preparación' status
            const { error: calErr } = await supabase.from('calendar_events').insert({
                user_id: profile.id,
                event_date: plannedDate,
                title: planningScript.titulo_guion || 'Guion Planificado',
                platform: planningScript.platform || platform || 'General',
                type: 'guion',
                script_full_text: formatFullScript(planningScript),
                content: {
                    video_duration: planningScript.video_duration || '45-60 seg',
                    hook: planningScript.hook || planningScript.gancho || '',
                    desarrollo: Array.isArray(planningScript.desarrollo) ? planningScript.desarrollo : (planningScript.puntos ? planningScript.puntos : []),
                    cierre: planningScript.cierre || '',
                    cta: planningScript.cta || planningScript.cierre || '',
                    copy_post: planningScript.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                },
                project_id: activeProject?.id
            });


            if (calErr) throw calErr;

            setSuccessModalData({
                title: '¡Añadido al Calendario! ✅',
                message: `Tu contenido ha sido agendado correctamente para el ${plannedDate} a las ${plannedTime}. (Estado: En preparación)`,
                actionLabel: 'Ver Calendario',
                actionRedirect: '/dashboard/calendar'
            });
            setIsPlannerModalOpen(false);
            setIsSuccessModalOpen(true);
        } catch (err) {
            console.error('Error planning script:', err);
            alert('Error al planificar: ' + err.message);
        } finally {
            setIsPlanningLoading(false);
        }
    };

    const handleTogglePlatform = (p) => {
        if (planPlatforms.includes(p)) {
            setPlanPlatforms(planPlatforms.filter(pl => pl !== p));
        } else {
            setPlanPlatforms([...planPlatforms, p]);
        }
    };

    const handleGenerateSlotScript = async (slot, silent = false) => {
        setGeneratingSlotId(slot.id);

        try {
            const res = await fetch('/api/generate-scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: slot.idea_title,
                    platform: slot.platform,
                    tone: toneBrand || 'Profesional',
                    goal: slot.goal,
                    count: 1,
                    videoDuration: videoDuration || '60 seg',
                    ideas: `Enfoque: ${slot.content_type}`,
                    userId: profile?.id,
                    projectId: activeProject?.id
                }),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                return null;
            }

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

            const desarrolloStr = Array.isArray(generatedScript.desarrollo) ? generatedScript.desarrollo.join('\n') : (generatedScript.desarrollo || '');
            const fullContent = (generatedScript.gancho || '') + '\n\n' + desarrolloStr + '\n\n' + (generatedScript.cta || '');
            const insertPayload = {
                user_id: profile.id,
                content: fullContent,
                platform: slot.platform,
                topic: slot.idea_title,
                tone: toneBrand || 'Profesional',
                is_saved: true,
                project_id: activeProject?.id
            };

            if (slot.scheduled_date) {
                insertPayload.scheduled_date = slot.scheduled_date;
            }

            const { data: insertedScript, error: scriptErr } = await supabase.from('scripts').insert(insertPayload).select().single();

            if (scriptErr) throw scriptErr;

            const { error: slotErr } = await supabase.from('content_slots').update({
                has_script: true,
                script_id: insertedScript.id
            }).eq('id', slot.id);

            if (slotErr) throw slotErr;

            const slotScriptData = {
                hook: generatedScript.gancho || '',
                desarrollo: Array.isArray(generatedScript.desarrollo) ? generatedScript.desarrollo : (generatedScript.desarrollo ? [generatedScript.desarrollo] : []),
                cta: generatedScript.cta || generatedScript.cierre || '',
                copy_post: generatedScript.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
            };

            setPlanSlots(planSlots.map(s => {
                if (s.id === slot.id) return {
                    ...s,
                    has_script: true,
                    script_id: insertedScript.id,
                    script_data: slotScriptData
                };
                return s;
            }));

            return { script: insertedScript, script_data: slotScriptData };

        } catch (err) {
            if (!silent) alert(err.message);
            console.error('[Dashboard] Error generating script:', err);
            return null;
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

            const slot = planSlots.find(s => s.id === slotId);
            if (slot && slot.script_id) {
                await supabase.from('scripts').update({ scheduled_date: dateValue }).eq('id', slot.script_id);
            }

            alert('Añadido al calendario ✅');
        } catch (err) {
            alert('Error al programar: ' + err.message);
        }
    };

    const [sendingToCalendar, setSendingToCalendar] = useState(false);

    const handleSendPlanToCalendar = async (slotsToSend = null) => {
        const slots = slotsToSend || planSlots;

        if (!profile?.id) {
            alert('Error: No hay sesión de usuario');
            return;
        }
        if (!slots || slots.length === 0) {
            alert('No hay contenido para enviar al calendario');
            return;
        }

        setSendingToCalendar(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión');

            const existingPlanId = slots[0]?.plan_id;
            let planId = existingPlanId;

            if (!planId) {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                const { data: planData, error: planError } = await supabase
                    .from('content_plans')
                    .insert({
                        user_id: user.id,
                        project_id: activeProject?.id,
                        month: currentMonth,
                        year: currentYear,
                        frequency: `${slots.length} publicaciones`,
                        platforms: [...new Set(slots.map(s => s.platform))],
                        focus: 'plan_mensual'
                    })
                    .select()
                    .single();

                if (planError) throw planError;
                planId = planData.id;
            }

            const eventsToInsert = [];

            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];

                let targetDate = slot.scheduled_date;
                if (!targetDate) {
                    const slotDate = new Date();
                    slotDate.setDate(slotDate.getDate() + i + 1);
                    targetDate = slotDate.toISOString().split('T')[0];
                }

                const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

                let refId = slot.id && isValidUUID(slot.id) ? slot.id : null;

                if (!refId) {
                    const { data: savedIdea } = await supabase.from('library').insert({
                        user_id: user.id,
                        project_id: activeProject?.id,
                        type: 'idea',
                        platform: slot.platform,
                        goal: slot.goal,
                        titulo: slot.idea_title,
                        content: { ...slot },
                        tags: [slot.platform, slot.content_type, slot.goal].filter(Boolean),
                        status: 'planificado'
                    }).select().single();

                    if (savedIdea?.id) {
                        refId = savedIdea.id;
                    }
                }

                eventsToInsert.push({
                    user_id: user.id,
                    project_id: activeProject?.id,
                    title: slot.idea_title || 'Idea Sin Título',
                    description: `Tipo: ${slot.content_type}\nObjetivo: ${slot.goal}\nPlataforma: ${slot.platform}`,
                    event_date: targetDate,
                    type: slot.content_type || 'idea',
                    platform: slot.platform,
                    reference_id: refId,
                    has_script: slot.has_script || false,
                    script_full_text: slot.script_data ? `TÍTULO: ${slot.idea_title}\n\nGANCHO:\n${slot.script_data.hook}\n\nDESARROLLO:\n${slot.script_data.desarrollo.join('\n')}\n\nCTA:\n${slot.script_data.cta}\n\nCOPY POST:\n${slot.script_data.copy_post?.descripcion_larga || ''}\n\nHASHTAGS:\n${Array.isArray(slot.script_data.copy_post?.hashtags) ? slot.script_data.copy_post.hashtags.map(t => '#' + t).join(' ') : ''}` : null,
                    content: slot.script_data || {
                        hook: slot.idea_title,
                        desarrollo: [slot.goal, slot.content_type],
                        cta: 'Click aquí'
                    }
                });

            }

            const { error: eventError } = await supabase
                .from('calendar_events')
                .insert(eventsToInsert);

            if (eventError) throw eventError;

            setPlanSlots(slots.map(s => ({ ...s, sent_to_calendar: true })));

            alert(`✅ Plan enviado al calendario: ${slots.length} eventos creados`);
            router.push('/dashboard/calendar');

        } catch (err) {
            console.error('[Plan Mensual] Error sending to calendar:', err);
            alert('Error al enviar al calendario: ' + err.message);
        } finally {
            setSendingToCalendar(false);
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
            {/* Header / Stats */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Sparkles size={16} color="#7ECECA" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Créditos IA: {aiCredits.total - aiCredits.used} / {aiCredits.total}</span>
                    <button onClick={handleBuyCredits} style={{ background: 'var(--accent-gradient)', color: 'black', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Comprar más</button>
                </div>
            </div>
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {[
                    { label: 'Generaciones Realizadas', val: stats.monthGenerations, sub: 'Mes actual', color: '#9D00FF' },
                    { label: 'Guiones Guardados', val: stats.saved, sub: 'Total histórico', color: '#F59E0B' },
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
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Duración del video</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {DURACIONES.map(d => (
                                        <button key={d} onClick={() => setVideoDuration(d)} style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: videoDuration === d ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: videoDuration === d ? 'black' : 'white', fontWeight: videoDuration === d ? 700 : 400 }}>{d}</button>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Sobre qué va el contenido</p>
                                    <VoiceDictation onResult={(text) => setTopic(prev => prev ? `${prev} ${text}` : text)} />
                                </div>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Idea para el CTA <span style={{ color: '#FF4D4D' }}>*</span></p>
                                        <VoiceDictation onResult={(text) => setCtaIdea(prev => prev ? `${prev} ${text}` : text)} />
                                    </div>
                                    <input
                                        className="input-field"
                                        placeholder="Ej: Que comenten la palabra 'IA', que vayan al link de mi bio, que me pidan una demo..."
                                        value={ctaIdea}
                                        onChange={(e) => setCtaIdea(e.target.value)}
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Temas o detalles específicos <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(opcional pero recomendado)</span></p>
                                    <VoiceDictation onResult={(text) => setSpecificDetails(prev => prev ? `${prev} ${text}` : text)} />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Ej: "Lista las 5 mejores IA para crear contenido: Notion AI, Jasper, Copy.ai, ChatGPT, Claude" · "Habla del error de publicar sin estrategia" · "Añade la técnica del loop abierto"</p>
                                <textarea
                                    className="textarea-field"
                                    placeholder="Escribe aquí los temas, herramientas, listas o puntos clave que quieres que cubra el guion…"
                                    value={specificDetails}
                                    onChange={(e) => setSpecificDetails(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.85rem' }}
                                />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Cantidad de guiones</p>
                                <input type="range" min="1" max="4" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#7ECECA' }} />
                                <p style={{ textAlign: 'center', marginTop: '8px', fontWeight: 700, color: '#7ECECA' }}>{quantity} guiones</p>
                            </div>

                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p style={{ fontSize: '0.85rem', color: '#7ECECA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0 }}>
                                    <Mic size={16} /> Puedes rellenar cada campo hablando: pulsa el icono del micrófono y dicta tu idea.
                                </p>
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
            {
                step === 1 && generationMode === 'plan' && (
                    <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', gap: '16px' }}>
                            {[1, 2].map(w => (
                                <div key={w} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        background: planWizardStep >= w ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
                                        color: planWizardStep >= w ? 'black' : 'rgba(255,255,255,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem'
                                    }}>
                                        {planWizardStep > w ? '✓' : w}
                                    </div>
                                    <span style={{ color: planWizardStep >= w ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: planWizardStep === w ? 700 : 400, fontSize: '0.85rem' }}>
                                        {w === 1 ? 'Ideas Base' : 'Configuración'}
                                    </span>
                                    {w < 2 && <div style={{ width: '40px', height: '2px', background: planWizardStep > w ? '#7ECECA' : 'rgba(255,255,255,0.1)' }} />}
                                </div>
                            ))}
                        </div>

                        <h2 style={{ fontSize: '1.8rem', marginBottom: '32px', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                            {planWizardStep === 1 ? 'Paso 1: Selecciona Ideas del Banco' : 'Paso 2: Detalles del Plan'}
                            {planWizardStep === 1 && (
                                <button
                                    onClick={() => setExtraIdeasModal({ ...extraIdeasModal, open: true })}
                                    className="btn-secondary"
                                    style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Search size={16} /> Explorar más ideas
                                </button>
                            )}
                        </h2>

                        {planWizardStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    Escoge las ideas en las que quieres basar tu mes. La IA las expandirá y creará guiones coherentes.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                                    {loadingRecommended && (
                                        <div style={{ gridColumn: '1 / -1', padding: '20px', background: 'rgba(126, 206, 202, 0.05)', borderRadius: '16px', border: '1px dashed rgba(126, 206, 202, 0.2)', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                <Loader2 size={16} className="animate-spin" color="#7ECECA" />
                                                <span style={{ fontSize: '0.9rem', color: '#7ECECA' }}>IA analizando tu perfil para sugerir ideas virales...</span>
                                            </div>
                                        </div>
                                    )}
                                    {(libIdeas.length > 0 || recommendedIdeas.length > 0 || extraIdeasModal.ideas.length > 0) ? (
                                        <>
                                            {/* Recommended Ideas (Proactive) */}
                                            {recommendedIdeas.length > 0 && (
                                                <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <Sparkles size={16} color="#7ECECA" />
                                                        <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7ECECA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sugerencias para tu Estrategia (IA)</h5>
                                                    </div>
                                                </div>
                                            )}
                                            {recommendedIdeas.map((idea, idx) => {
                                                const ideaId = `rec-${idx}`;
                                                return (
                                                    <div
                                                        key={ideaId}
                                                        onClick={() => {
                                                            if (selectedPlanIdeas.includes(ideaId)) {
                                                                setSelectedPlanIdeas(selectedPlanIdeas.filter(id => id !== ideaId));
                                                            } else {
                                                                setSelectedPlanIdeas([...selectedPlanIdeas, ideaId]);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '20px',
                                                            background: selectedPlanIdeas.includes(ideaId) ? 'rgba(126, 206, 202, 0.1)' : 'rgba(255,255,255,0.02)',
                                                            borderRadius: '16px',
                                                            border: selectedPlanIdeas.includes(ideaId) ? '2px solid #7ECECA' : '1px solid rgba(255,255,255,0.1)',
                                                            cursor: 'pointer',
                                                            transition: '0.2s',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            {idea.categoria && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>{idea.categoria}</span>}
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #7ECECA', background: selectedPlanIdeas.includes(ideaId) ? '#7ECECA' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {selectedPlanIdeas.includes(ideaId) && <CheckCircle2 size={14} color="black" />}
                                                            </div>
                                                        </div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px', paddingRight: '70px' }}>{idea.titulo_idea}</h4>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {idea.descripcion}
                                                        </p>
                                                    </div>
                                                );
                                            })}

                                            {/* Extra Ideas (Manual Search) */}
                                            {extraIdeasModal.ideas.length > 0 && (
                                                <div style={{ gridColumn: '1 / -1', margin: '20px 0 10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <Search size={16} color="var(--text-secondary)" />
                                                        <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nuevas Ideas Encontradas</h5>
                                                    </div>
                                                </div>
                                            )}
                                            {extraIdeasModal.ideas.map((idea, idx) => {
                                                const ideaId = `extra-${idx}`;
                                                return (
                                                    <div
                                                        key={ideaId}
                                                        onClick={() => {
                                                            if (selectedPlanIdeas.includes(ideaId)) {
                                                                setSelectedPlanIdeas(selectedPlanIdeas.filter(id => id !== ideaId));
                                                            } else {
                                                                setSelectedPlanIdeas([...selectedPlanIdeas, ideaId]);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '20px',
                                                            background: selectedPlanIdeas.includes(ideaId) ? 'rgba(126, 206, 202, 0.1)' : 'rgba(157, 0, 255, 0.05)',
                                                            borderRadius: '16px',
                                                            border: selectedPlanIdeas.includes(ideaId) ? '2px solid #7ECECA' : '1px solid rgba(157, 0, 255, 0.3)',
                                                            cursor: 'pointer',
                                                            transition: '0.2s',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '0.65rem', background: '#9D00FF', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>NUEVA</span>
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #7ECECA', background: selectedPlanIdeas.includes(ideaId) ? '#7ECECA' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {selectedPlanIdeas.includes(ideaId) && <CheckCircle2 size={14} color="black" />}
                                                            </div>
                                                        </div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px', paddingRight: '70px' }}>{idea.titulo_idea}</h4>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {idea.descripcion}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                            {/* Idea Bank */}
                                            {libIdeas.length > 0 && (
                                                <div style={{ gridColumn: '1 / -1', margin: '20px 0 10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <Bookmark size={16} color="var(--text-secondary)" />
                                                        <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ideas de tu Banco</h5>
                                                    </div>
                                                </div>
                                            )}
                                            {libIdeas.map(idea => (
                                                <div
                                                    key={idea.id}
                                                    onClick={() => {
                                                        if (selectedPlanIdeas.includes(idea.id)) {
                                                            setSelectedPlanIdeas(selectedPlanIdeas.filter(id => id !== idea.id));
                                                        } else {
                                                            setSelectedPlanIdeas([...selectedPlanIdeas, idea.id]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '20px',
                                                        background: selectedPlanIdeas.includes(idea.id) ? 'rgba(126, 206, 202, 0.1)' : 'rgba(255,255,255,0.02)',
                                                        borderRadius: '16px',
                                                        border: selectedPlanIdeas.includes(idea.id) ? '2px solid #7ECECA' : '1px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer',
                                                        transition: '0.2s',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #7ECECA', background: selectedPlanIdeas.includes(idea.id) ? '#7ECECA' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {selectedPlanIdeas.includes(idea.id) && <CheckCircle2 size={14} color="black" />}
                                                        </div>
                                                    </div>
                                                    <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px', paddingRight: '24px' }}>
                                                        {(() => {
                                                            let c = idea.content; if (typeof c === 'string') try { c = JSON.parse(c) } catch (e) { c = {} }; c = c || {};
                                                            return idea.titulo || c.titulo_idea || c.Título || c.Titulo || c.titulo || c.hook?.substring(0, 40) || 'Idea sin título';
                                                        })()}
                                                    </h4>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {(() => {
                                                            let c = idea.content; if (typeof c === 'string') try { c = JSON.parse(c) } catch (e) { c = {} }; c = c || {};
                                                            return c.descripcion || c.Descripción || c.Descripcion || c.hook || idea.descripcion || (c.desarrollo ? c.desarrollo[0] : 'Sin descripción disponible');
                                                        })()}
                                                    </p>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                                            <p style={{ color: 'var(--text-muted)' }}>No tienes ideas en tu banco todavía.</p>
                                            <button onClick={() => router.push('/dashboard/viral')} className="btn-secondary" style={{ marginTop: '12px' }}>Ir a Estrategia →</button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                    <button onClick={() => setGenerationMode('single')} className="btn-secondary" style={{ flex: 1 }}>Volver</button>
                                    <button onClick={() => setPlanWizardStep(2)} className="btn-primary" style={{ flex: 2 }}>Continuar ({selectedPlanIdeas.length} seleccionadas) →</button>
                                </div>
                            </div>
                        )}

                        {planWizardStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Describe tu marca y objetivos extra del mes</p>
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

                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Duración de los videos</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {DURACIONES.map(d => (
                                            <button key={d} onClick={() => setVideoDuration(d)} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: videoDuration === d ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: videoDuration === d ? 'black' : 'white' }}>{d}</button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                    <button onClick={() => setPlanWizardStep(1)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                    <button onClick={handleGeneratePlan} className="btn-primary" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>Generar Plan de 30 días →</button>
                                </div>
                                {error && <p style={{ color: '#FF4D4D', textAlign: 'center' }}>{error}</p>}
                            </div>
                        )}
                    </div>
                )
            }

            {
                step === 2 && (
                    <GenerationProgress
                        steps={loadingSteps}
                        currentPhase={loadingPhase}
                        brainName={hasBrain ? (brainName || 'perfil configurado') : null}
                        subtitle="Esto suele tomar entre 15 y 30 segundos..."
                    />
                )
            }

            {
                step === 3 && generationMode === 'single' && (
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
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                    position: 'relative'
                                }}>
                                    {/* Floating Block AI Editor */}
                                    {activeBlockChat && activeBlockChat.startsWith(`${i}-`) && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '80px',
                                            right: '32px',
                                            width: '320px',
                                            background: '#151515',
                                            border: '1px solid #9D00FF66',
                                            borderRadius: '12px',
                                            padding: '16px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            zIndex: 100,
                                            animation: 'slideIn 0.2s ease-out'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                <Sparkles size={14} color="#9D00FF" />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
                                                    {activeBlockChat.split('-')[1].toUpperCase()} CON IA
                                                </span>
                                                <button
                                                    onClick={() => setActiveBlockChat(null)}
                                                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem' }}
                                                >✕</button>
                                            </div>
                                            <textarea
                                                placeholder="Escribe cómo quieres mejorar este bloque... o déjalo vacío para mejora automática."
                                                value={blockChats[activeBlockChat] || ''}
                                                onChange={(e) => setBlockChats({ ...blockChats, [activeBlockChat]: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    background: '#080808',
                                                    border: '1px solid #333',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    padding: '10px',
                                                    fontSize: '0.85rem',
                                                    minHeight: '80px',
                                                    resize: 'none',
                                                    outline: 'none',
                                                    marginBottom: '12px',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                            <button
                                                onClick={() => handleRefineBlock(i, activeBlockChat.split('-')[1], blockChats[activeBlockChat])}
                                                disabled={refiningBlock === activeBlockChat}
                                                style={{
                                                    width: '100%',
                                                    background: 'var(--accent-gradient)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '10px',
                                                    color: '#000',
                                                    fontWeight: 800,
                                                    fontSize: '0.85rem',
                                                    cursor: refiningBlock === activeBlockChat ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                {refiningBlock === activeBlockChat ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                Mejorar parte (+1 crédito)
                                            </button>
                                        </div>
                                    )}
                                    {/* BANNER DE CONFIRMACIÓN DE DESPLIEGUE v2.5.3 */}
                                    <div style={{
                                        padding: '8px 24px',
                                        background: 'linear-gradient(90deg, #7ECECA, #22c55e)',
                                        color: '#000',
                                        textAlign: 'center',
                                        fontWeight: 900,
                                        fontSize: '0.8rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '2px',
                                        borderRadius: '0 0 12px 12px',
                                        marginBottom: '20px',
                                        boxShadow: '0 4px 15px rgba(126, 206, 202, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}>
                                        <Sparkles size={16} /> MODO PROFESIONAL ACTIVADO — v2.5.3 <Sparkles size={16} />
                                    </div>

                                    {/* Wizard Header */}
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
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: 'var(--accent-gradient)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#000',
                                                fontWeight: 900,
                                                fontSize: '0.7rem'
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
                                                        fontSize: '1rem',
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
                                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>DESARROLLO ({(s.desarrollo || []).length} PUNTOS ACCIONABLES)</label>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {Array.isArray(s.desarrollo) && s.desarrollo.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                                        <div style={{ marginTop: '14px', fontSize: '0.8rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', minWidth: '20px' }}>{idx < 9 ? `0${idx + 1}` : idx + 1}</div>
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <textarea
                                                                value={s.desarrollo[idx] || ''}
                                                                disabled={refiningBlock === `${i}-punto${idx + 1}`}
                                                                onChange={(e) => {
                                                                    const news = [...scripts];
                                                                    if (!Array.isArray(news[i].desarrollo)) news[i].desarrollo = [];
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
                                            { id: `copy-${i}`, icon: <Copy size={16} />, label: 'Copiar Todo', action: () => copyToClipboard(`GUION: ${s.titulo_guion || s.titulo_angulo}\n\nHOOK: ${s.hook || s.gancho}\n\nDESARROLLO:\n${s.desarrollo.join('\n')}\n\nCIERRE: ${s.cierre}\n\nCTA: ${s.cta}\n\n--- COPY POST ---\n${s.copy_post?.titulo}\n\n${s.copy_post?.descripcion_larga}\n\nHashtags: ${s.copy_post?.hashtags?.map(h => '#' + h).join(' ')}`, i) },
                                            {
                                                id: `save-${i}`,
                                                icon: savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? <CheckCircle2 size={16} color="#7ECECA" /> : <Bookmark size={16} />,
                                                label: savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? 'Guardado' : 'Guardar en Biblioteca',
                                                action: () => handleSaveScript(s)
                                            },
                                            {
                                                id: `plan-${i}`,
                                                icon: <Calendar size={16} />,
                                                label: 'Planificar Content',
                                                action: () => handleOpenPlanner(s),
                                                premium: true
                                            },
                                        ].map((btn, bidx) => (
                                            <button
                                                key={bidx}
                                                id={btn.id}
                                                onClick={btn.action}
                                                className={`btn-action-glass ${btn.premium ? 'btn-premium-glow' : ''}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '0.75rem',
                                                    padding: '10px 16px',
                                                    background: btn.label === 'Guardado' ? 'rgba(126, 206, 202, 0.1)' : 'rgba(255,255,255,0.03)',
                                                    border: btn.premium ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.1)',
                                                    color: (btn.label === 'Guardado' || btn.premium) ? '#7ECECA' : 'rgba(255,255,255,0.8)',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    fontWeight: 700
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
                )
            }


            {
                step === 3 && generationMode === 'plan' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    Plan de contenido a 30 días
                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', borderRadius: '4px', border: '1px solid rgba(126, 206, 202, 0.2)' }}>v2.5.7</span>
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Revisa tus ideas, selecciona las que quieras y sincroniza con tu calendario.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {selectedSlots.size > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="btn-secondary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,0,0,0.3)', color: '#ff4d4d' }}
                                    >
                                        <X size={16} /> Eliminar ({selectedSlots.size})
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirmAndSync}
                                    disabled={sendingToCalendar || selectedSlots.size === 0}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (sendingToCalendar || selectedSlots.size === 0) ? 0.7 : 1 }}
                                >
                                    {sendingToCalendar ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {sendingToCalendar ? 'Sincronizando...' : `Confirmar y Sincronizar (${selectedSlots.size})`}
                                </button>
                                <button onClick={() => { setStep(1); setPlanWizardStep(1); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCcw size={16} /> Nuevo Plan</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                            <input
                                type="checkbox"
                                checked={planSlots.length > 0 && selectedSlots.size === planSlots.length}
                                onChange={handleToggleSelectAll}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7ECECA' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Seleccionar Todo el Plan</span>
                        </div>

                        {isGeneratingMassive && (
                            <div className="premium-card" style={{ padding: '32px', background: 'rgba(126, 206, 202, 0.05)', border: '1px solid rgba(126, 206, 202, 0.2)', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Loader2 className="animate-spin" size={20} color="#7ECECA" />
                                        <h4 style={{ fontWeight: 800 }}>{generationProgress.status}</h4>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.round((generationProgress.current / generationProgress.total) * 100)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%`, height: '100%', background: 'var(--accent-gradient)', transition: '0.3s' }} />
                                </div>
                                <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Por favor, no cierres esta ventana hasta que termine la generación.</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {Array.isArray(planSlots) && planSlots.map((slot, i) => (
                                <div
                                    key={slot.id}
                                    className="premium-card plan-slot-card"
                                    onMouseDown={() => handleSlotMouseDown(slot.id)}
                                    onMouseEnter={() => handleSlotMouseEnter(slot.id)}
                                    onContextMenu={(e) => handleContextMenu(e, slot.id)}
                                    style={{
                                        padding: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        border: selectedSlots.has(slot.id) ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.05)',
                                        background: selectedSlots.has(slot.id) ? 'rgba(126, 206, 202, 0.05)' : 'transparent',
                                        opacity: selectedSlots.has(slot.id) ? 1 : 0.6,
                                        transition: '0.2s',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flex: 1 }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedSlots.has(slot.id)}
                                            onChange={() => handleToggleSlotSelection(slot.id)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#7ECECA' }}
                                        />

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
                )
            }
            <style jsx>{`
                @keyframes pulse-glow {
                    from { box-shadow: 0 0 5px rgba(126, 206, 202, 0.1); border-color: rgba(126, 206, 202, 0.3); }
                    to { box-shadow: 0 0 20px rgba(126, 206, 202, 0.3); border-color: rgba(126, 206, 202, 0.6); }
                }
            `}</style>
            {
                isSuccessModalOpen && (
                    <SuccessModal
                        isOpen={isSuccessModalOpen}
                        onClose={() => setIsSuccessModalOpen(false)}
                        title={successModalData.title}
                        message={successModalData.message}
                        actionLabel={successModalData.actionLabel}
                        actionOnClick={() => {
                            if (successModalData.actionRedirect) {
                                router.push(successModalData.actionRedirect);
                            } else {
                                router.push('/dashboard/library');
                            }
                            setIsSuccessModalOpen(false);
                        }}
                    />
                )
            }

            {
                extraIdeasModal.open && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }} onClick={() => setExtraIdeasModal({ ...extraIdeasModal, open: false })}>
                        <div style={{
                            background: '#1a1a1a', borderRadius: '20px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Explorar más ideas</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Cuéntanos más sobre qué contenido quieres este mes y la IA te propondrá nuevas ideas.
                            </p>

                            {/* Preset Selector */}
                            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7ECECA', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Preajustes del Proyecto</p>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    {presets.length > 0 ? presets.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setExtraIdeasModal({
                                                    ...extraIdeasModal,
                                                    form: {
                                                        context: p.config.context || '',
                                                        experienceLevel: p.config.experienceLevel || '',
                                                        productTicket: p.config.productTicket || '',
                                                        objections: p.config.objections || '',
                                                        examples: p.config.examples || ''
                                                    }
                                                });
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'rgba(126, 206, 202, 0.1)',
                                                border: '1px solid rgba(126, 206, 202, 0.2)',
                                                color: '#7ECECA',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {p.name}
                                        </button>
                                    )) : (
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>No hay preajustes guardados aún.</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>¿Qué quieres este mes? *</p>
                                    <textarea
                                        className="textarea-field"
                                        placeholder="Ej: Quiero crear contenido sobre cómo vender programas de mentoría online..."
                                        value={extraIdeasModal.form.context}
                                        onChange={(e) => setExtraIdeasModal({ ...extraIdeasModal, form: { ...extraIdeasModal.form, context: e.target.value } })}
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Nivel de experiencia</p>
                                        <input
                                            className="input-field"
                                            placeholder="Ej: Principiante"
                                            value={extraIdeasModal.form.experienceLevel}
                                            onChange={(e) => setExtraIdeasModal({ ...extraIdeasModal, form: { ...extraIdeasModal.form, experienceLevel: e.target.value } })}
                                        />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Ticket de producto</p>
                                        <input
                                            className="input-field"
                                            placeholder="Ej: 500-2000€"
                                            value={extraIdeasModal.form.productTicket}
                                            onChange={(e) => setExtraIdeasModal({ ...extraIdeasModal, form: { ...extraIdeasModal.form, productTicket: e.target.value } })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Objeciones clave</p>
                                    <input
                                        className="input-field"
                                        placeholder="Ej: Es caro, no tengo tiempo, no funciona"
                                        value={extraIdeasModal.form.objections}
                                        onChange={(e) => setExtraIdeasModal({ ...extraIdeasModal, form: { ...extraIdeasModal.form, objections: e.target.value } })}
                                    />
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Ejemplos de contenido que te gustan</p>
                                    <input
                                        className="input-field"
                                        placeholder="Ej: Videos de '@coach' o '@experto'"
                                        value={extraIdeasModal.form.examples}
                                        onChange={(e) => setExtraIdeasModal({ ...extraIdeasModal, form: { ...extraIdeasModal.form, examples: e.target.value } })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => setExtraIdeasModal({ ...extraIdeasModal, open: false })}
                                    className="btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!extraIdeasModal.form.context.trim()) {
                                            alert('Escribe qué quieres este mes');
                                            return;
                                        }
                                        setExtraIdeasModal({ ...extraIdeasModal, loading: true });
                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            const res = await fetch('/api/ideas-extra', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    context: extraIdeasModal.form.context,
                                                    experienceLevel: extraIdeasModal.form.experienceLevel,
                                                    productTicket: extraIdeasModal.form.productTicket,
                                                    objections: extraIdeasModal.form.objections,
                                                    examples: extraIdeasModal.form.examples,
                                                    userId: user?.id,
                                                    projectId: activeProject?.id
                                                })
                                            });

                                            if (res.status === 402) {
                                                window.dispatchEvent(new CustomEvent('show-no-credits'));
                                                setExtraIdeasModal({ ...extraIdeasModal, open: false, loading: false });
                                                return;
                                            }

                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error || 'Error al generar ideas');

                                            setExtraIdeasModal({
                                                open: false,
                                                ideas: data.ideas || [],
                                                loading: false,
                                                form: { context: '', experienceLevel: '', productTicket: '', objections: '', examples: '' }
                                            });
                                        } catch (err) {
                                            alert(err.message);
                                            setExtraIdeasModal({ ...extraIdeasModal, loading: false });
                                        }
                                    }}
                                    disabled={extraIdeasModal.loading}
                                    className="btn-primary"
                                    style={{ flex: 2, opacity: extraIdeasModal.loading ? 0.7 : 1 }}
                                >
                                    {extraIdeasModal.loading ? <><Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} /> Generando ideas...</> : <>Generar Ideas <Sparkles size={16} style={{ marginLeft: '8px' }} /></>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL PLANIFICAR */}
            {isPlannerModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="modal-content" style={{ maxWidth: '450px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(126, 206, 202, 0.08) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(126, 206, 202, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarDays size={20} color="#7ECECA" />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Planificar en Calendario</h3>
                                </div>
                                <button onClick={() => setIsPlannerModalOpen(false)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
                                Hemos analizado tu guion. Esta es la mejor sugerencia para maximizar tu impacto:
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#7ECECA', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Sparkles size={14} /> Sugerencia de la IA
                                        </div>
                                        <button
                                            onClick={handleAISuggestion}
                                            disabled={isSuggestingAI}
                                            style={{
                                                background: 'rgba(126, 206, 202, 0.1)',
                                                border: '1px solid rgba(126, 206, 202, 0.2)',
                                                color: '#7ECECA',
                                                fontSize: '0.7rem',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {isSuggestingAI ? <Loader2 className="animate-spin" size={12} /> : <RefreshCcw size={12} />}
                                            Analizar con IA
                                        </button>
                                    </div>

                                    {suggestedReasoning && (
                                        <div style={{
                                            background: 'rgba(126, 206, 202, 0.05)',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            color: '#7ECECA',
                                            marginBottom: '16px',
                                            lineHeight: 1.4,
                                            borderLeft: '2px solid #7ECECA'
                                        }}>
                                            {suggestedReasoning}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: '6px' }}>FECHA</label>
                                            <input
                                                type="date"
                                                className="input-field"
                                                value={plannedDate}
                                                onChange={e => setPlannedDate(e.target.value)}
                                                style={{ fontSize: '0.9rem', padding: '10px 14px' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: '6px' }}>HORA</label>
                                            <input
                                                type="time"
                                                className="input-field"
                                                value={plannedTime}
                                                onChange={e => setPlannedTime(e.target.value)}
                                                style={{ fontSize: '0.9rem', padding: '10px 14px' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '0 8px' }}>
                                    <div style={{ marginTop: '4px' }}><AlertCircle size={16} color="rgba(255,255,255,0.3)" /></div>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                                        Esta publicación se añadirá a tu calendario como "En preparación". Podrás cambiar el estado a "Publicado" una vez lo subas.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                <button onClick={() => setIsPlannerModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                <button
                                    onClick={handleConfirmPlanning}
                                    className="btn-primary"
                                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    disabled={isPlanningLoading}
                                >
                                    {isPlanningLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {isPlanningLoading ? 'Planificando...' : 'Confirmar Planificación'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isNamingModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Nombre del Preajuste</h3>
                        <input
                            className="input-field"
                            placeholder="Ej: Lanzamiento Marzo, Estrategia Leads..."
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            style={{ marginBottom: '24px' }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsNamingModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                            <button onClick={handleSavePreset} className="btn-primary" style={{ flex: 2 }}>Guardar Preajuste</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

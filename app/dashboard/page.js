'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2 as CheckCircle, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2 as Loader, Sparkles, Search, X, Mic, ThumbsUp, ThumbsDown, Clock, Megaphone, BookOpen, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';
import GenerationProgress from '@/app/components/GenerationProgress';
import SuccessModal from '@/app/components/SuccessModal';
import { saveToLibrary } from '@/lib/library';
import VoiceDictation from '@/app/components/VoiceDictation';
import { useProject } from '@/app/components/ProjectContext';
import FormPresets from '@/app/components/FormPresets';



const SUGGESTED_TRENDS = [
    { name: 'Nicho Marketing', icon: '📈', grow: '+12.5%', color: '#9D00FF' },
    { name: 'IA Generativa', icon: '🤖', grow: '+45.2%', color: '#00F3FF' },
    { name: 'Productividad', icon: '⌛', grow: '+8.1%', color: '#FF007A' },
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

const AUDIENCIAS_PLAN = ['Emprendedores', 'Coaches/Mentores', 'Dueños de negocio local', 'Creadores de Contenido', 'Infoproductores', 'eCommerce', 'B2B/Empresas'];
const OBJETIVOS_PLAN = ['Más Alcance / Visibilidad', 'Más Leads / DMs / Listas', 'Más Ventas (Producto/Servicio)', 'Posicionamiento / Autoridad'];
const ESTILOS_PLAN = ['Historias reales', 'Opiniones impopulares', 'Tutoriales / Paso a paso', 'Casos de estudio', 'Detrás de cámaras', 'Curación de contenido'];

// 20) v4.9.8 - Authorization JWT Fix
export const VERSION = 'v1.17.52'; // Monthly Plan: Sync Reliability Fix + Diagnostics



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
    const [singleFrequency, setSingleFrequency] = useState('3 publicaciones por semana');
    const [singleHowNotToSound, setSingleHowNotToSound] = useState('');
    const [singleContentStyles, setSingleContentStyles] = useState([]);
    const [specificDetails, setSpecificDetails] = useState('');
    const [ctaIdea, setCtaIdea] = useState('');
    const [experienciaReal, setExperienciaReal] = useState('');
    const [opinionPersonal, setOpinionPersonal] = useState('');
    const [faseCreador, setFaseCreador] = useState('Tengo algo de audiencia pero aún crezco');
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
    const [expandedSlots, setExpandedSlots] = useState(new Set());
    const [savedPlanSlotIds, setSavedPlanSlotIds] = useState(new Set());
    const [extraIdeasModal, setExtraIdeasModal] = useState({ open: false, ideas: [], loading: false, form: { context: '', experienceLevel: '', productTicket: '', objections: '', examples: '' } });
    const [recommendedIdeas, setRecommendedIdeas] = useState([]);
    const [loadingRecommended, setLoadingRecommended] = useState(false);

    // New Marketing Briefing States (v4.0.0)
    const [businessOffer, setBusinessOffer] = useState('');
    const [ticketPrice, setTicketPrice] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [targetAudienceType, setTargetAudienceType] = useState('Emprendedores');
    const [mainPainPoint, setMainPainPoint] = useState('');
    const [monthlyGoals, setMonthlyGoals] = useState([]);
    const [successMetric, setSuccessMetric] = useState('');
    const [keyThemes, setKeyThemes] = useState('');
    const [contentStyles, setContentStyles] = useState([]);
    const [howNotToSound, setHowNotToSound] = useState('');
    const [brandMantra, setBrandMantra] = useState('');
    const [briefAnalysis, setBriefAnalysis] = useState('');
    const [isAnalyzingBrief, setIsAnalyzingBrief] = useState(false);
    const [polishingField, setPolishingField] = useState(null); // Used for Monthly Plan / Script polishing
    const [aiRefineInstructions, setAiRefineInstructions] = useState({}); // { [fieldId]: string }
    const [showPolishToast, setShowPolishToast] = useState(false);

    // Missing states restored
    const [profile, setProfile] = useState(null);
    const [aiCredits, setAiCredits] = useState({ total: 0, used: 0 });
    const [error, setError] = useState('');
    const [hasBrain, setHasBrain] = useState(false);
    const [brainName, setBrainName] = useState('');
    const [events, setEvents] = useState([]);
    const [calendarDate, setCalendarDate] = useState('');
    const [loadingPhase, setLoadingPhase] = useState(0);
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
    const [planningIdx, setPlanningIdx] = useState(null);
    const [previousScripts, setPreviousScripts] = useState(null);
    const [presets, setPresets] = useState([]);
    const [loadingPresets, setLoadingPresets] = useState(false);
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [sourceType, setSourceType] = useState(null);
    const [sourceReferenceId, setSourceReferenceId] = useState(null);
    const [scriptFeedback, setScriptFeedback] = useState({}); // { [scriptIdx]: 'like' | 'dislike' }

    const handleFeedback = async (idx, type) => {
        if (scriptFeedback[idx]) return; // Already voted

        const script = scripts[idx];
        const scriptText = `GANCHO: ${script.hook || script.gancho}\nDESARROLLO: ${script.desarrollo.join(' | ')}\nCTA: ${script.cta}`;

        setScriptFeedback(prev => ({ ...prev, [idx]: type }));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/train-brain', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    feedback: type === 'like' ? 'Me gusta mucho este estilo y estructura.' : 'No me gusta este enfoque, cámbialo.',
                    scriptContext: scriptText,
                    projectId: activeProject?.id,
                    userId: session?.user?.id,
                    type: type === 'like' ? 'Positivo' : 'Negativo'
                })
            });

            if (!res.ok) throw new Error('Failed to train');
            const data = await res.json();
            console.log('[Feedback] Brain updated:', data.newNotes);
            
            // Optionally refresh the local brain context if we use it for live generation
            if (refreshBrain) await refreshBrain();

        } catch (err) {
            console.error('Error sending feedback:', err);
        }
    };

    const handleImproveField = async (text, setter, fieldId, instruction = '') => {
        if (!text || text.length < 5) return;
        setPolishingField(fieldId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/polish', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    text, 
                    userId: session?.user?.id,
                    projectId: activeProject?.id,
                    instruction: instruction || undefined
                }),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                return;
            }

            if (!res.ok) throw new Error('Error al mejorar');

            const data = await res.json();
            setter(data.polishedText);
            
            // Clear instruction after use
            setAiRefineInstructions(prev => ({ ...prev, [fieldId]: '' }));

            // Notify success with minimalist toast
            setShowPolishToast(true);
            setTimeout(() => setShowPolishToast(false), 3000);

            // Trigger credit refresh
            window.dispatchEvent(new CustomEvent('refresh-profile'));
        } catch (err) {
            console.error('[ImproveField] Error:', err);
            alert('No se pudo mejorar el texto. Inténtalo de nuevo.');
        } finally {
            setPolishingField(null);
        }
    };


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

    const handleConfirmAndSync = async (isSilent = false) => {
        const slotsToSync = planSlots.filter(s => selectedSlots.has(s.id));
        if (slotsToSync.length === 0) {
            if (!isSilent) alert('Selecciona al menos una idea para sincronizar');
            return;
        }
        await handleSendPlanToCalendar(slotsToSync);
        if (!isSilent) alert('¡Calendario sincronizado con éxito! ✓');
        // Optionally move to calendar or stay
    };

    useEffect(() => {
        // Clear generation results when switching project to avoid confusion
        setScripts([]);
        setStep(1);
        setTopic('');
        setIdeas('');
        setLibIdeas([]); // Clear library ideas too
        setRecommendedIdeas([]); // Clear recommended ideas
        loadData();
    }, [activeProject]);

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Profile
        const { data: profileData } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
        setProfile(profileData || user);

        // Credits - Unified System v2.0
        if (profileData) {
            setAiCredits({ total: profileData.credits_balance || 0, used: 0 });
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

        // --- v5.1.1: FETCH EXISTING PLAN SLOTS ---
        if (activeProject) {
            fetchPlanSlots(user.id, activeProject.id);
        }
    }

    const fetchPlanSlots = async (userId, projectId) => {
        try {
            // Find the latest plan for this project
            const { data: planData } = await supabase
                .from('content_plans')
                .select('id')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (planData) {
                const { data: slots } = await supabase
                    .from('content_slots')
                    .select('*')
                    .eq('plan_id', planData.id)
                    .order('day_number', { ascending: true });
                
                if (slots && slots.length > 0) {
                    setPlanSlots(slots);
                    // v1.17.46: No more auto-skipping to step 3. 
                    // User should always see the wizard (Step 1) to configure or clear.
                }
            }
        } catch (err) {
            console.warn('[v5.1.2] No existing plan found to load:', err.message);
        }
    };
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
    const [selectedColor, setSelectedColor] = useState('pink');
    const [existingLibraryId, setExistingLibraryId] = useState(null);

    const supabase = createSupabaseClient();
    const router = useRouter();
    const searchParams = useSearchParams();

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
        if (!userId) return { total: 0, used: 0 };
        const { data: profileData } = await supabase.from('users_profiles').select('credits_balance').eq('id', userId).single();
        const creditsObj = { total: profileData?.credits_balance || 0, used: 0 };
        setAiCredits(creditsObj);
        return creditsObj; // Return so callers can use fresh data immediately
    }

    useEffect(() => {
        // Load params from URL on initial load or navigation
        const params = searchParams;
        if (params.get('mode') === 'single') {
            setGenerationMode('single');
            const topicParam = params.get('topic');
            const platformParam = params.get('platform');
            const goalParam = params.get('goal');
            const countParam = params.get('count');
            const forceCount = countParam ? parseInt(countParam) : null;

            const savedDescription = params.get('description');
            const savedSourceType = params.get('source_type');
            const savedSourceReferenceId = params.get('source_reference_id');

            if (topicParam) setTopic(topicParam);
            if (platformParam) setPlatform(platformParam);
            if (goalParam) setGoal(goalParam);
            if (savedDescription) setIdeas(savedDescription);
            if (forceCount) setQuantity(forceCount);
            if (params.get('date')) setCalendarDate(params.get('date'));
            if (savedSourceType) setSourceType(savedSourceType);
            if (savedSourceReferenceId) {
                setSourceReferenceId(savedSourceReferenceId);
                
                // v5.1.5: Fetch existing event to get its script_id & color
                const fetchSourceDetails = async () => {
                    try {
                        const { data, error } = await supabase
                            .from('calendar_events')
                            .select('script_id, color')
                            .eq('id', savedSourceReferenceId)
                            .single();
                        
                        if (data) {
                            if (data.script_id) setExistingLibraryId(data.script_id);
                            if (data.color) setSelectedColor(data.color);
                        }
                    } catch (e) {
                        console.warn('[v5.1.5] Error fetching source details:', e);
                    }
                };
                fetchSourceDetails();
            }
        } else if (params.get('mode') === 'plan') {
            setGenerationMode('plan');
            setStep(1);
            setPlanWizardStep(1);
            setPlanSlots([]); // v1.17.45: Clear previous slots to avoid skipping
            setTopic('');
        } else if (!params.get('mode')) {
            // v1.17.43: Reset to initial state when navigating to root /dashboard without params
            // This ensures sidebar "Nuevo Guion" always starts a fresh session
            setGenerationMode('single');
            setStep(1);
            setWizardStep(1);
            setPlanWizardStep(1);
            setScripts([]);
            setPlanSlots([]);
            setTopic('');
            setIdeas('');
        }
    }, [supabase, searchParams]);

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
        setRecommendedIdeas([]); // Clear previous to show new ones
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/ideas-extra', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: profile.id,
                    projectId: activeProject.id,
                    proactive: true,
                    context: 'Generación proactiva basada en cerebro',
                    businessOffer: businessOffer,
                    targetAudience: targetAudience,
                    mainPainPoint: mainPainPoint
                })
            });
            const data = await res.json();
            if (res.ok) {
                // v1.17.47: Assign stable IDs upon fetch to ensure selection works
                const stableIdeas = (data.ideas || []).map((idea, idx) => ({
                    ...idea,
                    id: `ai-idea-${idx}-${Date.now()}`
                }));
                setRecommendedIdeas(stableIdeas);
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
                const savedDescription = params.get('description');
                const savedSourceType = params.get('source_type');
                const savedSourceReferenceId = params.get('source_reference_id');

                if (savedTopic) setTopic(savedTopic);
                if (savedPlatform) setPlatform(savedPlatform);
                if (savedGoal) setGoal(savedGoal);
                if (savedDescription) setIdeas(savedDescription);
                if (savedSourceType) setSourceType(savedSourceType);
                if (savedSourceReferenceId) setSourceReferenceId(savedSourceReferenceId);

                setGenerationMode('single');
                setWizardStep(3); // Land on Step 3 (Detalle: Topic, Tono, Generar)
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
                experienciaReal: experienciaReal || '',
                opinionPersonal: opinionPersonal || '',
                faseCreador: faseCreador || '',
                sourceType: params.get('source_type') || null,
                sourceReferenceId: params.get('source_reference_id') || null,
                projectId: activeProject?.id
            };
            console.log('[Dashboard] Sending request:', requestBody);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/generate-scripts', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    text,
                    type: blockType.includes('punto') ? 'desarrollo' : blockType,
                    instruction: instruction || '',
                    context: `Guion sobre ${topic} para ${platform}. Ãngulo: ${script.titulo_angulo || script.titulo_guion}`,
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

    async function handlePolishScript(scriptIndex, instruction) {
        const available = aiCredits.total - aiCredits.used;
        if (available < 1) {
            window.dispatchEvent(new CustomEvent('show-no-credits'));
            return;
        }

        setPreviousScripts(JSON.parse(JSON.stringify(scripts)));
        setRefiningBlock(`${scriptIndex}-full`);

        const script = scripts[scriptIndex];
        const parts = [
            script.gancho || script.hook || '',
            ...(Array.isArray(script.desarrollo) ? script.desarrollo : []),
            script.cta || '',
            script.cierre || ''
        ];

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    texts: parts,
                    type: 'full_script',
                    instruction,
                    context: `Guion sobre ${topic} para ${platform}. Fase: ${faseCreador}. Historia: ${experienciaReal}`,
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
            const refined = data.refinedText;

            if (Array.isArray(refined) && refined.length >= parts.length) {
                updatedScripts[scriptIndex].gancho = refined[0];
                updatedScripts[scriptIndex].hook = refined[0];
                // Update desarrollo points if they exist
                if (Array.isArray(updatedScripts[scriptIndex].desarrollo)) {
                    updatedScripts[scriptIndex].desarrollo = refined.slice(1, refined.length - 2);
                }
                updatedScripts[scriptIndex].cta = refined[refined.length - 2];
                updatedScripts[scriptIndex].cierre = refined[refined.length - 1];
            }

            setScripts(updatedScripts);
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            if (profile?.id) fetchCredits(profile.id);
        } catch (err) {
            alert('Error al pulir: ' + err.message);
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

    const handleAnalyzeBrief = async () => {
        if (!businessOffer.trim()) {
            alert('Por favor, indica qué vendes este mes.');
            return;
        }
        setIsAnalyzingBrief(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/analyze-plan-brief', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessOffer,
                    targetAudience,
                    targetAudienceType,
                    mainPainPoint,
                    monthlyGoals,
                    successMetric,
                    keyThemes,
                    contentStyles,
                    howNotToSound,
                    brandMantra,
                    ticketPrice,
                    platforms: planPlatforms
                })
            });
            const data = await res.json();
            if (data.summary) {
                setBriefAnalysis(data.summary);
                setTopic(data.summary); 
                setPlanWizardStep(4);
            } else {
                throw new Error(data.details || data.error || 'Error al analizar briefing');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsAnalyzingBrief(false);
        }
    };

    async function handleGeneratePlan() {
        const finalTopic = topic.trim() || briefAnalysis?.trim();
        
        if (!finalTopic) {
            setError('Por favor, describe tu marca y objetivos para el mes.');
            return;
        }
        if (planPlatforms.length === 0) {
            setError('Debes seleccionar al menos una plataforma.');
            return;
        }

        // Pre-check credits: only 3 for the plan itself (scripts generated separately)
        let postCount = 12;
        if (planFrequency === '4 publicaciones por semana') postCount = 16;
        if (planFrequency === '5 publicaciones por semana') postCount = 20;
        if (planFrequency === '7 publicaciones por semana') postCount = 28;

        const planCost = 3;
        const available = aiCredits.total - aiCredits.used;

        if (available < planCost) {
            setError(`Créditos insuficientes. Necesitas ${planCost} créditos para generar el plan y tienes ${available}.`);
            return;
        }

        setStep(2); // Show initial general loader
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    description: finalTopic,
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
                    businessOffer,
                    targetAudience,
                    targetAudienceType,
                    mainPainPoint,
                    monthlyGoals,
                    successMetric,
                    keyThemes,
                    contentStyles,
                    howNotToSound,
                    brandMantra,
                    ticketPrice,
                    projectId: activeProject?.id
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al generar el plan mensual.');
            }

            const data = await res.json();
            const slots = data.slots || [];
            if (slots.length === 0) {
                throw new Error('La IA no devolvió ideas. Intenta con una descripción más detallada.');
            }

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const slotsWithDates = slots.map((slot, index) => {
                let scheduledDate = slot.scheduled_date;
                if (!scheduledDate) {
                    // v1.17.48: SMART SCHEDULING based on frequency
                    let dayOffset = index + 1; // Default
                    const freqPrefix = planFrequency.split(' ')[0]; // "3", "4", "7"
                    
                    if (freqPrefix === '3') {
                        // 3x week (12 slots) -> Gap of ~2.5 days to cover 30 days
                        dayOffset = Math.floor(index * 2.5) + 1;
                    } else if (freqPrefix === '4') {
                        // 4x week (16 slots) -> Gap of ~1.8 days
                        dayOffset = Math.floor(index * 1.8) + 1;
                    } else if (freqPrefix === '7' || planFrequency === 'Diario') {
                        // Every day
                        dayOffset = index + 1;
                    }
                    
                    const slotDate = new Date(currentYear, currentMonth, today.getDate() + dayOffset);
                    scheduledDate = slotDate.toISOString().split('T')[0];
                }
                return { ...slot, scheduled_date: scheduledDate };
            });

            setPlanSlots(slotsWithDates);

            // Show plan immediately
            setStep(3);
            
            // --- AUTOMATION v4.4.0 ---
            // 1. Select all slots
            const allIds = slotsWithDates.map(s => s.id);
            setSelectedSlots(new Set(allIds));
            setExtraIdeasModal({ ...extraIdeasModal, ideas: [] });

            // 2. Refresh credits FIRST, then pass them directly to avoid stale state race conditions
            const freshCredits = await fetchCredits(profile.id);
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            if (typeof window !== 'undefined') {
                console.log(`[v4.5.2] Fresh credits: ${freshCredits.total - freshCredits.used} available`);
            }

            // 3. Trigger FULL AUTO FLOW immediately (no setTimeout)
            if (freshCredits.total > 0) {
                await handleAutoBatchGenerateAndSync(slotsWithDates, allIds, freshCredits);
            } else {
                alert('⚠️ Sin créditos disponibles. Por favor compra créditos para generar los guiones.');
            }

        } catch (err) {
            setError(err.message);
            setStep(1);
        }
    }

    // —— BATCH: Analizar y Planificar (FLUJO COMPLETO v4.5.0) ——
    const handleBatchGenerateScripts = async () => {
        // v4.9.1: Bulk generate using the new 1-click per-slot endpoint
        const slotsToProcess = planSlots.filter(s => selectedSlots.has(s.id) && !s.has_script);
        if (slotsToProcess.length === 0) {
            alert('✅ Todas las ideas seleccionadas ya tienen guion. Pulsa "Sincronizar Calendario" para añadirlas.');
            return;
        }

        if (!confirm(`¿Generar guiones para ${slotsToProcess.length} idea(s) seleccionada(s)?\n\nEsto usará ~${slotsToProcess.length} crédito(s). El proceso es individual y garantiza contenido completo.`)) return;

        setIsGeneratingMassive(true);
        setGenerationProgress({ current: 0, total: slotsToProcess.length, status: '🚀 Iniciando generación...' });

        let successCount = 0;
        for (let i = 0; i < slotsToProcess.length; i++) {
            const slot = slotsToProcess[i];
            setGenerationProgress({
                current: i + 1,
                total: slotsToProcess.length,
                status: `✍️ Generando guión ${i + 1} de ${slotsToProcess.length}: "${slot.idea_title.substring(0, 40)}..."`
            });

            try {
                const result = await handleGenerateSlotScript(slot, true);
                if (result) successCount++;
            } catch (err) {
                console.error(`[v4.9.1 Bulk] Failed for slot ${slot.id}:`, err.message);
            }
        }

        setIsGeneratingMassive(false);
        setGenerationProgress({ current: 0, total: 0, status: '' });

        const slotsWithScript = planSlots.filter(s => selectedSlots.has(s.id) && s.has_script).length;
        alert(`✅ Generación completada: ${successCount} de ${slotsToProcess.length} guión(es) generado(s) correctamente.\n\n${slotsWithScript > 0 ? `${slotsWithScript} idea(s) ya tenían guion.\n\n` : ''}Ahora puedes "Sincronizar Calendario" para añadirlos al calendario.`);
    }

    const handleAutoBatchGenerateAndSync = async (currentSlots, selectedIds, creditsObj = null) => {
        const credits = creditsObj || aiCredits;
        const slotsToProcess = currentSlots.filter(s => selectedIds.includes(s.id) && !s.has_script);
        
        setIsGeneratingMassive(true);
        setStep(3);
        
        if (slotsToProcess.length === 0) {
            console.log('[v4.5.0 Auto] No scripts needed, syncing existing...');
            const slotsToSync = currentSlots.filter(s => selectedIds.includes(s.id));
            await handleSendPlanToCalendar(slotsToSync); 
            setIsGeneratingMassive(false);
            return;
        }

        setGenerationProgress({ current: 0, total: slotsToProcess.length, status: '🚀 Generando guiones automáticamente...' });
        
        // Pass live credits so runBatchGeneration doesn't use stale React state
        const generatedSlots = await runBatchGeneration(slotsToProcess, true, credits);
        
        setGenerationProgress({ current: 0, total: 0, status: '📅 Enviando todo al calendario...' });

        try {
            let slotsForSync;
            if (generatedSlots && Array.isArray(generatedSlots) && generatedSlots.length > 0) {
                const generatedMap = new Map(generatedSlots.map(s => [String(s.id), s]));
                slotsForSync = currentSlots
                    .filter(s => selectedIds.includes(s.id))
                    .map(s => {
                        const fresh = generatedMap.get(String(s.id));
                        return fresh ? { ...s, ...fresh } : s;
                    });
                console.log('[v4.5.0] In-memory sync. Slots:', slotsForSync.length, ' Scripts:', generatedSlots.length);
            } else {
                console.warn('[v4.5.0] No generated data — using current slots as-is.');
                slotsForSync = currentSlots.filter(s => selectedIds.includes(s.id));
            }

            await handleSendPlanToCalendar(slotsForSync);
            
            setGenerationProgress({ current: 0, total: 0, status: '' });
            setIsGeneratingMassive(false);
            // Alert is shown by handleSendPlanToCalendar which also redirects to calendar
        } catch (err) {
            if (typeof window !== 'undefined') {
                console.error('[v4.5.2 AutoSync] Fatal error:', err);
            }
            setIsGeneratingMassive(false);
            alert('❌ Error al sincronizar: ' + err.message);
        }
    }

    const runBatchGeneration = async (slotsToProcess, isAuto = false, creditsObj = null) => {
        // Credit check using live credits (avoid stale state)
        const liveCredits = creditsObj || aiCredits;
        const available = liveCredits.total - liveCredits.used;
        const estimatedCost = slotsToProcess.length;
        if (available < estimatedCost) {
            const msg = `Créditos insuficientes. Tienes ${available} crédito(s) pero necesitas ~${estimatedCost} para ${slotsToProcess.length} guiones.`;
            setError(msg);
            if (isAuto) alert('⚠️ ' + msg + '\n\nCompra más créditos e inténtalo de nuevo.');
            return [];
        }

        setIsGeneratingMassive(true);
        let successCount = 0;
        const finalSlots = [];

        for (let i = 0; i < slotsToProcess.length; i++) {
            const slot = slotsToProcess[i];
            setGenerationProgress({
                current: i + 1,
                total: slotsToProcess.length,
                status: `Generando guión ${i + 1} de ${slotsToProcess.length}: ${slot.idea_title}`
            });

            try {
                const result = await handleGenerateSlotScript(slot, true);
                if (result) {
                    successCount++;
                    const scriptData = result.script_data;
                    let refId = null;
                    if (scriptData) {
                        const hookVal = scriptData.hook || scriptData.gancho || '';
                        const desArr = Array.isArray(scriptData.desarrollo) ? scriptData.desarrollo : [];
                        const ctaVal = scriptData.cta || scriptData.cierre || '';
                        const cpPost = scriptData.copy_post || {};
                        const htags = Array.isArray(cpPost.hashtags) ? cpPost.hashtags.map(h => h.startsWith('#') ? h : '#' + h).join(' ') : '';

                        const fullScript = [
                            slot.idea_title || 'Sin título',
                            '',
                            '🎯 GANCHO',
                            hookVal,
                            '',
                            '📝 DESARROLLO',
                            ...desArr.map((d, idx) => `${idx + 1}. ${d}`),
                            '',
                            '🔥 CTA / CIERRE',
                            ctaVal,
                            '',
                            '📱 COPY PARA EL POST',
                            cpPost.titulo || '',
                            cpPost.descripcion_larga || '',
                            '',
                            htags ? `HASHTAGS: ${htags}` : ''
                        ].filter(line => line !== undefined).join('\n');

                        try {
                            const libraryItem = await saveToLibrary({
                                userId: profile.id,
                                type: 'guion',
                                platform: slot.platform || 'General',
                                goal: slot.goal || 'engagement',
                                titulo: slot.idea_title || 'Guión del Plan',
                                script_full_text: fullScript,
                                content: {
                                    video_duration: (() => {
                                        const p = (slot.platform || '').toLowerCase();
                                        if (p.includes('youtube') && !p.includes('short')) return '5-10 min';
                                        if (p.includes('youtube short')) return '60 seg';
                                        if (p.includes('tiktok') || p.includes('reel') || p.includes('instagram')) return '60-90 seg';
                                        if (p.includes('linkedin')) return '2-3 min';
                                        if (p.includes(' x ') || p === 'x') return '60 seg';
                                        return videoDuration || '60 seg';
                                    })(),
                                    hook: hookVal,
                                    desarrollo: desArr,
                                    cierre: ctaVal,
                                    cta: ctaVal,
                                    copy_post: cpPost
                                },
                                tags: ['guion', slot.platform, 'plan-mensual'].filter(Boolean),
                                projectId: activeProject?.id
                            });
                            refId = libraryItem?.id || null;
                            
                            // Explicitly update slot to reflect it has a script now
                            slot.has_script = true;
                            slot.script_id = result.script?.id;
                            slot.script_data = scriptData;
                            finalSlots.push(slot);

                            await supabase.from('content_slots').update({
                                has_script: true,
                                script_id: result.script?.id,
                                script_data: scriptData
                            }).eq('id', slot.id);

                        } catch (libErr) {
                            console.error('Error saving to library or updating slot:', libErr);
                        }
                    }
                }
            } catch (e) {
                console.error(`[BatchGenerate] Error for slot ${slot.id}:`, e);
            }
        }

        if (!isAuto) {
            setIsGeneratingMassive(false);
        }
        setGenerationProgress({
            current: slotsToProcess.length,
            total: slotsToProcess.length,
            status: `¡Completado! ${successCount} de ${slotsToProcess.length} guiones generados.`
        });

        // Refresh credits
        window.dispatchEvent(new CustomEvent('refresh-profile'));
        fetchCredits(profile.id);

        // Update React state for visual feedback
        if (successCount > 0) {
            setPlanSlots(prev => prev.map(slot => {
                const processed = finalSlots.find(s => String(s.id) === String(slot.id));
                if (processed && processed.has_script) {
                    return { ...slot, has_script: true, script_data: processed.script_data, script_id: processed.script_id };
                }
                return slot;
            }));
        }

        if (typeof window !== 'undefined') {
            console.log(`[v4.5.2] runBatchGeneration DONE. ${successCount}/${slotsToProcess.length} generated. Returning ${finalSlots.length} slots.`);
        }
        return finalSlots; // ALWAYS return array — never return false or true
    };

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

    const handleOpenPlannerIdx = (script, idx) => {
        setPlanningScript(script);
        setPlanningIdx(idx);
        setSuggestedReasoning(''); 

        const bestDate = (() => {
            const start = new Date();
            start.setDate(start.getDate() + 1); 
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(start);
                checkDate.setDate(start.getDate() + i);
                const dateStr = checkDate.toISOString().split('T')[0];
                const hasExisting = events && events.some(e => e.event_date === dateStr);
                if (!hasExisting) return dateStr;
            }
            return start.toISOString().split('T')[0];
        })();

        setPlannedDate(bestDate);
        
        let bestTime = '18:00';
        const p = (script.platform || '').toLowerCase();
        if (p.includes('linkedin')) bestTime = '08:30';
        if (p.includes('youtube')) bestTime = '11:00';
        if (p.includes('tiktok') || p.includes('instagram') || p.includes('reels')) bestTime = '20:15';
        setPlannedTime(bestTime);
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
        if (!planningScript || !plannedDate) return alert('Selecciona una fecha');
        setIsPlanningLoading(true);
        try {
            const script = planningScript;
            const fullText = formatFullScript(script);
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Save to library first
            const libraryItem = await saveToLibrary({
                userId: user.id,
                type: 'guion',
                platform: script.platform || platform || 'General',
                goal: script.goal || goal || 'engagement',
                titulo: script.titulo_guion || script.titulo_angulo || 'Sin título',
                script_full_text: fullText,
                content: {
                    video_duration: script.video_duration || videoDuration || '60 seg',
                    hook: script.hook || script.gancho || '',
                    desarrollo: Array.isArray(script.desarrollo) ? script.desarrollo : [],
                    cierre: script.cta || '',
                    copy_post: script.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                },
                tags: ['guion', script.platform || platform, 'planificado'].filter(Boolean),
                projectId: activeProject?.id
            });

            // 2. Insert into calendar
            let endTime = '10:00';
            if (plannedTime) {
                const [h, m] = plannedTime.split(':').map(Number);
                const endH = (h + 1) % 24;
                endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }

            const { error: calErr } = await supabase.from('calendar_events').insert({
                user_id: user.id,
                project_id: activeProject?.id,
                event_date: plannedDate,
                start_time: plannedTime, // FIX: Use start_time for calendar compatibility
                end_time: endTime,       // FIX: Include end_time
                title: script.titulo_guion || script.titulo_angulo || 'Publicación Planificada',
                description: `Contenido planificado desde el generador.\n\nGuion: ${script.titulo_guion || ''}`,
                type: 'guion', // Change from 'Post' to 'guion' so Calendar displays it
                platform: script.platform || platform || 'General',
                status: 'Guion listo', // Change from 'prep' to 'Guion listo'
                color: selectedColor || 'pink', // v5.1.5: Use dynamic color selection
                script_id: libraryItem?.id || null,
                reference_id: libraryItem?.id || null, // FIX: Set reference_id for calendar script lookup
                has_script: true,
                script_full_text: fullText,
                content: {
                    video_duration: script.video_duration || videoDuration || '60 seg',
                    hook: script.hook || script.gancho || '',
                    desarrollo: Array.isArray(script.desarrollo) ? script.desarrollo : [],
                    cierre: script.cta || '',
                    copy_post: script.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                }
            });

            if (calErr) throw calErr;

            setPlanningIdx(null);
            setSuccessModalData({
                title: '¡Planificado con éxito! ✅',
                message: `Tu contenido ha sido agendado para el ${new Date(plannedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.`,
                actionLabel: 'Ver en el Calendario',
                actionRedirect: '/dashboard/calendar'
            });
            setIsSuccessModalOpen(true);
            
            // Refresh events
            const { data: refreshedEvents } = await supabase.from('calendar_events').select('*').eq('user_id', user.id);
            setEvents(refreshedEvents || []);
        } catch (err) {
            console.error('Error in planning:', err);
            alert('Error al planificar: ' + err.message);
        } finally {
            setIsPlanningLoading(false);
        }
    };

    const handleDirectSourceSave = async (script) => {
        if (!sourceReferenceId || !sourceType || !profile?.id) return;
        setIsPlanningLoading(true);

        try {
            const fullText = formatFullScript(script);

            // Siempre guardamos una copia primaria en la biblioteca del usuario
            const savedItem = await saveToLibrary({
                id: existingLibraryId, // FIX: Pass existing ID to allow updates in 'Guardar Original'
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
                tags: ['guion', script.platform || platform, 'update-origen'].filter(Boolean),
                projectId: activeProject?.id
            });

            if (sourceType === 'calendar_events') {
                // Also insert into scripts table for history/versions
                const { data: newScript, error: insErr } = await supabase.from('scripts').insert({
                    user_id: profile.id,
                    project_id: activeProject?.id,
                    title: script.titulo_guion || script.titulo_angulo || 'Guion Generado',
                    content: fullText,
                    hook: script.hook || script.gancho || '',
                    cta: script.cta || '',
                    structure: Array.isArray(script.desarrollo) ? script.desarrollo.map(d => ({ point: 'Desarrollo', detail: d })) : [],
                    post_copy: script.copy_post || {},
                    video_duration: script.video_duration || '60 seg',
                    focus: script.focus || 'autoridad',
                    source_type: 'calendar_events',
                    source_reference_id: sourceReferenceId
                }).select('id').single();

                if (insErr) {
                   console.warn('Error creating history entry in scripts:', insErr);
                }

                const { error: updateErr } = await supabase.from('calendar_events').update({
                    has_script: true,
                    script_id: savedItem.id, // We keep pointing to library for retrocompat
                    reference_id: savedItem.id, // FIX: Ensure direct source save also sets reference_id
                    script_full_text: fullText,
                    color: selectedColor || 'pink', // v5.1.5: Respetamos el color seleccionado al guardar
                    title: script.titulo_guion || script.titulo_angulo || 'Guion Generado',
                    content: {
                        video_duration: script.video_duration || '45-60 seg',
                        hook: script.hook || script.gancho || '',
                        desarrollo: Array.isArray(script.desarrollo) ? script.desarrollo : [],
                        cierre: script.cierre || '',
                        cta: script.cta || '',
                        copy_post: script.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                    }
                }).eq('id', sourceReferenceId);
                if (updateErr) throw updateErr;
            } else if (sourceType === 'content_slots') {
                // ALWAYS insert new to keep history (sessions)
                const { data: newScript, error: insErr } = await supabase.from('scripts').insert({
                    slot_id: sourceReferenceId,
                    user_id: profile.id,
                    project_id: activeProject?.id,
                    title: script.titulo_guion || script.titulo_angulo || 'Guion Generado',
                    content: fullText,
                    hook: script.hook || script.gancho || '',
                    cta: script.cta || '',
                    structure: Array.isArray(script.desarrollo) ? script.desarrollo.map(d => ({ point: 'Desarrollo', detail: d })) : [],
                    post_copy: script.copy_post || {},
                    video_duration: script.video_duration || '60 seg',
                    focus: script.focus || 'autoridad',
                    source_type: 'content_slots',
                    source_reference_id: sourceReferenceId
                }).select('id').single();

                if (insErr) throw insErr;
                
                // NOW update content_slots with the CORRECT script ID (from scripts table, not library)
                const { error: slotErr } = await supabase.from('content_slots').update({ 
                    has_script: true, 
                    script_id: newScript.id,
                    color: 'pink' // Differentiate
                }).eq('id', sourceReferenceId);
                
                if (slotErr) throw slotErr;
            } else if (sourceType === 'library') {
                 const { error: libErr } = await supabase.from('library').update({
                    type: 'guion',
                    script_full_text: fullText,
                    titulo: script.titulo_guion || script.titulo_angulo || 'Guion Generado',
                    content: {
                        video_duration: script.video_duration || '45-60 seg',
                        hook: script.hook || script.gancho || '',
                        desarrollo: Array.isArray(script.desarrollo) ? script.desarrollo : [],
                        cierre: script.cierre || '',
                        cta: script.cta || '',
                        copy_post: script.copy_post || { titulo: '', descripcion_larga: '', hashtags: [] }
                    }
                 }).eq('id', sourceReferenceId);
                 if (libErr) throw libErr;
            }

            setSuccessModalData({
                title: '¡Guardado en el Origen! ✅',
                message: `El guion ha sido vinculado y guardado en la idea original de donde provienes.`,
                actionLabel: 'Volver atrás',
                actionRedirect: `/dashboard/idea/${sourceReferenceId}`
            });
            setIsSuccessModalOpen(true);
        } catch (err) {
            console.error('Error in handleDirectSourceSave:', err);
            alert('Error al guardar en el origen: ' + err.message);
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

        // v4.6.0: Update visual state immediately
        setPlanSlots(prev => prev.map(s =>
            s.id === slot.id ? { ...s, slot_status: 'script_generating' } : s
        ));

        try {
            console.log(`[v4.6.0] Generating script for slot: "${slot.idea_title}" (id=${slot.id})`);

            const res = await fetch(`/api/slots/${slot.id}/generate-script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: profile?.id,
                    platform: slot.platform || 'Reels',
                    videoDuration: videoDuration || '60 seg',
                    focus: slot.content_type || 'autoridad',
                    ctaIdea: ctaIdea || null,
                }),
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                setPlanSlots(prev => prev.map(s =>
                    s.id === slot.id ? { ...s, slot_status: 'idea_only' } : s
                ));
                return null;
            }

            const data = await res.json();

            if (!res.ok || !data.ok) {
                console.error('[v4.6.0] Script generation failed:', data);
                setPlanSlots(prev => prev.map(s =>
                    s.id === slot.id ? { ...s, slot_status: 'script_error' } : s
                ));
                if (!silent) alert(data.error || 'Error al generar el guión. Inténtalo de nuevo.');
                return null;
            }

            const script = data.script;
            console.log('[v4.6.0] Script generated successfully:', script?.title);

            // Build local script_data for immediate display (no page reload needed)
            const slotScriptData = {
                hook: script.hook || '',
                gancho: script.hook || '',
                desarrollo: Array.isArray(script.structure)
                    ? script.structure.map(p => `${p.point}: ${p.detail}`)
                    : [],
                cta: script.cta || '',
                cierre: script.cta || '',
                copy_post: script.post_copy || { headline: '', body: '', hashtags: [] },
                notes: script.notes || '',
            };

            // Update React state for immediate visual feedback
            setPlanSlots(prev => prev.map(s => {
                if (s.id === slot.id) {
                    return {
                        ...s,
                        has_script: true,
                        slot_status: 'script_ready',
                        script_id: script.id || null,
                        script_data: slotScriptData,
                    };
                }
                return s;
            }));

            return { script, script_data: slotScriptData };

        } catch (err) {
            if (!silent) alert(err.message);
            console.error('[v4.6.0] Error generating script:', err);
            setPlanSlots(prev => prev.map(s =>
                s.id === slot.id ? { ...s, slot_status: 'script_error' } : s
            ));
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

        // v1.17.52: Inform the user before starting
        if (slotsToSend) {
            console.log(`[Sync] Iniciando proceso para ${slotsToSend.length} ideas seleccionadas.`);
        }

        setSendingToCalendar(true);
        setGenerationProgress({ current: 0, total: slots.length, status: 'Iniciando sincronización...' });

        let insertedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión activa');

            // Fetch existing events to detect duplicates/updates
            const { data: existingEvents } = await supabase
                .from('calendar_events')
                .select('id, event_date, title, has_script, script_full_text, notes')
                .eq('user_id', user.id)
                .eq('project_id', activeProject?.id || null);

            // Fetch existing scripts and library items once to improve performance
            const [ { data: allScripts }, { data: allLibraryScripts } ] = await Promise.all([
                supabase.from('scripts').select('*').eq('user_id', user.id).eq('project_id', activeProject?.id || null),
                supabase.from('library').select('*').eq('user_id', user.id).eq('type', 'guion').eq('project_id', activeProject?.id || null)
            ]);

            const combinedScripts = [
                ...(allScripts || []),
                ...(allLibraryScripts || []).map(libs => ({
                    ...libs,
                    topic: libs.titulo,
                    content: libs.content
                }))
            ];

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                try {
                    setGenerationProgress({
                        current: i + 1,
                        total: slots.length,
                        status: `Procesando ${i + 1}/${slots.length}: ${slot.idea_title}`
                    });

                    let targetDate = slot.scheduled_date ? new Date(slot.scheduled_date + 'T12:00:00') : new Date(today);
                    if (targetDate < today) targetDate = new Date(today);
                    
                    let dateStr = targetDate.toISOString().split('T')[0];
                    
                    // Duplicate/Update Detection
                    let existingEventId = null;
                    const existingEvent = existingEvents?.find(e => e.event_date === dateStr && e.title === slot.idea_title);
                    
                    if (existingEvent) {
                        // v1.17.52: RELAXED RULE - Don't skip anymore! If it exists, we mark for UPDATE.
                        // Only skip if the exact content is the SAME to save bandwidth (unlikely to happen during a test)
                        const isSameContent = existingEvent.has_script && (existingEvent.notes || existingEvent.script_full_text);
                        if (isSameContent) {
                            console.log(`[Sync] Match found for ${slot.idea_title} - overwriting/updating data.`);
                        }
                        existingEventId = existingEvent.id;
                    }

                    // UUID Validation for reference_id
                    const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
                    let refId = slot.id && isValidUUID(slot.id) ? slot.id : null;

                    // If not a UUID (proactive or local), save to library first
                    if (!refId) {
                        const savedItem = await saveToLibrary({
                            userId: user.id,
                            projectId: activeProject?.id || null,
                            type: 'idea',
                            platform: slot.platform,
                            goal: slot.goal,
                            titulo: slot.idea_title,
                            content: { ...slot },
                            tags: [slot.platform, slot.content_type].filter(Boolean)
                        });
                        if (savedItem?.id) refId = savedItem.id;
                    }

                    // Process script data if available
                    const normalize = (t) => String(t || '').replace(/[^\w\s\d]/g, '').trim().toLowerCase();
                    const slotTitleNorm = normalize(slot.idea_title);
                    const matchedScript = combinedScripts?.find(sc => normalize(sc.topic) === slotTitleNorm || normalize(sc.titulo) === slotTitleNorm);
                    
                    const sd = slot.script_data || matchedScript?.content;
                    let parsedSd = sd;
                    if (typeof sd === 'string' && sd.startsWith('{')) {
                        try { parsedSd = JSON.parse(sd); } catch(e) { parsedSd = { hook: sd }; }
                    } else if (typeof sd === 'string' && sd.trim().length > 0) {
                        parsedSd = { hook: sd };
                    }

                    const hookVal = parsedSd?.hook || parsedSd?.gancho || '';
                    const desRaw = parsedSd?.desarrollo || parsedSd?.puntos || [];
                    const desArr = Array.isArray(desRaw) ? desRaw : (desRaw ? [desRaw] : []);
                    const ctaVal = parsedSd?.cta || parsedSd?.cierre || '';
                    const hasRealContent = hookVal.length > 5 || desArr.length > 0;

                    const richIdeaContext = [
                        `📅 PLAN MENSUAL`,
                        `TÍTULO: ${slot.idea_title}`,
                        slot.idea_description ? `📝 RESUMEN: ${slot.idea_description}` : '',
                        `🎯 OBJETIVO: ${slot.goal || 'engagement'}`,
                        `📱 PLATAFORMA: ${slot.platform || 'General'}`,
                    ].filter(Boolean).join('\n');

                    let fullText = richIdeaContext;
                    if (hasRealContent) {
                        fullText = [
                            slot.idea_title,
                            '', '🎯 GANCHO', hookVal,
                            '', '📝 DESARROLLO', ...desArr.map((d, idx) => `${idx + 1}. ${d}`),
                            '', '🔥 CTA', ctaVal
                        ].join('\n');
                    }

                    const eventPayload = {
                        user_id: user.id,
                        project_id: activeProject?.id || null,
                        title: slot.idea_title || 'Idea Sin Título',
                        description: `[Plan Mensual] ${slot.idea_description || ''}`,
                        event_date: dateStr,
                        type: (slot.has_script || (parsedSd && hasRealContent)) ? 'guion' : 'idea',
                        status: (slot.has_script || (parsedSd && hasRealContent)) ? 'Guion listo' : 'Idea',
                        platform: slot.platform || 'General',
                        reference_id: refId,
                        has_script: !!(slot.has_script || (parsedSd && hasRealContent)),
                        script_full_text: fullText,
                        notes: fullText,
                        start_time: '12:00',
                        end_time: '13:00',
                        color: '#9D00FF'
                    };

                    if (existingEventId) {
                        const { error: upError } = await supabase.from('calendar_events').update(eventPayload).eq('id', existingEventId);
                        if (upError) throw upError;
                        updatedCount++;
                    } else {
                        const { error: insError } = await supabase.from('calendar_events').insert(eventPayload);
                        if (insError) throw insError;
                        insertedCount++;
                    }

                } catch (slotErr) {
                    console.error(`[Sync] Error en slot ${i}:`, slotErr);
                    failedCount++;
                }
            }

            setPlanSlots(slots.map(s => ({ ...s, sent_to_calendar: true })));
            setGenerationProgress({ current: slots.length, total: slots.length, status: '¡Sincronización completa!' });

            // v1.17.52: DEEP DIAGNOSTIC REPORT
            const report = [
                `✅ ¡Sincronización Finalizada!`,
                ``,
                `📊 Resultados:`,
                insertedCount > 0 ? `  • Insertados: ${insertedCount} nuevos ✅` : '',
                updatedCount > 0 ? `  • Actualizados: ${updatedCount} existentes 🔄` : '',
                failedCount > 0 ? `  • Fallidos: ${failedCount} (Ver consola) ❌` : '',
                ``,
                `Ahora puedes ir al calendario para ver tus publicaciones programadas.`
            ].filter(Boolean).join('\n');
            
            alert(report);
            router.push('/dashboard/calendar');

        } catch (err) {
            console.error('[Sync Major Error] ', err);
            alert('Error grave al sincronizar: ' + err.message);
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
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-credits'))} style={{ background: 'var(--accent-gradient)', color: 'black', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Comprar más</button>
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
                        onClick={() => { 
                            setGenerationMode('single'); 
                            setTopic(''); 
                            setWizardStep(1); 
                            setStep(1);
                            setScripts([]);
                        }}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, transition: '0.2s', background: generationMode === 'single' ? '#7ECECA' : 'transparent', color: generationMode === 'single' ? '#000' : 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Guiones de un tema
                    </button>
                    <button
                        onClick={() => { 
                            setGenerationMode('plan'); 
                            setTopic(''); 
                            setPlanWizardStep(1); 
                            setStep(1); 
                            setPlanSlots([]);
                        }}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, transition: '0.2s', background: generationMode === 'plan' ? '#7ECECA' : 'transparent', color: generationMode === 'plan' ? '#000' : 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <CalendarDays size={18} /> Plan mensual de contenido
                    </button>
                </div>
            )}

            {step === 1 && generationMode === 'single' && (
                <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                    {/* Script Presets */}
                    <FormPresets
                        type="script"
                        getCurrentConfig={() => ({
                            topic, platform, toneBrand, goal, awareness, quantity, hookType,
                            intensity, videoDuration, specificDetails, ctaIdea,
                            experienciaReal, opinionPersonal, faseCreador, victory, opinion, story
                        })}
                        onLoadConfig={(c) => {
                            if (c.topic) setTopic(c.topic);
                            if (c.platform) setPlatform(c.platform);
                            if (c.toneBrand) setToneBrand(c.toneBrand);
                            if (c.goal) setGoal(c.goal);
                            if (c.awareness) setAwareness(c.awareness);
                            if (c.quantity) setQuantity(c.quantity);
                            if (c.hookType) setHookType(c.hookType);
                            if (c.intensity) setIntensity(c.intensity);
                            if (c.videoDuration) setVideoDuration(c.videoDuration);
                            if (c.specificDetails) setSpecificDetails(c.specificDetails);
                            if (c.ctaIdea) setCtaIdea(c.ctaIdea);
                            if (c.experienciaReal) setExperienciaReal(c.experienciaReal);
                            if (c.opinionPersonal) setOpinionPersonal(c.opinionPersonal);
                            if (c.faseCreador) setFaseCreador(c.faseCreador);
                            if (c.victory) setVictory(c.victory);
                            if (c.opinion) setOpinion(c.opinion);
                            if (c.story) setStory(c.story);
                        }}
                    />
                    <style>{`
                        .wz-chip { padding: 10px 18px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.08); cursor: pointer; font-size: 0.85rem; font-weight: 600; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); transition: all 0.18s ease; display: inline-flex; align-items: center; gap: 6px; }
                        .wz-chip:hover { border-color: rgba(157,0,255,0.4); color: #fff; }
                        .wz-chip.active { background: rgba(157,0,255,0.85); border-color: #9D00FF; color: #fff; font-weight: 700; box-shadow: 0 0 14px rgba(157,0,255,0.4); }
                        .wz-chip-teal.active { background: rgba(126,206,202,0.15); border-color: #7ECECA; color: #7ECECA; box-shadow: 0 0 12px rgba(126,206,202,0.2); }
                        .wz-chips { display: flex; flex-wrap: wrap; gap: 10px; }
                        @media (max-width: 768px) { .wz-chips { display: grid; grid-template-columns: 1fr 1fr; } }
                        .wz-label { font-size: 0.7rem; font-weight: 800; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px; display: block; }
                        .wz-step { animation: wzFadeIn 0.22s ease; }
                        @keyframes wzFadeIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
                        .wz-input { background: rgba(255,255,255,0.04) !important; border: 2px solid rgba(255,255,255,0.08) !important; border-radius: 10px !important; transition: border-color 0.2s, box-shadow 0.2s !important; }
                        .wz-input:focus { border-color: #9D00FF !important; box-shadow: 0 0 0 3px rgba(157,0,255,0.15) !important; outline: none !important; }
                        .wz-progress-bar { height: 3px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; margin-bottom: 32px; }
                        .wz-progress-fill { height: 100%; background: linear-gradient(90deg, #9D00FF, #7ECECA); border-radius: 99px; transition: width 0.35s ease; }
                        @media (max-width: 768px) { .wz-nav-sticky { position: sticky; bottom: 0; background: #0a0a0f; padding: 16px 0 4px; border-top: 1px solid rgba(255,255,255,0.06); margin: 0 -40px; padding-left: 40px; padding-right: 40px; z-index: 10; } }
                    `}</style>

                    {/* Wizard Progress */}
                    <div style={{ marginBottom: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {wizardStep === 1 ? 'Tu Marca' : wizardStep === 2 ? 'Tu Contenido' : wizardStep === 3 ? 'Tu Estrategia' : 'Tu Idea'}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9D00FF' }}>Paso {wizardStep} de {hasBrain ? 3 : 4}</span>
                        </div>
                        <div className="wz-progress-bar">
                            <div className="wz-progress-fill" style={{ width: `${(wizardStep / (hasBrain ? 3 : 4)) * 100}%` }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {(hasBrain ? [2,3,4] : [1,2,3,4]).map((w,i) => (
                                <div key={w} style={{ width: 8, height: 8, borderRadius: '50%', background: wizardStep >= w ? '#9D00FF' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                            ))}
                        </div>
                    </div>

                    <h2 style={{ fontSize: '1.6rem', marginBottom: '24px', fontWeight: 800, textAlign: 'center', letterSpacing: '-0.02em' }}>
                        {wizardStep === 1 ? '🧠 Tu Marca Personal' : wizardStep === 2 ? '📱 Tu Contenido' : wizardStep === 3 ? '🎯 Tu Estrategia' : '💡 Tu Idea'}
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input className="input-field" placeholder="Quién eres en una frase" value={brainForm.biography} onChange={(e) => setBrainForm({ ...brainForm, biography: e.target.value })} />
                                                {brainForm.biography?.length >= 5 && (
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input 
                                                            className="input-field"
                                                            style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                            placeholder="Instrucción IA..."
                                                            value={aiRefineInstructions['brain_biography_edit'] || ''}
                                                            onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, brain_biography_edit: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !polishingField) {
                                                                    handleImproveField(brainForm.biography, (v) => setBrainForm(prev => ({ ...prev, biography: v })), 'brain_biography_edit', aiRefineInstructions['brain_biography_edit']);
                                                                }
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => handleImproveField(brainForm.biography, (v) => setBrainForm(prev => ({ ...prev, biography: v })), 'brain_biography_edit', aiRefineInstructions['brain_biography_edit'])} 
                                                            disabled={polishingField === 'brain_biography_edit'}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                                fontWeight: 700, cursor: polishingField === 'brain_biography_edit' ? 'default' : 'pointer',
                                                                background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                                color: '#7ECECA', transition: '0.2s'
                                                            }}
                                                        >
                                                            {polishingField === 'brain_biography_edit' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            {aiRefineInstructions['brain_biography_edit'] ? 'Aplicar' : 'Mejorar'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input className="input-field" placeholder="Qué vendes" value={brainForm.sells} onChange={(e) => setBrainForm({ ...brainForm, sells: e.target.value })} />
                                                {brainForm.sells?.length >= 5 && (
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input 
                                                            className="input-field"
                                                            style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                            placeholder="Instrucción IA..."
                                                            value={aiRefineInstructions['brain_sells_edit'] || ''}
                                                            onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, brain_sells_edit: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !polishingField) {
                                                                    handleImproveField(brainForm.sells, (v) => setBrainForm(prev => ({ ...prev, sells: v })), 'brain_sells_edit', aiRefineInstructions['brain_sells_edit']);
                                                                }
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => handleImproveField(brainForm.sells, (v) => setBrainForm(prev => ({ ...prev, sells: v })), 'brain_sells_edit', aiRefineInstructions['brain_sells_edit'])} 
                                                            disabled={polishingField === 'brain_sells_edit'}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                                fontWeight: 700, cursor: polishingField === 'brain_sells_edit' ? 'default' : 'pointer',
                                                                background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                                color: '#7ECECA', transition: '0.2s'
                                                            }}
                                                        >
                                                            {polishingField === 'brain_sells_edit' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            {aiRefineInstructions['brain_sells_edit'] ? 'Aplicar' : 'Mejorar'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input className="input-field" placeholder="A quién ayudas" value={brainForm.helps} onChange={(e) => setBrainForm({ ...brainForm, helps: e.target.value })} />
                                                {brainForm.helps?.length >= 5 && (
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input 
                                                            className="input-field"
                                                            style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                            placeholder="Instrucción IA..."
                                                            value={aiRefineInstructions['brain_helps_edit'] || ''}
                                                            onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, brain_helps_edit: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !polishingField) {
                                                                    handleImproveField(brainForm.helps, (v) => setBrainForm(prev => ({ ...prev, helps: v })), 'brain_helps_edit', aiRefineInstructions['brain_helps_edit']);
                                                                }
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => handleImproveField(brainForm.helps, (v) => setBrainForm(prev => ({ ...prev, helps: v })), 'brain_helps_edit', aiRefineInstructions['brain_helps_edit'])} 
                                                            disabled={polishingField === 'brain_helps_edit'}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                                fontWeight: 700, cursor: polishingField === 'brain_helps_edit' ? 'default' : 'pointer',
                                                                background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                                color: '#7ECECA', transition: '0.2s'
                                                            }}
                                                        >
                                                            {polishingField === 'brain_helps_edit' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            {aiRefineInstructions['brain_helps_edit'] ? 'Aplicar' : 'Mejorar'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>


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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input className="input-field" placeholder="Quién eres en una frase" value={brainForm.biography} onChange={(e) => setBrainForm({ ...brainForm, biography: e.target.value })} />
                                        {brainForm.biography?.length >= 5 && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción IA..."
                                                    value={aiRefineInstructions['brain_biography'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, brain_biography: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(brainForm.biography, (v) => setBrainForm(prev => ({ ...prev, biography: v })), 'brain_biography', aiRefineInstructions['brain_biography']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(brainForm.biography, (v) => setBrainForm(prev => ({ ...prev, biography: v })), 'brain_biography', aiRefineInstructions['brain_biography'])} 
                                                    disabled={polishingField === 'brain_biography'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'brain_biography' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'brain_biography' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['brain_biography'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input className="input-field" placeholder="Qué vendes" value={brainForm.sells} onChange={(e) => setBrainForm({ ...brainForm, sells: e.target.value })} />
                                        {brainForm.sells?.length >= 5 && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción IA..."
                                                    value={aiRefineInstructions['brain_sells'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, brain_sells: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(brainForm.sells, (v) => setBrainForm(prev => ({ ...prev, sells: v })), 'brain_sells', aiRefineInstructions['brain_sells']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(brainForm.sells, (v) => setBrainForm(prev => ({ ...prev, sells: v })), 'brain_sells', aiRefineInstructions['brain_sells'])} 
                                                    disabled={polishingField === 'brain_sells'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'brain_sells' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'brain_sells' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['brain_sells'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input className="input-field" placeholder="A quién ayudas" value={brainForm.helps} onChange={(e) => setBrainForm({ ...brainForm, helps: e.target.value })} />
                                        {brainForm.helps?.length >= 5 && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción IA..."
                                                    value={aiRefineInstructions['brain_helps'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, brain_helps: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(brainForm.helps, (v) => setBrainForm(prev => ({ ...prev, helps: v })), 'brain_helps', aiRefineInstructions['brain_helps']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(brainForm.helps, (v) => setBrainForm(prev => ({ ...prev, helps: v })), 'brain_helps', aiRefineInstructions['brain_helps'])} 
                                                    disabled={polishingField === 'brain_helps'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'brain_helps' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'brain_helps' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['brain_helps'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>


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

                    {/* Wizard Step 2: Tu Contenido */}
                    {wizardStep === 2 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div>
                                <span className="wz-label">📱 Plataforma principal</span>
                                <div className="wz-chips">
                                    {['Reels','TikTok','YouTube Shorts','LinkedIn','X','Instagram','YouTube'].map(p => (
                                        <button key={p} className={`wz-chip${platform === p ? ' active' : ''}`} onClick={() => setPlatform(p)}>{p}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="wz-label">⏱ Duración base del vídeo</span>
                                <div className="wz-chips">
                                    {['60 seg','90 seg','3 min','5 min','10 min'].map(d => (
                                        <button key={d} className={`wz-chip${videoDuration === d ? ' active' : ''}`} onClick={() => setVideoDuration(d)}>{d}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => setWizardStep(hasBrain ? 1 : 1)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={() => setWizardStep(3)} className="btn-primary" style={{ flex: 2 }}>Siguiente →</button>
                            </div>
                        </div>
                    )}

                    {/* Wizard Step 3: Tu Estrategia */}
                    {wizardStep === 3 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div>
                                <span className="wz-label">🎯 Objetivo principal</span>
                                <div className="wz-chips">
                                    {[
                                        { val: 'engagement', label: 'Más Visibilidad' },
                                        { val: 'atraer leads', label: 'Más Leads' },
                                        { val: 'venta directa', label: 'Más Ventas' },
                                        { val: 'autoridad', label: 'Autoridad' },
                                        { val: 'educar', label: 'Educar' },
                                        { val: 'storytelling', label: 'Storytelling' },
                                    ].map(o => (
                                        <button key={o.val} className={`wz-chip${goal === o.val ? ' active' : ''}`} onClick={() => setGoal(o.val)}>{o.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="wz-label">🎨 Estilo de contenido (multi-selección)</span>
                                <div className="wz-chips">
                                    {ESTILOS_PLAN.map(e => (
                                        <button key={e} className={`wz-chip wz-chip-teal${singleContentStyles.includes(e) ? ' active' : ''}`}
                                            onClick={() => setSingleContentStyles(prev => prev.includes(e) ? prev.filter(x=>x!==e) : [...prev, e])}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="wz-label">🚫 Lo que NO quieres (voz de marca)</span>
                                <input className="input-field wz-input" placeholder="Ej: No quiero frases motivacionales vacías ni promesas de dinero fácil" value={singleHowNotToSound} onChange={e => setSingleHowNotToSound(e.target.value)} />
                            </div>
                            <div>
                                <span className="wz-label">💫 Nivel de audiencia</span>
                                <div className="wz-chips">
                                    {AWARENESS_LEVELS.map(a => (
                                        <button key={a} className={`wz-chip${awareness === a ? ' active' : ''}`} onClick={() => setAwareness(a)}>
                                            {a === 'no te conoce' ? 'No me conoce' : a === 'tibia' ? 'Me conoce (tibia)' : 'Muy caliente'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => setWizardStep(2)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={() => setWizardStep(4)} className="btn-primary" style={{ flex: 2 }}>Siguiente →</button>
                            </div>
                        </div>
                    )}

                    {/* Wizard Step 4: Tu Idea */}
                    {wizardStep === 4 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div>
                                <span className="wz-label">💡 Idea o tema que quieres empujar</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <AIPolishedTextarea className="textarea-field wz-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: Cómo ganar 1.000 seguidores en 30 días sin pagar ads" style={{ minHeight: '90px', flex: 1 }} />
                                    <VoiceDictation onResult={(text) => setTopic(prev => prev ? `${prev} ${text}` : text)} />
                                </div>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Experiencia real / historia que quieres contar <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Recomendado)</span></p>
                                    <textarea 
                                        className="textarea-field" 
                                        placeholder="Ej: Ayer un cliente me dijo que mi app le ahorró 10 horas... o 'Cuando empecé no tenía ni 100€ en la cuenta...'" 
                                        value={experienciaReal} 
                                        onChange={(e) => setExperienciaReal(e.target.value)} 
                                        rows={2}
                                        style={{ width: '100%', minHeight: '80px' }}
                                    />
                                    {experienciaReal.length >= 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción (ej: hazlo más emocional...)"
                                                    value={aiRefineInstructions['experienciaReal'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, experienciaReal: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(experienciaReal, setExperienciaReal, 'experienciaReal', aiRefineInstructions['experienciaReal']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(experienciaReal, setExperienciaReal, 'experienciaReal', aiRefineInstructions['experienciaReal'])} 
                                                    disabled={polishingField === 'experienciaReal'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'experienciaReal' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'experienciaReal' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['experienciaReal'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}


                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Opinión personal / mensaje clave <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Recomendado)</span></p>
                                    <input 
                                        className="input-field" 
                                        placeholder="Ej: El networking tradicional ha muerto, ahora todo es marca personal." 
                                        value={opinionPersonal} 
                                        onChange={(e) => setOpinionPersonal(e.target.value)} 
                                    />
                                    {opinionPersonal.length >= 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción (ej: hazlo más directo...)"
                                                    value={aiRefineInstructions['opinionPersonal'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, opinionPersonal: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(opinionPersonal, setOpinionPersonal, 'opinionPersonal', aiRefineInstructions['opinionPersonal']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(opinionPersonal, setOpinionPersonal, 'opinionPersonal', aiRefineInstructions['opinionPersonal'])} 
                                                    disabled={polishingField === 'opinionPersonal'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'opinionPersonal' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'opinionPersonal' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['opinionPersonal'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}


                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Nivel de experiencia / fase en la que estás</p>
                                    <select 
                                        className="input-field shadow-sm"
                                        value={faseCreador}
                                        onChange={(e) => setFaseCreador(e.target.value)}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                    >
                                        <option value="Estoy empezando a crear contenido">Estoy empezando a crear contenido</option>
                                        <option value="Tengo algo de audiencia pero aún crezco">Tengo algo de audiencia pero aún crezco</option>
                                        <option value="Creo contenido de forma constante desde hace +1 año">Creo contenido de forma constante desde hace +1 año</option>
                                        <option value="Soy referente / tengo audiencia consolidada">Soy referente / tengo audiencia consolidada</option>
                                    </select>
                                </div>
                            </div>
                            <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', opacity: 0.6 }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>Victoria/Fracaso (Opcional)</p>
                                    <input className="input-field" placeholder="1-2 frases" value={victory} onChange={(e) => setVictory(e.target.value)} style={{ fontSize: '0.75rem' }} />
                                    {victory.length >= 2 && (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                                            <input 
                                                className="input-field"
                                                style={{ fontSize: '0.6rem', padding: '4px 6px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                placeholder="Instrucción (ej: profesional...)"
                                                value={aiRefineInstructions['victory'] || ''}
                                                onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, victory: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !polishingField) {
                                                        handleImproveField(victory, setVictory, 'victory', aiRefineInstructions['victory']);
                                                    }
                                                }}
                                            />
                                            <button 
                                                onClick={() => handleImproveField(victory, setVictory, 'victory', aiRefineInstructions['victory'])} 
                                                disabled={polishingField === 'victory'}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem',
                                                    fontWeight: 700, cursor: polishingField === 'victory' ? 'default' : 'pointer',
                                                    background: 'rgba(126, 206, 202, 0.05)', border: '1px solid rgba(126, 206, 202, 0.1)',
                                                    color: '#7ECECA', transition: '0.2s'
                                                }}
                                            >
                                                {polishingField === 'victory' ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                {aiRefineInstructions['victory'] ? 'Ok' : 'IA'}
                                            </button>
                                        </div>
                                    )}


                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>Opinión impopular (Opcional)</p>
                                    <input className="input-field" placeholder="Tu opinión controversial" value={opinion} onChange={(e) => setOpinion(e.target.value)} style={{ fontSize: '0.75rem' }} />
                                    {opinion.length >= 2 && (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                                            <input 
                                                className="input-field"
                                                style={{ fontSize: '0.6rem', padding: '4px 6px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                placeholder="Instrucción..."
                                                value={aiRefineInstructions['opinion'] || ''}
                                                onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, opinion: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !polishingField) {
                                                        handleImproveField(opinion, setOpinion, 'opinion', aiRefineInstructions['opinion']);
                                                    }
                                                }}
                                            />
                                            <button 
                                                onClick={() => handleImproveField(opinion, setOpinion, 'opinion', aiRefineInstructions['opinion'])} 
                                                disabled={polishingField === 'opinion'}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem',
                                                    fontWeight: 700, cursor: polishingField === 'opinion' ? 'default' : 'pointer',
                                                    background: 'rgba(126, 206, 202, 0.05)', border: '1px solid rgba(126, 206, 202, 0.1)',
                                                    color: '#7ECECA', transition: '0.2s'
                                                }}
                                            >
                                                {polishingField === 'opinion' ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                {aiRefineInstructions['opinion'] ? 'Ok' : 'IA'}
                                            </button>
                                        </div>
                                    )}


                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>Caso real / Situación (Opcional)</p>
                                    <input className="input-field" placeholder="Cliente o situación real" value={story} onChange={(e) => setStory(e.target.value)} style={{ fontSize: '0.75rem' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Idea para el CTA <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(opcional - la IA sugerirá uno si lo dejas vacío)</span></p>
                                        <VoiceDictation onResult={(text) => setCtaIdea(prev => prev ? `${prev} ${text}` : text)} />
                                    </div>
                                    <input
                                        className="input-field"
                                        placeholder="Ej: Que comenten la palabra 'IA', que vayan al link de mi bio... (O deja vacío para sugerencia IA)"
                                        value={ctaIdea}
                                        onChange={(e) => setCtaIdea(e.target.value)}
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <span className="wz-label">🔁 Mantra / Idea repetida <span style={{ color: 'rgba(255,255,255,0.25)' }}>(opcional)</span></span>
                                <input className="input-field wz-input" placeholder="Ej: La consistencia es la clave" value={brandMantra} onChange={e => setBrandMantra(e.target.value)} />
                            </div>
                            <div>
                                <span className="wz-label">📊 Métrica de éxito <span style={{ color: 'rgba(255,255,255,0.25)' }}>(opcional)</span></span>
                                <input className="input-field wz-input" placeholder="Ej: 500 seguidores en 30 días" value={successMetric} onChange={e => setSuccessMetric(e.target.value)} />
                            </div>
                            <div>
                                <span className="wz-label">📦 Cantidad de guiones</span>
                                <div className="wz-chips">
                                    {[1,2,3,4].map(q => (
                                        <button key={q} className={`wz-chip${quantity === q ? ' active' : ''}`} onClick={() => setQuantity(q)}>{q} guión{q > 1 ? 'es' : ''}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => setWizardStep(3)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={handleGenerateSingle} className="btn-primary btn-premium-glow" style={{ flex: 2, height: '56px', fontSize: '1.05rem', fontWeight: 800 }}>⚡ Generar guion con IA →</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Plan Monthly Mode (v4.0.0) */}
            {step === 1 && generationMode === 'plan' && (
                <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)', maxWidth: '900px', margin: '0 auto' }}>
                    {/* Plan Presets */}
                    <FormPresets
                        type="plan"
                        getCurrentConfig={() => ({
                            businessOffer, ticketPrice, targetAudience, targetAudienceType,
                            mainPainPoint, monthlyGoals, successMetric, keyThemes, contentStyles,
                            howNotToSound, brandMantra, planPlatforms, planFrequency, planFocus,
                            toneBrand, videoDuration
                        })}
                        onLoadConfig={(c) => {
                            if (c.businessOffer) setBusinessOffer(c.businessOffer);
                            if (c.ticketPrice) setTicketPrice(c.ticketPrice);
                            if (c.targetAudience) setTargetAudience(c.targetAudience);
                            if (c.targetAudienceType) setTargetAudienceType(c.targetAudienceType);
                            if (c.mainPainPoint) setMainPainPoint(c.mainPainPoint);
                            if (c.monthlyGoals) setMonthlyGoals(c.monthlyGoals);
                            if (c.successMetric) setSuccessMetric(c.successMetric);
                            if (c.keyThemes) setKeyThemes(c.keyThemes);
                            if (c.contentStyles) setContentStyles(c.contentStyles);
                            if (c.howNotToSound) setHowNotToSound(c.howNotToSound);
                            if (c.brandMantra) setBrandMantra(c.brandMantra);
                            if (c.planPlatforms) setPlanPlatforms(c.planPlatforms);
                            if (c.planFrequency) setPlanFrequency(c.planFrequency);
                            if (c.planFocus) setPlanFocus(c.planFocus);
                            if (c.toneBrand) setToneBrand(c.toneBrand);
                            if (c.videoDuration) setVideoDuration(c.videoDuration);
                        }}
                    />
                    <style>{`
                        .pwz-chip { padding: 11px 20px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.08); cursor: pointer; font-size: 0.85rem; font-weight: 600; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); transition: all 0.18s ease; }
                        .pwz-chip:hover { border-color: rgba(157,0,255,0.4); color: #fff; }
                        .pwz-chip.active { background: #9D00FF; border-color: #9D00FF; color: #fff; font-weight: 700; box-shadow: 0 0 14px rgba(157,0,255,0.4); }
                        .pwz-chip.active-teal { background: rgba(126,206,202,0.15); border-color: #7ECECA; color: #7ECECA; font-weight: 700; }
                        .pwz-chips { display: flex; flex-wrap: wrap; gap: 10px; }
                        @media (max-width: 768px) { .pwz-chips { display: grid; grid-template-columns: 1fr 1fr; } }
                        .pwz-intensity { padding: 16px 20px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.08); cursor: pointer; text-align: center; font-weight: 700; font-size: 0.9rem; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); transition: all 0.2s; flex: 1; }
                        .pwz-intensity:hover { border-color: rgba(157,0,255,0.3); }
                        .pwz-intensity.active { border-color: #9D00FF; background: rgba(157,0,255,0.12); color: #fff; box-shadow: 0 0 18px rgba(157,0,255,0.2); }
                    `}</style>

                    {/* Stepper Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {planWizardStep === 1 ? 'Plataformas' : planWizardStep === 2 ? 'Estrategia' : planWizardStep === 3 ? 'Tu Voz' : 'Ideas del Banco'}
                            </span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9D00FF' }}>Paso {planWizardStep} de 4</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #9D00FF, #7ECECA)', borderRadius: 99, width: `${(planWizardStep / 4) * 100}%`, transition: 'width 0.35s ease' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {[1,2,3,4].map(w => (
                                <div key={w} style={{ width: 8, height: 8, borderRadius: '50%', background: planWizardStep >= w ? '#9D00FF' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                            ))}
                        </div>
                    </div>

                    {/* STEP 1: PLATAFORMAS Y FRECUENCIA */}
                    {planWizardStep === 1 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>📱 Plataformas y Frecuencia</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¿Dónde publicas y con qué ritmo?</p>
                            </div>
                            <div>
                                <span className="wz-label">Plataformas (multi-selección)</span>
                                <div className="pwz-chips">
                                    {PLATAFORMAS.map(p => (
                                        <button key={p} className={`pwz-chip${planPlatforms.includes(p) ? ' active' : ''}`} onClick={() => handleTogglePlatform(p)}>{p}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="wz-label">Frecuencia semanal</span>
                                <div className="pwz-chips">
                                    {FRECUENCIAS.map(f => (
                                        <button key={f} className={`pwz-chip${planFrequency === f ? ' active' : ''}`} onClick={() => setPlanFrequency(f)}>{f.split(' ')[0]}× por semana</button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ gridColumn: '1 / span 2' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>¿Qué vendes este mes? (Oferta Principal) <span style={{color: '#7ECECA'}}>*</span></p>
                                    <input 
                                        className="input-field" 
                                        placeholder="Ej: Mentoría 1:1, Curso de IA, Pack de 10 guiones..." 
                                        value={businessOffer} 
                                        onChange={(e) => setBusinessOffer(e.target.value)} 
                                    />
                                    {businessOffer.length >= 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción (ej: hazlo más agresivo, añade urgencia...)"
                                                    value={aiRefineInstructions['businessOffer'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, businessOffer: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(businessOffer, setBusinessOffer, 'businessOffer', aiRefineInstructions['businessOffer']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(businessOffer, setBusinessOffer, 'businessOffer', aiRefineInstructions['businessOffer'])} 
                                                    disabled={polishingField === 'businessOffer'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'businessOffer' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'businessOffer' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['businessOffer'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0 }}>
                                                Instrucción opcional o hazlo automático. (1 crédito)
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Precio / Ticket medio (Opcional)</p>
                                    <input 
                                        className="input-field" 
                                        placeholder="Ej: 49€, 1500€, Suscripción 20€/mes..." 
                                        value={ticketPrice} 
                                        onChange={(e) => setTicketPrice(e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Tipo de audiencia <span style={{color: '#7ECECA'}}>*</span></p>
                                    <select 
                                        className="select-field" 
                                        value={targetAudienceType} 
                                        onChange={(e) => setTargetAudienceType(e.target.value)}
                                    >
                                        {AUDIENCIAS_PLAN.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / span 2' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Describe a tu público y su problema nº1 <span style={{color: '#7ECECA'}}>*</span></p>
                                    <textarea 
                                        className="textarea-field" 
                                        placeholder="Ej: Profesionales de +40 años que se sienten abrumados por la IA y tienen miedo de quedarse atrás." 
                                        value={mainPainPoint} 
                                        onChange={(e) => setMainPainPoint(e.target.value)} 
                                        rows={3} 
                                    />
                                    {mainPainPoint.length >= 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción (ej: enfócate en el dolor del tiempo...)"
                                                    value={aiRefineInstructions['mainPainPoint'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, mainPainPoint: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(mainPainPoint, setMainPainPoint, 'mainPainPoint', aiRefineInstructions['mainPainPoint']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(mainPainPoint, setMainPainPoint, 'mainPainPoint', aiRefineInstructions['mainPainPoint'])} 
                                                    disabled={polishingField === 'mainPainPoint'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'mainPainPoint' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'mainPainPoint' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['mainPainPoint'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}


                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => setGenerationMode('single')} className="btn-secondary" style={{ flex: 1 }}>← Volver</button>
                                <button onClick={() => {
                                    if (planPlatforms.length === 0) { alert('Selecciona al menos una plataforma.'); return; }
                                    setPlanWizardStep(2);
                                }} className="btn-primary" style={{ flex: 2 }}>Siguiente →</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ESTRATEGIA DEL MES */}
                    {planWizardStep === 2 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>🎯 Estrategia del Mes</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Metas, estilos e intensidad de contenido.</p>
                            </div>

                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>Objetivos principales (Selecciona varios)</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {OBJETIVOS_PLAN.map(o => (
                                        <button 
                                            key={o} 
                                            onClick={() => {
                                                if (monthlyGoals.includes(o)) setMonthlyGoals(monthlyGoals.filter(i => i !== o));
                                                else setMonthlyGoals([...monthlyGoals, o]);
                                            }}
                                            className={`pwz-chip${monthlyGoals.includes(o) ? ' active' : ''}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Temas clave a empujar</p>
                                    <textarea 
                                        className="textarea-field" 
                                        placeholder="Ej: Detrás de cámaras, errores comunes, mindset realista..." 
                                        value={keyThemes} 
                                        onChange={(e) => setKeyThemes(e.target.value)} 
                                        rows={3} 
                                    />
                                    {keyThemes.length >= 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    className="input-field"
                                                    style={{ fontSize: '0.7rem', padding: '6px 10px', height: 'auto', flex: 1, background: 'rgba(255,255,255,0.03)' }}
                                                    placeholder="Instrucción (ej: hazlo más profesional...)"
                                                    value={aiRefineInstructions['keyThemes'] || ''}
                                                    onChange={(e) => setAiRefineInstructions(prev => ({ ...prev, keyThemes: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !polishingField) {
                                                            handleImproveField(keyThemes, setKeyThemes, 'keyThemes', aiRefineInstructions['keyThemes']);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleImproveField(keyThemes, setKeyThemes, 'keyThemes', aiRefineInstructions['keyThemes'])} 
                                                    disabled={polishingField === 'keyThemes'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem',
                                                        fontWeight: 700, cursor: polishingField === 'keyThemes' ? 'default' : 'pointer',
                                                        background: 'rgba(126, 206, 202, 0.08)', border: '1px solid rgba(126, 206, 202, 0.2)',
                                                        color: '#7ECECA', transition: '0.2s'
                                                    }}
                                                >
                                                    {polishingField === 'keyThemes' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    {aiRefineInstructions['keyThemes'] ? 'Aplicar' : 'Mejorar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}


                                </div>
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Métrica de éxito mensual</p>
                                    <input 
                                        className="input-field wz-input" 
                                        placeholder="Ej: 50 nuevos seguidores, 10 llamadas de venta..." 
                                        value={successMetric} 
                                        onChange={(e) => setSuccessMetric(e.target.value)} 
                                    />
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '20px', marginBottom: '12px' }}>Estilo de contenido</p>
                                    <div className="pwz-chips">
                                        {ESTILOS_PLAN.map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => {
                                                    if (contentStyles.includes(s)) setContentStyles(contentStyles.filter(i => i !== s));
                                                    else setContentStyles([...contentStyles, s]);
                                                }}
                                                className={`pwz-chip${contentStyles.includes(s) ? ' active-teal' : ''}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Integrated Idea Bank Selection */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Añadir ideas de tu banco (Opcional)</h3>
                                        <button 
                                            onClick={fetchProactiveIdeas} 
                                            disabled={loadingRecommended}
                                            style={{ 
                                                background: 'transparent', border: 'none', color: '#7ECECA', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                                            }}
                                            title="Generar nuevas ideas personalizadas"
                                        >
                                            <RefreshCcw size={14} className={loadingRecommended ? "animate-spin" : ""} />
                                        </button>
                                        {loadingRecommended && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mapeando nicho...</span>}
                                    </div>
                                    <button onClick={() => setExtraIdeasModal({ ...extraIdeasModal, open: true })} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Explore más</button>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
                                    {(() => {
                                        // v4.9.1: AI Suggestions come FIRST for actual "dynamic" feel
                                        let combined = [
                                            ...recommendedIdeas.map((i, idx) => ({ 
                                                ...i, 
                                                source: 'ai', 
                                                displayTitle: i.titulo_idea || i.titulo || i.title || i.titulo_propuesto || i.content?.titulo || i.content?.idea_title || 'Sugerencia viral',
                                                descripcion: i.descripcion || i.description || i.idea_description || i.content?.descripcion || ''
                                            })),
                                            ...libIdeas.map(i => {
                                                const c = i.content || {};
                                                const title = i.titulo || i.title || c.titulo || c.titulo_idea || c.titulo_guion || c.titulo_angulo || i.goal || 'Idea estratégica';
                                                const desc = i.descripcion || i.description || i.script_full_text || c.descripcion || c.description || c.idea_description || c.hook || c.gancho || c.content || '';
                                                return { 
                                                    ...i, 
                                                    source: 'library', 
                                                    displayTitle: title,
                                                    descripcion: typeof desc === 'string' ? desc.substring(0, 300) : '' 
                                                };
                                            })
                                        ];

                                        // SHUFFLE only if not currently loading, to avoid layout jump during fetch
                                        if (combined.length > 0 && !loadingRecommended) {
                                            // Optional: simple shuffle here or just keep AI first
                                            // combined = combined.sort(() => Math.random() - 0.5);
                                        }

                                        if (combined.length === 0 && !loadingRecommended) {
                                            return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay ideas guardadas para mostrar.</p>;
                                        }

                                        return combined.slice(0, 40).map(idea => {
                                            const isSelected = selectedPlanIdeas.includes(idea.id);
                                            // Fallback for empty titles: use first few words of description
                                            const finalTitle = idea.displayTitle || (idea.descripcion ? (idea.descripcion.substring(0, 40) + '...') : 'Idea sin título');

                                            return (
                                                <div 
                                                    key={idea.id} 
                                                    onClick={() => {
                                                        if (isSelected) setSelectedPlanIdeas(selectedPlanIdeas.filter(id => id !== idea.id));
                                                        else setSelectedPlanIdeas([...selectedPlanIdeas, idea.id]);
                                                    }}
                                                    style={{
                                                        minWidth: '280px', maxWidth: '280px', padding: '16px', borderRadius: '16px', 
                                                        background: isSelected ? 'rgba(126, 206, 202, 0.12)' : 'rgba(255,255,255,0.04)',
                                                        border: isSelected ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.05)', 
                                                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                                                        boxShadow: isSelected ? '0 0 20px rgba(126, 206, 202, 0.15)' : 'none',
                                                        transform: isSelected ? 'translateY(-2px)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                        <span style={{ 
                                                            fontSize: '0.65rem', padding: '4px 10px', borderRadius: '6px', 
                                                            background: idea.source === 'ai' ? 'rgba(157, 0, 255, 0.15)' : 'rgba(126, 206, 202, 0.15)',
                                                            color: idea.source === 'ai' ? '#B55DFF' : '#7ECECA',
                                                            fontWeight: 900,
                                                            letterSpacing: '0.05em'
                                                        }}>
                                                            {idea.source === 'ai' ? '✨ IA SUGERIDA' : '📁 GUARDADA'}
                                                        </span>
                                                        {isSelected && <CheckCircle size={16} color="#7ECECA" />}
                                                    </div>
                                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: '8px', lineHeight: '1.2', color: 'white' }}>
                                                        {idea.displayTitle || (idea.descripcion ? (idea.descripcion.substring(0, 50) + '...') : 'Idea estratégica')}
                                                    </h4>
                                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', height: '4.2em', overflow: 'hidden', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                                        {idea.descripcion || 'Haz click para incluir esta idea estratégica en tu plan mensual.'}
                                                    </p>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button onClick={() => setPlanWizardStep(1)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={() => setPlanWizardStep(3)} className="btn-primary" style={{ flex: 2 }}>Siguiente: Configuración →</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONFIGURACIÓN Y VOZ */}
                    {planWizardStep === 3 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>🔊 Tu Voz y Canales</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Frecuencia, plataformas y tu estilo de comunicación.</p>
                            </div>

                            <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <span className="wz-label">Plataformas</span>
                                    <div className="pwz-chips">
                                        {PLATAFORMAS.map(p => (
                                            <button key={p} onClick={() => handleTogglePlatform(p)} className={`pwz-chip${planPlatforms.includes(p) ? ' active' : ''}`}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="wz-label">Frecuencia</span>
                                    <div className="pwz-chips">
                                        {FRECUENCIAS.map(f => (
                                            <button key={f} onClick={() => setPlanFrequency(f)} className={`pwz-chip${planFrequency === f ? ' active' : ''}`}>{f.split(' ')[0]}xSem</button>
                                        ))}
                                    </div>
                                </div>
                            </div>


                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <span className="wz-label">Filtro: Lo que NO queremos <span style={{fontWeight:400, color:'var(--text-muted)', textTransform:'none'}}>(voto de silencio)</span></span>
                                    <input className="input-field wz-input" placeholder="Ej: No quiero frases motivacionales vacías..." value={howNotToSound} onChange={(e) => setHowNotToSound(e.target.value)} />
                                </div>
                                <div>
                                    <span className="wz-label">Mantra / Idea repetida</span>
                                    <input className="input-field wz-input" placeholder="Ej: La consistencia siempre gana al talento." value={brandMantra} onChange={(e) => setBrandMantra(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <span className="wz-label">⚡ Presión de contenido</span>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {[{val:'Suave (Orgánico)', icon:'🌱', sub:'Atracción'},{val:'Media (Estrategia)', icon:'🎯', sub:'Equilibrio'},{val:'Fuerte (Lanzamiento)', icon:'🚀', sub:'Conversión'}].map(p => (
                                        <button key={p.val} className={`pwz-intensity${planFocus === p.val ? ' active' : ''}`} onClick={() => setPlanFocus(p.val)}>
                                            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{p.icon}</div>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{p.sub}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.val.split('(')[1]?.replace(')','')}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                <button onClick={() => setPlanWizardStep(2)} className="btn-secondary" style={{ flex: 1 }}>← Atrás</button>
                                <button onClick={handleAnalyzeBrief} disabled={isAnalyzingBrief} className="btn-primary btn-premium-glow" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>
                                    {isAnalyzingBrief ? <><Loader size={20} className="animate-spin" /> Analizando... </> : '⚡ Analizar con IA para Continuar →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: ANÁLISIS IA Y GENERAR */}
                    {planWizardStep === 4 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em', color: '#7ECECA' }}>✨ Estrategia Confirmada</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>La IA ha interpretado tu briefing. Revisa antes de generar.</p>
                            </div>

                            <div style={{ 
                                background: 'rgba(126, 206, 202, 0.05)', 
                                padding: '32px', 
                                borderRadius: '24px', 
                                border: '1px solid rgba(126, 206, 202, 0.2)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <Sparkles size={40} style={{ position: 'absolute', top: '-10px', right: '-10px', color: 'rgba(126, 206, 202, 0.1)' }} />
                                <p style={{ 
                                    fontSize: '1.2rem', 
                                    fontWeight: 500, 
                                    lineHeight: '1.6', 
                                    color: '#fff', 
                                    textAlign: 'center',
                                    fontStyle: 'italic'
                                }}>
                                    "{briefAnalysis}"
                                </p>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Se generarán aproximadamente {planFrequency.split(' ')[0] === '3' ? 12 : planFrequency.split(' ')[0] === '7' ? 28 : 16} ideas de contenido alineadas con esta estrategia.
                                </p>
                            </div>

                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                <button onClick={() => setPlanWizardStep(3)} className="btn-secondary" style={{ flex: 1 }}>← Re-ajustar</button>
                                <button onClick={handleGeneratePlan} className="btn-primary" style={{ flex: 2, height: '64px', fontSize: '1.2rem', fontWeight: 900 }}>
                                    ¡Generar Plan Mensual AHORA! 🚀
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && <p style={{ color: '#FF4D4D', textAlign: 'center', marginTop: '20px' }}>{error}</p>}

            {/* Step 2: Generation Progress */}
            {step === 2 && (
                <GenerationProgress
                    steps={loadingSteps}
                    currentPhase={loadingPhase}
                    brainName={hasBrain ? (brainName || 'perfil configurado') : null}
                    subtitle="Esto suele tomar entre 15 y 30 segundos..."
                />
            )}


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
                                                >✖</button>
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
                                                {refiningBlock === activeBlockChat ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
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
                                    <div className="card-header-wizard" style={{
                                        padding: '24px 32px 0 32px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '12px',
                                                background: 'var(--accent-gradient)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 12px rgba(126, 206, 202, 0.2)'
                                            }}>
                                                <span style={{ fontWeight: 900, color: '#000', fontSize: '1.2rem' }}>{i + 1}</span>
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'white' }}>{s.titulo_guion || s.titulo_angulo || `Guion ${i + 1}`}</h3>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        padding: '4px 8px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        <Clock size={12} color="rgba(255,255,255,0.5)" />
                                                        <input
                                                            type="text"
                                                            value={s.video_duration || videoDuration}
                                                            onChange={(e) => {
                                                                const news = [...scripts];
                                                                news[i].video_duration = e.target.value;
                                                                setScripts(news);
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'rgba(255,255,255,0.5)',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                width: '40px',
                                                                outline: 'none'
                                                            }}
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

                                        {/* Brain Learning Feedback Loop */}
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleFeedback(i, 'like')}
                                                disabled={scriptFeedback[i]}
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: scriptFeedback[i] === 'like' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.02)',
                                                    border: scriptFeedback[i] === 'like' ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.05)',
                                                    color: scriptFeedback[i] === 'like' ? '#4ade80' : 'rgba(255,255,255,0.3)',
                                                    cursor: scriptFeedback[i] ? 'default' : 'pointer',
                                                    transition: '0.2s'
                                                }}
                                                title="Me gusta este estilo (Entrenar IA)"
                                            >
                                                <ThumbsUp size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleFeedback(i, 'dislike')}
                                                disabled={scriptFeedback[i]}
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: scriptFeedback[i] === 'dislike' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(255,255,255,0.02)',
                                                    border: scriptFeedback[i] === 'dislike' ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.05)',
                                                    color: scriptFeedback[i] === 'dislike' ? '#f87171' : 'rgba(255,255,255,0.3)',
                                                    cursor: scriptFeedback[i] ? 'default' : 'pointer',
                                                    transition: '0.2s'
                                                }}
                                                title="No me gusta (Entrenar IA)"
                                            >
                                                <ThumbsDown size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="card-body-wizard" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

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
                                                        {refiningBlock === `${i}-gancho` ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
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
                                                                value={typeof s.desarrollo[idx] === 'object' ? JSON.stringify(s.desarrollo[idx]) : (s.desarrollo[idx] || '')}
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
                                                                {refiningBlock === `${i}-punto${idx + 1}` ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
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
                                                    {refiningBlock === `${i}-cta` ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
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
                                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(126, 206, 202, 0.6)', marginBottom: '8px', display: 'block' }}>TÃ TULO DEL POST</label>
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

                                            {/* v5.1.5: Color Selector UI in Direct Save context */}
                                            {sourceReferenceId && (
                                                <div style={{ padding: '0px 0px 20px 0px' }}>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎨 Estilo visual (Color en Calendario)</p>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        {[
                                                            { id: 'pink', color: '#FF79C6' },
                                                            { id: 'purple', color: '#BD93F9' },
                                                            { id: 'blue', color: '#8BE9FD' },
                                                            { id: 'green', color: '#50FA7B' },
                                                            { id: 'orange', color: '#FFB86C' }
                                                        ].map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => setSelectedColor(c.id)}
                                                                style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '50%',
                                                                    background: c.color,
                                                                    border: selectedColor === c.id ? '2px solid white' : 'none',
                                                                    cursor: 'pointer',
                                                                    transition: '0.2s',
                                                                    transform: selectedColor === c.id ? 'scale(1.2)' : 'none'
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* QUICK POLISH BUTTONS */}
                                        <div style={{ padding: '0px 0px 10px 0px' }}>
                                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✨ Pulido Rápido (Afecta a todo el guion)</p>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                <button 
                                                    onClick={() => handlePolishScript(i, 'Haz que todo el guion sea mucho más coloquial y humano, como si hablara un amigo.')}
                                                    disabled={refiningBlock === `${i}-full`}
                                                    className="btn-action-glass" 
                                                    style={{ fontSize: '0.75rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    {refiningBlock === `${i}-full` ? <Loader size={14} className="animate-spin" /> : '📢 Más coloquial'}
                                                </button>
                                                <button 
                                                    onClick={() => handlePolishScript(i, 'Hazlo más directo, elimina toda la "motivación barata" y ve al grano con datos u opiniones fuertes.')}
                                                    disabled={refiningBlock === `${i}-full`}
                                                    className="btn-action-glass" 
                                                    style={{ fontSize: '0.75rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    {refiningBlock === `${i}-full` ? <Loader size={14} className="animate-spin" /> : '🎯 Más directo / Sin humo'}
                                                </button>
                                                <button 
                                                    onClick={() => handlePolishScript(i, 'Integra mucho más la historia personal y opinión que proporcioné en el formulario para que no suene a IA.')}
                                                    disabled={refiningBlock === `${i}-full`}
                                                    className="btn-action-glass" 
                                                    style={{ fontSize: '0.75rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    {refiningBlock === `${i}-full` ? <Loader size={14} className="animate-spin" /> : '👤 Más historia propia'}
                                                </button>
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
                                                icon: savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? <CheckCircle size={16} color="#7ECECA" /> : <Bookmark size={16} />,
                                                label: savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? 'Guardado' : 'Guardar en Biblioteca',
                                                action: () => handleSaveScript(s)
                                            },
                                            {
                                                id: `plan-${i}`,
                                                icon: <Calendar size={16} />,
                                                label: sourceReferenceId ? 'Guardar en Idea Original' : (planningIdx === i ? 'Cerrar planificador' : 'Planificar Content'),
                                                action: () => sourceReferenceId ? handleDirectSourceSave(s) : (planningIdx === i ? setPlanningIdx(null) : handleOpenPlannerIdx(s, i)),
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

                                    {/* INLINE PLANNER */}
                                    {planningIdx === i && (
                                        <div className="planner-inline-container" style={{
                                            padding: '28px 32px',
                                            background: 'rgba(126, 206, 202, 0.04)',
                                            borderTop: '1px solid rgba(126, 206, 202, 0.12)',
                                            animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            borderRadius: '0 0 24px 24px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ padding: '8px', background: 'rgba(126, 206, 202, 0.1)', borderRadius: '10px' }}>
                                                        <CalendarDays size={20} color="#7ECECA" />
                                                    </div>
                                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#fff' }}>Planificar Publicación</h4>
                                                </div>
                                                <button 
                                                    onClick={handleAISuggestion}
                                                    disabled={isSuggestingAI}
                                                    className="btn-premium-glow"
                                                    style={{
                                                        padding: '8px 16px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '100px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        border: '1px solid #7ECECA',
                                                        background: 'rgba(126, 206, 202, 0.1)',
                                                        color: '#7ECECA',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {isSuggestingAI ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                    {isSuggestingAI ? 'Analizando...' : 'Sugerir con IA'}
                                                </button>
                                            </div>

                                            {suggestedReasoning && (
                                                <div style={{ 
                                                    marginBottom: '20px', 
                                                    padding: '12px 16px', 
                                                    background: 'rgba(126, 206, 202, 0.05)', 
                                                    border: '1px solid rgba(126, 206, 202, 0.2)', 
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    color: 'rgba(255,255,255,0.7)',
                                                    lineHeight: '1.4',
                                                    display: 'flex',
                                                    gap: '10px'
                                                }}>
                                                    <AlertCircle size={16} color="#7ECECA" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                    <span><strong>Estrategia sugerida:</strong> {suggestedReasoning}</span>
                                                </div>
                                            )}

                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: '20px', 
                                                marginBottom: '28px' 
                                            }}>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', color: 'rgba(126, 206, 202, 0.6)', fontWeight: 800, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FECHA DE PUBLICACIÓN</label>
                                                    <input
                                                        type="date"
                                                        className="input-field"
                                                        value={plannedDate}
                                                        onChange={e => setPlannedDate(e.target.value)}
                                                        style={{ fontSize: '0.95rem', width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', color: 'rgba(126, 206, 202, 0.6)', fontWeight: 800, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HORA ÓPTIMA</label>
                                                    <input
                                                        type="time"
                                                        className="input-field"
                                                        value={plannedTime}
                                                        onChange={e => setPlannedTime(e.target.value)}
                                                        style={{ fontSize: '0.95rem', width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* v5.1.5: Color Selector UI */}
                                            <div style={{ marginBottom: '28px' }}>
                                                <label style={{ fontSize: '0.65rem', color: 'rgba(126, 206, 202, 0.6)', fontWeight: 800, display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COLOR DE LA IDEA (VISUAL EN CALENDARIO)</label>
                                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {[
                                                        { id: 'pink', color: '#FF79C6', label: 'Rosa' },
                                                        { id: 'purple', color: '#BD93F9', label: 'Púrpura' },
                                                        { id: 'blue', color: '#8BE9FD', label: 'Azul' },
                                                        { id: 'green', color: '#50FA7B', label: 'Verde' },
                                                        { id: 'orange', color: '#FFB86C', label: 'Naranja' }
                                                    ].map((c) => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => setSelectedColor(c.id)}
                                                            title={c.label}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                background: c.color,
                                                                border: selectedColor === c.id ? `3px solid #fff` : 'none',
                                                                cursor: 'pointer',
                                                                boxShadow: selectedColor === c.id ? `0 0 15px ${c.color}` : 'none',
                                                                transition: '0.2s transform, 0.2s box-shadow',
                                                                transform: selectedColor === c.id ? 'scale(1.15)' : 'scale(1)'
                                                            }}
                                                        />
                                                    ))}
                                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '10px' }}>
                                                        {selectedColor === 'pink' ? 'Rosa (AI)' : 
                                                         selectedColor === 'purple' ? 'Púrpura' : 
                                                         selectedColor === 'blue' ? 'Azul' : 
                                                         selectedColor === 'green' ? 'Verde' : 'Naranja'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                                <button 
                                                    onClick={() => setPlanningIdx(null)} 
                                                    className="btn-secondary" 
                                                    style={{ flex: 1, height: '48px', opacity: 0.6 }}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleConfirmPlanning}
                                                    className="btn-primary btn-premium-glow"
                                                    style={{ 
                                                        flex: 2, 
                                                        height: '48px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        gap: '10px',
                                                        background: 'var(--accent-gradient)',
                                                        color: '#000',
                                                        fontWeight: 900,
                                                        fontSize: '0.95rem'
                                                    }}
                                                    disabled={isPlanningLoading}
                                                >
                                                    {isPlanningLoading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                                    {isPlanningLoading ? 'Programando...' : 'Confirmar Planificación'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', borderRadius: '4px', border: '1px solid rgba(126, 206, 202, 0.2)' }}>v4.9.1</span>
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    {isGeneratingMassive ? `✍️ Generando guión ${generationProgress.current} de ${generationProgress.total}...` : 'Genera ideas de 30 días y crea guiones con 1 clic desde cada idea.'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {!isGeneratingMassive && (
                                    <>
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
                                            onClick={handleBatchGenerateScripts}
                                            disabled={selectedSlots.size === 0}
                                            className="btn-primary"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                background: 'linear-gradient(135deg, #7ECECA, #4db8b2)',
                                                opacity: selectedSlots.size === 0 ? 0.7 : 1,
                                                fontWeight: 800,
                                                boxShadow: '0 0 20px rgba(126, 206, 202, 0.3)'
                                            }}
                                        >
                                            <Sparkles size={16} />
                                            {`Analizar y Planificar (${planSlots.filter(s => selectedSlots.has(s.id) && !s.has_script).length})`}
                                        </button>
                                        <button
                                            onClick={handleConfirmAndSync}
                                            disabled={sendingToCalendar || selectedSlots.size === 0}
                                            className="btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (sendingToCalendar || selectedSlots.size === 0) ? 0.7 : 1 }}
                                        >
                                            {sendingToCalendar ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                            {sendingToCalendar ? 'Sincronizando...' : `Sincronizar Calendario (${selectedSlots.size})`}
                                        </button>
                                    </>
                                )}
                                <button onClick={() => { setStep(1); setPlanWizardStep(1); setPlanSlots([]); setTopic(''); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCcw size={16} /> Nuevo Plan</button>
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
                                        <Loader className="animate-spin" size={20} color="#7ECECA" />
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
                            {Array.isArray(planSlots) && planSlots.map((slot, i) => {
                                const isExpanded = expandedSlots.has(slot.id);
                                const sd = slot.script_data;
                                const isSaved = savedPlanSlotIds.has(slot.id);
                                const hookText = sd?.hook || sd?.gancho || '';
                                const desarrolloArr = Array.isArray(sd?.desarrollo) ? sd.desarrollo : [];
                                const ctaText = sd?.cta || sd?.cierre || '';
                                const copyPost = sd?.copy_post || {};
                                const hashtagsArr = Array.isArray(copyPost.hashtags) ? copyPost.hashtags : [];

                                const handleSavePlanSlot = async () => {
                                    if (!sd || isSaved) return;
                                    try {
                                        await saveScript({
                                            titulo_guion: slot.idea_title,
                                            hook: hookText,
                                            gancho: hookText,
                                            desarrollo: desarrolloArr,
                                            cta: ctaText,
                                            cierre: ctaText,
                                            copy_post: copyPost,
                                            platform: slot.platform,
                                            goal: slot.goal
                                        }, true);
                                        setSavedPlanSlotIds(prev => new Set([...prev, slot.id]));
                                    } catch (e) {
                                        console.error('Error saving plan slot:', e);
                                    }
                                };

                                const handleCopyPlanSlot = () => {
                                    if (!sd) return;
                                    const text = `TÍTULO: ${slot.idea_title}\n\nGANCHO:\n${hookText}\n\nDESARROLLO:\n${desarrolloArr.map((d, idx) => `${idx + 1}. ${d}`).join('\n')}\n\nCTA:\n${ctaText}\n\nCOPY POST:\n${copyPost.titulo || ''}\n${copyPost.descripcion_larga || ''}\n\nHASHTAGS:\n${hashtagsArr.map(h => h.startsWith('#') ? h : '#' + h).join(' ')}`;
                                    navigator.clipboard.writeText(text);
                                };

                                const toggleExpand = () => {
                                    const newSet = new Set(expandedSlots);
                                    if (isExpanded) newSet.delete(slot.id);
                                    else newSet.add(slot.id);
                                    setExpandedSlots(newSet);
                                };

                                return (
                                <div
                                    key={slot.id}
                                    className="premium-card plan-slot-card"
                                    style={{
                                        border: selectedSlots.has(slot.id) ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.05)',
                                        background: selectedSlots.has(slot.id) ? 'rgba(126, 206, 202, 0.03)' : 'transparent',
                                        opacity: selectedSlots.has(slot.id) ? 1 : 0.6,
                                        transition: '0.2s',
                                        overflow: 'hidden',
                                        marginBottom: '12px'
                                    }}
                                >
                                    {/* Header row: REVIEW & EDIT */}
                                    <div
                                        style={{
                                            padding: '20px 24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            background: 'rgba(255,255,255,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }} onClick={toggleExpand}>
                                            <input
                                                type="checkbox"
                                                checked={selectedSlots.has(slot.id)}
                                                onChange={() => handleToggleSlotSelection(slot.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: '20px', height: '20px', accentColor: '#7ECECA', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', fontWeight: 900 }}>DÍA {slot.day_number || (i + 1)}</span>
                                                    <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>•</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Calendar size={12} color="#7ECECA" />
                                                        <input 
                                                            type="date"
                                                            value={slot.scheduled_date || ''}
                                                            onChange={(e) => {
                                                                const newSlots = [...planSlots];
                                                                newSlots[i].scheduled_date = e.target.value;
                                                                setPlanSlots(newSlots);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ 
                                                                background: 'rgba(126, 206, 202, 0.1)', 
                                                                color: '#7ECECA', 
                                                                border: '1px solid rgba(126, 206, 202, 0.2)',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 800,
                                                                padding: '4px 8px',
                                                                outline: 'none',
                                                                cursor: 'pointer',
                                                                colorScheme: 'dark'
                                                            }}
                                                        />
                                                        <span style={{ fontSize: '0.75rem', color: '#7ECECA', fontWeight: 700 }}>
                                                            {slot.scheduled_date ? new Date(slot.scheduled_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }) : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', margin: 0 }}>{slot.idea_title}</h3>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{slot.platform}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>|</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{slot.content_type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPlanSlots(planSlots.filter(s => s.id !== slot.id)); }} 
                                                className="btn-secondary" 
                                                style={{ padding: '8px', minWidth: 'auto', border: '1px solid rgba(255,0,0,0.1)', color: 'rgba(255,77,77,0.6)' }}
                                                title="Eliminar esta idea"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            
                                            {!slot.has_script ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleGenerateSlotScript(slot); }}
                                                    disabled={generatingSlotId === slot.id}
                                                    className="btn-primary"
                                                    style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 4px 12px rgba(126, 206, 202, 0.2)' }}
                                                >
                                                    {generatingSlotId === slot.id ? <Loader className="animate-spin" size={14} /> : 'Generar Guión'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                                                    className="btn-secondary"
                                                    style={{ padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)' }}
                                                >
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    {isExpanded ? 'Cerrar' : 'Ver Guión'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Script Content */}
                                    {isExpanded && slot.has_script && sd && (
                                        <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                                {/* Left Column: Script */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {/* Hook */}
                                                    <div style={{ background: 'rgba(255, 215, 0, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 215, 0, 0.15)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                            <span style={{ fontSize: '1rem' }}>🎯</span>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gancho / Hook</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.9rem', color: 'white', lineHeight: '1.6', margin: 0, fontWeight: 600 }}>{hookText || 'Sin gancho'}</p>
                                                    </div>

                                                    {/* Desarrollo */}
                                                    <div style={{ background: 'rgba(126, 206, 202, 0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(126, 206, 202, 0.1)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                            <span style={{ fontSize: '1rem' }}>📝</span>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7ECECA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desarrollo</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {desarrolloArr.length > 0 ? desarrolloArr.map((punto, pidx) => (
                                                                <div key={pidx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                                    <span style={{ background: 'rgba(126, 206, 202, 0.15)', color: '#7ECECA', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>{pidx + 1}</span>
                                                                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', margin: 0 }}>
                                                                        {typeof punto === 'object' ? JSON.stringify(punto) : punto}
                                                                    </p>
                                                                </div>
                                                            )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Sin desarrollo</p>}
                                                        </div>
                                                    </div>

                                                    {/* CTA */}
                                                    <div style={{ background: 'rgba(255, 77, 77, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 77, 77, 0.15)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                            <span style={{ fontSize: '1rem' }}>🔥</span>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF4D4D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CTA / Cierre</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.9rem', color: 'white', lineHeight: '1.6', margin: 0, fontWeight: 600 }}>{ctaText || 'Sin CTA'}</p>
                                                    </div>
                                                </div>

                                                {/* Right Column: Copy Post */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <div style={{ background: 'rgba(157, 0, 255, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(157, 0, 255, 0.15)', flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                            <span style={{ fontSize: '1rem' }}>📱</span>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9D00FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Copy para Post</span>
                                                        </div>
                                                        {copyPost.titulo && (
                                                            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{copyPost.titulo}</p>
                                                        )}
                                                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                                                            {copyPost.descripcion_larga || 'Sin descripción'}
                                                        </p>
                                                        {hashtagsArr.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {hashtagsArr.map((tag, tidx) => (
                                                                    <span key={tidx} style={{ fontSize: '0.7rem', padding: '3px 10px', background: 'rgba(157, 0, 255, 0.1)', color: '#9D00FF', borderRadius: '100px', border: '1px solid rgba(157, 0, 255, 0.2)', fontWeight: 600 }}>
                                                                        #{tag.replace(/^#/, '')}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <button
                                                            onClick={handleSavePlanSlot}
                                                            disabled={isSaved}
                                                            style={{
                                                                width: '100%',
                                                                padding: '14px 20px',
                                                                fontSize: '0.9rem',
                                                                fontWeight: 800,
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                cursor: isSaved ? 'default' : 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '8px',
                                                                background: isSaved ? 'rgba(0,255,0,0.1)' : 'var(--accent-gradient)',
                                                                color: isSaved ? '#00ff00' : 'black',
                                                                boxShadow: isSaved ? 'none' : '0 0 20px rgba(126, 206, 202, 0.3)',
                                                                transition: '0.2s'
                                                            }}
                                                        >
                                                            {isSaved ? <><CheckCircle size={18} /> Guardado en Biblioteca</> : <><Bookmark size={18} /> Guardar en Biblioteca</>}
                                                        </button>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={handleCopyPlanSlot}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '10px 16px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 700,
                                                                    borderRadius: '10px',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    background: 'rgba(255,255,255,0.03)',
                                                                    color: 'rgba(255,255,255,0.8)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px',
                                                                    transition: '0.2s'
                                                                }}
                                                            >
                                                                <Copy size={14} /> Copiar Todo
                                                            </button>
                                                            <button
                                                                onClick={() => router.push('/dashboard/calendar')}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '10px 16px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 700,
                                                                    borderRadius: '10px',
                                                                    border: '1px solid rgba(126, 206, 202, 0.2)',
                                                                    background: 'rgba(126, 206, 202, 0.05)',
                                                                    color: '#7ECECA',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px',
                                                                    transition: '0.2s'
                                                                }}
                                                            >
                                                                <Calendar size={14} /> Ver Calendario
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
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
                                    {extraIdeasModal.loading ? <><Loader className="animate-spin" size={16} style={{ marginRight: '8px' }} /> Generando ideas...</> : <>Generar Ideas <Sparkles size={16} style={{ marginLeft: '8px' }} /></>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL PLANIFICAR REMOVED AND MOVED TO INLINE */}
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

            {/* Minimalist Polish Success Toast */}
            {showPolishToast && (
                <div style={{
                    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(126, 206, 202, 0.95)', color: 'black', padding: '10px 24px',
                    borderRadius: '50px', fontWeight: 900, fontSize: '0.85rem', zIndex: 2000,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '8px',
                    animation: 'fadeInOut 3s forwards'
                }}>
                    <Sparkles size={16} /> ¡Texto mejorado con éxito!
                </div>
            )}

            <style jsx>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }

                @media (max-width: 768px) {
                    .scripts-container { padding: 0 16px 100px 16px !important; }
                    .premium-card { border-radius: 12px !important; }
                    .card-header-wizard { padding: 16px 20px 0 20px !important; flex-direction: column; align-items: flex-start !important; gap: 16px; }
                    .card-body-wizard { padding: 20px !important; gap: 24px !important; }
                    .hook-section, .structure-section, .cta-section, .copy-section { gap: 8px !important; }
                    .structure-item { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
                    .structure-number { width: 30px !important; height: 30px !important; font-size: 0.9rem !important; }
                    .footer-actions { flex-direction: column; padding: 16px !important; height: auto !important; }
                    .footer-actions button { width: 100% !important; justify-content: center; }
                    .planner-inline-container { padding: 16px !important; margin: 10px -20px -20px -20px !important; border-radius: 0 0 12px 12px !important; background: rgba(126, 206, 202, 0.03) !important; border-top: 1px solid rgba(126, 206, 202, 0.1) !important; }
                    .planner-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                }
            `}</style>
        </div >
    );
}

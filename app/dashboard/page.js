'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2, Sparkles, Search, X, Mic, ThumbsUp, ThumbsDown, Clock, Megaphone } from 'lucide-react';
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

// 17) v2.8.4 - Clean UI Encoding & Professional Prompt
export const VERSION = 'v4.3.2';




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
    const [experienciaReal, setExperienciaReal] = useState('');
    const [opinionPersonal, setOpinionPersonal] = useState('');
    const [faseCreador, setFaseCreador] = useState('Lanzando mi primera app / Empezando');
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2, Sparkles, Search, X, Mic, ThumbsUp, ThumbsDown, Clock, Megaphone } from 'lucide-react';
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

// 17) v2.8.4 - Clean UI Encoding & Professional Prompt
export const VERSION = 'v4.5.0';




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
    const [experienciaReal, setExperienciaReal] = useState('');
    const [opinionPersonal, setOpinionPersonal] = useState('');
    const [faseCreador, setFaseCreador] = useState('Lanzando mi primera app / Empezando');
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

    // v4.4.26: Visible Version Banner to ensure user knows they are on the right code
    useEffect(() => {
        const bannerId = 'writi-version-banner';
        if (typeof document !== 'undefined' && !document.getElementById(bannerId)) {
            const banner = document.createElement('div');
            banner.id = bannerId;
            banner.innerHTML = 'v4.5.0 ACTIVADA';
            Object.assign(banner.style, {
                position: 'fixed', bottom: '10px', left: '10px', padding: '4px 10px',
                background: '#FFD700', color: '#000', fontSize: '10px', fontWeight: 'bold',
                borderRadius: '4px', zIndex: '9999', pointerEvents: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            });
            document.body.appendChild(banner);
        }
    }, []);
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
    const [sourceEventId, setSourceEventId] = useState(null);
    const [scriptFeedback, setScriptFeedback] = useState({}); // { [scriptIdx]: 'like' | 'dislike' }

    const handleFeedback = async (idx, type) => {
        if (scriptFeedback[idx]) return; // Already voted

        const script = scripts[idx];
        const scriptText = `GANCHO: ${script.hook || script.gancho}\nDESARROLLO: ${script.desarrollo.join(' | ')}\nCTA: ${script.cta}`;

        setScriptFeedback(prev => ({ ...prev, [idx]: type }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/train-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feedback: type === 'like' ? 'Me gusta mucho este estilo y estructura.' : 'No me gusta este enfoque, cámbialo.',
                    scriptContext: scriptText,
                    projectId: activeProject?.id,
                    userId: user.id,
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
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text, 
                    userId: user?.id,
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


    // v4.4.27: Restored activeProject from hook
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

        // Credits - prefer profile.credits_balance, but fallback if 0 to check legacy
        const { data: legacyCreds } = await supabase.from('ai_credits').select('*').eq('user_id', user.id).single();
        const netLegacy = legacyCreds ? (legacyCreds.total_credits - legacyCreds.used_credits) : 0;

        if (profileData && profileData.credits_balance !== null && profileData.credits_balance !== undefined && (profileData.credits_balance > 0 || netLegacy <= 0)) {
            setAiCredits({ total: profileData.credits_balance || 0, used: 0 });
        } else if (legacyCreds) {
            setAiCredits({ total: legacyCreds.total_credits || 0, used: legacyCreds.used_credits || 0 });
        } else {
            setAiCredits({ total: 0, used: 0 });
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
        if (!userId) return { total: 0, used: 0 };
        const { data: profileData } = await supabase.from('users_profiles').select('credits_balance').eq('id', userId).single();
        const { data: legacyCreds } = await supabase.from('ai_credits').select('*').eq('user_id', userId).single();
        const netLegacy = legacyCreds ? (legacyCreds.total_credits - legacyCreds.used_credits) : 0;

        let credits = { total: 0, used: 0 };
        if (profileData && profileData.credits_balance !== null && profileData.credits_balance !== undefined && (profileData.credits_balance > 0 || netLegacy <= 0)) {
            credits = { total: profileData.credits_balance, used: 0 };
        } else if (legacyCreds) {
            credits = { total: legacyCreds.total_credits, used: legacyCreds.used_credits };
        }
        
        setAiCredits(credits);
        return credits;
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
                if (params.get('source_event_id')) setSourceEventId(params.get('source_event_id'));
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
                if (params.get('source_event_id')) setSourceEventId(params.get('source_event_id'));

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
                experienciaReal: experienciaReal || '',
                opinionPersonal: opinionPersonal || '',
                faseCreador: faseCreador || '',
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
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch('/api/analyze-plan-brief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                    // Start from TOMORROW (index + 1)
                    const slotDate = new Date(currentYear, currentMonth, today.getDate() + index + 1);
                    scheduledDate = slotDate.toISOString().split('T')[0];
                }
                return { ...slot, scheduled_date: scheduledDate };
            });

            setPlanSlots(slotsWithDates);

            // Show plan immediately
            setStep(3);
            
            // --- AUTOMATION v4.5.0 ---
            // 1. Select all slots
            const allIds = slotsWithDates.map(s => s.id);
            setSelectedSlots(new Set(allIds));
            setExtraIdeasModal({ ...extraIdeasModal, ideas: [] });

            // 2. Refresh credits FIRST and wait for them to load
            const credits = await fetchCredits(profile.id);
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            
            console.log(`[DEBUG] Credits loaded: ${credits.total - credits.used} available (total: ${credits.total})`);

            // 3. Trigger Batch Script Generation automatically - PASS credits directly to avoid state timing issues
            if (credits.total > 0) {
                await handleAutoBatchGenerateAndSync(slotsWithDates, allIds, credits);
            } else {
                // No credits - show alert but still show the plan
                alert('⚠️ CRÉDITOS INSUFICIENTES\n\nNo tienes créditos suficientes para generar guiones automáticamente.\n\nPor favor, compra créditos y luego usa el botón "Analizar y Planificar" para generar los guiones.');
            }

        } catch (err) {
            setError(err.message);
            setStep(1);
        }
    }

    // —— BATCH: Analizar y Planificar ——
    const handleBatchGenerateScripts = async () => {
        const slotsToProcess = planSlots.filter(s => selectedSlots.has(s.id) && !s.has_script);
        if (slotsToProcess.length === 0) {
            alert('No hay ideas sin guion para generar. Selecciona ideas que aún no tengan guion.');
            return;
        }

        if (!confirm(`¿Generar guiones para ${slotsToProcess.length} ideas? Esto usará ~${slotsToProcess.length} créditos.`)) return;

        await runBatchGeneration(slotsToProcess, false, aiCredits);
    }

    const handleAutoBatchGenerateAndSync = async (currentSlots, selectedIds, creditsObj = null) => {
        console.log('[DEBUG handleAutoBatchGenerateAndSync] Starting with slots:', currentSlots.length, 'selectedIds:', selectedIds.length, 'credits:', creditsObj);
        
        const credits = creditsObj || aiCredits;
        const slotsToProcess = currentSlots.filter(s => selectedIds.includes(s.id) && !s.has_script);
        console.log('[DEBUG] Slots to process:', slotsToProcess.length);
        
        setIsGeneratingMassive(true);
        setStep(3); 
        
        let finalGeneratedSlots = [];
        if (slotsToProcess.length > 0) {
            setGenerationProgress({ current: 0, total: slotsToProcess.length, status: 'Iniciando v4.5.0: Generando guiones...' });
            finalGeneratedSlots = await runBatchGeneration(slotsToProcess, true, credits);
            console.log('[DEBUG] Batch generation result:', finalGeneratedSlots?.length || 0, 'slots');
        } else {
            console.log('[v4.5.0] No scripts to generate, proceeding with Deep Sync Fallback.');
        }
        
        setGenerationProgress({ current: 0, total: 0, status: '🚀 Sincronizando v4.5.0: Asegurando integridad...' });

        // Handle case where batch generation failed (e.g., no credits)
        if (!finalGeneratedSlots || !Array.isArray(finalGeneratedSlots)) {
            console.log('[DEBUG] Batch generation failed or returned false, showing error state');
            setIsGeneratingMassive(false);
            return;
        }

        try {
            // STEP 1: Map from generation results
            const generatedMap = new Map(finalGeneratedSlots.map(s => [String(s.id), s]));
            let slotsForSync = currentSlots
                .filter(s => selectedIds.includes(s.id))
                .map(s => {
                    const freshData = generatedMap.get(String(s.id));
                    return freshData ? { ...s, ...freshData } : s;
                });

            // STEP 2: v4.5.0 Deep Sync Fallback (The "Safety Net")
            // Search for existing scripts in DB by title for any slot still missing content
            const slotsMissingData = slotsForSync.filter(s => {
                const hasRealText = s.script_data?.hook || s.script_data?.gancho || s.script_data?.desarrollo;
                return !hasRealText;
            });

            if (slotsMissingData.length > 0) {
                console.log(`[v4.5.0] Deep Sync Fallback active for ${slotsMissingData.length} slots...`);
                // Fetch from both sources
                const [scriptsRes, libraryRes] = await Promise.all([
                    supabase.from('scripts').select('*').eq('user_id', profile.id),
                    supabase.from('library').select('*').eq('user_id', profile.id).eq('type', 'guion')
                ]);

                const globalData = [...(scriptsRes.data || []), ...(libraryRes.data || [])];
                const normalize = (t) => String(t || '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D|\uFE0F|[^\w\s\d]/g, '').trim().toLowerCase();

                slotsForSync = slotsForSync.map(s => {
                    const hasRealText = s.script_data?.hook || s.script_data?.gancho || s.script_data?.desarrollo;
                    if (hasRealText) return s;

                    const sTitleNorm = normalize(s.idea_title);
                    const match = globalData.find(gd => 
                        normalize(gd.topic) === sTitleNorm || 
                        normalize(gd.titulo) === sTitleNorm ||
                        normalize(gd.content?.titulo_guion) === sTitleNorm
                    );

                    if (match) {
                        console.log(`[v4.5.0] Deep Match found for "${s.idea_title}"! Recovering content...`);
                        return { 
                            ...s, 
                            script_data: match.content || match, 
                            has_script: true,
                            fromFallback: true 
                        };
                    }
                    return s;
                });
            }

            console.log(`[v4.5.0] Final slots prepared for calendar: ${slotsForSync.length}`);

            // STEP 3: FINAL PASS TO CALENDAR
            await handleSendPlanToCalendar(slotsForSync);
            
            setGenerationProgress({ current: 0, total: 0, status: '' });
            setIsGeneratingMassive(false);
            alert('¡COMPLETADO v4.5.0! 🚀 Los guiones han sido rescatados y sincronizados.');
        } catch (err) {
            console.error('[Nuclear Sync v4.5.0] Fatal:', err);
            setIsGeneratingMassive(false);
            alert('Error crítico v4.5.0: ' + err.message);
        }
    }

    const runBatchGeneration = async (slotsToProcess, isAuto = false, creditsObj = null) => {
        const credits = creditsObj || aiCredits;
        console.log('[v4.5.0 runBatchGeneration] Starting with', slotsToProcess.length, 'slots');
        
        // Credit check
        const available = credits.total - credits.used;
        const estimatedCost = slotsToProcess.length;
        
        if (available < estimatedCost) {
            const errorMsg = `Créditos insuficientes. Tienes ${available} créditos pero necesitas ~${estimatedCost}.`;
            console.error('[v4.5.0] Credit check failed:', errorMsg);
            setError(errorMsg);
            if (isAuto) {
                alert(`⚠️ CRÉDITOS INSUFICIENTES\n\n${errorMsg}\n\nPor favor, compra más créditos.`);
            }
            return [];
        }

        setIsGeneratingMassive(true);
        let successCount = 0;
        const finalSlots = []; // accumulate successful results

        for (let i = 0; i < slotsToProcess.length; i++) {
            const slot = slotsToProcess[i];
            setGenerationProgress({
                current: i + 1,
                total: slotsToProcess.length,
                status: `[v4.5.0] Generando guión ${i + 1}/${slotsToProcess.length}: ${slot.idea_title}`
            });

            try {
                const result = await handleGenerateSlotScript(slot, true);
                console.log(`[v4.5.0] Result for "${slot.idea_title}":`, result ? 'OK' : 'NULL');

                if (result && result.script_data) {
                    const scriptData = result.script_data;
                    const hookVal = scriptData.hook || scriptData.gancho || '';
                    const desArr = Array.isArray(scriptData.desarrollo) ? scriptData.desarrollo : [];
                    const ctaVal = scriptData.cta || scriptData.cierre || '';
                    const cpPost = scriptData.copy_post || {};
                    const htags = Array.isArray(cpPost.hashtags) ? cpPost.hashtags.map(h => h.startsWith('#') ? h : '#' + h).join(' ') : '';

                    const fullScript = [
                        slot.idea_title || 'Sin título', '',
                        '🎯 GANCHO', hookVal, '',
                        '📝 DESARROLLO', ...desArr.map((d, idx) => `${idx + 1}. ${d}`), '',
                        '🔥 CTA / CIERRE', ctaVal, '',
                        '📱 COPY PARA EL POST', cpPost.titulo || '', cpPost.descripcion_larga || '', '',
                        htags ? `HASHTAGS: ${htags}` : ''
                    ].filter(line => line !== undefined).join('\n');

                    // Save to library (non-blocking)
                    saveToLibrary({
                        userId: profile.id,
                        type: 'guion',
                        platform: slot.platform || 'General',
                        goal: slot.goal || 'engagement',
                        titulo: slot.idea_title || 'Guión del Plan',
                        script_full_text: fullScript,
                        content: { video_duration: videoDuration || '60 seg', hook: hookVal, desarrollo: desArr, cierre: ctaVal, cta: ctaVal, copy_post: cpPost },
                        tags: ['guion', slot.platform, 'plan-mensual'].filter(Boolean),
                        projectId: activeProject?.id
                    }).then(libItem => {
                        console.log(`[v4.5.0] Library saved for "${slot.idea_title}": id=${libItem?.id}`);
                    }).catch(e => console.warn('[v4.5.0] Library save error (non-fatal):', e));

                    // Build the enriched slot object and push to finalSlots
                    const enrichedSlot = {
                        ...slot,
                        has_script: true,
                        script_id: result.script?.id,
                        script_data: scriptData,
                        script_full_text: fullScript,
                    };
                    finalSlots.push(enrichedSlot);
                    successCount++;
                    console.log(`[v4.5.0] ✅ Slot "${slot.idea_title}" enriched. finalSlots.length=${finalSlots.length}`);
                } else {
                    // Still include the slot (without script) so calendar gets all slots
                    finalSlots.push(slot);
                    console.warn(`[v4.5.0] ⚠️ No script_data returned for "${slot.idea_title}". Adding bare slot.`);
                }
            } catch (e) {
                console.error(`[v4.5.0] Batch fail for "${slot.idea_title}":`, e);
                finalSlots.push(slot); // include anyway
            }
        }

        setGenerationProgress({
            current: slotsToProcess.length,
            total: slotsToProcess.length,
            status: `✅ v4.5.0: ${successCount}/${slotsToProcess.length} guiones generados.`
        });

        // Update React state for visual feedback (non-blocking, does not affect calendar sync)
        if (successCount > 0) {
            setPlanSlots(prev => prev.map(slot => {
                const processed = finalSlots.find(s => String(s.id) === String(slot.id));
                if (processed && processed.has_script) {
                    return { ...slot, has_script: true, script_data: processed.script_data, script_id: processed.script_id };
                }
                return slot;
            }));
        }

        // Refresh credits
        try { window.dispatchEvent(new CustomEvent('refresh-profile')); fetchCredits(profile.id); } catch {}

        console.log(`[v4.5.0] runBatchGeneration returning finalSlots length: ${finalSlots.length}`);
        return finalSlots; // ALWAYS return the array — never return false
    };

    const [stats, setStats] = useState({ generated: 0, saved: 0, monthGenerations: 0 });

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
                                            {sendingToCalendar ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                            {sendingToCalendar ? 'Sincronizando...' : `Sincronizar Calendario (${selectedSlots.size})`}
                                        </button>
                                    </>
                                )}
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
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Header row */}
                                    <div
                                        onMouseDown={() => handleSlotMouseDown(slot.id)}
                                        onMouseEnter={() => handleSlotMouseEnter(slot.id)}
                                        onContextMenu={(e) => handleContextMenu(e, slot.id)}
                                        style={{
                                            padding: '20px 24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedSlots.has(slot.id)}
                                                onChange={() => handleToggleSlotSelection(slot.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#7ECECA', flexShrink: 0 }}
                                            />

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(126, 206, 202, 0.08)', borderRadius: '12px', minWidth: '56px', height: '56px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.65rem', color: '#7ECECA', fontWeight: 800, textTransform: 'uppercase' }}>DÍA</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>{slot.day_number}</span>
                                            </div>

                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA', fontSize: '0.7rem', padding: '3px 10px' }}>{slot.platform}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Objetivo: <strong style={{ color: 'white' }}>{slot.goal}</strong></span>
                                                    {slot.has_script && (
                                                        <span className="badge" style={{ background: 'rgba(0, 255, 0, 0.1)', color: '#00ff00', border: '1px solid rgba(0,255,0,0.3)', fontSize: '0.65rem', padding: '2px 8px' }}>✓ Guión Listo</span>
                                                    )}
                                                </div>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>{slot.idea_title}</h4>
                                                {slot.idea_description && (
                                                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                                        {slot.idea_description}
                                                    </p>
                                                )}
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>Enfoque: {slot.content_type}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} color="var(--text-secondary)" />
                                                <input
                                                    type="date"
                                                    value={slot.scheduled_date || ''}
                                                    onChange={(e) => handleScheduleSlot(slot.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', colorScheme: 'dark' }}
                                                />
                                            </div>
                                            {!slot.has_script ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleGenerateSlotScript(slot); }}
                                                    disabled={generatingSlotId === slot.id}
                                                    className="btn-primary"
                                                    style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, opacity: generatingSlotId === slot.id ? 0.7 : 1, whiteSpace: 'nowrap' }}
                                                >
                                                    {generatingSlotId === slot.id ? <><Loader2 className="animate-spin" size={14} style={{ marginRight: '6px', display: 'inline' }} /> Generando...</> : <><Sparkles size={14} style={{ marginRight: '6px', display: 'inline' }} /> Generar Guión</>}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                                                    className="btn-secondary"
                                                    style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <BookOpen size={14} />
                                                    {isExpanded ? 'Ocultar Guión' : 'Ver Guión'}
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
                                                                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', margin: 0 }}>{punto}</p>
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
                                                            {isSaved ? <><CheckCircle2 size={18} /> Guardado en Biblioteca</> : <><Bookmark size={18} /> Guardar en Biblioteca</>}
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
            `}</style>
        </div >
    );
}

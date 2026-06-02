'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePersistedState, RestoreBanner, AutosaveIndicator } from '@/hooks/usePersistedState';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackPixelEvent } from '@/app/lib/pixel';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, CheckCircle2 as CheckCircle, Copy, Bookmark, Calendar, RefreshCcw, PlusCircle, AlertCircle, TrendingUp, CalendarDays, Loader2 as Loader, Sparkles, Search, X, Mic, ThumbsUp, ThumbsDown, Clock, Megaphone, BookOpen, Trash2, ChevronUp, ChevronDown, Zap, Brain, Download, MessageSquare, Target, Flag, Eye, Award, Heart } from 'lucide-react';
import AIPolishedTextarea from '@/app/components/AIPolishedTextarea';
import ScriptWizardFlow from '@/app/dashboard/components/ScriptWizardFlow';
import GenerationProgress from '@/app/components/GenerationProgress';
import SuccessModal from '@/app/components/SuccessModal';
import { saveToLibrary } from '@/lib/library';
import VoiceDictation from '@/app/components/VoiceDictation';
import { useProject } from '@/app/components/ProjectContext';
import FormPresets from '@/app/components/FormPresets';
import PlanMonthlyFlow from '@/app/dashboard/components/PlanMonthlyFlow';



const SUGGESTED_TRENDS = [
    { name: 'Nicho Marketing', icon: '📈', grow: '+12.5%', color: '#9D00FF' },
    { name: 'IA Generativa', icon: '🤖', grow: '+45.2%', color: '#00F3FF' },
    { name: 'Productividad', icon: '⌛', grow: '+8.1%', color: '#FF007A' },
];

const PLATAFORMAS = ['Reels', 'TikTok', 'LinkedIn', 'YouTube Shorts', 'YouTube'];
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
export const VERSION = 'v1.17.55'; // UI Duplicate Fix (Step 3) + Schema Fix (color & Datos inválidos)

// Variables de módulo — persisten mientras el tab esté abierto, sobreviven navegación SPA
let _cachedScripts = [];
let _cachedStep    = 1;
let _cachedTopic   = '';
let _cachedPlatform = 'Reels';

// Plan wizard cache — mismo patrón, sobrevive navegación entre páginas del dashboard
let _cachedPlanMode      = 'single';
let _cachedPlanStep      = 1;
let _cachedPlanIdeas     = [];
let _cachedPlanSelected  = [];
let _cachedPlanPlatforms = ['Reels'];
let _cachedPlanFrequency = '3 publicaciones por semana';
let _cachedPlanOffer     = '';
let _cachedPlanAudience  = 'Emprendedores';
let _cachedPlanPain      = '';
let _cachedPlanProjectId = null; // para detectar cambio de proyecto y limpiar

export default function DashboardPage() {
    const [generationMode, setGenerationMode] = useState(_cachedPlanMode);

    // Wizard steps: 1 = marca, 2 = contexto, 3 = detalle
    const [wizardStep, setWizardStep] = useState(1);
    const [step, setStep]     = useState(_cachedStep >= 3 ? 3 : 1);
    const [topic, setTopic]   = useState(_cachedTopic);
    const [platform, setPlatform] = useState(_cachedPlatform || 'Reels');
    const [toneBrand, setToneBrand] = useState('cercano');
    const [goal, setGoal] = useState('engagement');
    const [awareness, setAwareness] = useState('tibia');
    const [quantity, setQuantity] = useState(2);
    const [ideas, setIdeas] = useState('');
    const [scripts, setScripts] = useState(_cachedScripts);

    // Wizard step 3 fields
    const [victory, setVictory] = useState('');
    const [opinion, setOpinion] = useState('');
    const [story, setStory] = useState('');
    const [hookType, setHookType] = useState('curiosidad extrema');
    const [showOptional, setShowOptional] = useState(false);
    const [voiceStoryPhase, setVoiceStoryPhase] = useState(1);
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

    // Plan mode states — inicializan desde el caché de módulo para sobrevivir navegación
    const [planPlatforms, setPlanPlatforms] = useState(_cachedPlanPlatforms);
    const [planFrequency, setPlanFrequency] = useState(_cachedPlanFrequency);
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
    const [selectedPlanIdeas, setSelectedPlanIdeas] = useState(_cachedPlanSelected);
    const [planWizardStep, setPlanWizardStep] = useState(_cachedPlanStep);
    const [isGeneratingMassive, setIsGeneratingMassive] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: '' });
    const [expandedSlots, setExpandedSlots] = useState(new Set());
    const [savedPlanSlotIds, setSavedPlanSlotIds] = useState(new Set());
    const [extraIdeasModal, setExtraIdeasModal] = useState({ open: false, ideas: [], loading: false, form: { context: '', experienceLevel: '', productTicket: '', objections: '', examples: '' } });
    const [recommendedIdeas, setRecommendedIdeas] = useState(_cachedPlanIdeas);
    const [loadingRecommended, setLoadingRecommended] = useState(false);
    const [ideasFetchError, setIdeasFetchError] = useState('');

    // New Marketing Briefing States (v4.0.0)
    const [businessOffer, setBusinessOffer] = useState(_cachedPlanOffer);
    const [ticketPrice, setTicketPrice] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [targetAudienceType, setTargetAudienceType] = useState(_cachedPlanAudience);
    const [mainPainPoint, setMainPainPoint] = useState(_cachedPlanPain);
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
    const [savedFromIdea, setSavedFromIdea] = useState(null); // { idea_title, source_idea_id, ... }
    const [activeScriptTab, setActiveScriptTab] = useState(0);
    const [planPhase, setPlanPhase] = useState(1);
    const [planAdvancedOpen, setPlanAdvancedOpen] = useState(false);

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


    const { activeProject, projectBrain, refreshBrain, projectVersion } = useProject();

    // ── Persistencia — refs para capturar valores actuales ────────
    const [autosaving, setAutosaving]   = useState(false);
    const [showRestore, setShowRestore] = useState(false);

    // Refs para que visibilitychange siempre vea los valores más recientes
    const draftRef = useRef({});
    const restoredRef = useRef(false);
    useEffect(() => {
        draftRef.current = { topic, platform, toneBrand, hookType, scripts, step, pid: activeProject?.id };
        // Sincronizar variables de módulo — persisten en navegación SPA
        _cachedScripts  = scripts;
        _cachedStep     = step;
        _cachedTopic    = topic;
        _cachedPlatform = platform;
        // Plan wizard cache — mismo patrón
        _cachedPlanMode      = generationMode;
        _cachedPlanStep      = planWizardStep;
        _cachedPlanIdeas     = recommendedIdeas;
        _cachedPlanSelected  = selectedPlanIdeas;
        _cachedPlanPlatforms = planPlatforms;
        _cachedPlanFrequency = planFrequency;
        _cachedPlanOffer     = businessOffer;
        _cachedPlanAudience  = targetAudienceType;
        _cachedPlanPain      = mainPainPoint;
        _cachedPlanProjectId = activeProject?.id || null;
    });

    const getDraftKey = (pid) => `matrix_draft_v4_${pid || 'global'}`;
    const SESSION_KEY = 'writi_scripts_session';
    const autosaveRef = useRef(null);

    // ── Autosave: guardar guiones editados en BD cada 3 segundos ──
    useEffect(() => {
        if (!scripts.length || step !== 3 || !topic) return; // Solo guardar cuando está editando

        // Limpiar timeout anterior
        if (autosaveRef.current) clearTimeout(autosaveRef.current);

        // Guardar en sessionStorage inmediatamente
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                scripts: scripts.slice(0, 10),
                topic,
                platform,
            }));
        } catch (e) {}

        // Guardar en BD cada 3 segundos (debounced)
        autosaveRef.current = setTimeout(async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Guardar en library si hay scripts editados
                for (let i = 0; i < scripts.length; i++) {
                    const script = scripts[i];
                    if (script.library_id) {
                        // Actualizar script existente
                        await supabase
                            .from('library')
                            .update({
                                title: script.titulo || topic,
                                content: JSON.stringify(script),
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', script.library_id);
                    }
                }
            } catch (err) {
                console.log('[Autosave] Silent save:', err.message);
            }
        }, 3000);

        return () => {
            if (autosaveRef.current) clearTimeout(autosaveRef.current);
        };
    }, [scripts, step, topic, platform]);

    // Restaura guiones al montar
    useEffect(() => {
        // Caso 1: navegación SPA — módulo ya tiene los scripts en memoria
        if (_cachedScripts.length > 0 && _cachedStep >= 3) {
            restoredRef.current = true; // evita que projectVersion resetee step
            return;
        }
        // Caso 2: recarga de página — leer sessionStorage
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return;
            const d = JSON.parse(raw);
            if (!d.scripts?.length) return;
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('topic') || urlParams.get('from_idea') || urlParams.get('mode')) return;
            setScripts(d.scripts);
            setStep(3);
            if (d.topic) setTopic(d.topic);
            if (d.platform) setPlatform(d.platform);
            restoredRef.current = true;
        } catch {}
    }, []);

    // Guarda síncronamente cuando el usuario cambia de pestaña (visibilitychange)
    // Es el único momento garantizado antes del descarte del navegador
    useEffect(() => {
        const handleHide = () => {
            const { topic: t, platform: pl, toneBrand: tb, hookType: hk,
                    scripts: sc, step: st, pid } = draftRef.current;
            if (!t && !sc?.length) return;
            const key = getDraftKey(pid || 'global');
            try {
                localStorage.setItem(key, JSON.stringify({
                    topic: t, platform: pl || 'Reels', toneBrand: tb || 'cercano',
                    hookType: hk || 'curiosidad extrema',
                    scripts: (sc || []).slice(0, 10), step: st, ts: Date.now(),
                }));
            } catch {}
        };
        document.addEventListener('visibilitychange', handleHide);
        window.addEventListener('beforeunload', handleHide);
        return () => {
            document.removeEventListener('visibilitychange', handleHide);
            window.removeEventListener('beforeunload', handleHide);
        };
    }, []); // solo montar/desmontar — usa ref para valores actuales

    // Guarda draft cuando cambian scripts o step — usa pid 'global' si no hay proyecto
    useEffect(() => {
        if (!topic && !scripts.length) return;
        const pid = activeProject?.id || 'global';
        try {
            localStorage.setItem(getDraftKey(pid), JSON.stringify({
                topic, platform: platform || 'Reels', toneBrand: toneBrand || 'cercano',
                hookType: hookType || 'curiosidad extrema',
                scripts: scripts.slice(0, 10), step, ts: Date.now(),
            }));
            setAutosaving(true);
            setTimeout(() => setAutosaving(false), 1200);
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topic, scripts, step, activeProject?.id]);

    // Restaura draft al montar — URL params tienen prioridad
    useEffect(() => {
        const pid = activeProject?.id || 'global';
        try {
            const raw = localStorage.getItem(getDraftKey(pid));
            if (!raw) return;
            const d = JSON.parse(raw);
            if (Date.now() - (d.ts || 0) > 4 * 3600 * 1000) return;
            const urlParams = new URLSearchParams(window.location.search);
            const hasUrlTopic = urlParams.get('topic') || urlParams.get('from_idea');
            if (hasUrlTopic) return;
            if (d.topic)           setTopic(d.topic);
            if (d.platform)        setPlatform(d.platform);
            if (d.toneBrand)       setToneBrand(d.toneBrand);
            if (d.hookType)        setHookType(d.hookType);
            if (d.scripts?.length) { setScripts(d.scripts); setStep(3); setShowRestore(true); restoredRef.current = true; }
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProject?.id]);

    const clearDraft = useCallback(() => {
        try { localStorage.removeItem(getDraftKey(activeProject?.id || 'global')); } catch {}
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
        _cachedScripts = []; _cachedStep = 1; _cachedTopic = ''; _cachedPlatform = 'Reels';
        setShowRestore(false);
    }, [activeProject?.id]);

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

    // Load user data and credits on mount
    useEffect(() => {
        const loadUserCredits = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    console.warn('[Credits] No user found');
                    return;
                }

                const { data: profileData, error } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();

                if (error) {
                    console.error('[Credits] Error fetching profile:', error);
                    return;
                }

                if (profileData) {
                    const creditsValue = profileData.credits_balance !== undefined ? profileData.credits_balance : 0;
                    console.log('[Credits] Profile loaded, balance:', creditsValue);
                    setAiCredits({ total: creditsValue, used: 0 });
                } else {
                    console.warn('[Credits] No profile data found');
                }
            } catch (err) {
                console.error('[Credits] Exception loading credits:', err);
            }
        };

        loadUserCredits();
    }, []);

    useEffect(() => {
        // Al cambiar de proyecto: limpiar guiones/ideas (NO plan wizard — se limpia por cambio de projectId)
        // No resetear step si hay scripts cargados (evita que TOKEN_REFRESHED borre el trabajo)
        if (_cachedScripts.length === 0 && !restoredRef.current) setStep(1);
        restoredRef.current = false;
        setIdeas('');
        setLibIdeas([]);
        // NO tocar plan wizard state aquí — este effect corre en cada mount y destruiría el caché
        setIdeasFetchError('');
        setPlanSlots([]);
        setSelectedSlots(new Set());
        loadData();
    }, [projectVersion]);

    // Detectar cambio REAL de proyecto (no mount) para limpiar el plan wizard
    const prevProjectIdRef = useRef(null);
    useEffect(() => {
        const currentId = activeProject?.id || null;
        if (prevProjectIdRef.current === null) {
            // Primera vez (mount): solo registrar el proyecto actual, no limpiar
            prevProjectIdRef.current = currentId;
            return;
        }
        if (prevProjectIdRef.current !== currentId) {
            // Proyecto realmente cambió — limpiar plan wizard
            prevProjectIdRef.current = currentId;
            setRecommendedIdeas([]);
            setPlanWizardStep(1);
            setSelectedPlanIdeas([]);
            setGenerationMode('single');
            _cachedPlanMode = 'single'; _cachedPlanStep = 1; _cachedPlanIdeas = [];
            _cachedPlanSelected = []; _cachedPlanPlatforms = ['Reels'];
            _cachedPlanFrequency = '3 publicaciones por semana';
            _cachedPlanOffer = ''; _cachedPlanAudience = 'Emprendedores'; _cachedPlanPain = '';
            _cachedPlanProjectId = null;
        }
    }, [activeProject?.id]);

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // ARREGLO: Validar email confirmado - BLOQUEO OBLIGATORIO
        if (user && !user.email_confirmed_at) {
            await supabase.auth.signOut();
            router.push('/login?error=Por favor confirma tu email antes de continuar');
            return;
        }

        // Profile
        const { data: profileData } = await supabase.from('users_profiles').select('*').eq('id', user.id).single();
        setProfile(profileData || user);

        // Credits are loaded in initial useEffect on mount, not here
        // This prevents overwriting them with stale data

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

    // Track Purchase event when plan is activated
    useEffect(() => {
        if (searchParams.get('plan_activated') === 'true') {
            trackPixelEvent('Purchase', {
                value: 24.90,
                currency: 'EUR',
            });
        }
    }, [searchParams]);

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

    // Restaurar si hubo generación interrumpida (cambio de pestaña durante carga)
    useEffect(() => {
        try {
            const wasGenerating = localStorage.getItem('guion_generando');
            const backup = localStorage.getItem('guion_backup');
            if (wasGenerating === 'true' && backup) {
                const bd = JSON.parse(backup);
                const age = Date.now() - (bd.ts || 0);
                if (age < 5 * 60 * 1000) { // menos de 5 min
                    localStorage.removeItem('guion_generando');
                    if (bd.topic) setTopic(bd.topic);
                    if (bd.platform) setPlatform(bd.platform);
                    if (bd.toneBrand) setToneBrand(bd.toneBrand);
                    setStep(1); // volver al form con datos restaurados
                }
            }
        } catch {}
    }, []); // Solo al montar

    useEffect(() => {
        // Load params from URL on initial load or navigation
        const params = searchParams;

        // Voice story mode — read from sessionStorage (never URL, keeps text private)
        if (params.get('mode') === 'voice-story') {
            const story = typeof window !== 'undefined'
                ? sessionStorage.getItem('writi_voice_story') || ''
                : '';
            if (story) {
                try {
                    sessionStorage.removeItem('writi_voice_story');
                    sessionStorage.removeItem('writi_scripts_session'); // CRITICAL: Clear old scripts cache
                } catch(e) {}
                setGenerationMode('single');
                setExperienciaReal(story);
                // Use first sentence as topic so generation has context
                const firstSentence = story.split(/[.!?]/)[0]?.trim().slice(0, 120) || story.slice(0, 120);
                setTopic(firstSentence);
                setShowOptional(true);
                setVoiceStoryPhase(3); // jump to phase 3 — user just picks details & generates
                setWizardStep(4);
            }
        }

        // From-idea context (from calendar "Crear guión" button)
        if (params.get('from_idea') === '1') {
            try {
                const raw = sessionStorage.getItem('from_idea_context');
                if (raw) {
                    const ctx = JSON.parse(raw);
                    if (ctx?.from_idea && ctx?.idea_title) {
                        setGenerationMode('single');
                        setTopic(ctx.idea_title);
                        if (ctx.platform) setPlatform(ctx.platform);
                        setVoiceStoryPhase(3);
                        setWizardStep(4);
                    }
                }
            } catch(e) {}
        }

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
            // Solo resetear si no hay guiones cargados — si los hay, el usuario
            // viene de navegar a otra sección y debe ver su trabajo
            if (_cachedScripts.length === 0) {
                setGenerationMode('single');
                setStep(1);
                setWizardStep(1);
                setPlanWizardStep(1);
                setScripts([]);
                setPlanSlots([]);
                setTopic('');
                setIdeas('');
            }
        }
    }, [supabase, searchParams]);

    // Plan wizard state survives SPA navigation via module-level _cachedPlan* variables.
    // No sessionStorage effects needed — useState initializers use cached values directly.

    // Fetch library + AI ideas when entering plan mode at step 1 (first visit or project change)
    useEffect(() => {
        if (generationMode !== 'plan' || planWizardStep !== 1 || !activeProject) return;
        fetchLibraryIdeas();
        // Only fetch AI ideas if none cached in module variable (avoids re-charging credits on nav)
        if (recommendedIdeas.length === 0) fetchProactiveIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generationMode, planWizardStep, projectVersion, activeProject?.id]);

    const fetchProactiveIdeas = async () => {
        if (!activeProject) return;
        setIdeasFetchError('');
        setLoadingRecommended(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) {
                setIdeasFetchError('Sesión no disponible. Recarga la página.');
                return;
            }
            const res = await fetch('/api/ideas-extra', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId: activeProject.id,
                    proactive: true,
                    businessOffer,
                    targetAudience,
                    mainPainPoint
                })
            });
            const data = await res.json();
            if (res.ok) {
                const stableIdeas = (data.ideas || []).map((idea, idx) => ({
                    ...idea,
                    id: `ai-idea-${idx}-${Date.now()}`
                }));
                setRecommendedIdeas(stableIdeas);
            } else if (data.code === 'NO_CREDITS') {
                setIdeasFetchError('Sin créditos suficientes para ideas IA.');
            } else {
                setIdeasFetchError('Error al generar ideas. Intenta de nuevo.');
                console.error('[ideas-proactive]', data.error);
            }
        } catch (err) {
            setIdeasFetchError('Error de red. Intenta de nuevo.');
            console.error('[ideas-proactive]', err);
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
        // Fallback: if topic empty (e.g. voice-story state race), use first line of experienciaReal
        const effectiveTopic = topic?.trim() ||
            experienciaReal?.split(/[.!?\n]/)[0]?.trim().slice(0, 120) || '';

        if (!effectiveTopic) {
            setError('Por favor, indica sobre qué quieres crear contenido.');
            return;
        }
        // Sync topic state so the rest of the function uses the right value
        if (!topic?.trim() && effectiveTopic) setTopic(effectiveTopic);
        console.log('[Dashboard] handleGenerateSingle called', { topic: effectiveTopic, platform, goal, hasBrain, wizardStep });

        // CRITICAL: Limpiar sessionStorage ANTES de generar para evitar restaurar guiones viejos
        try { sessionStorage.removeItem('writi_scripts_session'); } catch {}

        if (!hasBrain && wizardStep < 2) {
            setError('Por favor, completa el Paso 1 (Marca Personal) antes de generar.');
            return;
        }

        setStep(2);
        setError('');

        // BACKUP: guardar formulario ANTES de la llamada — restaurar si falla/interrumpe
        try {
            localStorage.setItem('guion_backup', JSON.stringify({
                topic: effectiveTopic, platform, toneBrand, hookType,
                goal, awareness, victory, opinion, story, specificDetails,
                ctaIdea, experienciaReal, opinionPersonal,
                ts: Date.now()
            }));
            localStorage.setItem('guion_generando', 'true');
        } catch {}

        try {
            // Priority check for count to avoid state race conditions from strategy
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const urlCount = params.get('count');
            const finalQuantity = urlCount ? parseInt(urlCount) : (quantity || 2);

            const requestBody = {
                topic: effectiveTopic,
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
            // Add idea context to improve generation (from calendar flow)
            try {
                const raw = sessionStorage.getItem('from_idea_context');
                if (raw) {
                    const ideaCtx = JSON.parse(raw);
                    if (ideaCtx?.from_idea) {
                        requestBody.ideaContext = {
                            idea_title: ideaCtx.idea_title,
                            platform: ideaCtx.platform,
                            source_idea_id: ideaCtx.source_idea_id,
                            source_type: ideaCtx.source_type,
                        };
                    }
                }
            } catch(e) {}

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
            // CRITICAL: Limpiar voice-story después de generación exitosa
            try {
                sessionStorage.removeItem('writi_voice_story');
                setVoiceStoryPhase(1);
            } catch {}
            // Guardar en sessionStorage — restauración garantizada al volver a esta página
            try {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                    scripts: finalScripts.slice(0, 10),
                    topic: effectiveTopic,
                    platform: platform || 'Reels',
                    ts: Date.now(),
                }));
            } catch {}
            // Guardar en localStorage también (respaldo cross-session)
            try {
                const pid = activeProject?.id || 'global';
                localStorage.setItem(getDraftKey(pid), JSON.stringify({
                    topic: effectiveTopic, platform: platform || 'Reels',
                    toneBrand: toneBrand || 'cercano', hookType: hookType || 'curiosidad extrema',
                    scripts: finalScripts.slice(0, 10), step: 3, ts: Date.now(),
                }));
            } catch {}
            // Limpiar flags de generación — éxito
            try { localStorage.removeItem('guion_generando'); } catch {}
            // Refresh credits balance in header
            window.dispatchEvent(new CustomEvent('refresh-profile'));
            fetchCredits(profile.id);
        } catch (err) {
            // RESTAURAR formulario si falló — topic y form siguen visibles
            try {
                localStorage.removeItem('guion_generando');
                const backup = localStorage.getItem('guion_backup');
                if (backup) {
                    const bd = JSON.parse(backup);
                    if (bd.topic && !topic)    setTopic(bd.topic);
                    if (bd.platform)           setPlatform(bd.platform);
                }
            } catch {}
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

            // ── CRÍTICO: Guardar slots en content_slots con UUIDs reales ANTES de generar guiones
            // handleGenerateSlotScript llama /api/slots/:id/generate-script que busca el slot en BD.
            // Si el slot no existe en BD (id fake), devuelve 404 y los guiones nunca se generan.
            let slotsForGeneration = slotsWithDates;
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    // Crear un plan en content_plans para agrupar los slots
                    const { data: planRecord } = await supabase.from('content_plans').insert({
                        user_id: authUser.id,
                        project_id: activeProject?.id || null,
                        description: briefAnalysis || businessOffer || 'Plan mensual',
                        platforms: planPlatforms,
                        frequency: planFrequency,
                        post_count: slotsWithDates.length,
                    }).select('id').single();

                    if (planRecord) {
                        // Insertar todos los slots sin ID → Supabase genera UUIDs reales
                        const slotsToInsert = slotsWithDates.map(s => ({
                            user_id: authUser.id,
                            project_id: activeProject?.id || null,
                            plan_id: planRecord.id,
                            idea_title: s.idea_title,
                            idea_description: s.idea_description || '',
                            platform: s.platform || 'Reels',
                            content_type: s.content_type || 'video',
                            day_number: s.day_number || 1,
                            goal: s.goal || 'engagement',
                            hook: s.hook || '',
                            scheduled_date: s.scheduled_date || null,
                            has_script: false,
                            slot_status: 'idea_only',
                        }));

                        const { data: savedSlots } = await supabase
                            .from('content_slots')
                            .insert(slotsToInsert)
                            .select('id, idea_title');

                        if (savedSlots && savedSlots.length > 0) {
                            // Reemplazar IDs fake por UUIDs reales del servidor
                            slotsForGeneration = slotsWithDates.map((s, i) => ({
                                ...s,
                                id: savedSlots[i]?.id || s.id,
                            }));
                            console.log(`[plan] ${savedSlots.length} slots guardados en BD con UUIDs reales`);
                        }
                    }
                }
            } catch (saveErr) {
                console.warn('[plan] No se pudieron pre-guardar slots en BD:', saveErr.message);
                // Continuar con IDs fake — los guiones fallarán pero el plan visual seguirá
            }

            setPlanSlots(slotsForGeneration);

            // Show plan immediately
            setStep(3);

            // --- AUTOMATION v4.4.0 ---
            // 1. Select all slots
            const allIds = slotsForGeneration.map(s => s.id);
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
                await handleAutoBatchGenerateAndSync(slotsForGeneration, allIds, freshCredits);
            } else {
                alert('⚠️ Sin créditos disponibles. Por favor compra créditos para generar los guiones.');
            }

        } catch (err) {
            console.error('❌ Plan generation error:', err);
            setError(`⚠️ Error: ${err.message}. Intenta nuevamente.`);
            setStep(4); // Mantén en el paso actual para que pueda reintentar
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
        console.log('EFFECT_MOUNTED: Stats useEffect is executing');

        const fetchStats = async () => {
            console.log('FETCH_STATS_CALLED: Starting fetchStats');

            const { data: { user } } = await supabase.auth.getUser();
            console.log('AUTH_USER_ID', user?.id);

            if (!user?.id) {
                console.warn('No user found');
                return;
            }

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Test query - contar TODOS los scripts del usuario
            const { count: guardados, error: error1 } = await supabase
                .from('scripts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            console.log('GUARDADOS_COUNT', guardados);
            console.log('GUARDADOS_ERROR', error1);

            // Contar generaciones del mes
            const { count: monthGenerations, error: error2 } = await supabase
                .from('scripts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', startOfMonth.toISOString());

            console.log('MONTH_COUNT', monthGenerations);
            console.log('MONTH_ERROR', error2);

            // ARREGLO: generated debe ser monthGenerations, saved debe ser guardados
            setStats({ generated: monthGenerations || 0, saved: guardados || 0, monthGenerations: monthGenerations || 0 });
        };

        fetchStats();
        const chan = supabase.channel('ui-stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts' }, fetchStats)
            .subscribe();
        return () => supabase.removeChannel(chan);
    }, []);

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
            const savedItem = await saveToLibrary({
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
                projectId: activeProject?.id,
                // Link to source idea if coming from calendar/strategy
                ...(() => {
                    try {
                        const raw = sessionStorage.getItem('from_idea_context');
                        if (raw) {
                            const ctx = JSON.parse(raw);
                            if (ctx?.source_idea_id) return { source_idea_id: ctx.source_idea_id, source_type: ctx.source_type || 'calendar' };
                        }
                    } catch(e) {}
                    return {};
                })(),
            });

            const savedId = savedItem?.id || null;

            // Link script to source idea if from_idea context exists
            try {
                const raw = sessionStorage.getItem('from_idea_context');
                if (raw) {
                    const ctx = JSON.parse(raw);
                    if (ctx?.source_idea_id && ctx?.source_type === 'calendar') {
                        await supabase.from('calendar_events')
                            .update({ has_script: true, script_id: savedId })
                            .eq('id', ctx.source_idea_id);
                    }
                    if (!silent) setSavedFromIdea(ctx);
                    sessionStorage.removeItem('from_idea_context');
                } else if (!silent) {
                    alert('Guardado en biblioteca ✓');
                }
            } catch(e) {
                if (!silent) alert('Guardado en biblioteca ✓');
            }

            return savedId;
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
        if (!planningScript) return;
        // brainProfile puede ser null — la IA igual puede sugerir fecha con topic+platform
        setIsSuggestingAI(true);
        setSuggestedReasoning('');
        try {
            const res = await fetch('/api/suggest-planning', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: planningScript.titulo_guion || planningScript.titulo_angulo || topic || 'Contenido',
                    platform: planningScript.platform || platform || 'Reels',
                    brainProfile: brainProfile || null,
                    existingEvents: events.map(e => e.event_date),
                    projectId: activeProject?.id
                })
            });

            if (res.status === 402) {
                alert('Créditos insuficientes para usar esta función.');
                return;
            }

            const data = await res.json();

            if (data.error) throw new Error(data.error);

            if (data.suggestedDate) {
                setPlannedDate(data.suggestedDate);
                if (data.suggestedTime) setPlannedTime(data.suggestedTime);
                setSuggestedReasoning(data.reasoning || '');
            } else {
                throw new Error('La IA no devolvió una fecha válida. Inténtalo de nuevo.');
            }
        } catch (err) {
            console.error('Error in handleAISuggestion:', err);
            alert('No se pudo sugerir la fecha: ' + (err.message || 'Error desconocido'));
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
            let refreshQ = supabase.from('calendar_events').select('*').eq('user_id', user.id);
            if (activeProject?.id) refreshQ = refreshQ.eq('project_id', activeProject.id);
            const { data: refreshedEvents } = await refreshQ;
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
                    cierre: script.cierre || script.remate || '',
                    cta: script.cta || '',
                    structure: Array.isArray(script.desarrollo) ? script.desarrollo.map(d => ({ point: 'Desarrollo', detail: d })) : [],
                    post_copy: script.copy_post || {},
                    video_duration: script.video_duration || '60 seg',
                    focus: script.focus || 'autoridad',
                    platform: platform || 'General',
                    goal: goal || 'engagement',
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
                    cierre: script.cierre || script.remate || '',
                    cta: script.cta || '',
                    structure: Array.isArray(script.desarrollo) ? script.desarrollo.map(d => ({ point: 'Desarrollo', detail: d })) : [],
                    post_copy: script.copy_post || {},
                    video_duration: script.video_duration || '60 seg',
                    focus: script.focus || 'autoridad',
                    platform: platform || 'General',
                    goal: goal || 'engagement',
                    source_type: 'content_slots',
                    source_reference_id: sourceReferenceId
                }).select('id').single();

                if (insErr) throw insErr;
                
                // NOW update content_slots with the CORRECT script ID (from scripts table, not library)
                const { error: slotErr } = await supabase.from('content_slots').update({ 
                    has_script: true, 
                    script_id: newScript.id
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
            // GUARDAR FECHA Y COLOR EN content_slots
            const { error: slotErr } = await supabase.from('content_slots').update({
                scheduled_date: dateValue,
                slot_color: selectedColor || 'pink'  // Guardar el color seleccionado
            }).eq('id', slotId);

            if (slotErr) throw slotErr;

            setPlanSlots(planSlots.map(s => {
                if (s.id === slotId) return { ...s, scheduled_date: dateValue, slot_color: selectedColor || 'pink' };
                return s;
            }));

            const slot = planSlots.find(s => s.id === slotId);
            if (slot && slot.script_id) {
                // También actualizar en scripts para consistencia
                await supabase.from('scripts').update({
                    scheduled_date: dateValue,
                    slot_color: selectedColor || 'pink'
                }).eq('id', slot.script_id);
            }

            alert(`✅ Agregado al calendario (Fecha: ${dateValue}, Color: ${selectedColor || 'pink'})`);
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
                        color: 'green'
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

            {/* Banner restauración */}
            {showRestore && (
                <RestoreBanner
                    message={scripts.length ? 'Tienes guiones generados guardados' : 'Tienes un borrador guardado'}
                    onRestore={() => setShowRestore(false)}
                    onDiscard={() => { clearDraft(); setTopic(''); setScripts([]); setStep(1); }}
                />
            )}

            {/* Header / Stats */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Sparkles size={16} color="#7ECECA" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Créditos IA: {aiCredits.total - aiCredits.used} / {aiCredits.total}</span>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-credits'))} style={{ background: 'var(--accent-gradient)', color: 'black', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Comprar más</button>
                </div>
            </div>
            <style>{`
                @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
                @keyframes cardFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', animation: 'countUp 0.4s ease', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #7c3aed, transparent)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} color="#a78bfa" fill="#a78bfa" />
                        </div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Este mes</p>
                    </div>
                    <h3 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '4px', color: '#fff' }}>{stats.monthGenerations}</h3>
                    <p style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, margin: 0 }}>guiones creados</p>
                </div>
                <div className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', animation: 'countUp 0.4s ease 0.1s both', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={18} color="#f59e0b" />
                        </div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Biblioteca</p>
                    </div>
                    <h3 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '4px', color: '#fff' }}>{stats.saved}</h3>
                    <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, margin: 0 }}>guiones guardados</p>
                </div>
                <div className="premium-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', animation: 'countUp 0.4s ease 0.2s both', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #34d399, transparent)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={18} color="#34d399" />
                        </div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Tiempo ahorrado</p>
                    </div>
                    <h3 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '4px', color: '#fff' }}>~{Math.round((stats.monthGenerations || stats.saved || 0) * 0.75)}h</h3>
                    <p style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, margin: 0 }}>vs escribir manualmente</p>
                </div>
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
                            _cachedScripts = []; _cachedStep = 1; _cachedTopic = '';
                        }}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, transition: '0.2s', background: generationMode === 'single' ? '#7c3aed' : 'rgba(255,255,255,0.04)', color: generationMode === 'single' ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer' }}
                    >
                        <div>Guiones de un tema</div>
                        {generationMode === 'single' && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 400 }}>Genera 3-5 guiones sobre cualquier tema en 2 minutos</div>}
                    </button>
                    <button
                        onClick={() => {
                            setGenerationMode('plan');
                            setTopic('');
                            setPlanWizardStep(1);
                            setStep(1);
                            setPlanSlots([]);
                        }}
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, transition: '0.2s', background: generationMode === 'plan' ? '#7c3aed' : 'rgba(255,255,255,0.04)', color: generationMode === 'plan' ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarDays size={18} /> Plan mensual de contenido</div>
                        {generationMode === 'plan' && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: 400 }}>Planifica todo tu mes con ideas + guiones + calendario</div>}
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
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9D00FF' }}>Paso {wizardStep} de 4</span>
                        </div>
                        <div className="wz-progress-bar">
                            <div className="wz-progress-fill" style={{ width: `${(wizardStep / 4) * 100}%` }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            {[
                                { n: 1, time: '~2 min' },
                                { n: 2, time: '~1 min' },
                                { n: 3, time: '~2 min' },
                                { n: 4, time: '~3 min' },
                            ].map(({ n, time }) => (
                                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {wizardStep > n ? (
                                        <span style={{ color: '#34d399', fontWeight: 800, fontSize: '0.85rem' }}>✓</span>
                                    ) : (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: wizardStep >= n ? '#9D00FF' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                                    )}
                                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <h2 style={{ fontSize: '1.6rem', marginBottom: '24px', fontWeight: 800, textAlign: 'center', letterSpacing: '-0.02em' }}>
                        {wizardStep === 1 ? '🧠 Tu Marca Personal' : wizardStep === 2 ? '📱 Tu Contenido' : wizardStep === 3 ? '🎯 Tu Estrategia' : '💡 Tu Idea'}
                    </h2>

                    {/* Wizard Step 1: Marca Personal */}
                    {wizardStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {hasBrain && (
                                <button onClick={() => setWizardStep(4)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.35)', marginBottom: '8px' }}>
                                    <Zap size={18} fill="#fff" /> Crear guión ahora — saltar configuración
                                </button>
                            )}
                            {hasBrain ? (
                                <div style={{ padding: '24px', background: 'rgba(126, 206, 202, 0.05)', borderRadius: '16px', border: '1px solid rgba(126, 206, 202, 0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <p style={{ fontWeight: 700, color: '#7ECECA', margin: 0 }}>✓ Cerebro IA configurado</p>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(52,211,153,0.2)', animation: 'pulse 2s infinite' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                                                Activo
                                            </span>
                                        </div>
                                        <button onClick={() => setEditingBrain(!editingBrain)} style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, padding: '5px 14px', borderRadius: '8px' }}>
                                            {editingBrain ? 'Cancelar' : '✏️ Editar'}
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
                                                console.log('EDIT_BRAIN_SAVE_CLICKED');
                                                const { data: { user } } = await supabase.auth.getUser();
                                                const { error: upsertError } = await supabase.from('brand_brain').upsert({ user_id: user.id, biography: brainForm.biography, products_services: brainForm.sells, audience: brainForm.helps, style_words: brainForm.style_words }, { onConflict: 'user_id' });
                                                console.log('BRAIN_UPSERT', { upsertError });
                                                if (upsertError) {
                                                    setError('Error guardando: ' + upsertError.message);
                                                    return;
                                                }
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
                                        console.log('STEP1_BUTTON_CLICKED', { brainForm });
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!brainForm.biography || !brainForm.helps) {
                                            console.log('VALIDATION_FAILED', { biography: brainForm.biography, helps: brainForm.helps });
                                            setError('Por favor, completa al menos "Quién eres" y "A quién ayuda"');
                                            return;
                                        }
                                        console.log('VALIDATION_PASSED');
                                        const { error: upsertError } = await supabase.from('brand_brain').upsert({ user_id: user.id, biography: brainForm.biography, products_services: brainForm.sells, audience: brainForm.helps, style_words: brainForm.style_words }, { onConflict: 'user_id' });
                                        console.log('UPSERT_COMPLETE', { upsertError });
                                        if (upsertError) {
                                            setError('Error guardando cerebro IA: ' + upsertError.message);
                                            return;
                                        }
                                        setHasBrain(true);
                                        setBrainName(brainForm.biography.substring(0, 30));
                                        console.log('STEP_CHANGE_TO_2');
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

                    {/* Wizard Step 4: Tu Idea — nuevo flujo por fases */}
                    {wizardStep === 4 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <ScriptWizardFlow
                            topic={topic} setTopic={setTopic}
                            toneBrand={toneBrand} setToneBrand={setToneBrand}
                            hookType={hookType} setHookType={setHookType}
                            platform={platform} setPlatform={setPlatform}
                            quantity={quantity} setQuantity={setQuantity}
                            experienciaReal={experienciaReal} setExperienciaReal={setExperienciaReal}
                            initialPhase={voiceStoryPhase}
                            onBack={() => { setVoiceStoryPhase(1); setWizardStep(3); }}
                            onGenerate={handleGenerateSingle}
                        />
                        {/* Hidden original fields kept for compat — DO NOT REMOVE */}
                        <div style={{ display: 'none' }}>

                            {/* ── ZONA OBLIGATORIA ─────────────────────── */}
                            {/* Campo principal — protagonista */}
                            <div>
                                <span className="wz-label" style={{ fontSize: '0.95rem', fontWeight: 800 }}>💡 ¿Sobre qué quieres crear contenido hoy?</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
                                    <AIPolishedTextarea className="textarea-field wz-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: Por qué el 90% de los coaches fracasan en redes" style={{ minHeight: '100px', flex: 1, fontSize: '1rem' }} />
                                    <VoiceDictation onResult={(text) => setTopic(prev => prev ? `${prev} ${text}` : text)} />
                                </div>
                            </div>

                            {/* Tono + Gancho */}
                            <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <p style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>Tono de marca</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                        {TONOS_MARCA.map(t => (
                                            <button key={t} onClick={() => setToneBrand(t)} style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: toneBrand === t ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: toneBrand === t ? 'black' : 'white', fontWeight: toneBrand === t ? 700 : 400 }}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>Tipo de gancho</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                        {HOOK_TYPES.map(h => (
                                            <button key={h} onClick={() => setHookType(h)} style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: hookType === h ? '#9D00FF' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: hookType === h ? 700 : 400 }}>{h}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Intensidad mejorada */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <p style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>Intensidad del hook</p>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: intensity <= 2 ? '#34d399' : intensity <= 3 ? '#f59e0b' : '#ef4444', background: intensity <= 2 ? 'rgba(52,211,153,0.1)' : intensity <= 3 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 10px', borderRadius: '20px' }}>
                                        {intensity === 1 ? 'Suave' : intensity === 2 ? 'Moderado' : intensity === 3 ? 'Equilibrado' : intensity === 4 ? 'Intenso' : 'Máximo impacto'}
                                    </span>
                                </div>
                                <input type="range" min="1" max="5" value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#9D00FF' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                                    <span>Suave</span><span>Equilibrado</span><span>Máximo impacto</span>
                                </div>
                            </div>

                            {/* ── SEPARADOR ────────────────────────────── */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                                <button onClick={() => setShowOptional(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '10px 18px', width: '100%', justifyContent: 'center', transition: 'all 0.2s' }}>
                                    <span>{showOptional ? '▲' : '+'}</span>
                                    {showOptional ? 'Ocultar contexto personal' : '+ Añadir contexto personal (mejora el guión)'}
                                </button>
                            </div>

                            {/* ── ZONA OPCIONAL ────────────────────────── */}
                            {showOptional && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'countUp 0.25s ease' }}>
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
                            </div>)} {/* ── Fin zona opcional ── */}

                            {/* Cantidad + Botón generar */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Cantidad:</span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {[1,2,3,4].map(q => (
                                            <button key={q} onClick={() => setQuantity(q)} style={{ width: '38px', height: '38px', borderRadius: '9px', border: `1px solid ${quantity === q ? '#9D00FF' : 'rgba(255,255,255,0.12)'}`, background: quantity === q ? 'rgba(157,0,255,0.15)' : 'rgba(255,255,255,0.04)', color: quantity === q ? '#c084fc' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>{q}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="wz-nav-sticky" style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => setWizardStep(3)} className="btn-secondary" style={{ flex: 'none', padding: '0 20px', height: '56px' }}>← Atrás</button>
                                    <button onClick={handleGenerateSingle} className="btn-primary btn-premium-glow" style={{ flex: 1, height: '56px', fontSize: '1rem', fontWeight: 800, animation: 'pulse 2.5s infinite' }}>
                                        ⚡ Generar {quantity} guión{quantity > 1 ? 'es' : ''} con tu Cerebro IA
                                    </button>
                                </div>
                            </div>
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

                    {/* STEP 1: DYNAMIC FLOW - Plataformas hasta Pain Point */}
                    {planWizardStep === 1 && (
                        <PlanMonthlyFlow
                            planPlatforms={planPlatforms}
                            setPlanPlatforms={setPlanPlatforms}
                            planFrequency={planFrequency}
                            setPlanFrequency={setPlanFrequency}
                            businessOffer={businessOffer}
                            setBusinessOffer={setBusinessOffer}
                            ticketPrice={ticketPrice}
                            setTicketPrice={setTicketPrice}
                            targetAudienceType={targetAudienceType}
                            setTargetAudienceType={setTargetAudienceType}
                            mainPainPoint={mainPainPoint}
                            setMainPainPoint={setMainPainPoint}
                            PLATAFORMAS={PLATAFORMAS}
                            FRECUENCIAS={FRECUENCIAS}
                            AUDIENCIAS_PLAN={AUDIENCIAS_PLAN}
                            handleImproveField={handleImproveField}
                            polishingField={polishingField}
                            aiRefineInstructions={aiRefineInstructions}
                            setAiRefineInstructions={setAiRefineInstructions}
                            onBack={() => setGenerationMode('single')}
                            onComplete={() => setPlanWizardStep(2)}
                        />
                    )}

                    {/* STEP 2: ESTRATEGIA DEL MES */}
                    {planWizardStep === 2 && (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>Elige tu estrategia</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Metas, estilos e intensidad de contenido.</p>
                            </div>

                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>Objetivos principales (Selecciona varios)</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                                    {[
                                        { id: 'Más Alcance / Visibilidad', label: 'Visibilidad', icon: <Eye size={24} /> },
                                        { id: 'Más Leads / DMs / Listas', label: 'Leads', icon: <Target size={24} /> },
                                        { id: 'Más Ventas (Producto/Servicio)', label: 'Ventas', icon: <TrendingUp size={24} /> },
                                        { id: 'Posicionamiento / Autoridad', label: 'Autoridad', icon: <Award size={24} /> },
                                        { id: 'Educación / Tutoriales', label: 'Educacion', icon: <BookOpen size={24} /> },
                                        { id: 'Conexión / Comunidad', label: 'Conexion', icon: <Heart size={24} /> },
                                    ].map(obj => {
                                        const isSelected = monthlyGoals.includes(obj.id);
                                        return (
                                            <button key={obj.id}
                                                onClick={() => {
                                                    if (monthlyGoals.includes(obj.id)) setMonthlyGoals(monthlyGoals.filter(g => g !== obj.id));
                                                    else setMonthlyGoals([...monthlyGoals, obj.id]);
                                                }}
                                                style={{
                                                    padding: '20px', borderRadius: '14px', textAlign: 'left',
                                                    border: `1px solid ${isSelected ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                                    background: isSelected ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                }}>
                                                <div style={{ marginBottom: '8px', color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>{obj.icon}</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>
                                                    {obj.label}
                                                </div>
                                                {isSelected && <div style={{ fontSize: '0.65rem', color: '#a78bfa', marginTop: '4px' }}>Seleccionado</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Campos avanzados colapsables */}
                            <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                <button
                                    onClick={() => setPlanAdvancedOpen(v => !v)}
                                    style={{
                                        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: 'none',
                                        cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 700,
                                    }}
                                >
                                    <span>+ Configuracion avanzada</span>
                                    {planAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {planAdvancedOpen && (
                                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
                                )}
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
                                        {ideasFetchError && !loadingRecommended && (
                                            <span style={{ fontSize: '0.7rem', color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                ⚠ {ideasFetchError}
                                            </span>
                                        )}
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
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>Tu Voz y Canales</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Frecuencia, plataformas y tu estilo de comunicación.</p>
                            </div>

                            <div>
                                <span className="wz-label">Presion de contenido</span>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {[{val:'Suave (Orgánico)', sub:'Atraccion'},{val:'Media (Estrategia)', sub:'Equilibrio'},{val:'Fuerte (Lanzamiento)', sub:'Conversion'}].map(p => (
                                        <button key={p.val} className={`pwz-intensity${planFocus === p.val ? ' active' : ''}`} onClick={() => setPlanFocus(p.val)}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{p.sub}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.val.split('(')[1]?.replace(')','')}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Campos de voz avanzados colapsables */}
                            <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                <button
                                    onClick={() => setPlanAdvancedOpen(v => !v)}
                                    style={{
                                        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: 'none',
                                        cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 700,
                                    }}
                                >
                                    <span>+ Configuracion avanzada de voz</span>
                                    {planAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {planAdvancedOpen && (
                                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <span className="wz-label">Filtro: Lo que NO queremos <span style={{fontWeight:400, color:'var(--text-muted)', textTransform:'none'}}>(voto de silencio)</span></span>
                                            <input className="input-field wz-input" placeholder="Ej: No quiero frases motivacionales vacías..." value={howNotToSound} onChange={(e) => setHowNotToSound(e.target.value)} />
                                        </div>
                                        <div>
                                            <span className="wz-label">Mantra / Idea repetida</span>
                                            <input className="input-field wz-input" placeholder="Ej: La consistencia siempre gana al talento." value={brandMantra} onChange={(e) => setBrandMantra(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                <button onClick={() => setPlanWizardStep(2)} className="btn-secondary" style={{ flex: 1 }}>Atras</button>
                                <button onClick={handleAnalyzeBrief} disabled={isAnalyzingBrief} className="btn-primary btn-premium-glow" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>
                                    {isAnalyzingBrief ? <><Loader size={20} className="animate-spin" /> Analizando... </> : 'Analizar con IA para Continuar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: ANÁLISIS IA Y GENERAR */}
                    {planWizardStep === 4 && (() => {
                        // Parse briefAnalysis markdown into clean blocks
                        const raw = briefAnalysis || '';
                        // Extract bold sections (**text**: content) as strategy pillars
                        const pillars = [];
                        const boldPattern = /\*\*([^*]+)\*\*:?\s*([^*\n]+(?:\n(?!\*\*)[^\n]*)*)/g;
                        let m;
                        while ((m = boldPattern.exec(raw)) !== null) {
                            const label = m[1].trim().replace(/^#+\s*/, '');
                            const body  = m[2].trim().replace(/\*\*/g, '').replace(/^[""]|[""]$/g, '');
                            if (label && body && body.length > 20) pillars.push({ label, body });
                        }
                        // Fallback: split by sentences if no bold found
                        const fallbackLines = pillars.length === 0
                            ? raw.replace(/\*\*/g, '').replace(/^#+[^\n]*/gm, '').split(/\.\s+/).filter(s => s.trim().length > 30).slice(0, 4)
                            : [];

                        const PILLAR_COLORS = ['#a78bfa', '#34d399', '#60a5fa', '#f59e0b'];
                        const PILLAR_ICONS  = ['🎯', '📈', '⚡', '🔑'];

                        return (
                        <div className="wz-step" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '20px', padding: '4px 14px', marginBottom: '12px' }}>
                                    <Sparkles size={13} color="#a78bfa" />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estrategia lista</span>
                                </div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em', color: '#fff' }}>Tu plan del mes</h2>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>La IA ha definido tu estrategia. Revisa y genera.</p>
                            </div>

                            {/* Strategy pillars */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(pillars.length > 0 ? pillars : fallbackLines.map(t => ({ label: '', body: t }))).slice(0, 4).map((item, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${PILLAR_COLORS[i] || '#a78bfa'}22`, borderLeft: `3px solid ${PILLAR_COLORS[i] || '#a78bfa'}`, borderRadius: '0 12px 12px 0', padding: '14px 18px' }}>
                                        {item.label && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
                                                <span>{PILLAR_ICONS[i] || '▸'}</span>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: PILLAR_COLORS[i] || '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</span>
                                            </div>
                                        )}
                                        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Ideas estimate */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', padding: '12px 20px' }}>
                                <CheckCircle size={15} color="#34d399" />
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                                    Se generarán ~{planFrequency.split(' ')[0] === '3' ? 12 : planFrequency.split(' ')[0] === '7' ? 28 : 16} ideas de contenido alineadas con esta estrategia
                                </p>
                            </div>

                            <div className="wz-nav-sticky" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => setPlanWizardStep(3)} className="btn-secondary" style={{ flex: 'none', padding: '0 20px', height: '52px' }}>← Ajustar</button>
                                <button onClick={handleGeneratePlan} className="btn-primary btn-premium-glow" style={{ flex: 1, height: '52px', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Zap size={18} /> Generar mi plan mensual
                                </button>
                            </div>
                        </div>
                        );
                    })()}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '120px' }}>
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
                            </div>
                        </div>

                        {/* Script Tabs */}
                        {scripts.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                {scripts.map((_, tabIdx) => (
                                    <button key={tabIdx} onClick={() => setActiveScriptTab(tabIdx)} style={{
                                        padding: '8px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                                        background: activeScriptTab === tabIdx ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${activeScriptTab === tabIdx ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                                        color: activeScriptTab === tabIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}>Guion {tabIdx + 1}</button>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {Array.isArray(scripts) && scripts.filter((_, i) => scripts.length === 1 || i === activeScriptTab).map((s, _mapIdx) => {
                            const i = scripts.length === 1 ? 0 : activeScriptTab;
                            return (
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
                                    {/* Header rediseñado */}
                                    <div style={{
                                        padding: '20px 28px',
                                        background: 'rgba(124,58,237,0.08)',
                                        borderBottom: '1px solid rgba(124,58,237,0.12)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>{s.titulo_guion || s.titulo_angulo || `Guion ${i + 1}`}</h3>
                                                <span style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', borderRadius: '20px', padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Modo Pro</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                                    <Clock size={11} /> {s.video_duration || videoDuration}
                                                </span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                                                    {platform}
                                                </span>
                                                {s.titulo_angulo && s.titulo_angulo !== s.titulo_guion && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', color: '#a78bfa', fontWeight: 600 }}>
                                                        {s.titulo_angulo}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="card-body-wizard" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                        {/* GANCHO */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                                                {previousScripts && (
                                                    <button onClick={handleUndo} style={{ background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Deshacer</button>
                                                )}
                                                <button
                                                    onClick={() => handleRefineBlock(i, 'gancho')}
                                                    disabled={refiningBlock === `${i}-gancho`}
                                                    title="Mejorar gancho con IA"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '5px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                                                        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                                                        color: '#a78bfa', cursor: 'pointer', transition: '0.2s'
                                                    }}
                                                >
                                                    {refiningBlock === `${i}-gancho` ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    Mejorar
                                                </button>
                                            </div>
                                            <div style={{
                                                background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
                                                borderLeft: '3px solid #7c3aed', borderRadius: '0 12px 12px 0',
                                                padding: '16px 20px',
                                            }}>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                                    Gancho
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
                                                    rows={3}
                                                    style={{
                                                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                                                        color: '#fff', fontSize: '1rem', fontWeight: 600, lineHeight: 1.7,
                                                        resize: 'none', fontFamily: 'inherit', opacity: refiningBlock === `${i}-gancho` ? 0.5 : 1,
                                                        transition: '0.3s'
                                                    }}
                                                />
                                            </div>
                                            {improvementCounts[`${i}-gancho`] > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(124, 58, 237, 0.6)' }}>Versión mejorada. Mejoras restantes: {3 - improvementCounts[`${i}-gancho`]}</span>}
                                        </div>

                                        {/* DESARROLLO (3 PUNTOS) */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0px' }}>
                                                <MessageSquare size={14} color="#a78bfa" />
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Desarrollo</span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {Array.isArray(s.desarrollo) && s.desarrollo.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                                        <div style={{ marginTop: '10px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx < 9 ? `0${idx + 1}` : idx + 1}</div>
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
                                                                    width: '100%',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                                    outline: 'none',
                                                                    color: 'rgba(255,255,255,0.88)',
                                                                    fontSize: '0.95rem',
                                                                    lineHeight: 1.75,
                                                                    fontFamily: "'Inter', sans-serif",
                                                                    resize: 'none',
                                                                    padding: '0',
                                                                    boxSizing: 'border-box',
                                                                    minHeight: '60px',
                                                                    paddingRight: '40px',
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
                                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Target size={14} color="#34d399" />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Llamada a la Accion</span>
                                                </div>
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
                                            <textarea
                                                value={s.cta}
                                                disabled={refiningBlock === `${i}-cta`}
                                                onChange={(e) => {
                                                    const news = [...scripts];
                                                    news[i].cta = e.target.value;
                                                    setScripts(news);
                                                }}
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    outline: 'none',
                                                    color: 'rgba(255,255,255,0.88)',
                                                    fontSize: '0.95rem',
                                                    lineHeight: 1.75,
                                                    fontFamily: "'Inter', sans-serif",
                                                    resize: 'none',
                                                    padding: '0',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>

                                        {/* CIERRE */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <Flag size={14} color="#60a5fa" />
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cierre / Remate</span>
                                            </div>
                                            <textarea
                                                value={s.cierre || ''}
                                                onChange={(e) => {
                                                    const news = [...scripts];
                                                    news[i].cierre = e.target.value;
                                                    setScripts(news);
                                                }}
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    outline: 'none',
                                                    color: 'rgba(255,255,255,0.88)',
                                                    fontSize: '0.95rem',
                                                    lineHeight: 1.75,
                                                    fontFamily: "'Inter', sans-serif",
                                                    resize: 'none',
                                                    padding: '0',
                                                    boxSizing: 'border-box',
                                                    minHeight: '60px',
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
                                                        { id: 'purple', color: '#9D00FF', label: 'Morado' },
                                                        { id: 'pink', color: '#EC4899', label: 'Rosa' },
                                                        { id: 'blue', color: '#3B82F6', label: 'Azul' },
                                                        { id: 'green', color: '#10B981', label: 'Verde' },
                                                        { id: 'yellow', color: '#F59E0B', label: 'Amarillo' },
                                                        { id: 'red', color: '#EF4444', label: 'Rojo' }
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
                                                        {selectedColor === 'purple' ? 'Morado' :
                                                         selectedColor === 'pink' ? 'Rosa' :
                                                         selectedColor === 'blue' ? 'Azul' :
                                                         selectedColor === 'green' ? 'Verde' :
                                                         selectedColor === 'yellow' ? 'Amarillo' : 'Rojo'}
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
                            );
                            })}
                        </div>

                        {/* Sticky Action Bar */}
                        <div style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
                            background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            padding: '12px 24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        }}>
                            {(() => {
                                const activeIdx = scripts.length === 1 ? 0 : activeScriptTab;
                                const s = scripts[activeIdx];
                                if (!s) return null;
                                return (
                                    <>
                                        <button
                                            onClick={() => handleFeedback(activeIdx, 'like')}
                                            disabled={!!scriptFeedback[activeIdx]}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: scriptFeedback[activeIdx] === 'like' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)',
                                                border: scriptFeedback[activeIdx] === 'like' ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                                                color: scriptFeedback[activeIdx] === 'like' ? '#4ade80' : 'rgba(255,255,255,0.5)',
                                                cursor: scriptFeedback[activeIdx] ? 'default' : 'pointer',
                                            }}
                                            title="Me gusta este estilo"
                                        ><ThumbsUp size={16} /></button>
                                        <button
                                            onClick={() => handleFeedback(activeIdx, 'dislike')}
                                            disabled={!!scriptFeedback[activeIdx]}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: scriptFeedback[activeIdx] === 'dislike' ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.04)',
                                                border: scriptFeedback[activeIdx] === 'dislike' ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                                                color: scriptFeedback[activeIdx] === 'dislike' ? '#f87171' : 'rgba(255,255,255,0.5)',
                                                cursor: scriptFeedback[activeIdx] ? 'default' : 'pointer',
                                            }}
                                            title="No me gusta"
                                        ><ThumbsDown size={16} /></button>
                                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
                                        <button
                                            id={`copy-sticky-${activeIdx}`}
                                            onClick={() => copyToClipboard(`GUION: ${s.titulo_guion || s.titulo_angulo}\n\nHOOK: ${s.hook || s.gancho}\n\nDESARROLLO:\n${(s.desarrollo || []).join('\n')}\n\nCIERRE: ${s.cierre}\n\nCTA: ${s.cta}\n\n--- COPY POST ---\n${s.copy_post?.titulo}\n\n${s.copy_post?.descripcion_larga}\n\nHashtags: ${s.copy_post?.hashtags?.map(h => '#' + h).join(' ')}`, `sticky-${activeIdx}`)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 18px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                                            }}
                                        ><Copy size={15} /> Copiar</button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const { Document, Paragraph, TextRun, HeadingLevel, Packer, BorderStyle } = await import('docx');
                                                    const hook = s.hook || s.gancho || '';
                                                    const desarrollo = Array.isArray(s.desarrollo) ? s.desarrollo : [];
                                                    const cta = s.cta || s.cierre || '';
                                                    const titulo = s.titulo_guion || s.titulo_angulo || 'Guion';
                                                    const children = [
                                                        new Paragraph({ children: [new TextRun({ text: 'WRITI.AI — Guion generado', size: 18, color: '9ca3af' })], spacing: { after: 80 } }),
                                                        new Paragraph({ children: [new TextRun({ text: titulo, bold: true, size: 52, color: '111827' })], spacing: { after: 200 } }),
                                                        new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' } }, spacing: { after: 200 } }),
                                                        ...(hook ? [
                                                            new Paragraph({ children: [new TextRun({ text: '⚡ HOOK', bold: true, size: 22, color: '7c3aed' })], spacing: { before: 200, after: 80 } }),
                                                            new Paragraph({ children: [new TextRun({ text: hook, size: 26, bold: true, color: '1f2937' })], spacing: { after: 200 } }),
                                                        ] : []),
                                                        ...(desarrollo.length ? [
                                                            new Paragraph({ children: [new TextRun({ text: '📝 DESARROLLO', bold: true, size: 22, color: '374151' })], spacing: { before: 200, after: 80 } }),
                                                            ...desarrollo.map((p, i) => new Paragraph({ children: [new TextRun({ text: `${i+1}. ${p}`, size: 24, color: '374151' })], spacing: { before: 60, after: 60 }, bullet: { level: 0 } })),
                                                        ] : []),
                                                        ...(cta ? [
                                                            new Paragraph({ children: [new TextRun({ text: '📢 CTA', bold: true, size: 22, color: '059669' })], spacing: { before: 200, after: 80 } }),
                                                            new Paragraph({ children: [new TextRun({ text: cta, size: 24, bold: true, color: '059669' })], spacing: { after: 120 } }),
                                                        ] : []),
                                                    ];
                                                    const doc = new Document({ creator: 'WRITI.AI', title: titulo, sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] });
                                                    const blob = await Packer.toBlob(doc);
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url; a.download = `${titulo.replace(/[^a-z0-9]/gi,'-').toLowerCase()}.docx`;
                                                    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                                                } catch(e) { alert('Error al generar Word: ' + e.message); }
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', color: '#7dd3fc', cursor: 'pointer' }}
                                            title="Descargar como Word (.docx)"
                                        ><Download size={15} /> .docx</button>
                                        <button
                                            onClick={() => handleSaveScript(s)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 18px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                                                background: savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(124,58,237,0.3)',
                                                color: '#a78bfa', cursor: 'pointer',
                                            }}
                                        >
                                            {savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? <CheckCircle size={15} /> : <Bookmark size={15} />}
                                            {savedScriptsIds.has(s.id || s.titulo_guion || s.titulo_angulo) ? 'Guardado' : 'Guardar'}
                                        </button>
                                        <button
                                            onClick={() => sourceReferenceId ? handleDirectSourceSave(s) : (planningIdx === activeIdx ? setPlanningIdx(null) : handleOpenPlannerIdx(s, activeIdx))}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 22px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800,
                                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                                border: '1px solid #7c3aed',
                                                color: '#fff', cursor: 'pointer',
                                                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                                            }}
                                        ><Calendar size={15} /> {sourceReferenceId ? 'Guardar en Origen' : 'Planificar'}</button>
                                        {handleSaveAll && scripts.length > 1 && (
                                            <button
                                                onClick={handleSaveAll}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '10px 18px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                                                }}
                                            >Guardar todos</button>
                                        )}
                                    </>
                                );
                            })()}
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                        border: selectedSlots.has(slot.id) ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.07)',
                                        background: selectedSlots.has(slot.id) ? 'rgba(124,58,237,0.05)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '14px',
                                        overflow: 'hidden',
                                        animation: `cardFadeIn 0.25s ease ${Math.min(i * 0.03, 0.5)}s both`,
                                        transition: 'border-color 0.15s',
                                    }}
                                >
                                    {/* Header row */}
                                    <div
                                        style={{
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            userSelect: 'none',
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
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.3 }}>{slot.idea_title}</h3>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                                                    {slot.platform && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '1px 6px' }}>{slot.platform}</span>}
                                                    {slot.content_type && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '1px 6px' }}>{slot.content_type}</span>}
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

                                    {/* Expanded Script Content — single column clean */}
                                    {isExpanded && slot.has_script && sd && (
                                        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>

                                                {/* Hook */}
                                                {hookText && (
                                                    <div style={{ borderLeft: '3px solid #a78bfa', paddingLeft: '14px', background: 'rgba(167,139,250,0.04)', borderRadius: '0 10px 10px 0', padding: '12px 14px 12px 14px' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '5px' }}>⚡ Hook</span>
                                                        <p style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>{hookText}</p>
                                                    </div>
                                                )}

                                                {/* Desarrollo */}
                                                {desarrolloArr.length > 0 && (
                                                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px 14px' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>Desarrollo</span>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {desarrolloArr.slice(0, 3).map((punto, pidx) => (
                                                                <div key={pidx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                                    <span style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>{pidx + 1}</span>
                                                                    <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, margin: 0 }}>{typeof punto === 'object' ? JSON.stringify(punto) : punto}</p>
                                                                </div>
                                                            ))}
                                                            {desarrolloArr.length > 3 && <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', margin: '4px 0 0 28px' }}>+{desarrolloArr.length - 3} puntos más</p>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* CTA */}
                                                {ctaText && (
                                                    <div style={{ borderLeft: '3px solid #34d399', background: 'rgba(52,211,153,0.04)', borderRadius: '0 10px 10px 0', padding: '10px 14px' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>CTA</span>
                                                        <p style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{ctaText}</p>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                                                    <button onClick={handleSavePlanSlot} disabled={isSaved}
                                                        style={{ flex: 1, padding: '9px 0', borderRadius: '9px', border: isSaved ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(124,58,237,0.3)', background: isSaved ? 'rgba(52,211,153,0.08)' : 'rgba(124,58,237,0.1)', color: isSaved ? '#34d399' : '#a78bfa', fontSize: '0.78rem', fontWeight: 700, cursor: isSaved ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        {isSaved ? <><CheckCircle size={13} /> Guardado</> : <><Bookmark size={13} /> Guardar</>}
                                                    </button>
                                                    <button onClick={handleCopyPlanSlot}
                                                        style={{ padding: '9px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Copy size={13} /> Copiar
                                                    </button>
                                                    <button onClick={() => router.push('/dashboard/calendar')}
                                                        style={{ padding: '9px 16px', borderRadius: '9px', border: '1px solid rgba(126,206,202,0.2)', background: 'rgba(126,206,202,0.05)', color: '#7ECECA', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Calendar size={13} />
                                                    </button>
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                                            <span>💾</span>
                                            <span>Guarda esta configuración para reutilizarla</span>
                                        </div>
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

            {/* Modal: guión guardado desde idea del calendario */}
            {savedFromIdea && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#141416', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✅</div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Guión guardado</h3>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', lineHeight: 1.5 }}>
                            "{savedFromIdea.idea_title?.slice(0, 60)}" está listo en tu biblioteca
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={() => { setSavedFromIdea(null); router.push('/dashboard/library'); }}
                                style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                📚 Ver en Biblioteca
                            </button>
                            <button onClick={() => { setSavedFromIdea(null); router.push('/dashboard/calendar'); }}
                                style={{ padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                📅 Ver en Calendario
                            </button>
                            <button onClick={() => { setSavedFromIdea(null); setStep(1); setScripts([]); }}
                                style={{ padding: '12px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px', color: '#a78bfa', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
                                Crear otro guión
                            </button>
                        </div>
                    </div>
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

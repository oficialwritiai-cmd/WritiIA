/* app/dashboard/estrategia/page.js */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Plus, Target, Sparkles, Wand2, Calendar, Layout, Trash2, ArrowRight, Save, Wand, PenSquare, Download, Loader2, CheckCircle2, TrendingUp, Brain, Search, Layers, Zap, MessageSquare, ArrowLeft, Rocket, Edit3, X } from 'lucide-react';
import GenerationProgress from '@/app/components/GenerationProgress';
import SuccessModal from '@/app/components/SuccessModal';
import { saveToLibrary } from '@/lib/library';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useProject } from '@/app/components/ProjectContext';
import BrainField from '@/app/components/BrainField';

// Strategy Page v1.17.22 (Refined Planning & Persistence)
// Simple stepper component
function Stepper({ current }) {
    const steps = ['Tu idea', 'Banco de ideas'];
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '40px' }}>
            {steps.map((label, idx) => {
                const isActive = idx === current;
                const isCompleted = idx < current;

                return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: isCompleted ? 'rgba(34, 197, 94, 0.1)' : isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: isCompleted ? '#22C55E' : isActive ? '#000' : 'rgba(255,255,255,0.3)',
                                border: isCompleted ? '1px solid rgba(34, 197, 94, 0.2)' : isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                transition: '0.3s'
                            }}
                        >
                            {isCompleted ? <CheckCircle2 size={20} /> : idx + 1}
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: isActive ? '#FFF' : 'rgba(255,255,255,0.3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function EstrategiaPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [brainActive, setBrainActive] = useState(false);
    const [ideas, setIdeas] = useState([]);
    const [selectedIdeaIds, setSelectedIdeaIds] = useState(new Set());
    const [selectedIdeasForPlan, setSelectedIdeasForPlan] = useState([]);
    const [savingToCalendar, setSavingToCalendar] = useState(false);
    const [savingToLibrary, setSavingToLibrary] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successModalData, setSuccessModalData] = useState({ title: '', message: '' });
    const [selectedPhase, setSelectedPhase] = useState('ideacion');
    const [syncProgress, setSyncProgress] = useState(null);
    
    // Nuevo flujo de planificación inteligente
    const [isAnalyzingPlan, setIsAnalyzingPlan] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planResult, setPlanResult] = useState(null);
    const [editablePlan, setEditablePlan] = useState(null);
    const [form, setForm] = useState({
        objective: '',
        launch: '',
        objection: '',
        story: '',
        types: [],
        platforms: [],
    });
    const [ideaCount, setIdeaCount] = useState(20);

    // Presets State
    const [presets, setPresets] = useState([]);
    const [loadingPresets, setLoadingPresets] = useState(false);
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [savingPreset, setSavingPreset] = useState(false);

    const supabase = createSupabaseClient();

    const { activeProject, projectBrain, projectVersion } = useProject();

    useEffect(() => {
        if (projectBrain) {
            setBrainActive(true);
        } else {
            setBrainActive(false);
        }
    }, [projectBrain]);

    useEffect(() => {
        async function loadInitialData() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const userId = session.user.id;

                supabase.from('users_profiles').select('*').eq('id', userId).single()
                    .then(({ data: prof }) => { if (prof) setProfile(prof); });

                // Presets are project-specific now
                fetchPresets(userId);
            }
        }
        loadInitialData();
    }, [projectVersion]);

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
            alert('Por favor ingresa un nombre para el preajuste');
            return;
        }

        setSavingPreset(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión');

            const { error } = await supabase
                .from('strategy_presets')
                .insert({
                    user_id: user.id,
                    project_id: activeProject?.id,
                    nombre_preset: newPresetName.trim(),
                    data: form
                });

            if (error) throw error;

            setIsNamingModalOpen(false);
            setNewPresetName('');
            fetchPresets(user.id);
            alert('✓ Preajuste guardado correctamente');
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setSavingPreset(false);
        }
    };

    const handleLoadPreset = (preset) => {
        if (!preset || !preset.data) return;
        setForm(preset.data);
        alert(`✓ Preajuste "${preset.nombre_preset}" cargado`);
    };

    const handleDeletePreset = async (e, id) => {
        e.stopPropagation();
        if (!confirm('¿Seguro que quieres borrar este preajuste?')) return;

        try {
            const { error } = await supabase
                .from('strategy_presets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setPresets(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert('Error al borrar: ' + err.message);
        }
    };

    const ideasLoadingSteps = [
        "Leyendo tu Cerebro IA…",
        "Buscando ángulos de contenido…",
        "Diseñando ideas virales…",
        "Preparando tu Banco de Ideas…",
    ];

    useEffect(() => {
        if (loading) {
            let current = 0;
            setLoadingPhase(0);
            const interval = setInterval(() => {
                if (current < ideasLoadingSteps.length - 1) {
                    current++;
                    setLoadingPhase(current);
                }
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setForm((prev) => {
                const arr = Array.isArray(prev[name]) ? [...prev[name]] : [];
                if (checked) {
                    if (!arr.includes(value)) arr.push(value);
                }
                else {
                    const idx = arr.indexOf(value);
                    if (idx > -1) arr.splice(idx, 1);
                }
                return { ...prev, [name]: arr };
            });
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleGenerateIdeas = async () => {
        if (!form.objective || form.platforms.length === 0) {
            setError('Por favor completa el objetivo y selecciona al menos una plataforma.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');
            const token = session.access_token;

            const res = await fetch('/api/estrategia/generate-ideas', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    userId: session.user.id,
                    projectId: activeProject?.id
                })
            });

            if (res.status === 402) {
                window.dispatchEvent(new CustomEvent('show-no-credits'));
                setLoading(false);
                return;
            }

            const data = await res.json();
            console.log('[Estrategia] Response:', data);

            if (!res.ok) throw new Error(data.error || 'Error al generar ideas');

            if (!data.ideas) {
                throw new Error('No se recibieron ideas. Verifica que el Cerebro IA esté configurado.');
            }

            // ULTRA ROBUST PARSING
            let ideasData = data.ideas;
            console.log('[Estrategia] Raw data type:', typeof ideasData, Array.isArray(ideasData));

            // Step 1: If it's a string, parse it as JSON
            if (typeof ideasData === 'string') {
                console.log('[Estrategia] Parsing string...');
                const str = ideasData.trim();

                // Si es un array JSON
                if (str.startsWith('[')) {
                    try {
                        ideasData = JSON.parse(str);
                        console.log('[Estrategia] Parsed as array, length:', ideasData?.length);
                    } catch (e) {
                        console.error('[Estrategia] Parse error:', e);
                        // Buscar el array manualmente
                        const match = str.match(/\[[\s\S]*\]/);
                        if (match) {
                            try {
                                ideasData = JSON.parse(match[0]);
                            } catch (e2) {
                                ideasData = [];
                            }
                        } else {
                            ideasData = [];
                        }
                    }
                }
                // Si es un objeto JSON único
                else if (str.startsWith('{')) {
                    try {
                        ideasData = [JSON.parse(str)];
                    } catch (e) {
                        ideasData = [];
                    }
                }
                else {
                    ideasData = [];
                }
            }

            // ASEGURAR que es array al final
            if (!Array.isArray(ideasData)) {
                console.error('[Estrategia] ideasData is not array after parsing:', typeof ideasData);
                if (ideasData && typeof ideasData === 'object') {
                    ideasData = [ideasData];
                } else {
                    ideasData = [];
                }
            }

            // Step 2: Ensure it's an array
            if (!Array.isArray(ideasData)) {
                if (ideasData && typeof ideasData === 'object') {
                    ideasData = [ideasData];
                } else {
                    ideasData = [];
                }
            }

            // Step 3: Filter out invalid ideas (must have at least titulo or descripcion)
            ideasData = ideasData.filter(idea =>
                idea && (
                    idea.titulo_idea ||
                    idea.titulo ||
                    idea.descripcion ||
                    idea.plataforma
                )
            );

            console.log('[Estrategia] Final ideas count:', ideasData.length);
            if (ideasData.length > 0 && ideasData[0]) {
                console.log('[Estrategia] First idea:', JSON.stringify(ideasData[0]).substring(0, 200));
            }

            if (ideasData.length === 0) {
                throw new Error('No se pudieron parsear las ideas. Intenta de nuevo.');
            }

            // ASEGURAR que ideasData es un array de objetos antes de guardar
            if (!Array.isArray(ideasData)) {
                console.error('[Estrategia] ideasData no es array:', ideasData);
                throw new Error('Error al procesar las ideas');
            }

            // Verificar que cada elemento es un objeto
            for (let i = 0; i < Math.min(3, ideasData.length); i++) {
                console.log('[Estrategia] Idea[' + i + ']:', typeof ideasData[i], ideasData[i]?.titulo_idea);
            }

            // Step 4: Inject stable IDs for selection robustness
            const finalIdeas = ideasData.map((idea, idx) => {
                const stableId = idea.id || idea.titulo_idea || idea.titulo || `idea-${Date.now()}-${idx}`;
                return {
                    ...idea,
                    id: String(stableId)
                };
            });

            console.log('[Estrategia] Setting finalIdeas, count:', finalIdeas.length);
            setIdeas(finalIdeas);
            setSelectedIdeaIds(new Set()); // Reset selection for new batch
            setStep(1);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleIdeaSelection = (id) => {
        const newSelected = new Set(selectedIdeaIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIdeaIds(newSelected);
    };

    const handleSaveSelectedIdeas = async () => {
        if (selectedIdeaIds.size === 0) {
            alert('No hay ideas seleccionadas para guardar.');
            return;
        }

        const ideasToSave = ideas.filter(i => selectedIdeaIds.has(i.id));

        if (ideasToSave.length === 0) return;

        setSavingToLibrary(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión activa');

            for (const idea of ideasToSave) {
                await saveToLibrary({
                    userId: user.id,
                    type: 'idea',
                    platform: idea.plataforma || form.platforms[0] || 'General',
                    goal: idea.objetivo || form.objective || 'Viralidad',
                    titulo: idea.titulo_idea || idea.titulo || 'Sin título',
                    content: {
                        descripcion: idea.descripcion || '',
                        por_que_funciona: idea.por_que_funciona || '',
                        cta: idea.cta || ''
                    },
                    tags: ['idea', idea.plataforma || 'General', idea.objetivo || 'Viralidad'].filter(Boolean),
                    projectId: activeProject?.id
                });
            }

            setSuccessModalData({
                title: '¡Ideas Guardadas!',
                message: `Se han guardado ${ideasToSave.length} ideas exitosamente en tu biblioteca.`
            });
            setIsSuccessModalOpen(true);
            // NOTA: A petición del usuario, NO limpiamos la selección para permitir enviarlas al calendario.
            // setSelectedIdeaIds(new Set()); 
        } catch (err) {
            console.error('Error al guardar masivamente:', err);
            alert('Error al guardar algunas ideas: ' + err.message);
        } finally {
            setSavingToLibrary(false);
        }
    };

    const handleGoToPlan = () => {
        if (selectedIdeaIds.size === 0) {
            alert('Selecciona al menos una idea para crear tu plan.');
            return;
        }

        const selectedIdeas = ideas.filter(i => selectedIdeaIds.has(String(i.id)));

        if (selectedIdeas.length === 0) {
            alert('Selecciona al menos una idea para crear tu plan.');
            return;
        }

        setSelectedIdeasForPlan(selectedIdeas);
        setStep(2);
    };

    const handleAnalyzeAndPlan = async () => {
        if (selectedIdeaIds.size === 0) {
            alert('Selecciona al menos una idea para analizar y planificar.');
            return;
        }

        const selectedIdeas = ideas.filter(i => selectedIdeaIds.has(String(i.id)));

        if (selectedIdeas.length === 0) {
            console.error('[Estrategia] Mismatch detected:', { selectedIdeaIds: Array.from(selectedIdeaIds), ideasCount: ideas.length });
            alert('Error de selección: No se encontraron las ideas marcadas. Por favor, deselecciona y vuelve a marcar.');
            return;
        }

        setIsAnalyzingPlan(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');
            const token = session.access_token;

            const res = await fetch('/api/estrategia/analyze-and-plan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    selectedIdeas,
                    userId: session.user.id,
                    projectId: activeProject?.id,
                    preferences: form
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al analizar y planificar');
            }

            const data = await res.json();
            console.log('[ANALYZE-PLAN] Resultado:', data);

            setPlanResult(data);
            setEditablePlan(data.plan || []);
            setShowPlanModal(true);
        } catch (err) {
            console.error('[ANALYZE-PLAN] Error:', err);
            alert('Error al analizar y planificar: ' + err.message);
        } finally {
            setIsAnalyzingPlan(false);
        }
    };

    const handleApplyPlan = async () => {
        if (!editablePlan || editablePlan.length === 0) {
            alert('No hay plan para aplicar.');
            return;
        }

        setSavingToCalendar(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión');

            // Resilience: Ensure we have a project ID
            const targetProjectId = activeProject?.id || profile?.last_project_id || null;
            console.log('[Estrategia] Aplicando plan al proyecto:', targetProjectId);

            const { data: planData, error: planError } = await supabase
                .from('content_plans')
                .insert({
                    user_id: user.id,
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear(),
                    frequency: `${editablePlan.length} publicaciones`,
                    platforms: [...new Set(editablePlan.map(i => i.suggestedPlatform || i.plataforma))],
                    focus: 'plan_inteligente',
                    project_id: targetProjectId
                })
                .select()
                .single();

            if (planError) throw planError;

            const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

            // 1. Identify items requiring library storage (new ideas from IA)
            const ideasForLibrary = editablePlan
                .filter(item => !isValidUUID(item.id))
                .map(item => ({
                    user_id: user.id,
                    type: 'idea',
                    platform: item.suggestedPlatform || item.plataforma || 'General',
                    goal: item.objetivo || 'engagement',
                    titulo: item.titulo_idea || item.titulo || 'Idea Estratégica',
                    content: {
                        descripcion: item.descripcion || item.description || '',
                        por_que_funciona: item.por_que_funciona || '',
                        cta: item.cta || ''
                    },
                    tags: [item.suggestedPlatform || 'General', item.tipo || 'viral', 'plan-inteligente'].filter(Boolean),
                    status: 'borrador',
                    project_id: targetProjectId
                }));

            let libraryMap = {}; // Maps original array index to library ID

            // 2. Batch insert into library
            if (ideasForLibrary.length > 0) {
                const { data: savedLibraryItems, error: libErr } = await supabase
                    .from('library')
                    .insert(ideasForLibrary)
                    .select('id, titulo');
                
                if (libErr) console.error('[ApplyPlan] Error batch saving to library:', libErr);
                
                // Map the saved IDs back (by title/order)
                if (savedLibraryItems) {
                    savedLibraryItems.forEach(saved => {
                        libraryMap[saved.titulo] = saved.id;
                    });
                }
            }

            // 3. Prepare events for batch insert into calendar
            const eventsToInsert = editablePlan.map(item => {
                const title = item.titulo_idea || item.titulo || 'Sin título';
                const refId = isValidUUID(item.id) ? item.id : libraryMap[title];
                
                let descriptionStr = item.descripcion || item.description || '';
                if (item.reason) descriptionStr += `\n\n🎯 AI Tip: ${item.reason}`;
                if (item.suggestedTime) descriptionStr += `\n⏰ Hora Sugerida: ${item.suggestedTime}`;

                const colorOptions = ['purple', 'pink', 'blue', 'green', 'yellow'];
                const defaultColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

                // Map suggested time (v1.17.22 fix)
                const startTime = item.suggestedTime || '09:00';
                let endTime = '10:00';
                if (startTime.includes(':')) {
                    const [h, m] = startTime.split(':').map(Number);
                    endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }

                return {
                    user_id: user.id,
                    title: title,
                    description: descriptionStr,
                    event_date: item.suggestedDate,
                    type: item.tipo || item.categoria || 'idea',
                    platform: item.suggestedPlatform || item.plataforma || 'General',
                    color: 'green', // Identificador visual para ideas estratégicas
                    reference_id: refId,
                    project_id: targetProjectId,
                    status: 'En preparación',
                    start_time: startTime,
                    end_time: endTime
                };
            });

            // 4. Final Batch Insert into Calendar
            const { error: eventError } = await supabase
                .from('calendar_events')
                .insert(eventsToInsert);

            if (eventError) throw eventError;

            const slotsToInsert = editablePlan.map((item, idx) => ({
                plan_id: planData.id,
                user_id: user.id,
                day_number: item.suggestedDate ? parseInt(item.suggestedDate.split('-')[2]) : idx + 1,
                platform: item.suggestedPlatform || item.plataforma || 'Reels',
                content_type: item.tipo || item.categoria || 'viral',
                idea_title: item.titulo_idea || item.titulo || 'Sin título',
                goal: item.objetivo || 'engagement',
                project_id: targetProjectId
            }));
            await supabase.from('content_slots').insert(slotsToInsert);

            const dates = eventsToInsert.map(e => new Date(e.event_date));
            const minDate = new Date(Math.min(...dates)).toLocaleDateString();
            const maxDate = new Date(Math.max(...dates)).toLocaleDateString();

            setShowPlanModal(false);
            setSuccessModalData({
                title: '¡Plan Inteligente Aplicado!',
                message: `Se han sincronizado ${eventsToInsert.length} ideas con éxito en el proyecto "${activeProject?.name || 'actual'}". Revisa tu calendario entre el ${minDate} y el ${maxDate}. ¡Hay mucho contenido nuevo en Abril!`,
                redirectTo: '/dashboard/calendar',
                actionLabel: 'Ver Calendario',
                secondaryActionLabel: 'Ver en Biblioteca',
                secondaryActionRedirect: '/dashboard/library'
            });
            setIsSuccessModalOpen(true);
        } catch (err) {
            console.error('[ApplyPlan] Error:', err);
            alert('Error al aplicar el plan: ' + err.message);
        } finally {
            setSavingToCalendar(false);
        }
    };

    const handleUpdatePlanDate = (index, newDate) => {
        setEditablePlan(prev => {
            const updated = [...prev];
            if (updated[index]) {
                updated[index] = { ...updated[index], suggestedDate: newDate };
            }
            return updated;
        });
    };

    const handleExportExcel = async (specificIdeas = null) => {
        const ideasToExport = specificIdeas || ideas;
        if (!ideasToExport || ideasToExport.length === 0) {
            alert('No hay ideas para exportar.');
            return;
        }

        setExporting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/export/ideas', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: ideasToExport, // Send the full objects, not just 'ids' which might be "1"
                    userId: user.id
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al exportar');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `WritiIA_Ideas_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Error al exportar: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    const handleSendToCalendar = async () => {
        if (selectedIdeasForPlan.length === 0) {
            alert('No hay ideas para enviar al calendario.');
            return;
        }

        setSavingToCalendar(true);
        setSyncProgress({ current: 0, total: selectedIdeasForPlan.length, text: 'Iniciando sincronización...' });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión');

            // 1. Get AI suggested schedule
            setSyncProgress(prev => ({ ...prev, text: '📅 Calculando fechas óptimas...' }));
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const scheduleRes = await fetch('/api/calendar/plan', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: selectedIdeasForPlan,
                    userId: user.id,
                    projectId: activeProject?.id
                })
            });
            const { schedule } = await scheduleRes.json();
            console.log('[CALENDARIO] Plan sugerido por IA:', schedule);

            // 2. Create the content plan record
            const { data: planData, error: planError } = await supabase
                .from('content_plans')
                .insert({
                    user_id: user.id,
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear(),
                    frequency: `${selectedIdeasForPlan.length} publicaciones`,
                    platforms: [...new Set(selectedIdeasForPlan.map(i => i.plataforma))],
                    focus: 'plan_mensual',
                    project_id: activeProject?.id
                })
                .select()
                .single();

            if (planError) throw planError;

            // 3. Prepare events and generate scripts sequentially
            const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
            const eventsToInsert = [];

            for (let idx = 0; idx < selectedIdeasForPlan.length; idx++) {
                let idea = { ...selectedIdeasForPlan[idx] };
                const suggestion = schedule?.find(s => s.id_idea === idea.id || s.id === idea.id) || {};
                const targetDate = suggestion.fecha_sugerida || suggestion.fecha || new Date(new Date().setDate(new Date().getDate() + idx + 1)).toISOString().split('T')[0];

                setSyncProgress({ current: idx + 1, total: selectedIdeasForPlan.length, text: `Generando guion y copy: ${idea.titulo_idea || idea.titulo || 'Idea ' + (idx+1)}...` });
                console.log(`[PLAN_CALENDARIO] Generando guion para idea ${idx + 1}/${selectedIdeasForPlan.length}: ${idea.titulo_idea || idea.titulo}`);

                // --- 3.1 GENERATE FULL SCRIPT VIA API ---
                let fullScriptContent = { ...idea };
                let scriptFullText = idea.descripcion || '';

                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;

                    const scriptRes = await fetch('/api/generate-scripts', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            topic: `${idea.titulo_idea || idea.titulo || ''} - ${idea.descripcion || ''}`,
                            platform: idea.plataforma || 'General',
                            count: 1,
                            tone: 'Directo y persuasivo',
                            intensity: 4,
                            videoDuration: '60 seg',
                            userId: user.id,
                            projectId: activeProject?.id
                        })
                    });

                    if (scriptRes.ok) {
                        const scriptData = await scriptRes.json();
                        if (scriptData.scripts && scriptData.scripts.length > 0) {
                            const generatedScript = scriptData.scripts[0];
                            fullScriptContent = { ...fullScriptContent, ...generatedScript };
                            
                            // Reconstruct the full text for the calendar event
                            let textParts = [];
                            if (generatedScript.titulo_guion) textParts.push(`🎬 TÍTULO: ${generatedScript.titulo_guion}`);
                            if (generatedScript.gancho) textParts.push(`\n🪝 GANCHO (Hook):\n${generatedScript.gancho}`);
                            if (generatedScript.desarrollo && Array.isArray(generatedScript.desarrollo)) {
                                textParts.push(`\n📝 DESARROLLO:\n${generatedScript.desarrollo.join('\n')}`);
                            }
                            if (generatedScript.cierre) textParts.push(`\n✨ CIERRE:\n${generatedScript.cierre}`);
                            if (generatedScript.cta) textParts.push(`\n🎯 CTA:\n${generatedScript.cta}`);
                            if (generatedScript.copy_post) {
                                textParts.push(`\n\n📌 COPY PARA EL POST:\n${generatedScript.copy_post.titulo || ''}\n${generatedScript.copy_post.descripcion_larga || ''}\n${generatedScript.copy_post.hashtags?.join(' ') || ''}`);
                            }
                            
                            scriptFullText = textParts.join('\n');
                        }
                    } else {
                        console.warn('[PLAN_CALENDARIO] Falló la generación del guion para:', idea.titulo_idea);
                    }
                } catch (scriptErr) {
                    console.error('[PLAN_CALENDARIO] Error llamando a /api/generate-scripts:', scriptErr);
                }
                // ----------------------------------------

                let validRefId = isValidUUID(idea.id) ? idea.id : null;

                // 3.2 GUARDAR EN BIBLIOTECA COMO GUION COMPLETO
                try {
                    setSyncProgress(prev => ({ ...prev, text: `Guardando en biblioteca: ${idea.titulo_idea || idea.titulo || 'Idea ' + (idx+1)}...` }));
                    
                    // Si ya existía, actualizamos. Si no, insertamos.
                    const payload = {
                        user_id: user.id,
                        type: 'guion', // Ahora es un guion completo
                        platform: idea.plataforma || 'General',
                        goal: idea.objetivo || 'engagement',
                        titulo: idea.titulo_idea || idea.titulo || 'Idea Estratégica',
                        content: fullScriptContent,
                        script_full_text: scriptFullText,
                        tags: [idea.plataforma, idea.tipo, idea.objetivo, 'plan-mensual'].filter(Boolean),
                        status: 'borrador',
                        project_id: activeProject?.id
                    };

                    let savedData;
                    if (validRefId) {
                        savedData = await supabase.from('library').update(payload).eq('id', validRefId).select().single();
                    } else {
                        savedData = await supabase.from('library').insert(payload).select().single();
                    }

                    if (savedData.data && savedData.data.id) {
                        validRefId = savedData.data.id;
                    }
                } catch (saveErr) {
                    console.error('Error auto-guardando guion en biblioteca:', saveErr);
                }

                // 3.3 PREPARAR PARA CALENDARIO
                let descriptionStr = scriptFullText;
                if (suggestion.motivo || suggestion.razon) {
                    descriptionStr += `\n\n🎯 AI Tip: ${suggestion.motivo || suggestion.razon}`;
                }
                if (suggestion.hora_sugerida || suggestion.hora) {
                    descriptionStr += `\n⏰ Hora Sugerida: ${suggestion.hora_sugerida || suggestion.hora}`;
                }

                const colorOptions = ['purple', 'pink', 'blue', 'green', 'yellow'];
                const defaultColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

                // Map suggested time (v1.17.22 fix)
                const startTime = suggestion.hora_sugerida || suggestion.hora || '09:00';
                let endTime = '10:00';
                if (startTime.includes(':')) {
                    const [h, m] = startTime.split(':').map(Number);
                    endTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }

                eventsToInsert.push({
                    user_id: user.id,
                    title: idea.titulo_idea || idea.titulo || 'Sin título',
                    description: descriptionStr,
                    event_date: targetDate,
                    type: idea.tipo || idea.tipo_contenido || 'idea',
                    platform: idea.plataforma || 'General',
                    color: defaultColor,
                    reference_id: validRefId,
                    project_id: activeProject?.id,
                    start_time: startTime,
                    end_time: endTime
                });
            }

            // 4. INSERTAR TODOS LOS EVENTOS EN CALENDARIO
            setSyncProgress({ current: selectedIdeasForPlan.length, total: selectedIdeasForPlan.length, text: 'Escribiendo eventos en el calendario...' });
            const { error: eventError } = await supabase
                .from('calendar_events')
                .insert(eventsToInsert);

            if (eventError) throw eventError;

            // 5. Insertar slots del plan (para compatibilidad)
            const slotsToInsert = selectedIdeasForPlan.map((idea, idx) => {
                const suggestion = schedule?.find(s => s.id_idea === idea.id || s.id === idea.id) || {};
                const targetDate = suggestion.fecha_sugerida || suggestion.fecha;
                return {
                    plan_id: planData.id,
                    user_id: user.id,
                    day_number: targetDate ? parseInt(targetDate.split('-')[2]) : idx + 1,
                    platform: idea.plataforma || 'Reels',
                    content_type: idea.tipo || idea.tipo_contenido || 'viral',
                    idea_title: idea.titulo_idea || idea.titulo || 'Sin título',
                    goal: idea.objetivo || 'engagement'
                };
            });
            await supabase.from('content_slots').insert(slotsToInsert);

            const dates = eventsToInsert.map(e => new Date(e.event_date));
            const minDate = new Date(Math.min(...dates)).toLocaleDateString();
            const maxDate = new Date(Math.max(...dates)).toLocaleDateString();

            setSuccessModalData({
                title: '¡Plan Mensual Completo!',
                message: `Se han generado los guiones de ${selectedIdeasForPlan.length} ideas y programado entre el ${minDate} y el ${maxDate}.`,
                redirectTo: '/dashboard/calendar',
                actionLabel: 'Ver Calendario',
                secondaryActionLabel: 'Ver en Biblioteca',
                secondaryActionRedirect: '/dashboard/library'
            });
            setIsSuccessModalOpen(true);
        } catch (err) {
            console.error('[Estrategia] Error sending to calendar:', err);
            alert('Error al enviar al calendario: ' + err.message);
        } finally {
            setSavingToCalendar(false);
            setSyncProgress(null);
        }
    };

    const addToCalendar = async () => {
        const selected = ideas.filter(i => selectedIdeaIds.has(String(i.id)));
        if (!selected.length) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const today = new Date();
            const events = selected.map((idea, i) => {
                const d = new Date(today);
                d.setDate(d.getDate() + (i * 2) + 1);
                return {
                    user_id: user.id,
                    title: idea.titulo_idea || idea.titulo || 'Idea de contenido',
                    event_date: d.toISOString().split('T')[0],
                    status: 'idea', platform: form.platforms[0] || 'Reels',
                    color: 'purple', type: 'idea',
                    start_time: '09:00', end_time: '10:00',
                    notes: idea.descripcion || idea.hook || '',
                };
            });
            const { error } = await supabase.from('calendar_events').insert(events);
            if (!error) router.push('/dashboard/calendar');
            else alert('Error: ' + error.message);
        } catch(e) { alert('Error: ' + e.message); }
    };

    const handleGenerateScriptForIdea = (idea) => {
        if (!idea) return;
        const titulo = idea.titulo_idea || idea.titulo || '';
        const desc = idea.descripcion || '';
        const plataforma = idea.plataforma || 'Reels';
        const objetivo = idea.objetivo || 'engagement';
        if (!titulo) return;

        // Save ideas to sessionStorage before navigating so they can be restored
        try { sessionStorage.setItem('estrategia_ideas_backup', JSON.stringify(ideas)); } catch(e) {}

        const params = new URLSearchParams();
        params.set('mode', 'single');
        params.set('count', '1');
        params.set('topic', encodeURIComponent(`${titulo}\n${desc}`));
        params.set('platform', encodeURIComponent(plataforma));
        params.set('goal', encodeURIComponent(objetivo));
        params.set('source_type', 'strategy');
        router.push(`/dashboard?${params.toString()}`);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Brand & Month
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const currentMonth = monthNames[new Date().getMonth()];
        const currentYear = new Date().getFullYear();

        // Cover
        doc.setFontSize(22);
        doc.text("Plan Estratégico de Contenido", 105, 80, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`${profile?.nombre_marca || 'Writiai User'} - ${currentMonth} ${currentYear}`, 105, 95, { align: 'center' });

        doc.addPage();

        // Table Data
        const itemsToDownload = selectedIdeaIds.size > 0
            ? ideas.filter(i => selectedIdeaIds.has(i.id || i.titulo_idea || i.titulo || String(ideas.indexOf(i))))
            : ideas;

        const tableBody = itemsToDownload.map(i => [
            i.titulo_idea || i.titulo || 'Sin título',
            i.plataforma || 'Reels',
            i.objetivo || 'Engagement',
            i.tipo || 'Viral',
            i.descripcion || '',
            i.cta || ''
        ]);

        doc.autoTable({
            head: [['Título', 'Plataforma', 'Objetivo', 'Tipo', 'Descripción', 'CTA']],
            body: tableBody,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [126, 206, 202] }
        });

        doc.save(`Ideas_Contenido_${currentMonth}_${currentYear}.pdf`);
    };

    const renderDiscovery = () => (
        <div style={{ maxWidth: '660px', margin: '0 auto' }}>
            <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: '8px' }}>
                        ¿Sobre qué quieres crear este mes?
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', margin: 0 }}>
                        Cuéntanos tu objetivo o tema del mes
                    </p>
                </div>

                {/* Cerebro IA badge */}

                {/* Presets Manager Section — hidden */}
                <div style={{ display: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Tus Preajustes ({presets.length})
                        </h3>
                        {presets.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Selecciona uno para cargar</span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', minHeight: '60px' }}>
                        {loadingPresets ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                                <Loader2 size={16} className="animate-spin" /> Cargando preajustes...
                            </div>
                        ) : presets.length === 0 ? (
                            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px' }}>
                                No tienes preajustes guardados.
                            </div>
                        ) : (
                            presets.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleLoadPreset(p)}
                                    style={{
                                        flexShrink: 0,
                                        padding: '12px 20px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: '0.2s',
                                        position: 'relative',
                                        group: 'true'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    }}
                                >
                                    <Layers size={16} color="var(--accent)" />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.nombre_preset}</span>
                                    <button
                                        onClick={(e) => handleDeletePreset(e, p.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255,0,0,0.5)',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            borderRadius: '6px'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.color = '#FF4D4D'}
                                        onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,0,0,0.5)'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {brainActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', borderRadius: '12px', marginBottom: '32px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.9rem', fontWeight: 700 }}>
                        <Brain size={18} /> ✓ Cerebro IA Activo — tus ideas sonarán a ti
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', borderRadius: '12px', marginBottom: '32px', border: '1px solid rgba(234, 179, 8, 0.2)', fontSize: '0.9rem', fontWeight: 700 }}>
                        <Brain size={18} /> Cerebro IA incompleto. <a href="/dashboard/knowledge" style={{ color: '#EAB308', textDecoration: 'underline', marginLeft: '4px' }}>Complétalo para mejores resultados →</a>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Preguntas de texto */}
                    <div>
                        <BrainField
                            className="textarea-field"
                            label="¿Qué quieres conseguir con tu contenido en los próximos 30 días?"
                            placeholder="Ej: Ganar 500 seguidores y conseguir 5 clientes..."
                            value={form.objective}
                            onChange={(e) => handleChange({ target: { name: 'objective', value: e.target.value } })}
                            fieldKey="objective"
                            brainContext={projectBrain}
                            rows={3}
                            apiEndpoint="/api/estrategia/improve-field"
                        />
                    </div>

                    <div style={{ display: 'none' }}>
                        <BrainField
                            className="textarea-field"
                            label="¿Tienes algún lanzamiento u oferta próxima?"
                            placeholder="Ej: Lanzamiento de curso el día 20..."
                            value={form.launch}
                            onChange={(e) => handleChange({ target: { name: 'launch', value: e.target.value } })}
                            fieldKey="launch"
                            brainContext={projectBrain}
                            rows={2}
                            apiEndpoint="/api/estrategia/improve-field"
                        />
                    </div>

                    <div style={{ display: 'none' }}>
                        <BrainField
                            className="textarea-field"
                            label="¿Cuál es la mayor objeción de tus clientes?"
                            placeholder="Ej: Es muy caro, no tengo tiempo..."
                            value={form.objection}
                            onChange={(e) => handleChange({ target: { name: 'objection', value: e.target.value } })}
                            fieldKey="objection"
                            brainContext={projectBrain}
                            rows={2}
                            apiEndpoint="/api/estrategia/improve-field"
                        />
                    </div>

                    {/* Cantidad de ideas */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>¿Cuántas ideas quieres?</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[10, 20, 30].map(n => (
                                <button key={n} onClick={() => setIdeaCount(n)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${ideaCount === n ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`, background: ideaCount === n ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', color: ideaCount === n ? '#a78bfa' : 'rgba(255,255,255,0.5)', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.15s' }}>
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chips Multiselección — hidden */}
                    <div style={{ display: 'none' }}>
                        <label style={{ display: 'block', marginBottom: '12px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Tipo de contenido a potenciar:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Ganar seguidores', 'Ventas directas', 'Autoridad', 'Educar', 'Viralidad'].map(opt => (
                                <label key={opt} style={{ cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="types"
                                        value={opt}
                                        checked={form.types.includes(opt)}
                                        onChange={handleChange}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        background: form.types.includes(opt) ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                        color: form.types.includes(opt) ? '#000' : 'rgba(255,255,255,0.5)',
                                        border: '1px solid ' + (form.types.includes(opt) ? 'var(--accent)' : 'rgba(255,255,255,0.1)'),
                                        transition: '0.2s'
                                    }}>
                                        {opt}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Plataformas:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn', 'X'].map(p => (
                                <label key={p} style={{ cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="platforms"
                                        value={p}
                                        checked={form.platforms.includes(p)}
                                        onChange={handleChange}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        background: form.platforms.includes(p) ? '#FFF' : 'rgba(255,255,255,0.05)',
                                        color: form.platforms.includes(p) ? '#000' : 'rgba(255,255,255,0.5)',
                                        border: '1px solid ' + (form.platforms.includes(p) ? '#FFF' : 'rgba(255,255,255,0.1)'),
                                        transition: '0.2s'
                                    }}>
                                        {p}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                        {loading ? (
                            <div style={{ flex: 1 }}>
                                <GenerationProgress
                                    steps={ideasLoadingSteps}
                                    currentPhase={loadingPhase}
                                    brainName={brainActive ? (profile?.nombre_marca || 'perfil configurado') : null}
                                    subtitle="Esto suele tomar entre 15 y 30 segundos…"
                                />
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleGenerateIdeas}
                                    disabled={loading}
                                    style={{ flex: 2, height: '56px', fontSize: '1rem', fontWeight: 800, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
                                >
                                    <Zap size={18} /> Generar ideas →
                                </button>
                                <button
                                    onClick={() => setIsNamingModalOpen(true)}
                                    disabled={loading || !form.objective}
                                    className="btn-secondary"
                                    title="Guardar esta configuración como preajuste"
                                    style={{
                                        flex: 1,
                                        height: '64px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        borderColor: 'rgba(126, 206, 202, 0.3)',
                                        color: '#7ECECA'
                                    }}
                                >
                                    <Save size={20} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>GUARDAR PREAJUSTE</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Modal para nombre del preajuste */}
                    {isNamingModalOpen && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            backdropFilter: 'blur(8px)'
                        }}>
                            <div className="premium-card" style={{ padding: '32px', maxWidth: '400px', width: '90%' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '20px' }}>Guardar Preajuste</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                                    Dale un nombre a esta configuración para reutilizarla luego.
                                </p>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej: Lanzamiento Marzo / Consultoría"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    autoFocus
                                    style={{ marginBottom: '24px' }}
                                />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setIsNamingModalOpen(false)}
                                        className="btn-secondary"
                                        style={{ flex: 1 }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSavePreset}
                                        disabled={savingPreset || !newPresetName.trim()}
                                        className="btn-primary"
                                        style={{ flex: 1 }}
                                    >
                                        {savingPreset ? <Loader2 className="animate-spin" size={18} /> : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && <p style={{ color: '#FF4D4D', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}
                </div>
            </div>
        </div>
    );

    const renderIdeas = () => {
        console.log('[Estrategia] renderIdeas - ideas:', ideas);

        // ASEGURAR que ideas es SIEMPRE un array de objetos
        let ideasList = [];

        // CASO 1: Si es string (JSON raw como "[{...},{...}]")
        if (typeof ideas === 'string') {
            const str = ideas.trim();
            // Si empieza con "[" es un array JSON
            if (str.startsWith('[')) {
                try {
                    const parsed = JSON.parse(str);
                    console.log('[Estrategia] Parsed string as array:', Array.isArray(parsed));
                    ideasList = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    console.error('[Estrategia] Error parsing JSON string:', e);
                    // Buscar el array manualmente
                    const match = str.match(/\[[\s\S]*\]/);
                    if (match) {
                        try {
                            ideasList = JSON.parse(match[0]);
                        } catch (e2) {
                            console.error('[Estrategia] Fallback parse failed:', e2);
                        }
                    }
                }
            } else if (str.startsWith('{')) {
                // Es un objeto único
                try {
                    ideasList = [JSON.parse(str)];
                } catch (e) {
                    console.error('[Estrategia] Error parsing object string:', e);
                }
            }
        }
        // CASO 2: Si ya es array
        else if (Array.isArray(ideas)) {
            ideasList = ideas;
        }
        // CASO 3: Si es un solo objeto
        else if (ideas && typeof ideas === 'object') {
            ideasList = [ideas];
        }

        // Filtrar: solo objetos válidos con al menos titulo o descripcion
        ideasList = ideasList.filter(idea =>
            idea &&
            typeof idea === 'object' &&
            (idea.titulo_idea || idea.titulo || idea.descripcion || idea.plataforma)
        );

        console.log('[Estrategia] Final ideasList count:', ideasList.length);
        if (ideasList.length > 0 && ideasList[0]) {
            console.log('[Estrategia] First idea:', JSON.stringify(ideasList[0]).substring(0, 200));
        }

        return (
            <>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>Banco de Ideas Estratégicas</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Selecciona las mejores ideas para crear tu plan mensual de contenido.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                const idsToToggle = ideasList.map((idea, idx) => String(idea.id || idea.titulo_idea || idea.titulo || idx)).filter(Boolean);
                                if (selectedIdeaIds.size === idsToToggle.length && idsToToggle.length > 0) {
                                    setSelectedIdeaIds(new Set());
                                } else {
                                    setSelectedIdeaIds(new Set(idsToToggle));
                                }
                            }}
                            style={{ background: selectedIdeaIds.size === ideasList.length && ideasList.length > 0 ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                        >
                            {selectedIdeaIds.size === ideasList.length && ideasList.length > 0 ? 'Deseleccionar todas' : 'Seleccionar todas'}
                        </button>
                        <button
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7ECECA', borderColor: 'rgba(126, 206, 202, 0.3)' }}
                            onClick={handleSaveSelectedIdeas}
                            disabled={selectedIdeaIds.size === 0 || savingToLibrary}
                        >
                            {savingToLibrary ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Guardar seleccionadas ({selectedIdeaIds.size})
                        </button>
                        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleDownloadPDF}>
                            <Save size={16} /> Descargar ideas (.pdf)
                        </button>
                        
                        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                            <button
                                className="btn-primary"
                                style={{
                                    padding: '14px 28px',
                                    fontSize: '1rem',
                                    background: selectedIdeaIds.size === 0 || isAnalyzingPlan 
                                        ? 'rgba(255,255,255,0.05)' 
                                        : 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)',
                                    color: selectedIdeaIds.size === 0 || isAnalyzingPlan ? 'rgba(255,255,255,0.3)' : '#FFF',
                                    border: selectedIdeaIds.size === 0 || isAnalyzingPlan ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                    boxShadow: selectedIdeaIds.size === 0 || isAnalyzingPlan ? 'none' : '0 4px 20px rgba(183, 77, 255, 0.4)',
                                    cursor: selectedIdeaIds.size === 0 || isAnalyzingPlan ? 'not-allowed' : 'pointer'
                                }}
                                onClick={handleAnalyzeAndPlan}
                                disabled={selectedIdeaIds.size === 0 || isAnalyzingPlan}
                            >
                                {isAnalyzingPlan ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" style={{ marginRight: '10px' }} />
                                        Analizando y planificando...
                                    </>
                                ) : (
                                    <>
                                        <Rocket size={20} style={{ marginRight: '10px' }} />
                                        Analizar y Planificar Automático
                                    </>
                                )}
                            </button>
                            <button 
                                className="btn-secondary" 
                                style={{ padding: '12px 24px', opacity: 0.6 }} 
                                onClick={handleGoToPlan} 
                                disabled={selectedIdeaIds.size === 0}
                            >
                                Crear plan simple →
                            </button>
                        </div>
                    </div>
                </div>

                {ideasList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>No hay ideas generadas aún.</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginTop: '8px' }}>Completa el formulario y genera ideas estratégicas.</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(1, 1fr)',
                        gap: '16px'
                    }}>
                        {ideasList.map((idea, idx) => {
                            // PROTECCIÓN: Si no es un objeto, skip
                            if (!idea || typeof idea !== 'object') {
                                return null;
                            }

                            // Extract fields with fallbacks
                            const id = String(idea.id || idea.titulo_idea || idea.titulo || idx);
                            const isSelected = selectedIdeaIds.has(id);
                            
                            const titulo = idea?.titulo_idea || idea?.titulo || idea?.idea_title || idea?.title || idea?.titulo_angulo || 'Idea Estratégica';
                            const desc = idea?.descripcion || idea?.idea_description || idea?.description || idea?.contenido || '';

                            const truncateDesc = (text, maxLen = 120) => {
                                if (!text) return '';
                                return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
                            };

                            return (
                                <div
                                    key={id}
                                    onClick={() => toggleIdeaSelection(id)}
                                    className="premium-card"
                                    style={{
                                        padding: '18px',
                                        background: isSelected ? 'linear-gradient(145deg, rgba(126, 206, 202, 0.1) 0%, #0a0a0a 100%)' : 'linear-gradient(145deg, #151515 0%, #0c0c0c 100%)',
                                        border: isSelected ? '1px solid #7ECECA' : '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        borderRadius: '14px',
                                        boxShadow: isSelected ? '0 4px 20px rgba(126, 206, 202, 0.2)' : '0 2px 8px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '14px',
                                        right: '14px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '5px',
                                        border: '2px solid ' + (isSelected ? '#7ECECA' : 'rgba(255,255,255,0.15)'),
                                        background: isSelected ? '#7ECECA' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {isSelected && <CheckCircle2 size={12} color="#000" />}
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '0', flexWrap: 'wrap' }}>
                                        <span className="badge" style={{ background: 'rgba(157, 0, 255, 0.12)', color: '#D8B4FF', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '20px' }}>
                                            {idea?.plataforma || 'Reels'}
                                        </span>
                                        <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.12)', color: '#7ECECA', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '20px' }}>
                                            {idea?.tipo || 'viral'}
                                        </span>
                                        {idea?.potencial === 'alto' && (
                                            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '20px' }}>
                                                Alto
                                            </span>
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0', paddingRight: '28px', lineHeight: '1.3', color: '#fff' }}>
                                        {titulo}
                                    </h3>

                                    {desc && (
                                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0', lineHeight: '1.45', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                            {desc}
                                        </p>
                                    )}

                                    {idea?.por_que_funciona && (
                                        <div style={{ background: 'rgba(255,255,255,0.025)', padding: '10px', borderRadius: '8px', marginTop: 'auto', borderLeft: '2px solid #7ECECA' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#7ECECA', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                Por qué funciona
                                            </span>
                                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', lineHeight: '1.3', margin: 0 }}>
                                                {truncateDesc(idea.por_que_funciona, 60)}
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        {/* Botón Generar Guion oculto — evita perder ideas al navegar */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                // Using the top-level import 'saveToLibrary'
                                                await saveToLibrary({
                                                    userId: profile?.id,
                                                    type: 'idea',
                                                    platform: idea?.plataforma || 'General',
                                                    goal: idea?.objetivo || 'engagement',
                                                    titulo: idea?.titulo_idea || idea?.titulo || 'Idea Estratégica',
                                                    content: idea,
                                                    tags: [idea?.plataforma, idea?.tipo, idea?.objetivo].filter(Boolean)
                                                });
                                                alert('✓ Guardado en tu biblioteca');
                                            }}
                                            className="btn-secondary"
                                            style={{
                                                flex: 1,
                                                padding: '8px 0',
                                                fontSize: '0.7rem',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <Save size={11} style={{ marginRight: '4px' }} /> Guardar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Barra fija — ideas seleccionadas */}
            {selectedIdeaIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e1e2a', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '14px', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 2000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{selectedIdeaIds.size} ideas seleccionadas</span>
                    <button onClick={addToCalendar}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
                        <Calendar size={16} /> Añadir al calendario →
                    </button>
                </div>
            )}
            </>
        );
    };

    const renderPlan = () => {
        const selectedIdeas = selectedIdeasForPlan;
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px' }}>Tu Estrategia Mensual Lista.</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Hemos distribuido tus {selectedIdeas.length} ideas seleccionadas a lo largo del mes.</p>
                </div>

                <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px 32px', borderBottom: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 700 }}>Marzo 2026</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 700 }}>{selectedIdeas.length} publicaciones</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => handleExportExcel(selectedIdeasForPlan)}
                                disabled={exporting}
                                className="btn-secondary"
                                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                Exportar Excel
                            </button>
                            <button
                                className="btn-secondary"
                                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={handleSendToCalendar}
                                disabled={savingToCalendar}
                            >
                                {savingToCalendar ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
                                <span>
                                    {savingToCalendar ? (syncProgress?.text || 'Guardando...') : 'Enviar al Calendario'}
                                </span>
                            </button>
                            <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => router.push('/dashboard/calendar')}>
                                Ver Calendario →
                            </button>
                        </div>
                    </div>

                    <div style={{ background: '#080808' }}>
                        {selectedIdeas.map((idea, idx) => (
                            <div key={idx} style={{
                                padding: '24px 32px',
                                borderBottom: idx === selectedIdeas.length - 1 ? 'none' : '1px solid #1A1A1A',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '32px'
                            }}>
                                <div style={{ minWidth: '60px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', display: 'block' }}>DÍA</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{Math.floor(idx * (30 / selectedIdeas.length)) + 1}</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <span className="badge" style={{ background: 'rgba(126, 206, 202, 0.1)', color: '#7ECECA' }}>{idea.plataforma}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Objetivo: {idea.objetivo}</span>
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{idea.titulo_idea || idea.titulo || idea.title || 'Idea Estratégica'}</h4>
                                </div>

                                <div>
                                    <button
                                        onClick={() => handleGenerateScriptForIdea(idea)}
                                        className="btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '8px 16px', background: 'transparent', border: '1px solid #2A2A2A' }}
                                    >
                                        Generar Guión →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <button className="btn-secondary" style={{ padding: '16px 32px' }} onClick={() => setStep(0)}>
                        Reiniciar Proceso de Estrategia
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ background: '#050505', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <Stepper current={step} />

                {step === 0 && renderDiscovery()}
                {step === 1 && renderIdeas()}
                {step === 2 && renderPlan()}

                {step > 0 && (
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => setStep(step - 1)}
                            className="btn-secondary"
                            style={{ padding: '12px 24px' }}
                        >
                            <ArrowLeft size={16} /> Volver al paso anterior
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de éxito (Global) */}
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                title={successModalData.title}
                message={successModalData.message}
                actionLabel={successModalData.actionLabel}
                actionOnClick={() => {
                    setIsSuccessModalOpen(false);
                    if (successModalData.redirectTo) {
                        router.push(successModalData.redirectTo);
                    } else {
                        router.push('/dashboard/library');
                    }
                }}
                secondaryActionLabel={successModalData.secondaryActionLabel}
                secondaryActionOnClick={() => {
                    setIsSuccessModalOpen(false);
                    if (successModalData.secondaryActionRedirect) {
                        router.push(successModalData.secondaryActionRedirect);
                    }
                }}
            />

            {/* Modal de Plan Inteligente */}
            {showPlanModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="premium-card" style={{ 
                        padding: '32px', 
                        maxWidth: '900px', 
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Rocket size={28} color="#B74DFF" />
                                    Plan Inteligente de Contenido
                                </h2>
                                {planResult?.summary && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {planResult.summary.totalIdeas} ideas planificadas ({planResult.summary.originalIdeas} originales + {planResult.summary.newIdeas} generadas por IA)
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => setShowPlanModal(false)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            marginBottom: '24px',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{ 
                                padding: '12px 16px', 
                                background: 'rgba(126, 206, 202, 0.1)', 
                                borderRadius: '8px',
                                border: '1px solid rgba(126, 206, 202, 0.2)'
                            }}>
                                <Calendar size={16} color="#7ECECA" />
                                <span style={{ marginLeft: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                                    {planResult?.summary?.dateRange?.start} → {planResult?.summary?.dateRange?.end}
                                </span>
                            </div>
                            <div style={{ 
                                padding: '12px 16px', 
                                background: 'rgba(183, 77, 255, 0.1)', 
                                borderRadius: '8px',
                                border: '1px solid rgba(183, 77, 255, 0.2)'
                            }}>
                                <Zap size={16} color="#B74DFF" />
                                <span style={{ marginLeft: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                                    Optimizado por IA
                                </span>
                            </div>
                        </div>

                        <div style={{ 
                            maxHeight: '400px', 
                            overflow: 'auto',
                            marginBottom: '24px',
                            border: '1px solid #1E1E1E',
                            borderRadius: '12px'
                        }}>
                            {editablePlan && editablePlan.map((item, idx) => (
                                <div key={idx} style={{
                                    padding: '16px 20px',
                                    borderBottom: idx === editablePlan.length - 1 ? 'none' : '1px solid #1A1A1A',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    background: item.isNew ? 'rgba(183, 77, 255, 0.05)' : 'transparent'
                                }}>
                                    <div style={{ minWidth: '100px' }}>
                                        <input
                                            type="date"
                                            value={item.suggestedDate || ''}
                                            onChange={(e) => handleUpdatePlanDate(idx, e.target.value)}
                                            style={{
                                                background: '#1A1A1A',
                                                border: '1px solid #2A2A2A',
                                                color: '#FFF',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span className="badge" style={{ 
                                                background: 'rgba(126, 206, 202, 0.1)', 
                                                color: '#7ECECA',
                                                fontSize: '0.65rem'
                                            }}>
                                                {item.suggestedPlatform || item.plataforma}
                                            </span>
                                            {item.isNew && (
                                                <span className="badge" style={{ 
                                                    background: 'rgba(183, 77, 255, 0.15)', 
                                                    color: '#B74DFF',
                                                    fontSize: '0.65rem'
                                                }}>
                                                    Sugerida por IA
                                                </span>
                                            )}
                                        </div>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                                            {item.titulo_idea || item.titulo || 'Sin título'}
                                        </h4>
                                        {item.reason && (
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
                                                {item.reason}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ 
                                        padding: '6px 12px', 
                                        background: item.suggestedTime ? 'rgba(255,215,0,0.1)' : 'transparent',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: item.suggestedTime ? '#FFD700' : 'rgba(255,255,255,0.3)'
                                    }}>
                                        {item.suggestedTime || '--:--'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowPlanModal(false)}
                                className="btn-secondary"
                                style={{ padding: '12px 24px' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApplyPlan}
                                disabled={savingToCalendar}
                                className="btn-primary"
                                style={{ 
                                    padding: '12px 32px',
                                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                    border: 'none'
                                }}
                            >
                                {savingToCalendar ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <Calendar size={18} style={{ marginRight: '8px' }} />
                                        Aplicar Plan al Calendario
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .premium-card {
                    background: #0D0D0D;
                    border: 1px solid #1E1E1E;
                    border-radius: 20px;
                    transition: 0.3s;
                }
                .premium-card:hover {
                    border-color: #2A2A2A;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

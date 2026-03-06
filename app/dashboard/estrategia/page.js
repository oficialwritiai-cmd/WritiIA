/* app/dashboard/estrategia/page.js */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Plus, Target, Sparkles, Wand2, Calendar, Layout, Trash2, ArrowRight, Save, Wand, PenSquare, Download, Loader2, CheckCircle2, TrendingUp, Brain, Search, Layers, Zap, MessageSquare, ArrowLeft } from 'lucide-react';
import GenerationProgress from '@/app/components/GenerationProgress';
import SuccessModal from '@/app/components/SuccessModal';
import { saveToLibrary } from '@/lib/library';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Simple stepper component
function Stepper({ current }) {
    const steps = ['Descubrimiento', 'Banco de Ideas', 'Plan Mensual'];
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
    const [form, setForm] = useState({
        objective: '',
        launch: '',
        objection: '',
        story: '',
        types: [],
        platforms: [],
    });

    // Presets State
    const [presets, setPresets] = useState([]);
    const [loadingPresets, setLoadingPresets] = useState(false);
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [savingPreset, setSavingPreset] = useState(false);

    const supabase = createSupabaseClient();

    useEffect(() => {
        async function loadInitialData() {
            // Use getSession for faster non-blocking load
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // background load
                const userId = session.user.id;

                // Fetch profile
                supabase.from('users_profiles').select('*').eq('id', userId).single()
                    .then(({ data: prof }) => { if (prof) setProfile(prof); });

                // Fetch brain status
                supabase.from('brand_brain').select('id').eq('user_id', userId).single()
                    .then(({ data: brain }) => setBrainActive(!!brain));

                // Fetch Presets
                fetchPresets(userId);
            }
        }
        loadInitialData();
    }, []);

    const fetchPresets = async (userId) => {
        if (!userId) return;
        setLoadingPresets(true);
        try {
            const { data, error } = await supabase
                .from('strategy_presets')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

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
            const res = await fetch('/api/estrategia/generate-ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    userId: profile?.id
                })
            });

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

            console.log('[Estrategia] Setting ideas, type:', typeof ideasData, 'isArray:', Array.isArray(ideasData));
            setIdeas(ideasData);
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

        const ideasToSave = ideas.filter((i, idx) => {
            const id = i?.id || i?.titulo_idea || i?.titulo || String(idx);
            return selectedIdeaIds.has(id);
        });

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
                    tags: ['idea', idea.plataforma || 'General', idea.objetivo || 'Viralidad'].filter(Boolean)
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

        // Filtrar ideas seleccionadas - con protección
        let ideasArray = ideas;
        if (typeof ideas === 'string') {
            try {
                ideasArray = JSON.parse(ideas);
                if (!Array.isArray(ideasArray)) ideasArray = [ideasArray];
            } catch (e) {
                ideasArray = [];
            }
        }

        if (!Array.isArray(ideasArray)) {
            ideasArray = [];
        }

        const selectedIdeas = ideasArray.filter(i => {
            const id = i?.id || i?.titulo_idea || i?.titulo || String(ideasArray.indexOf(i));
            return selectedIdeaIds.has(id);
        });

        if (selectedIdeas.length === 0) {
            alert('Selecciona al menos una idea para crear tu plan.');
            return;
        }

        setSelectedIdeasForPlan(selectedIdeas);
        setStep(2);
    };

    const handleExportExcel = async (specificIdeas = null) => {
        const ideasToExport = specificIdeas || ideas;
        if (!ideasToExport || ideasToExport.length === 0) {
            alert('No hay ideas para exportar.');
            return;
        }

        setExporting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/export/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay sesión');

            // 1. Get AI suggested schedule
            const scheduleRes = await fetch('/api/calendar/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: selectedIdeasForPlan,
                    userId: user.id
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
                    focus: 'plan_mensual'
                })
                .select()
                .single();

            if (planError) throw planError;

            // 3. Prepare events and ensure all ideas are in library
            const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
            const eventsToInsert = [];

            for (let idx = 0; idx < selectedIdeasForPlan.length; idx++) {
                let idea = { ...selectedIdeasForPlan[idx] };
                const suggestion = schedule?.find(s => s.id_idea === idea.id || s.id === idea.id) || {};
                const targetDate = suggestion.fecha_sugerida || suggestion.fecha || new Date(new Date().setDate(new Date().getDate() + idx + 1)).toISOString().split('T')[0];

                let validRefId = isValidUUID(idea.id) ? idea.id : null;

                // Si no tiene UUID válido, guardarla primero en biblioteca para obtener uno
                if (!validRefId) {
                    try {
                        const savedData = await supabase.from('library').insert({
                            user_id: user.id,
                            type: 'idea',
                            platform: idea.plataforma || 'General',
                            goal: idea.objetivo || 'engagement',
                            titulo: idea.titulo_idea || idea.titulo || 'Idea Estratégica',
                            content: idea,
                            tags: [idea.plataforma, idea.tipo, idea.objetivo].filter(Boolean),
                            status: 'borrador'
                        }).select().single();

                        if (savedData.data && savedData.data.id) {
                            validRefId = savedData.data.id;
                        }
                    } catch (saveErr) {
                        console.error('Error auto-guardando idea antes de calendario:', saveErr);
                    }
                }

                console.log(`[PLAN_CALENDARIO] creando evento para idea ${validRefId || 'SIN_ID'} en ${targetDate}`);

                let descriptionStr = idea.descripcion || '';
                if (suggestion.motivo || suggestion.razon) {
                    descriptionStr += `\n\n🎯 AI Tip: ${suggestion.motivo || suggestion.razon}`;
                }
                if (suggestion.hora_sugerida || suggestion.hora) {
                    descriptionStr += `\n⏰ Hora Sugerida: ${suggestion.hora_sugerida || suggestion.hora}`;
                }

                eventsToInsert.push({
                    user_id: user.id,
                    title: idea.titulo_idea || idea.titulo || 'Sin título',
                    description: descriptionStr,
                    event_date: targetDate,
                    type: idea.tipo || idea.tipo_contenido || 'idea',
                    platform: idea.plataforma || 'General',
                    reference_id: validRefId
                });
            }

            const { error: eventError } = await supabase
                .from('calendar_events')
                .insert(eventsToInsert);

            if (eventError) throw eventError;

            // 4. (Optional) Also save to slots for backward compatibility if needed
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
                title: '¡Plan Calendario Creado!',
                message: `Se han planificado ${selectedIdeasForPlan.length} ideas entre el ${minDate} y el ${maxDate}. ¿Qué quieres hacer ahora?`,
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
        }
    };

    const handleGenerateScriptForIdea = (idea) => {
        // Validate idea has required data
        if (!idea) {
            alert('Error: No se pudo obtener la idea. Intenta de nuevo.');
            return;
        }

        const titulo = idea.titulo_idea || idea.titulo || '';
        const desc = idea.descripcion || '';
        const plataforma = idea.plataforma || 'Reels';
        const objetivo = idea.objetivo || 'engagement';

        if (!titulo) {
            alert('Error: La idea no tiene título válido.');
            return;
        }

        console.log('[Estrategia] Generating script for idea:', { titulo, plataforma, objetivo });

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
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="premium-card" style={{ padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Target size={32} color="var(--accent)" />
                    Sesión de Descubrimiento
                    <span style={{ fontSize: '0.7rem', color: '#FFD700', background: 'rgba(255,215,0,0.1)', padding: '4px 8px', borderRadius: '6px', marginLeft: 'auto' }}>v1.6.5</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '1.1rem' }}>
                    Diseñaremos tu estrategia basándonos en tus objetivos reales para los próximos 30 días.
                </p>

                {/* Presets Manager Section */}
                <div style={{ marginBottom: '40px' }}>
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
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>¿Qué quieres conseguir con tu contenido en los próximos 30 días?</label>
                        <textarea
                            name="objective"
                            className="textarea-field"
                            placeholder="Ej: Ganar 500 seguidores y conseguir 5 clientes..."
                            value={form.objective}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>¿Tienes algún lanzamiento u oferta próxima?</label>
                        <textarea
                            name="launch"
                            className="textarea-field"
                            placeholder="Ej: Lanzamiento de curso el día 20..."
                            value={form.launch}
                            onChange={handleChange}
                            rows={2}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>¿Cuál es la mayor objeción de tus clientes?</label>
                        <textarea
                            name="objection"
                            className="textarea-field"
                            placeholder="Ej: Es muy caro, no tengo tiempo..."
                            value={form.objection}
                            onChange={handleChange}
                            rows={2}
                        />
                    </div>

                    {/* Chips Multiselección */}
                    <div>
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
                                    className="btn-primary"
                                    style={{ flex: 2, height: '64px', fontSize: '1.1rem', fontWeight: 900 }}
                                >
                                    <Sparkles size={20} /> Analizar y generar banco de ideas →
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
                                const allIds = ideasList.map((i, idx) => i?.id || i?.titulo_idea || i?.titulo || String(idx)).filter(Boolean);
                                if (selectedIdeaIds.size === allIds.length) {
                                    setSelectedIdeaIds(new Set());
                                } else {
                                    setSelectedIdeaIds(new Set(allIds));
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
                        <button className="btn-primary" style={{ padding: '12px 24px' }} onClick={handleGoToPlan} disabled={selectedIdeaIds.size === 0}>
                            Crear plan con ({selectedIdeaIds.size}) seleccionadas →
                        </button>
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
                            const id = idea?.id || idea?.titulo_idea || idea?.titulo || String(idx);
                            const isSelected = selectedIdeaIds.has(id);
                            const titulo = idea?.titulo_idea || idea?.titulo || idea?.title || idea?.titulo_angulo || 'Idea Estratégica';
                            const desc = idea?.descripcion || idea?.description || idea?.contenido || '';

                            const truncateDesc = (text, maxLen = 100) => {
                                if (!text) return '';
                                return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
                            };

                            return (
                                <div
                                    key={idx}
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
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleGenerateScriptForIdea(idea); }}
                                            className="btn-primary"
                                            style={{
                                                flex: 2,
                                                padding: '8px 0',
                                                fontSize: '0.7rem',
                                                background: 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <Sparkles size={11} style={{ marginRight: '4px' }} /> Generar Guion
                                        </button>
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
                                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #B74DFF 0%, #7000FF 100%)', border: 'none' }}
                                onClick={handleSendToCalendar}
                                disabled={savingToCalendar}
                            >
                                {savingToCalendar ? <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px', display: 'inline' }} /> : <Calendar size={16} style={{ marginRight: '8px', display: 'inline' }} />}
                                {savingToCalendar ? 'Guardando...' : 'Enviar al Calendario'}
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

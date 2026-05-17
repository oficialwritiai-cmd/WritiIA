'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import {
    Plus, FolderOpen, Calendar, X, Loader2, Trash2,
    Sparkles, ArrowRight, Mic, Brain, FileText, ChevronRight,
    Zap, BarChart2, Clock, CheckCircle2, PlayCircle
} from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';
import ConfirmDialog from '@/app/components/ConfirmDialog';

/* ─── Inline styles helpers ─────────────────────────── */
const card = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '24px',
    transition: 'all 0.2s ease',
};

const actionCardBase = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px',
    padding: '28px',
    cursor: 'pointer',
    transition: 'all 0.22s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    overflow: 'hidden',
    textDecoration: 'none',
};

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color = '#a78bfa', sublabel, onClick }) {
    const [hovered, setHovered] = React.useState(false);
    return (
        <div
            style={{
                ...card,
                display: 'flex', alignItems: 'flex-start', gap: '16px',
                cursor: onClick ? 'pointer' : 'default',
                border: onClick && hovered ? `1px solid ${color}30` : card.border,
                background: onClick && hovered ? `${color}06` : card.background,
                transition: 'all 0.2s ease',
            }}
            onClick={onClick}
            onMouseEnter={() => onClick && setHovered(true)}
            onMouseLeave={() => onClick && setHovered(false)}
        >
            <div style={{
                width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                background: `${color}18`,
                border: `1px solid ${color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={20} color={color} strokeWidth={1.8} />
            </div>
            <div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {label}
                </p>
                <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '4px' }}>
                    {value ?? '—'}
                </p>
                {sublabel && (
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{sublabel}</p>
                )}
            </div>
        </div>
    );
}

/* ─── Scripts Stat Card (con CTA cuando es 0) ───────── */
function ScriptsStatCard({ value, router }) {
    const [hovered, setHovered] = React.useState(false);
    const isEmpty = !value || value === 0;
    const color = '#34d399';

    if (isEmpty) {
        return (
            <div style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative' }}>
                <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                    background: `${color}18`, border: `1px solid ${color}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <FileText size={20} color={color} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Guiones guardados
                    </p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', lineHeight: 1, marginBottom: '10px' }}>
                        Aun sin guiones
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/session')}
                        onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color; }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: 'transparent', color: color,
                            border: `1px solid ${color}50`, borderRadius: '8px',
                            padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s ease',
                        }}
                    >
                        <Sparkles size={12} strokeWidth={2} /> Crear mi primer guion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                ...card, display: 'flex', alignItems: 'flex-start', gap: '16px',
                cursor: 'pointer',
                border: hovered ? `1px solid ${color}30` : card.border,
                background: hovered ? `${color}06` : card.background,
                transition: 'all 0.2s ease',
            }}
            onClick={() => router.push('/dashboard/library')}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{
                width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <FileText size={20} color={color} strokeWidth={1.8} />
            </div>
            <div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Guiones guardados
                </p>
                <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '4px' }}>
                    {value}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>listos para grabar</p>
            </div>
        </div>
    );
}

/* ─── Action Card ───────────────────────────────────── */
function ActionCard({ number, title, desc, btnLabel, onClick, accent = '#a78bfa', icon: Icon, ribbon }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={{
                ...actionCardBase,
                border: `1px solid ${hovered ? `${accent}35` : 'rgba(255,255,255,0.07)'}`,
                background: hovered ? `${accent}09` : 'rgba(255,255,255,0.03)',
                transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
                boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.4)` : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
        >
            {ribbon && (
                <div style={{
                    position: 'absolute', top: '16px', right: '16px',
                    background: `${accent}22`, border: `1px solid ${accent}40`,
                    borderRadius: '100px', padding: '3px 10px',
                    fontSize: '0.68rem', fontWeight: 700, color: accent, letterSpacing: '0.05em',
                }}>
                    {ribbon}
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                    width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                    background: `${accent}18`, border: `1px solid ${accent}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={22} color={accent} strokeWidth={1.8} />
                </div>
                <span style={{
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)',
                    fontWeight: 700, letterSpacing: '0.1em',
                }}>
                    0{number}
                </span>
            </div>

            <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '8px', lineHeight: 1.3 }}>
                    {title}
                </h3>
                <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                    {desc}
                </p>
            </div>

            <button
                onClick={e => { e.stopPropagation(); onClick(); }}
                style={{
                    marginTop: 'auto',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: hovered ? accent : 'transparent',
                    color: hovered ? '#000' : accent,
                    border: `1px solid ${accent}50`,
                    borderRadius: '10px', padding: '10px 18px',
                    fontSize: '0.8rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    width: 'fit-content',
                }}
            >
                {btnLabel}
                <ChevronRight size={14} strokeWidth={2.5} />
            </button>
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function DashboardHomePage() {
    const [profile, setProfile]         = useState(null);
    const [projects, setProjects]       = useState([]);
    const [brain, setBrain]             = useState(null);
    const [stats, setStats]             = useState({ sessions: 0, scripts: 0, activeSession: null });
    const [loading, setLoading]         = useState(true);
    const [learningSignals, setLearningSignals] = useState([]);
    const [showModal, setShowModal]     = useState(false);
    const [newName, setNewName]         = useState('');
    const [newDesc, setNewDesc]         = useState('');
    const [creating, setCreating]       = useState(false);
    const [deletingId, setDeletingId]   = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectToDelete, setProjectToDelete]     = useState(null);

    const supabase = createSupabaseClient();
    const router   = useRouter();
    const { refreshProjects, setActiveProject, activeProjectId } = useProject();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('create') === 'true') setShowModal(true);
    }, [searchParams]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Profile
        const { data: profileData } = await supabase
            .from('users_profiles').select('*').eq('id', user.id).single();
        setProfile(profileData);

        // Projects
        const { data: projectsData } = await supabase
            .from('projects').select('*').eq('user_id', user.id)
            .or('is_deleted.eq.false,is_deleted.is.null')
            .order('created_at', { ascending: false });
        setProjects(projectsData || []);

        const activeId = activeProjectId || (projectsData?.[0]?.id ?? null);

        // Brain of active project
        if (activeId) {
            const { data: brainData } = await supabase
                .from('project_brains').select('*').eq('project_id', activeId).single();
            setBrain(brainData);
        }

        // Stats: sessions this month
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        const { count: sessionCount } = await supabase
            .from('sessions').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', monthStart.toISOString());

        // Stats: scripts saved (tabla library, type = 'guion')
        const { count: scriptCount } = await supabase
            .from('library').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('type', 'guion');

        // Active session
        const { data: activeSessions } = await supabase
            .from('sessions').select('id, current_step, status, updated_at')
            .eq('user_id', user.id).eq('status', 'active')
            .order('updated_at', { ascending: false }).limit(1);

        setStats({
            sessions: sessionCount ?? 0,
            scripts:  scriptCount ?? 0,
            activeSession: activeSessions?.[0] ?? null,
        });

        // Cargar señales de aprendizaje del Cerebro IA
        fetch('/api/performance')
            .then(r => r.json())
            .then(({ signals = [] }) => setLearningSignals(signals))
            .catch(() => {});

        setLoading(false);
    }

    function getUserName() {
        if (!profile) return '';
        if (profile.full_name) return profile.full_name.split(' ')[0];
        if (profile.name)      return profile.name.split(' ')[0];
        if (profile.email)     return profile.email.split('@')[0];
        return 'Creador';
    }

    function getTimeOfDay() {
        const h = new Date().getHours();
        if (h < 12) return 'Buenos días';
        if (h < 19) return 'Buenas tardes';
        return 'Buenas noches';
    }

    async function handleCreateProject() {
        if (!newName.trim()) return;
        setCreating(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setCreating(false); return; }
        const { data: projectData, error } = await supabase.from('projects').insert({
            user_id: user.id, name: newName.trim(),
            description: newDesc.trim() || null, metadata: {}
        }).select().single();
        if (!error && projectData) {
            await supabase.from('project_brains').insert({ project_id: projectData.id });
            await supabase.from('activity_logs').insert({ user_id: user.id, project_id: projectData.id, action: 'created' });
            setNewName(''); setNewDesc(''); setShowModal(false);
            await loadData(); await refreshProjects();
            await setActiveProject(projectData.id);
        }
        setCreating(false);
    }

    async function handleDeleteProject(e, projectId) {
        e.stopPropagation();
        setProjectToDelete(projectId);
        setShowDeleteConfirm(true);
    }

    async function confirmDeleteProject() {
        if (!projectToDelete) return;
        setDeletingId(projectToDelete);
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('projects').update({ is_deleted: true }).eq('id', projectToDelete).eq('user_id', user?.id || null);
        await supabase.from('activity_logs').insert({ user_id: user.id, project_id: projectToDelete, action: 'deleted' });
        setProjects(prev => prev.filter(p => p.id !== projectToDelete));
        setDeletingId(null); setProjectToDelete(null);
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
    const stepLabels = { 1: 'Cerebro IA', 2: 'Ideas', 3: 'Guiones', 4: 'Calendario' };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={28} style={{ color: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 28px 60px' }}>

            {/* ── HERO ─────────────────────────────────────────── */}
            {/* Banner: Cerebro IA no configurado */}
            {!brain?.biography && (
                <div style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: '16px', padding: '18px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '16px', flexWrap: 'wrap', marginBottom: '28px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                            background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Brain size={20} color="#a78bfa" strokeWidth={1.8} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                                Configura tu Cerebro IA
                            </p>
                            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                                8 minutos y tendras contenido completamente personalizado para tu marca
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => activeProject ? router.push(`/dashboard/session?project=${activeProject.id}`) : setShowModal(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: '#7c3aed', color: '#fff',
                            border: 'none', borderRadius: '10px',
                            padding: '11px 20px', fontSize: '0.82rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Sparkles size={15} strokeWidth={2} /> Empezar ahora <ArrowRight size={14} />
                    </button>
                </div>
            )}

            <div style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '10px' }}>
                    {getTimeOfDay()}, {getUserName()} ·{' '}
                    <span style={{ color: '#a78bfa' }}>{activeProject?.name || 'Sin proyecto activo'}</span>
                </p>
                <h1 style={{
                    fontSize: 'clamp(1.9rem, 3.5vw, 2.7rem)',
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: '#fff',
                    letterSpacing: '-0.03em',
                    marginBottom: '14px',
                    maxWidth: '700px',
                }}>
                    Tu centro de mando para el contenido de tu negocio
                </h1>
                <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.42)', maxWidth: '560px', lineHeight: 1.65, marginBottom: '28px' }}>
                    Organiza tus historias, guiones y planes mensuales desde un solo lugar. WRITI convierte tus ideas en un sistema.
                </p>

                {/* CTA dinamico segun estado */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {brain?.biography && stats.scripts > 0 ? (
                        /* Estado 3: cerebro + guiones → ir al calendario */
                        <>
                            <button
                                onClick={() => router.push('/dashboard/calendar')}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: '#7c3aed', color: '#fff',
                                    border: 'none', borderRadius: '12px',
                                    padding: '13px 24px', fontSize: '0.88rem', fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <Calendar size={16} strokeWidth={2} /> Ver tu calendario <ArrowRight size={15} />
                            </button>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={13} color="#34d399" />
                                {stats.scripts} guion{stats.scripts !== 1 ? 'es' : ''} listo{stats.scripts !== 1 ? 's' : ''}
                            </span>
                        </>
                    ) : brain?.biography && stats.scripts === 0 ? (
                        /* Estado 2: cerebro configurado pero sin guiones */
                        <>
                            <button
                                onClick={() => activeProject ? router.push(`/dashboard/session?project=${activeProject.id}`) : setShowModal(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: '#7c3aed', color: '#fff',
                                    border: 'none', borderRadius: '12px',
                                    padding: '13px 24px', fontSize: '0.88rem', fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <Sparkles size={16} strokeWidth={2} /> Genera tu primer guion <ArrowRight size={15} />
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/library')}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)',
                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                                    padding: '13px 24px', fontSize: '0.88rem', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            >
                                <FolderOpen size={16} strokeWidth={1.8} /> Ver biblioteca
                            </button>
                        </>
                    ) : (
                        /* Estado 1: sin cerebro → flujo Matrix */
                        <>
                            <button
                                onClick={() => activeProject ? router.push(`/dashboard/session?project=${activeProject.id}`) : setShowModal(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: '#7c3aed', color: '#fff',
                                    border: 'none', borderRadius: '12px',
                                    padding: '13px 24px', fontSize: '0.88rem', fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <Sparkles size={16} strokeWidth={2} /> Iniciar Sesion WRITI
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/home')}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)',
                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                                    padding: '13px 24px', fontSize: '0.88rem', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            >
                                <FileText size={16} strokeWidth={1.8} /> Crear guiones rapidos
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── ACTIVE SESSION BANNER ────────────────────────── */}
            {stats.activeSession && (
                <div
                    onClick={() => router.push(`/dashboard/session${activeProject ? `?project=${activeProject.id}` : ''}`)}
                    style={{
                        background: 'rgba(124,58,237,0.08)',
                        border: '1px solid rgba(124,58,237,0.25)',
                        borderRadius: '14px', padding: '14px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '12px', cursor: 'pointer', marginBottom: '32px',
                        transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.08)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#a78bfa',
                            boxShadow: '0 0 8px #a78bfa',
                            animation: 'pulse 2s ease-in-out infinite',
                        }} />
                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                            Sesión WRITI en progreso — Paso {stats.activeSession.current_step || 1}:{' '}
                            <span style={{ color: '#a78bfa' }}>
                                {stepLabels[stats.activeSession.current_step || 1]}
                            </span>
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 700 }}>
                        Continuar <ChevronRight size={14} />
                    </div>
                </div>
            )}

            {/* ── STATS ────────────────────────────────────────── */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px',
                marginBottom: '40px',
            }} className="stats-grid">
                <StatCard
                    icon={Clock}
                    label="Sesiones este mes"
                    value={stats.sessions}
                    color="#a78bfa"
                    sublabel="planificaciones"
                />
                <ScriptsStatCard value={stats.scripts} router={router} />
                <StatCard
                    icon={Clock}
                    label="Horas ahorradas"
                    value={stats.scripts > 0 ? `${Math.round(stats.scripts * 0.75)} hrs` : '0 hrs'}
                    color="#34d399"
                    sublabel={stats.scripts > 0 ? 'vs escribir manualmente' : 'empieza a generar'}
                />
                <StatCard
                    icon={Zap}
                    label="Créditos IA"
                    value={profile?.credits_balance ?? '—'}
                    color="#fbbf24"
                    sublabel={profile?.plan === 'pro' ? 'plan PRO activo' : 'plan actual'}
                />
            </div>

            {/* ── WIDGET APRENDIZAJE IA ────────────────────────── */}
            <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={18} color="#a78bfa" />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', margin: 0 }}>Tu Cerebro IA está aprendiendo</p>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Basado en tu feedback de guiones</p>
                    </div>
                </div>
                {learningSignals.length < 3 ? (
                    <div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', marginBottom: '10px' }}>
                            <div style={{ height: '100%', width: `${Math.min(learningSignals.length / 3 * 100, 100)}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                            Dale feedback a {3 - learningSignals.length} guion{3 - learningSignals.length !== 1 ? 'es' : ''} más para activar el aprendizaje automático
                        </p>
                        <a href="/dashboard/library" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', textDecoration: 'none' }}>
                            Ver Biblioteca →
                        </a>
                    </div>
                ) : (
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', fontWeight: 600 }}>Lo que mejor te funciona:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                            {learningSignals.filter(s => s.performance_score > 0).slice(0, 4).map(s => (
                                <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: s.signal_type === 'hook_style' ? '#a78bfa' : '#34d399', background: s.signal_type === 'hook_style' ? 'rgba(167,139,250,0.1)' : 'rgba(52,211,153,0.1)', border: `1px solid ${s.signal_type === 'hook_style' ? 'rgba(167,139,250,0.2)' : 'rgba(52,211,153,0.2)'}`, borderRadius: '20px', padding: '4px 12px' }}>
                                    {s.signal_type === 'hook_style' ? '⚡' : '🎭'} {s.signal_value}
                                </span>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                            Basado en {learningSignals.reduce((sum, s) => sum + (s.sample_count || 0), 0)} guiones evaluados
                        </p>
                    </div>
                )}
            </div>

            {/* ── ACTION CARDS ─────────────────────────────────── */}
            <div style={{ marginBottom: '14px' }}>
                <h2 style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                    ¿Qué quieres hacer hoy?
                </h2>
            </div>
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
                marginBottom: '40px',
            }} className="action-grid">
                <ActionCard
                    number={1}
                    icon={FileText}
                    title="Guiones rápidos de un tema"
                    desc="Genera guiones para Reels, Shorts o posts sobre un tema concreto en minutos."
                    btnLabel="Crear guiones"
                    accent="#a78bfa"
                    onClick={() => router.push('/dashboard')}
                />
                <ActionCard
                    number={2}
                    icon={Sparkles}
                    title="Nueva sesión Matrix"
                    desc={brain?.biography
                        ? "Tu Cerebro IA ya está listo ⚡ — saltas directo a generar nuevas ideas, guiones y fechas en minutos."
                        : "Define tu Cerebro IA una vez y genera ideas + guiones + calendario en 4 pasos."}
                    btnLabel={brain?.biography ? "⚡ Generar nuevas ideas" : "Iniciar Matrix"}
                    accent="#7c3aed"
                    ribbon={brain?.biography ? "Tu cerebro está activo" : "Recomendado"}
                    onClick={() => activeProject
                        ? router.push(`/dashboard/session?project=${activeProject.id}`)
                        : setShowModal(true)
                    }
                />
                <ActionCard
                    number={3}
                    icon={Mic}
                    title="Cuenta tu historia con tu voz"
                    desc="Graba una nota de voz contando una anécdota o aprendizaje. WRITI la transcribe y genera guiones a tu alrededor."
                    btnLabel="Grabar nota de voz"
                    accent="#34d399"
                    ribbon="Nuevo"
                    onClick={() => router.push('/dashboard/voice')}
                />
            </div>

            {/* ── BRAND / BRAIN CARD ───────────────────────────── */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                    Tu marca y Cerebro IA
                </h2>

                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '20px', padding: '28px',
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px',
                    alignItems: 'start',
                }} className="brain-card">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px',
                                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Brain size={22} color="#a78bfa" strokeWidth={1.8} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                                    {activeProject?.name || 'Sin proyecto activo'}
                                </h3>
                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                                    Cerebro IA · {brain?.biography ? 'configurado' : 'pendiente de configurar'}
                                </p>
                            </div>
                        </div>

                        {/* Barra de progreso del Cerebro IA */}
                        {(() => {
                            const fields = [
                                brain?.biography,
                                brain?.audience,
                                brain?.products_services,
                                brain?.style_words,
                                brain?.content_pillars,
                                brain?.faqs,
                            ];
                            const filled = fields.filter(f => {
                                if (!f) return false;
                                if (Array.isArray(f)) return f.length > 0;
                                if (typeof f === 'string') return f.trim().length > 0;
                                return true;
                            }).length;
                            const pct = Math.round((filled / 6) * 100);
                            const isComplete = pct === 100;

                            return (
                                <div style={{ marginBottom: '16px' }}>
                                    {isComplete ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <CheckCircle2 size={15} color="#34d399" />
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399' }}>
                                                Cerebro IA completo
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                                                Tu Cerebro IA esta al <span style={{ color: '#a78bfa', fontWeight: 700 }}>{pct}%</span>
                                            </span>
                                            <button
                                                onClick={() => activeProject ? router.push(`/dashboard/session?project=${activeProject.id}`) : setShowModal(true)}
                                                style={{
                                                    background: 'none', border: 'none',
                                                    color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700,
                                                    cursor: 'pointer', padding: 0,
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    textDecoration: 'underline', textDecorationStyle: 'dotted',
                                                    textUnderlineOffset: '3px',
                                                }}
                                            >
                                                completar <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <div style={{
                                        height: '5px', background: 'rgba(255,255,255,0.07)',
                                        borderRadius: '100px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            background: isComplete
                                                ? 'linear-gradient(90deg, #34d399, #6ee7b7)'
                                                : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                                            borderRadius: '100px',
                                            transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                    {!isComplete && (
                                        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                                            {filled} de 6 bloques completados
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {brain?.content_pillars || brain?.audience || brain?.style_words ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {brain.audience && (
                                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '100px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', fontWeight: 600 }}>
                                        {String(brain.audience).slice(0, 40)}
                                    </span>
                                )}
                                {brain.style_words && (
                                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '100px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontWeight: 600 }}>
                                        {String(brain.style_words).slice(0, 30)}
                                    </span>
                                )}
                                {brain.content_pillars && (
                                    <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '100px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontWeight: 600 }}>
                                        {Array.isArray(brain.content_pillars)
                                            ? `${brain.content_pillars.length} pilares`
                                            : 'Pilares activos'}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
                                Aun no has configurado tu Cerebro IA. Es el primer paso para que WRITI genere contenido en tu voz.
                            </p>
                        )}
                    </div>

                    <button
                        onClick={() => activeProject
                            ? router.push(`/dashboard/knowledge`)
                            : setShowModal(true)
                        }
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: 'transparent', color: '#a78bfa',
                            border: '1px solid rgba(124,58,237,0.35)',
                            borderRadius: '11px', padding: '10px 18px',
                            fontSize: '0.8rem', fontWeight: 700,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Ver / editar Cerebro IA <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* ── PROJECTS SECTION ─────────────────────────────── */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Tus proyectos ({projects.length})
                </h2>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'transparent', color: 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '9px', padding: '7px 14px',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                    <Plus size={13} strokeWidth={2.5} /> Nuevo proyecto
                </button>
            </div>

            {projects.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '48px 24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: '18px',
                }}>
                    <FolderOpen size={36} color="rgba(255,255,255,0.15)" style={{ marginBottom: '14px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', marginBottom: '20px' }}>
                        Crea tu primer proyecto para organizar tu contenido
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                            border: '1px solid rgba(124,58,237,0.25)', borderRadius: '11px',
                            padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem',
                        }}
                    >
                        <Plus size={16} /> Crear proyecto
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '14px',
                }}>
                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => router.push(`/dashboard/home/${project.id}`)}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${project.id === activeProjectId ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: '16px', padding: '20px',
                                cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.05)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {project.id === activeProjectId && (
                                <div style={{
                                    position: 'absolute', top: '14px', right: '14px',
                                    width: '7px', height: '7px', borderRadius: '50%',
                                    background: '#a78bfa', boxShadow: '0 0 6px #a78bfa',
                                }} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <FolderOpen size={17} color="#a78bfa" />
                                </div>
                                <button
                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                    style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#444'}
                                >
                                    {deletingId === project.id ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={14} />}
                                </button>
                            </div>
                            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{project.name}</h3>
                            {project.description && (
                                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {project.description}
                                </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={11} /> {formatDate(project.created_at)}
                                </span>
                                <ArrowRight size={14} color="rgba(167,139,250,0.5)" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── NEW PROJECT MODAL ────────────────────────────── */}
            {showModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '20px' }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{ background: '#161620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '460px', position: 'relative' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={16} />
                        </button>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px', color: '#fff' }}>Nuevo proyecto</h2>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginBottom: '28px' }}>Cada proyecto tiene su propio Cerebro IA y contenido</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                                placeholder="Nombre del proyecto (ej: Mi marca personal)"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%' }}
                                autoFocus
                            />
                            <textarea
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Descripción opcional (nicho, objetivo…)"
                                rows={3}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%' }}
                            />
                        </div>

                        <button
                            onClick={handleCreateProject}
                            disabled={!newName.trim() || creating}
                            style={{
                                width: '100%', padding: '14px', background: newName.trim() ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                                color: newName.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem',
                                cursor: newName.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {creating ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Creando…</> : <><Plus size={16} /> Crear proyecto</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── CONFIRM DELETE ───────────────────────────────── */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="¿Eliminar proyecto?"
                message="Esta acción no se puede deshacer. Se eliminará el proyecto y todo su contenido."
                confirmLabel="Eliminar"
                onConfirm={() => { confirmDeleteProject(); setShowDeleteConfirm(false); }}
                onCancel={() => { setShowDeleteConfirm(false); setProjectToDelete(null); }}
            />

            {/* ── RESPONSIVE + ANIMATIONS ─────────────────────── */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                @media (max-width: 768px) {
                    .stats-grid  { grid-template-columns: repeat(2, 1fr) !important; }
                    .action-grid { grid-template-columns: 1fr !important; }
                    .brain-card  { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 480px) {
                    .stats-grid  { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 1024px) {
                    .stats-grid  { grid-template-columns: repeat(2, 1fr) !important; }
                    .action-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </div>
    );
}

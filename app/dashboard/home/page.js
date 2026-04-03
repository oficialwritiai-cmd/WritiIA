'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Plus, FolderOpen, Calendar, X, Loader2, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { useProject } from '@/app/components/ProjectContext';
import ConfirmDialog from '@/app/components/ConfirmDialog';

export default function DashboardHomePage() {
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const supabase = createSupabaseClient();
    const router = useRouter();
    const { refreshProjects, setActiveProject } = useProject();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setShowModal(true);
        }
    }, [searchParams]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: profileData } = await supabase
            .from('users_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        setProfile(profileData);

        const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .or('is_deleted.eq.false,is_deleted.is.null')
            .order('created_at', { ascending: false });
        setProjects(projectsData || []);
        setLoading(false);
    }

    function getUserName() {
        if (!profile) return '';
        if (profile.full_name) return profile.full_name.split(' ')[0];
        if (profile.name) return profile.name.split(' ')[0];
        if (profile.email) return profile.email.split('@')[0];
        return 'Creador';
    }

    async function handleCreateProject() {
        if (!newName.trim()) return;
        setCreating(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setCreating(false); return; }

        const { data: projectData, error } = await supabase.from('projects').insert({
            user_id: user.id,
            name: newName.trim(),
            description: newDesc.trim() || null,
            metadata: {}
        }).select().single();

        if (!error && projectData) {
            // Auto-create empty project brain
            await supabase.from('project_brains').insert({
                project_id: projectData.id
            });
            // Audit Log
            await supabase.from('activity_logs').insert({
                user_id: user.id,
                project_id: projectData.id,
                action: 'created'
            });
            setNewName('');
            setNewDesc('');
            setShowModal(false);
            await loadData();
            await refreshProjects();
            // Auto-select the new project
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
        setDeletingId(null);
        setProjectToDelete(null);
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={32} className="spin" style={{ color: '#7ECECA' }} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
            {/* HERO WELCOME BLOCK */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(126,206,202,0.08) 0%, rgba(126,206,202,0.02) 100%)',
                border: '1px solid rgba(126,206,202,0.15)',
                borderRadius: '32px',
                padding: '48px 40px',
                marginBottom: '48px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative gradient orb */}
                <div style={{
                    position: 'absolute', top: '-60px', right: '-60px',
                    width: '200px', height: '200px',
                    background: 'radial-gradient(circle, rgba(126,206,202,0.15) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-40px', left: '20%',
                    width: '160px', height: '160px',
                    background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none'
                }} />

                <h1 style={{
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    fontWeight: 900,
                    marginBottom: '12px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #7ECECA 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    position: 'relative',
                }}>
                    Hola, {getUserName()} 👋
                </h1>
                <p style={{
                    color: '#999',
                    fontSize: '1.05rem',
                    lineHeight: 1.6,
                    maxWidth: '600px',
                    marginBottom: '32px',
                    position: 'relative',
                }}>
                    Tu suite creativa está lista. Genera ideas, guiones y calendarios de contenido en segundos.
                </p>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        background: 'var(--accent-gradient)',
                        color: 'black', border: 'none', borderRadius: '16px',
                        padding: '16px 32px', fontSize: '1rem', fontWeight: 900,
                        cursor: 'pointer', position: 'relative',
                        boxShadow: '0 4px 20px rgba(126,206,202,0.3)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 30px rgba(126,206,202,0.4)'; }}
                    onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(126,206,202,0.3)'; }}
                >
                    <Plus size={20} strokeWidth={3} /> Nuevo Proyecto
                </button>
            </div>

            {/* PROJECTS SECTION */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FolderOpen size={24} color="#7ECECA" /> Tus Proyectos
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</span>
            </div>

            {projects.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '24px',
                }}>
                    <Sparkles size={40} color="#7ECECA" style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ color: '#888', fontSize: '1rem', marginBottom: '8px', fontWeight: 600 }}>
                        Aún no tienes proyectos
                    </p>
                    <p style={{ color: '#555', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 24px' }}>
                        Crea tu primer proyecto para organizar tus ideas y guiones.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(126,206,202,0.1)', color: '#7ECECA',
                            border: '1px solid rgba(126,206,202,0.2)', borderRadius: '12px',
                            padding: '12px 24px', fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        <Plus size={18} /> Crear primer proyecto
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px',
                }}>
                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => router.push(`/dashboard/home/${project.id}`)}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '20px',
                                padding: '24px',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                position: 'relative',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.border = '1px solid rgba(126,206,202,0.25)';
                                e.currentTarget.style.background = 'rgba(126,206,202,0.04)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: 'rgba(126,206,202,0.1)',
                                    borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <FolderOpen size={20} color="#7ECECA" />
                                </div>
                                <button
                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                    style={{
                                        background: 'none', border: 'none', color: '#444',
                                        cursor: 'pointer', padding: '4px', borderRadius: '6px',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={e => e.target.style.color = '#FF4D4D'}
                                    onMouseLeave={e => e.target.style.color = '#444'}
                                >
                                    {deletingId === project.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                </button>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px', color: '#fff' }}>
                                {project.name}
                            </h3>
                            {project.description && (
                                <p style={{
                                    color: '#777', fontSize: '0.85rem', lineHeight: 1.5,
                                    marginBottom: '16px',
                                    display: '-webkit-box', WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                    {project.description}
                                </p>
                            )}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginTop: 'auto', paddingTop: '12px',
                                borderTop: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '0.75rem' }}>
                                    <Calendar size={12} /> {formatDate(project.created_at)}
                                </span>
                                <ArrowRight size={16} color="#7ECECA" style={{ opacity: 0.5 }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* NEW PROJECT MODAL */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000, backdropFilter: 'blur(8px)', padding: '20px',
                }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '28px', maxWidth: '460px', width: '100%',
                            padding: '40px', position: 'relative',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px' }}>
                            Nuevo Proyecto ✨
                        </h2>
                        <p style={{ color: '#777', fontSize: '0.85rem', marginBottom: '28px' }}>
                            Organiza tus ideas, guiones y contenidos bajo un mismo proyecto.
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>
                                Nombre del proyecto *
                            </label>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ej: Lanzamiento Curso Online"
                                autoFocus
                                style={{
                                    width: '100%', padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '14px', color: 'white',
                                    fontSize: '0.95rem', outline: 'none',
                                    transition: 'border 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>
                                Descripción breve (opcional)
                            </label>
                            <textarea
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="¿De qué trata este proyecto?"
                                rows={3}
                                style={{
                                    width: '100%', padding: '14px 16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '14px', color: 'white',
                                    fontSize: '0.9rem', outline: 'none', resize: 'vertical',
                                    transition: 'border 0.2s', fontFamily: 'inherit',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <button
                            onClick={handleCreateProject}
                            disabled={creating || !newName.trim()}
                            style={{
                                width: '100%', padding: '16px',
                                background: newName.trim() ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                                color: newName.trim() ? 'black' : '#555',
                                border: 'none', borderRadius: '16px',
                                fontWeight: 900, fontSize: '1rem', cursor: newName.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {creating ? <Loader2 size={20} className="spin" /> : <Plus size={20} />}
                            {creating ? 'Creando...' : 'Crear proyecto'}
                        </button>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="¿Eliminar proyecto?"
                message="Esta acción eliminará el proyecto y todos sus datos. No se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                isDangerous={true}
                onConfirm={confirmDeleteProject}
            />

            <style jsx>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

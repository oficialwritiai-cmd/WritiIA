'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2, Loader2, FolderOpen, Calendar, CheckCircle2 } from 'lucide-react';

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const supabase = createSupabaseClient();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadProject();
    }, [id]);

    async function loadProject() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (data) {
            setProject(data);
            setName(data.name);
            setDescription(data.description || '');
        }
        setLoading(false);
    }

    async function handleSave() {
        if (!name.trim()) return;
        setSaving(true);
        const { error } = await supabase
            .from('projects')
            .update({
                name: name.trim(),
                description: description.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (!error) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            setProject(prev => ({ ...prev, name: name.trim(), description: description.trim() || null }));
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!confirm('¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.')) return;
        await supabase.from('projects').delete().eq('id', id);
        router.push('/dashboard/home');
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={32} className="spin" style={{ color: '#7ECECA' }} />
            </div>
        );
    }

    if (!project) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <FolderOpen size={48} color="#444" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontWeight: 800, marginBottom: '8px' }}>Proyecto no encontrado</h2>
                <p style={{ color: '#666', marginBottom: '24px' }}>Este proyecto no existe o no tienes acceso.</p>
                <button
                    onClick={() => router.push('/dashboard/home')}
                    style={{
                        background: 'rgba(126,206,202,0.1)', color: '#7ECECA',
                        border: '1px solid rgba(126,206,202,0.2)', borderRadius: '12px',
                        padding: '12px 24px', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    Volver a Inicio
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
            {/* BACK BUTTON */}
            <button
                onClick={() => router.push('/dashboard/home')}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'none', border: 'none', color: '#888',
                    cursor: 'pointer', marginBottom: '32px', fontSize: '0.9rem',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#7ECECA'}
                onMouseLeave={e => e.currentTarget.style.color = '#888'}
            >
                <ArrowLeft size={18} /> Volver a proyectos
            </button>

            {/* PROJECT HEADER */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '24px',
                padding: '36px',
                marginBottom: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                    <div style={{
                        width: '52px', height: '52px',
                        background: 'rgba(126,206,202,0.1)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <FolderOpen size={24} color="#7ECECA" />
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>PROYECTO</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#555', fontSize: '0.8rem', marginTop: '2px' }}>
                            <Calendar size={12} /> Creado el {formatDate(project.created_at)}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>
                        Nombre del proyecto
                    </label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px', color: 'white',
                            fontSize: '1.1rem', fontWeight: 700, outline: 'none',
                            transition: 'border 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                </div>

                <div style={{ marginBottom: '28px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 600 }}>
                        Descripción
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Añade una descripción para este proyecto..."
                        rows={4}
                        style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px', color: 'white',
                            fontSize: '0.95rem', outline: 'none', resize: 'vertical',
                            transition: 'border 0.2s', fontFamily: 'inherit', lineHeight: 1.6,
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        style={{
                            flex: 2, padding: '14px 24px',
                            background: saved ? 'rgba(34,197,94,0.15)' : 'var(--accent-gradient)',
                            color: saved ? '#22c55e' : 'black',
                            border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
                            borderRadius: '14px',
                            fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            transition: 'all 0.3s',
                        }}
                    >
                        {saving ? <Loader2 size={18} className="spin" /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{
                            flex: 1, padding: '14px 24px',
                            background: 'rgba(255,77,77,0.08)',
                            color: '#FF4D4D',
                            border: '1px solid rgba(255,77,77,0.15)',
                            borderRadius: '14px',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        <Trash2 size={16} /> Eliminar
                    </button>
                </div>
            </div>

            <style jsx>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

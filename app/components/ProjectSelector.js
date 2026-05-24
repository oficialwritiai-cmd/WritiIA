'use client';

import { useState } from 'react';
import { useProject } from '@/app/components/ProjectContext';
import { FolderOpen, ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function ProjectSelector({ mobile = false }) {
    const { projects, activeProject, setActiveProject } = useProject();
    const [selectorOpen, setSelectorOpen] = useState(false);
    const router   = useRouter();
    const pathname = usePathname();

    const handleSelectProject = (projectId) => {
        setSelectorOpen(false);
        if (pathname?.startsWith('/dashboard/session')) {
            // Update localStorage BEFORE reload so ProjectContext picks up the new project
            localStorage.setItem('writi_active_project', projectId);
            window.location.href = `/dashboard/session?project=${projectId}`;
            return;
        }
        setActiveProject(projectId);
    };

    // If projects are loading or empty, we still want to show something on mobile
    const hasProjects = Array.isArray(projects) && projects.length > 0;

    if (mobile) {
        return (
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', marginBottom: '10px' }}
            >
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    paddingLeft: '4px'
                }}>
                    Proyecto Actual
                </div>
                
                {hasProjects ? (
                    <>
                        <button
                            onClick={() => setSelectorOpen(!selectorOpen)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                width: '100%',
                                background: 'rgba(126,206,202,0.1)',
                                border: '1px solid rgba(126,206,202,0.2)',
                                borderRadius: '12px', padding: '12px 16px',
                                color: '#7ECECA', cursor: 'pointer', fontSize: '0.9rem',
                                fontWeight: 700, transition: '0.2s',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                <FolderOpen size={18} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activeProject?.name || 'Selecciona un proyecto'}
                                </span>
                            </div>
                            <ChevronDown size={18} style={{ transform: selectorOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>

                        {selectorOpen && (
                            <div style={{
                                marginTop: '8px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '12px',
                                padding: '4px',
                                border: '1px solid rgba(126,206,202,0.1)',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {projects.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelectProject(p.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            width: '100%', padding: '12px',
                                            background: activeProject && p.id === activeProject.id ? 'rgba(126,206,202,0.15)' : 'transparent',
                                            border: 'none', color: activeProject && p.id === activeProject.id ? '#7ECECA' : '#aaa',
                                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                            textAlign: 'left', borderRadius: '8px'
                                        }}
                                    >
                                        <FolderOpen size={14} color={activeProject && p.id === activeProject.id ? '#7ECECA' : '#444'} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                    </button>
                                ))}
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                                <button
                                    onClick={() => window.location.href = '/dashboard/home?create=true'}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '12px', color: '#7ECECA', background: 'none', border: 'none',
                                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, textAlign: 'left'
                                    }}
                                >
                                    ➕ Crear nuevo proyecto
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <button
                        onClick={() => window.location.href = '/dashboard/home?create=true'}
                        style={{
                            width: '100%', padding: '12px', background: 'var(--accent-gradient)',
                            border: 'none', color: 'black', borderRadius: '12px',
                            fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >
                        ➕ Crear Primer Proyecto
                    </button>
                )}
            </div>
        );
    }

    // Default Desktop View
    if (!hasProjects) {
        return (
            <button
                onClick={() => window.location.href = '/dashboard/home?create=true'}
                style={{
                    padding: '8px 16px', background: 'var(--accent-gradient)',
                    border: 'none', color: 'black', borderRadius: '100px',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                }}
            >
                ➕ Crear Proyecto
            </button>
        );
    }

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
        >
            <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(126,206,202,0.08)',
                    border: '1px solid rgba(126,206,202,0.15)',
                    borderRadius: '12px', padding: '6px 14px',
                    color: '#7ECECA', cursor: 'pointer', fontSize: '0.8rem',
                    fontWeight: 700, whiteSpace: 'nowrap', transition: '0.2s',
                }}
            >
                <FolderOpen size={14} />
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProject?.name || 'Selecciona...'}</span>
                <ChevronDown size={14} style={{ transform: selectorOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </button>
            {selectorOpen && (
                <div style={{
                    position: 'absolute', top: '115%', left: 0, minWidth: '220px',
                    background: 'rgba(15, 15, 15, 0.98)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
                    zIndex: 1000, overflow: 'hidden', padding: '6px'
                }}>
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleSelectProject(p.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                width: '100%', padding: '10px 12px',
                                background: activeProject && p.id === activeProject.id ? 'rgba(126, 206, 202, 0.12)' : 'transparent',
                                border: 'none', color: activeProject && p.id === activeProject.id ? '#7ECECA' : '#eee',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                textAlign: 'left', transition: '0.15s',
                                borderRadius: '100px', marginBottom: '2px'
                            }}
                            onMouseEnter={e => { if (!activeProject || p.id !== activeProject.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={e => { if (!activeProject || p.id !== activeProject.id) e.currentTarget.style.background = 'transparent' }}
                        >
                            <FolderOpen size={14} color={activeProject && p.id === activeProject.id ? '#7ECECA' : '#666'} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </button>
                    ))}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                    <button
                        onClick={() => window.location.href = '/dashboard/home?create=true'}
                        style={{
                            width: '95%', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 12px', color: '#7ECECA', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800
                        }}
                    >
                        ➕ Crear nuevo proyecto
                    </button>
                </div>
            )}
        </div>
    );
}

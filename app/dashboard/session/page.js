'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SessionProvider } from '@/app/components/SessionContext';
import SessionLayout from './SessionLayout';
import { useProject } from '@/app/components/ProjectContext';
import { Loader2 } from 'lucide-react';

function SessionContent() {
    const params    = useSearchParams();
    const router    = useRouter();
    const { activeProject } = useProject();

    const urlProjectId = params.get('project');
    // Context takes priority — selectProject() updates state synchronously now
    const projectId    = activeProject?.id || urlProjectId;

    // Keep URL in sync with active project
    useEffect(() => {
        if (activeProject?.id && activeProject.id !== urlProjectId) {
            router.replace(`/dashboard/session?project=${activeProject.id}`);
        }
    }, [activeProject?.id]);

    if (!projectId) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🗂️</div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
                    Ningún proyecto seleccionado
                </p>
                <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '28px' }}>
                    Vuelve al dashboard, elige un proyecto y pulsa "Empezar sesión de planificación".
                </p>
                <a href="/dashboard/home" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(126,206,202,0.1)', color: '#7ECECA',
                    border: '1px solid rgba(126,206,202,0.2)', borderRadius: '12px',
                    padding: '12px 24px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem',
                }}>
                    ← Ir al dashboard
                </a>
            </div>
        );
    }

    return (
        <>
            {/* DEBUG — borrar después de confirmar el fix */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                background: '#1a0a2e', borderBottom: '2px solid #9D00FF',
                padding: '4px 12px', fontSize: '11px', color: '#c084fc',
                fontFamily: 'monospace', display: 'flex', gap: '16px',
            }}>
                <span>URL: <b>{urlProjectId || 'null'}</b></span>
                <span>CTX: <b>{activeProject?.id || 'null'}</b></span>
                <span>KEY: <b>{projectId}</b></span>
            </div>
            <div style={{ paddingTop: '24px' }}>
                <SessionProvider key={projectId} projectId={projectId}>
                    <SessionLayout />
                </SessionProvider>
            </div>
        </>
    );
}

export default function SessionPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={32} style={{ color: '#7ECECA', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <SessionContent />
        </Suspense>
    );
}

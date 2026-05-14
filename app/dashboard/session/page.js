'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SessionProvider } from '@/app/components/SessionContext';
import SessionLayout from './SessionLayout';
import { useProject } from '@/app/components/ProjectContext';
import { Loader2 } from 'lucide-react';

function SessionContent() {
    const params    = useSearchParams();
    const { activeProjectId } = useProject();

    // Priority: ?project= query param → ProjectContext active project
    const projectId = params.get('project') || activeProjectId;

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
        <SessionProvider projectId={projectId}>
            <SessionLayout />
        </SessionProvider>
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

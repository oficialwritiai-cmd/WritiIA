'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function RecuperacionPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/user-recovery');
            if (!res.ok) throw new Error('No autenticado');
            const result = await res.json();
            setData(result);
            setError('');
        } catch (err) {
            setError('Error al cargar datos: ' + err.message);
            setTimeout(() => router.push('/dashboard'), 2000);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>;
    if (error) return <div style={{ padding: 40, color: '#ff4d4d' }}>{error}</div>;
    if (!data) return null;

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '30px', fontSize: '2rem', fontWeight: 900 }}>
                🔍 Centro de Recuperación de Datos
            </h1>

            {/* Eventos de Junio */}
            <div style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', fontWeight: 700 }}>
                    📅 Eventos del Calendario (Junio 2025)
                </h2>
                {data.calendarEventsJune?.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {data.calendarEventsJune.map((ev) => (
                            <div key={ev.id} style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px', padding: '16px' }}>
                                <div style={{ fontWeight: 700, marginBottom: '8px' }}>{ev.title}</div>
                                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px' }}>
                                    📅 {ev.event_date} | 🏷️ {ev.platform || 'General'}
                                </div>
                                {ev.content && (
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', maxHeight: '200px', overflow: 'auto', marginBottom: '8px' }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {typeof ev.content === 'string' ? ev.content : JSON.stringify(ev.content, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(ev.content || JSON.stringify(ev));
                                        alert('✓ Copiado al portapapeles');
                                    }}
                                    style={{ padding: '8px 16px', background: '#7C3AED', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                                >
                                    📋 Copiar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#999' }}>No hay eventos en junio</p>
                )}
            </div>

            {/* Scripts en Library */}
            <div style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '1.3rem', fontWeight: 700 }}>
                    📝 Guiones Guardados (Library)
                </h2>
                {data.libraryScripts?.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {data.libraryScripts.map((script) => (
                            <div key={script.id} style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '16px' }}>
                                <div style={{ fontWeight: 700, marginBottom: '8px' }}>{script.title}</div>
                                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px' }}>
                                    ⏰ {new Date(script.created_at).toLocaleDateString()}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(script.content || '');
                                        alert('✓ Contenido copiado');
                                    }}
                                    style={{ padding: '8px 16px', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                                >
                                    📋 Copiar Contenido
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#999' }}>No hay scripts en library</p>
                )}
            </div>

            <button
                onClick={() => router.push('/dashboard')}
                style={{ padding: '12px 24px', background: '#7C3AED', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
            >
                ← Volver al Dashboard
            </button>
        </div>
    );
}

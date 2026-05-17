'use client';
import { useState, useEffect } from 'react';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadLogs(); }, []);
  useEffect(() => {
    const interval = setInterval(loadLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadLogs() {
    try {
      const res = await fetch('/api/logs');
      const { logs } = await res.json();
      setLogs(logs || []);
    } catch (e) {}
    finally { setLoading(false); }
  }

  const filtered = logs.filter(l =>
    !filter ||
    l.action?.includes(filter) ||
    l.error_message?.includes(filter) ||
    l.user_id?.includes(filter)
  );

  return (
    <div style={{ background: '#0c0c0e', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Logs del sistema</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Actualiza cada 15s &middot; {filtered.length} entradas
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filtrar por accion, error, user_id..."
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
                padding: '8px 14px',
                fontSize: '0.82rem',
                outline: 'none',
                width: 260,
              }}
            />
            <button
              onClick={loadLogs}
              style={{
                background: '#7c3aed',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                padding: '8px 16px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.82rem',
              }}
            >
              Actualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: 60 }}>Cargando logs...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((log, i) => (
              <div
                key={log.id || i}
                style={{
                  background: log.error_message ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${log.error_message ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                  display: 'grid',
                  gridTemplateColumns: '160px 200px 1fr',
                  gap: 12,
                  alignItems: 'start',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                  {new Date(log.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: log.error_message ? '#f87171' : '#a78bfa',
                  background: log.error_message ? 'rgba(248,113,113,0.1)' : 'rgba(167,139,250,0.08)',
                  padding: '2px 8px',
                  borderRadius: 5,
                }}>
                  {log.action}
                </span>
                <div>
                  {log.error_message && (
                    <p style={{ color: '#f87171', fontSize: '0.78rem', margin: '0 0 4px', fontWeight: 600 }}>
                      {log.error_message}
                    </p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                  {log.user_id && (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem', margin: '4px 0 0', fontFamily: 'monospace' }}>
                      user: {log.user_id}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#555', padding: 40 }}>
                Sin logs {filter ? 'con ese filtro' : 'aun'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

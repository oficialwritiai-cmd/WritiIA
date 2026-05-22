'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

/**
 * useState con persistencia en sessionStorage.
 * Sobrevive: cambio de pestaña, minimizar, bloqueo de pantalla, navegación entre rutas.
 * Se borra: cuando el usuario cierra el tab (sessionStorage) o llama a clearState().
 *
 * @param {string} key   - Clave única (ej: 'matrix_topic_f16c333c')
 * @param {*} defaultValue
 * @returns [state, setState, clearState, hasRestored]
 */
export function usePersistedState(key, defaultValue) {
    const [hasRestored, setHasRestored] = useState(false);

    const [state, setState] = useState(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return defaultValue;
            const parsed = JSON.parse(raw);
            if (Date.now() - (parsed.ts || 0) > TTL_MS) {
                sessionStorage.removeItem(key);
                return defaultValue;
            }
            return parsed.v;
        } catch {
            return defaultValue;
        }
    });

    // Guarda en sessionStorage en cada cambio
    const isFirst = useRef(true);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            sessionStorage.setItem(key, JSON.stringify({ v: state, ts: Date.now() }));
            if (isFirst.current) {
                isFirst.current = false;
                // Detecta si hay valor guardado distinto del default
                const raw = sessionStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const hasData = JSON.stringify(parsed.v) !== JSON.stringify(defaultValue);
                    if (hasData) setHasRestored(true);
                }
            }
        } catch {}
    }, [key, state]);

    const clearState = useCallback(() => {
        try { sessionStorage.removeItem(key); } catch {}
        setState(defaultValue);
        setHasRestored(false);
    }, [key, defaultValue]);

    return [state, setState, clearState, hasRestored];
}

/**
 * Comprueba si hay estado guardado para una clave (sin restaurarlo).
 * Útil para mostrar el banner de restauración.
 */
export function hasSavedState(key) {
    if (typeof window === 'undefined') return false;
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Date.now() - (parsed.ts || 0) < TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Banner de restauración.
 * Muestra slide-down cuando hay estado guardado.
 * El usuario elige restaurar o empezar de nuevo.
 */
export function RestoreBanner({ onRestore, onDiscard, message = 'Tienes trabajo guardado' }) {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9990,
            background: 'rgba(12,12,20,0.97)', borderBottom: '1px solid rgba(124,58,237,0.3)',
            padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'restoreSlide 0.3s ease-out', gap: '16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
            <style>{`@keyframes restoreSlide { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>💾</span>
                <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{message}</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Continúa donde lo dejaste</p>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => { onDiscard(); setVisible(false); }}
                    style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                    Empezar de nuevo
                </button>
                <button onClick={() => { onRestore(); setVisible(false); }}
                    style={{ padding: '7px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>
                    ✓ Restaurar
                </button>
            </div>
        </div>
    );
}

/**
 * Indicador de autoguardado — aparece brevemente al guardar.
 */
export function AutosaveIndicator({ saving }) {
    if (!saving) return null;
    return (
        <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
            ✓ Guardado automáticamente
        </span>
    );
}

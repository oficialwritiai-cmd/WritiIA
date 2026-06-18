'use client';
import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

// ── State shape ──────────────────────────────────────────────────────────────
const initialState = {
    sessionId: null,
    projectId: null,
    currentStep: 1,
    status: 'idle',       // idle | active | completed
    loading: true,
    saving: false,
    error: null,

    // Step 1
    brain: null,
    contentPillars: [],
    sessionFAQs: [],
    timeHorizon: '1month',
    brainSaved: false,

    // Step 2
    generatedIdeas: [],
    selectedSlotIds: [],

    // Step 3
    scripts: [],

    // Step 4
    calendarEvents: [],

    // Sesion activa pero vieja (>48h) — el usuario decide si continuar o empezar de nuevo
    staleSession: null,
};

// ── Reducer ──────────────────────────────────────────────────────────────────
function sessionReducer(state, action) {
    switch (action.type) {
        case 'INIT':
            return { ...state, ...action.payload, loading: false };
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'SET_BRAIN':
            return { ...state, brain: action.payload, brainSaved: true };
        case 'SET_PILLARS':
            return { ...state, contentPillars: action.payload };
        case 'SET_FAQS':
            return { ...state, sessionFAQs: action.payload };
        case 'SET_TIME_HORIZON':
            return { ...state, timeHorizon: action.payload };
        case 'SET_IDEAS':
            return { ...state, generatedIdeas: action.payload };
        case 'TOGGLE_SLOT': {
            const ids = state.selectedSlotIds;
            const next = ids.includes(action.payload)
                ? ids.filter(id => id !== action.payload)
                : [...ids, action.payload];
            return { ...state, selectedSlotIds: next };
        }
        case 'SET_SELECTED_SLOTS':
            return { ...state, selectedSlotIds: action.payload };
        case 'ADD_SCRIPT':
            return { ...state, scripts: [...state.scripts, action.payload] };
        case 'UPDATE_SCRIPT':
            return {
                ...state,
                scripts: state.scripts.map(s =>
                    s.id === action.payload.id ? { ...s, ...action.payload.changes } : s
                ),
            };
        case 'SET_SCRIPTS':
            return { ...state, scripts: action.payload };
        case 'SET_CALENDAR':
            return { ...state, calendarEvents: action.payload };
        case 'SET_SAVING':
            return { ...state, saving: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'COMPLETE':
            return { ...state, status: 'completed' };
        default:
            return state;
    }
}

// ── Context ──────────────────────────────────────────────────────────────────
const SessionContext = createContext(null);

const STALE_SESSION_MS = 48 * 60 * 60 * 1000; // 48 horas

export function SessionProvider({ projectId, children }) {
    const [state, dispatch] = useReducer(sessionReducer, { ...initialState, projectId });
    const supabase = createSupabaseClient();
    const saveTimer = useRef(null);

    // Carga los datos de una sesion existente y los mete en el estado.
    // Compartido entre el auto-resume normal y "Continuar sesion anterior".
    const loadSessionData = useCallback(async (session) => {
        const [brainRes, slotsRes, scriptsRes] = await Promise.all([
            supabase.from('project_brains').select('*').eq('project_id', session.project_id).single(),
            session.selected_slot_ids?.length
                ? supabase.from('content_slots').select('*').in('id', session.selected_slot_ids)
                : Promise.resolve({ data: [] }),
            session.script_ids?.length
                ? supabase.from('scripts').select('*').in('id', session.script_ids)
                : Promise.resolve({ data: [] }),
        ]);

        dispatch({
            type: 'INIT',
            payload: {
                sessionId: session.id,
                currentStep: session.current_step || 1,
                status: 'active',
                brain: brainRes.data || null,
                contentPillars: session.content_pillars || [],
                sessionFAQs: session.session_faqs || [],
                timeHorizon: session.time_horizon || '1month',
                brainSaved: !!brainRes.data,
                generatedIdeas: slotsRes.data || [],
                selectedSlotIds: session.selected_slot_ids || [],
                scripts: scriptsRes.data || [],
                staleSession: null,
            },
        });
    }, [supabase]);

    // ── Initial load: resume active session or create new ──────────────────
    useEffect(() => {
        if (!projectId) {
            dispatch({ type: 'INIT', payload: { loading: false } });
            return;
        }

        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    dispatch({ type: 'INIT', payload: { loading: false } });
                    return;
                }

                const { data: session } = await supabase
                    .from('sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('project_id', projectId)
                    .eq('status', 'active')
                    .single();

                if (session) {
                    // Sesion activa pero vieja y a medias — que el usuario decida
                    const ageMs = Date.now() - new Date(session.updated_at || session.created_at).getTime();
                    const isStale = ageMs > STALE_SESSION_MS && (session.current_step || 1) > 1;

                    if (isStale) {
                        dispatch({ type: 'INIT', payload: { loading: false, staleSession: session } });
                        return;
                    }

                    await loadSessionData(session);
                } else {
                    // New session
                    const { data: newSession, error: insertErr } = await supabase
                        .from('sessions')
                        .insert({ user_id: user.id, project_id: projectId })
                        .select()
                        .single();

                    if (insertErr) throw insertErr;

                    const { data: brain } = await supabase
                        .from('project_brains')
                        .select('*')
                        .eq('project_id', projectId)
                        .single();

                    dispatch({
                        type: 'INIT',
                        payload: {
                            sessionId: newSession.id,
                            status: 'active',
                            brain: brain || null,
                            brainSaved: !!brain,
                        },
                    });
                }
            } catch (err) {
                console.error('[SessionContext] Init error:', err);
                dispatch({ type: 'INIT', payload: { loading: false, error: err.message } });
            }
        })();
    }, [projectId]);

    // ── "Continuar sesion anterior" desde el prompt de sesion vieja ────────
    const resumeStaleSession = useCallback(async () => {
        if (!state.staleSession) return;
        await loadSessionData(state.staleSession);
    }, [state.staleSession, loadSessionData]);

    // ── Limpia sessionStorage de Matrix para un projectId/sesion dados ─────
    function clearMatrixSessionStorage(pid, slotIds = []) {
        try {
            sessionStorage.removeItem(`cerebro_fields_${pid || 'global'}`);
            (slotIds || []).forEach(id => sessionStorage.removeItem(`writi_s3_${pid}_${id}`));
        } catch {}
    }

    // ── Abandona la sesion actual (o una explicita) y empieza una limpia ───
    // Usado por "Nueva sesion" desde Paso 3 y por "Empezar sesion nueva" del
    // prompt de sesion vieja. Los guiones ya generados quedan intactos en
    // Biblioteca/content_slots — solo se marca la fila de `sessions` como
    // abandonada para que deje de auto-resumirse.
    const restartSession = useCallback(async (explicitSession = null) => {
        const target = explicitSession || (state.sessionId ? { id: state.sessionId, project_id: projectId, selected_slot_ids: state.selectedSlotIds } : null);
        try {
            if (target?.id) {
                await supabase.from('sessions').update({ status: 'abandoned' }).eq('id', target.id);
            }
            clearMatrixSessionStorage(target?.project_id || projectId, target?.selected_slot_ids || state.selectedSlotIds);
        } catch (err) {
            console.error('[SessionContext] restartSession error:', err);
        } finally {
            // Recarga completa para que el efecto de init cree una sesion nueva desde cero
            window.location.href = window.location.pathname + window.location.search;
        }
    }, [state.sessionId, state.selectedSlotIds, projectId, supabase]);

    // ── Persist current state to Supabase ────────────────────────────────
    const persistStep = useCallback(async (extra = {}) => {
        if (!state.sessionId) return;
        dispatch({ type: 'SET_SAVING', payload: true });
        try {
            await supabase.from('sessions').update({
                current_step: state.currentStep,
                content_pillars: state.contentPillars,
                session_faqs: state.sessionFAQs,
                time_horizon: state.timeHorizon,
                selected_slot_ids: state.selectedSlotIds,
                script_ids: state.scripts.map(s => s.id).filter(Boolean),
                updated_at: new Date().toISOString(),
                ...extra,
            }).eq('id', state.sessionId);
        } catch (err) {
            console.error('[SessionContext] persistStep error:', err);
        } finally {
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    }, [
        state.sessionId, state.currentStep, state.contentPillars,
        state.sessionFAQs, state.timeHorizon, state.selectedSlotIds, state.scripts,
    ]);

    // ── Debounced save (for field editing in step 1) ──────────────────────
    const debouncedSave = useCallback((extra = {}) => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persistStep(extra), 1000);
    }, [persistStep]);

    // ── Advance step + save ───────────────────────────────────────────────
    const completeStep = useCallback(async (step, extraData = {}) => {
        dispatch({ type: 'SET_STEP', payload: step + 1 });
        await persistStep({ current_step: step + 1, ...extraData });
    }, [persistStep]);

    // ── Complete the whole session ────────────────────────────────────────
    const completeSession = useCallback(async () => {
        dispatch({ type: 'COMPLETE' });
        try {
            await supabase.from('sessions').update({
                status: 'completed',
                current_step: 4,
                completed_at: new Date().toISOString(),
            }).eq('id', state.sessionId);
        } catch (err) {
            console.error('[SessionContext] completeSession error:', err);
        }
    }, [state.sessionId]);

    return (
        <SessionContext.Provider value={{
            state,
            dispatch,
            persistStep,
            debouncedSave,
            completeStep,
            completeSession,
            resumeStaleSession,
            restartSession,
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession must be used inside SessionProvider');
    return ctx;
}

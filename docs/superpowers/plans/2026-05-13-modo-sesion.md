# Modo Sesión Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/dashboard/session` — wizard de 4 pasos para coaches/creadores que persiste estado en Supabase y genera cerebro, ideas, guiones y mini calendario.

**Architecture:** Página única con `SessionContext` + `useReducer` (mismo patrón que `ProjectContext`). Auto-save a Supabase al completar cada paso. Pasos como componentes independientes montados condicionalmente. `HumanizeButton` reutilizable en Step3 y Library.

**Tech Stack:** Next.js App Router, React `useContext`/`useReducer`, Supabase, Anthropic `claude-haiku-4-5-20251001`, endpoints existentes `/api/generate-brain`, `/api/generate-ideas`, `/api/generate-scripts`.

**Nota crítica sobre tablas:** Las "ideas" se guardan en `content_slots` (tabla existente). Los scripts en `scripts` (tabla existente). Se añade `session_id` a ambas.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `app/components/SessionContext.js` | Crear | Estado global + reducer + auto-save |
| `app/components/HumanizeButton.js` | Crear | Botón reutilizable humanizar guion |
| `app/dashboard/session/page.js` | Crear | Entry point, provee SessionProvider |
| `app/dashboard/session/SessionLayout.js` | Crear | Barra de progreso + routing de pasos |
| `app/dashboard/session/SessionStep1Brain.js` | Crear | Review/edit cerebro IA + pilares + FAQs |
| `app/dashboard/session/SessionStep2Ideas.js` | Crear | Generación + selección de ideas |
| `app/dashboard/session/SessionStep3Scripts.js` | Crear | Generación de guiones + humanizar |
| `app/dashboard/session/SessionStep4Calendar.js` | Crear | Mini calendario 2–4 semanas |
| `app/api/humanize-script/route.js` | Crear | Endpoint humanizar guion |
| `lib/credits.js` | Modificar | Añadir `HUMANIZE_SCRIPT: 1` |
| `lib/validations.js` | Modificar | Añadir `HumanizeScriptSchema` |
| `app/api/generate-ideas/route.js` | Modificar | Prompt actualizado con pilares + FAQs |
| `app/api/generate-scripts/route.js` | Modificar | Añadir huecos humanos al prompt |
| `app/dashboard/home/page.js` | Modificar | Botón entrada al Modo Sesión |
| `app/dashboard/library/page.js` | Modificar | Añadir HumanizeButton en cada guion |

---

## Task 1: DB Migrations

**Files:**
- No archivos — ejecutar SQL directo en Supabase Dashboard → SQL Editor

- [ ] **Step 1: Crear tabla `sessions`**

```sql
CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  project_id          UUID REFERENCES projects(id),
  current_step        INT DEFAULT 1,
  status              TEXT DEFAULT 'active',
  content_pillars     TEXT[] DEFAULT '{}',
  session_faqs        TEXT[] DEFAULT '{}',
  time_horizon        TEXT DEFAULT '1month',
  selected_slot_ids   UUID[] DEFAULT '{}',
  script_ids          UUID[] DEFAULT '{}',
  calendar_event_ids  UUID[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX sessions_active_unique
  ON sessions(user_id, project_id) WHERE status = 'active';

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON sessions USING (auth.uid() = user_id);
```

- [ ] **Step 2: Añadir columnas a tablas existentes**

```sql
ALTER TABLE content_slots ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
ALTER TABLE scripts       ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
ALTER TABLE scripts       ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
```

- [ ] **Step 3: Verificar**

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions';
SELECT column_name FROM information_schema.columns WHERE table_name = 'scripts' AND column_name IN ('session_id','status');
SELECT column_name FROM information_schema.columns WHERE table_name = 'content_slots' AND column_name = 'session_id';
```

Esperado: las columnas aparecen en los tres resultados.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add sessions table and session_id columns to content_slots/scripts"
```

---

## Task 2: Credits + Validation Schema

**Files:**
- Modify: `lib/credits.js`
- Modify: `lib/validations.js`

- [ ] **Step 1: Añadir costo en `lib/credits.js`**

Añadir después de la línea `IMPROVE_SCRIPT: 1,`:

```javascript
HUMANIZE_SCRIPT: 1,         // Humanize/rewrite a script to sound less robotic
```

- [ ] **Step 2: Añadir schema Zod en `lib/validations.js`**

Añadir al final del archivo:

```javascript
export const HumanizeScriptSchema = z.object({
    scriptText: z.string().min(10).max(8000),
    projectId:  z.string().uuid().optional().nullable(),
    tone:       safeOptional(100),
});
```

- [ ] **Step 3: Verificar en dev server**

Arranca `npm run dev`. No debe haber errores de compilación en la terminal.

- [ ] **Step 4: Commit**

```bash
git add lib/credits.js lib/validations.js
git commit -m "feat: add HUMANIZE_SCRIPT credit cost and validation schema"
```

---

## Task 3: SessionContext.js

**Files:**
- Create: `app/components/SessionContext.js`

- [ ] **Step 1: Crear el archivo**

```javascript
'use client';
import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const initialState = {
  sessionId: null, projectId: null, currentStep: 1,
  status: 'idle', loading: true, saving: false, error: null,
  brain: null, contentPillars: [], sessionFAQs: [],
  timeHorizon: '1month', brainSaved: false,
  generatedIdeas: [], selectedSlotIds: [],
  scripts: [], calendarEvents: [],
};

function sessionReducer(state, action) {
  switch (action.type) {
    case 'INIT':          return { ...state, ...action.payload, loading: false };
    case 'SET_STEP':      return { ...state, currentStep: action.payload };
    case 'SET_BRAIN':     return { ...state, brain: action.payload, brainSaved: true };
    case 'SET_PILLARS':   return { ...state, contentPillars: action.payload };
    case 'SET_FAQS':      return { ...state, sessionFAQs: action.payload };
    case 'SET_IDEAS':     return { ...state, generatedIdeas: action.payload };
    case 'TOGGLE_SLOT': {
      const ids = state.selectedSlotIds;
      const next = ids.includes(action.payload)
        ? ids.filter(id => id !== action.payload)
        : [...ids, action.payload];
      return { ...state, selectedSlotIds: next };
    }
    case 'ADD_SCRIPT':    return { ...state, scripts: [...state.scripts, action.payload] };
    case 'UPDATE_SCRIPT': return {
      ...state,
      scripts: state.scripts.map(s =>
        s.id === action.payload.id ? { ...s, ...action.payload.changes } : s
      ),
    };
    case 'SET_CALENDAR':  return { ...state, calendarEvents: action.payload };
    case 'SET_SAVING':    return { ...state, saving: action.payload };
    case 'SET_ERROR':     return { ...state, error: action.payload };
    case 'COMPLETE':      return { ...state, status: 'completed' };
    default:              return state;
  }
}

const SessionContext = createContext(null);

export function SessionProvider({ projectId, children }) {
  const [state, dispatch] = useReducer(sessionReducer, { ...initialState, projectId });
  const supabase = createSupabaseClient();
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .single();

      if (session) {
        const [brainRes, slotsRes, scriptsRes] = await Promise.all([
          supabase.from('project_brains').select('*').eq('project_id', projectId).single(),
          session.selected_slot_ids?.length
            ? supabase.from('content_slots').select('*').in('id', session.selected_slot_ids)
            : Promise.resolve({ data: [] }),
          session.script_ids?.length
            ? supabase.from('scripts').select('*').in('id', session.script_ids)
            : Promise.resolve({ data: [] }),
        ]);
        dispatch({ type: 'INIT', payload: {
          sessionId: session.id, currentStep: session.current_step,
          status: 'active', brain: brainRes.data,
          contentPillars: session.content_pillars || [],
          sessionFAQs: session.session_faqs || [],
          timeHorizon: session.time_horizon || '1month',
          brainSaved: !!brainRes.data,
          generatedIdeas: slotsRes.data || [],
          selectedSlotIds: session.selected_slot_ids || [],
          scripts: scriptsRes.data || [],
        }});
      } else {
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({ user_id: user.id, project_id: projectId })
          .select().single();
        const { data: brain } = await supabase
          .from('project_brains').select('*').eq('project_id', projectId).single();
        dispatch({ type: 'INIT', payload: {
          sessionId: newSession.id, status: 'active',
          brain: brain || null, brainSaved: !!brain,
        }});
      }
    })();
  }, [projectId]);

  const persistStep = useCallback(async (extra = {}) => {
    if (!state.sessionId) return;
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await supabase.from('sessions').update({
        current_step: state.currentStep,
        content_pillars: state.contentPillars,
        session_faqs: state.sessionFAQs,
        selected_slot_ids: state.selectedSlotIds,
        script_ids: state.scripts.map(s => s.id).filter(Boolean),
        updated_at: new Date().toISOString(),
        ...extra,
      }).eq('id', state.sessionId);
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.sessionId, state.currentStep, state.contentPillars,
      state.sessionFAQs, state.selectedSlotIds, state.scripts]);

  const debouncedSave = useCallback((extra = {}) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistStep(extra), 1000);
  }, [persistStep]);

  const completeStep = useCallback(async (step, extraData = {}) => {
    dispatch({ type: 'SET_STEP', payload: step + 1 });
    await persistStep({ current_step: step + 1, ...extraData });
  }, [persistStep]);

  const completeSession = useCallback(async () => {
    dispatch({ type: 'COMPLETE' });
    await supabase.from('sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', state.sessionId);
  }, [state.sessionId]);

  return (
    <SessionContext.Provider value={{ state, dispatch, persistStep, debouncedSave, completeStep, completeSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
};
```

- [ ] **Step 2: Verificar compilación**

```bash
npm run dev
```

Esperado: sin errores de compilación.

- [ ] **Step 3: Commit**

```bash
git add app/components/SessionContext.js
git commit -m "feat(session): add SessionContext with useReducer and auto-save"
```

---

## Task 4: Session page.js + SessionLayout.js

**Files:**
- Create: `app/dashboard/session/page.js`
- Create: `app/dashboard/session/SessionLayout.js`

- [ ] **Step 1: Crear `app/dashboard/session/page.js`**

```javascript
'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SessionProvider } from '@/app/components/SessionContext';
import SessionLayout from './SessionLayout';
import { Loader2 } from 'lucide-react';

function SessionContent() {
  const params = useSearchParams();
  const projectId = params.get('project');

  if (!projectId) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#888' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Ningún proyecto seleccionado.</p>
        <p style={{ fontSize: '0.9rem' }}>Vuelve al dashboard y selecciona un proyecto antes de iniciar una sesión.</p>
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
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Crear `app/dashboard/session/SessionLayout.js`**

```javascript
'use client';
import { useSession } from '@/app/components/SessionContext';
import { Loader2, Save } from 'lucide-react';
import SessionStep1Brain    from './SessionStep1Brain';
import SessionStep2Ideas    from './SessionStep2Ideas';
import SessionStep3Scripts  from './SessionStep3Scripts';
import SessionStep4Calendar from './SessionStep4Calendar';

const STEPS = [
  { n: 1, label: 'Cerebro IA' },
  { n: 2, label: 'Ideas' },
  { n: 3, label: 'Guiones' },
  { n: 4, label: 'Calendario' },
];

const STEP_MAP = { 1: SessionStep1Brain, 2: SessionStep2Ideas, 3: SessionStep3Scripts, 4: SessionStep4Calendar };

export default function SessionLayout() {
  const { state } = useSession();
  const { currentStep, loading, saving, status } = state;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: '#7ECECA', animation: 'spin 1s linear infinite' }} />
        <style jsx>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '12px' }}>¡Sesión completada!</h2>
        <p style={{ color: '#888', marginBottom: '32px' }}>Tu contenido está en el calendario.</p>
        <a href="/dashboard/calendar" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--accent-gradient)', color: 'black',
          padding: '14px 28px', borderRadius: '14px', fontWeight: 900, textDecoration: 'none',
        }}>Ver mi calendario →</a>
      </div>
    );
  }

  const ActiveStep = STEP_MAP[currentStep];

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Progress steps */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700,
                background: s.n < currentStep ? '#7ECECA' : s.n === currentStep ? 'rgba(126,206,202,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${s.n <= currentStep ? '#7ECECA' : 'rgba(255,255,255,0.1)'}`,
                color: s.n < currentStep ? '#111' : s.n === currentStep ? '#7ECECA' : '#555',
              }}>
                {s.n < currentStep ? '✓' : s.n}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.n === currentStep ? '#fff' : '#555' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: '4px',
            background: 'linear-gradient(90deg, #7ECECA, #4A9D9A)',
            width: `${((currentStep - 1) / 3) * 100}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <ActiveStep />

      {saving && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(0,0,0,0.85)', padding: '8px 16px',
          borderRadius: '100px', fontSize: '0.8rem', color: '#7ECECA',
          border: '1px solid rgba(126,206,202,0.2)',
        }}>
          <Save size={14} /> Guardando...
        </div>
      )}
      <style jsx>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
```

- [ ] **Step 3: Navegar a `http://localhost:3000/dashboard/session?project=CUALQUIER_PROJECT_ID`**

Esperado: spinner de carga → barra de progreso en Paso 1 (aunque Step1 aún no exista, Next.js mostrará error de módulo no encontrado — es normal hasta Task 5).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/session/page.js app/dashboard/session/SessionLayout.js
git commit -m "feat(session): add session page and layout with progress bar"
```

---

## Task 5: SessionStep1Brain.js

**Files:**
- Create: `app/dashboard/session/SessionStep1Brain.js`

- [ ] **Step 1: Crear el componente**

```javascript
'use client';
import { useState } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Sparkles, ChevronRight } from 'lucide-react';

const WIZARD_STEPS = [
  { id: 1, title: 'Negocio y Biografía', placeholder: 'Ej: Soy María, coach de productividad...', question: '¿Quién eres y qué haces? ¿Qué resultados has conseguido?' },
  { id: 2, title: 'Público Objetivo', placeholder: 'Ej: Emprendedoras de 30-50 años que...', question: '¿Quién es tu cliente ideal? ¿Qué problemas tiene y qué desea?' },
  { id: 3, title: 'Productos y Nicho', placeholder: 'Ej: Vendo asesorías 1:1 y un curso online...', question: '¿Qué productos o servicios vendes? ¿En qué nicho?' },
  { id: 4, title: 'Estilo y Valores', placeholder: 'Ej: Directa, sin filtros. Palabras: resultados, claridad.', question: '¿Qué tono quieres usar? Escribe 3-5 palabras que definan tu estilo.' },
  { id: 5, title: 'Oferta Irresistible', placeholder: 'Ej: Ayudo a mujeres empresarias a perder 5 kilos en 8 semanas...', question: 'Describe tu oferta principal: ¿qué prometes, en cuánto tiempo y para quién?' },
];

export default function SessionStep1Brain() {
  const { state, dispatch, debouncedSave, completeStep } = useSession();
  const { brain, contentPillars, sessionFAQs, timeHorizon, brainSaved, sessionId, projectId } = state;
  const supabase = createSupabaseClient();

  // Wizard state (only used when no brain exists)
  const [wizardStep, setWizardStep]   = useState(1);
  const [answers, setAnswers]         = useState({ step1:'', step2:'', step3:'', step4:'', step5:'' });
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState('');

  // Shared editable fields
  const [pillarsText, setPillarsText] = useState(contentPillars.join('\n'));
  const [faqsText, setFaqsText]       = useState(sessionFAQs.join('\n'));
  const [horizon, setHorizon]         = useState(timeHorizon);

  function handlePillarsChange(val) {
    setPillarsText(val);
    const arr = val.split('\n').map(s => s.trim()).filter(Boolean);
    dispatch({ type: 'SET_PILLARS', payload: arr });
    debouncedSave({ content_pillars: arr });
  }

  function handleFaqsChange(val) {
    setFaqsText(val);
    const arr = val.split('\n').map(s => s.trim()).filter(Boolean);
    dispatch({ type: 'SET_FAQS', payload: arr });
    debouncedSave({ session_faqs: arr });
  }

  function handleHorizonChange(val) {
    setHorizon(val);
    dispatch({ type: 'SET_PILLARS', payload: contentPillars }); // trigger re-render
    debouncedSave({ time_horizon: val });
  }

  async function handleGenerateBrain() {
    setGenerating(true);
    setGenError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/generate-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, userId: user.id, projectId }),
      });
      if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { brain: newBrain } = await res.json();
      await supabase.from('project_brains').upsert({ ...newBrain, project_id: projectId });
      dispatch({ type: 'SET_BRAIN', payload: newBrain });
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleConfirm() {
    // Merge final pillar/faq values before advancing
    const pillarsArr = pillarsText.split('\n').map(s => s.trim()).filter(Boolean);
    const faqsArr    = faqsText.split('\n').map(s => s.trim()).filter(Boolean);
    dispatch({ type: 'SET_PILLARS', payload: pillarsArr });
    dispatch({ type: 'SET_FAQS',    payload: faqsArr });
    await completeStep(1, {
      content_pillars: pillarsArr,
      session_faqs: faqsArr,
      time_horizon: horizon,
    });
  }

  const pillarsAndFaqsFields = (
    <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '32px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', color: '#7ECECA' }}>
        Contexto de esta sesión
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Pilares de contenido (3–5, uno por línea)
        </label>
        <textarea value={pillarsText} onChange={e => handlePillarsChange(e.target.value)}
          placeholder={'Mentalidad emprendedora\nProductividad con IA\nMarketing de atracción'}
          rows={5}
          style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '0.95rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Preguntas que te hacen tus clientes (una por línea)
        </label>
        <textarea value={faqsText} onChange={e => handleFaqsChange(e.target.value)}
          placeholder={'¿Por dónde empiezo a vender online?\n¿Cuánto tiempo tarda en verse resultados?'}
          rows={5}
          style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '0.95rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Horizonte de planificación
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['2weeks', '1month'].map(val => (
            <button key={val} onClick={() => handleHorizonChange(val)} style={{
              padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              background: horizon === val ? 'rgba(126,206,202,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${horizon === val ? '#7ECECA' : 'rgba(255,255,255,0.1)'}`,
              color: horizon === val ? '#7ECECA' : '#888',
            }}>
              {val === '2weeks' ? '2 semanas' : '1 mes'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── MODO REVIEW (brain exists) ──────────────────────────────
  if (brainSaved && brain) {
    return (
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px' }}>🧠 Tu Cerebro IA</h2>
        <p style={{ color: '#888', marginBottom: '28px' }}>Revisa y ajusta antes de generar ideas.</p>

        <div style={{ display: 'grid', gap: '16px', marginBottom: '8px' }}>
          {[
            { label: 'Biografía', value: brain.biography },
            { label: 'Audiencia', value: brain.audience },
            { label: 'Estilo', value: brain.style_words },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '16px', background: 'rgba(126,206,202,0.04)', border: '1px solid rgba(126,206,202,0.12)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#7ECECA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: 1.6 }}>{value || '—'}</div>
            </div>
          ))}
        </div>

        {pillarsAndFaqsFields}

        <button onClick={handleConfirm} style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: 'var(--accent-gradient)', color: 'black',
          border: 'none', borderRadius: '14px', padding: '16px 32px',
          fontSize: '1rem', fontWeight: 900, cursor: 'pointer',
        }}>
          Confirmar y generar ideas <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  // ── MODO WIZARD (no brain) ──────────────────────────────────
  const currentWizardData = WIZARD_STEPS.find(s => s.id === wizardStep);
  const stepKey = `step${wizardStep}`;

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px' }}>🧠 Crea tu Cerebro IA</h2>
      <p style={{ color: '#888', marginBottom: '28px' }}>5 preguntas rápidas para personalizar todas tus ideas y guiones.</p>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {WIZARD_STEPS.map(s => (
          <div key={s.id} style={{ height: '4px', flex: 1, borderRadius: '2px', background: s.id <= wizardStep ? '#7ECECA' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
        ))}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '0.8rem', color: '#7ECECA', fontWeight: 700, textTransform: 'uppercase' }}>Paso {wizardStep} de 5</span>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '8px 0' }}>{currentWizardData.title}</h3>
        <p style={{ color: '#888', marginBottom: '16px' }}>{currentWizardData.question}</p>
      </div>

      <textarea
        value={answers[stepKey]}
        onChange={e => setAnswers(prev => ({ ...prev, [stepKey]: e.target.value }))}
        placeholder={currentWizardData.placeholder}
        rows={6}
        style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '1rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: '16px' }}
        onFocus={e => e.target.style.borderColor = 'rgba(126,206,202,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
      />

      {wizardStep < 5 && (
        <button onClick={() => setWizardStep(w => w + 1)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(126,206,202,0.1)', color: '#7ECECA',
          border: '1px solid rgba(126,206,202,0.2)', borderRadius: '12px',
          padding: '12px 24px', fontWeight: 700, cursor: 'pointer',
        }}>
          Siguiente <ChevronRight size={18} />
        </button>
      )}

      {wizardStep === 5 && (
        <>
          {pillarsAndFaqsFields}
          {genError && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#EF4444', marginBottom: '16px', fontSize: '0.9rem' }}>{genError}</div>}
          <button onClick={async () => { await handleGenerateBrain(); }} disabled={generating} style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: generating ? 'rgba(255,255,255,0.05)' : 'var(--accent-gradient)',
            color: generating ? '#555' : 'black',
            border: 'none', borderRadius: '14px', padding: '16px 32px',
            fontSize: '1rem', fontWeight: 900, cursor: generating ? 'not-allowed' : 'pointer',
          }}>
            {generating ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generando Cerebro IA...</> : <><Sparkles size={18} /> Generar Cerebro IA y continuar</>}
          </button>
          {/* After brain is generated, brainSaved will be true and we re-render review mode.
              User then clicks "Confirmar y generar ideas" to advance to step 2. */}
          <style jsx>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Probar en browser**

Navega a `/dashboard/session?project=<id_sin_brain>`.
Esperado: wizard de 5 pasos sin modal overlay, barra de puntos de progreso.

Navega con un proyecto que ya tiene cerebro.
Esperado: vista de review con bio/audiencia/estilo + campos de pilares y FAQs pre-cargados.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/session/SessionStep1Brain.js
git commit -m "feat(session): add SessionStep1Brain with inline wizard and review mode"
```

---

## Task 6: SessionStep2Ideas.js

**Files:**
- Create: `app/dashboard/session/SessionStep2Ideas.js`

- [ ] **Step 1: Crear el componente**

```javascript
'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function SessionStep2Ideas() {
  const { state, dispatch, completeStep } = useSession();
  const { brain, contentPillars, sessionFAQs, timeHorizon, generatedIdeas, selectedSlotIds, projectId, sessionId } = state;
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [extraCount, setExtraCount] = useState(0); // max 2 extra generations

  useEffect(() => {
    if (generatedIdeas.length === 0) generateIdeas();
  }, []);

  async function generateIdeas() {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Pilares: ${contentPillars.join(', ')}. FAQs: ${sessionFAQs.join('. ')}`,
          platforms: ['Reels', 'TikTok', 'YouTube Shorts'],
          goal: `Contenido para ${timeHorizon === '2weeks' ? '2 semanas' : '1 mes'}`,
          count: 18,
          projectId,
          userId: user.id,
          contentPillars,
          sessionFAQs,
        }),
      });
      if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { ideas } = await res.json();
      dispatch({ type: 'SET_IDEAS', payload: ideas });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateMore() {
    if (extraCount >= 2) return;
    setExtraCount(c => c + 1);
    await generateIdeas();
  }

  async function handleAdvance() {
    if (selectedSlotIds.length < 2) return;
    const { data: { user } } = await supabase.auth.getUser();

    // Insert selected ideas as content_slots
    const toInsert = generatedIdeas
      .filter((_, idx) => selectedSlotIds.includes(String(idx))) // temp index-based selection
      .map(idea => ({
        user_id: user.id,
        project_id: projectId,
        session_id: sessionId,
        title: idea.titulo,
        hook: idea.hook,
        description: idea.descripcion,
        pilar: idea.pilar,
        tipo_contenido: idea.tipo,
        cta: idea.cta,
        platform: 'Reels',
        status: 'idea_only',
      }));

    const { data: insertedSlots } = await supabase
      .from('content_slots').insert(toInsert).select();

    const slotIds = (insertedSlots || []).map(s => s.id);
    dispatch({ type: 'SET_IDEAS', payload: insertedSlots || generatedIdeas });

    await completeStep(2, { selected_slot_ids: slotIds });
  }

  // Group ideas by pillar
  const byPilar = generatedIdeas.reduce((acc, idea, idx) => {
    const key = idea.pilar || 'Sin pilar';
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...idea, _idx: String(idx) });
    return acc;
  }, {});

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <Loader2 size={36} style={{ color: '#7ECECA', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
      <p style={{ color: '#888' }}>Generando ideas para tu nicho...</p>
      <style jsx>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px' }}>💡 Elige tus ideas</h2>
          <p style={{ color: '#888' }}>Selecciona entre 2 y 8 ideas para guionizar.</p>
        </div>
        <button onClick={handleGenerateMore} disabled={extraCount >= 2 || loading} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(126,206,202,0.08)', color: extraCount >= 2 ? '#555' : '#7ECECA',
          border: '1px solid rgba(126,206,202,0.2)', borderRadius: '10px',
          padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700,
          cursor: extraCount >= 2 ? 'not-allowed' : 'pointer',
        }}>
          <Sparkles size={14} /> Más ideas {extraCount >= 2 ? '(máx)' : `(${2 - extraCount} restantes)`}
        </button>
      </div>

      <div style={{ marginBottom: '12px', fontSize: '0.85rem', color: selectedSlotIds.length >= 2 ? '#10B981' : '#888' }}>
        {selectedSlotIds.length} seleccionadas {selectedSlotIds.length < 2 && '— mínimo 2 para continuar'}
      </div>

      {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#EF4444', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

      {Object.entries(byPilar).map(([pilar, ideas]) => (
        <div key={pilar} style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '0.75rem', color: '#7ECECA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
            {pilar}
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {ideas.map(idea => {
              const isSelected = selectedSlotIds.includes(idea._idx);
              return (
                <div key={idea._idx} onClick={() => dispatch({ type: 'TOGGLE_SLOT', payload: idea._idx })}
                  style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    background: isSelected ? 'rgba(126,206,202,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(126,206,202,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex', gap: '14px', alignItems: 'flex-start',
                  }}>
                  <div style={{ color: isSelected ? '#7ECECA' : '#444', flexShrink: 0, marginTop: '2px' }}>
                    <CheckCircle2 size={20} fill={isSelected ? 'rgba(126,206,202,0.2)' : 'transparent'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.95rem' }}>{idea.titulo}</div>
                    <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.5 }}>{idea.hook}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={handleAdvance} disabled={selectedSlotIds.length < 2} style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        background: selectedSlotIds.length >= 2 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
        color: selectedSlotIds.length >= 2 ? 'black' : '#555',
        border: 'none', borderRadius: '14px', padding: '16px 32px',
        fontSize: '1rem', fontWeight: 900,
        cursor: selectedSlotIds.length >= 2 ? 'pointer' : 'not-allowed',
      }}>
        Generar guiones <ChevronRight size={20} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Probar en browser**

Completa el paso 1 y avanza al paso 2. Esperado: grid de ideas agrupadas por pilar. Clic en ideas → se resaltan. Botón "Generar guiones" activo al seleccionar 2+.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/session/SessionStep2Ideas.js
git commit -m "feat(session): add SessionStep2Ideas with grouped idea grid and selection"
```

---

## Task 7: /api/humanize-script + HumanizeButton.js

**Files:**
- Create: `app/api/humanize-script/route.js`
- Create: `app/components/HumanizeButton.js`

- [ ] **Step 1: Crear `app/api/humanize-script/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { getServerSession, unauthorized } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { HumanizeScriptSchema } from '@/lib/validations';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

export async function POST(req) {
  const { user, supabase } = await getServerSession(req);
  if (!user) return unauthorized();

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const validation = HumanizeScriptSchema.safeParse(body);
  if (!validation.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });

  const { scriptText, projectId, tone } = validation.data;

  const credit = await chargeCredits(supabase, user.id, CREDIT_COSTS.HUMANIZE_SCRIPT, 'humanize_script', projectId);
  if (!credit.success) return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });

  let brandStyle = tone || '';
  let brandTone  = '';
  if (projectId) {
    const { data: brain } = await supabase
      .from('project_brains').select('style_words, values_tone')
      .eq('project_id', projectId).single();
    if (brain) { brandStyle = brain.style_words || tone || ''; brandTone = brain.values_tone || ''; }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Eres editor de contenido especializado en voz humana para creadores digitales.

ESTILO DE LA MARCA: ${brandStyle}
TONO: ${brandTone}

REGLAS (en orden de prioridad):
1. MISMO IDIOMA: Detecta el idioma del guion original y responde en ese mismo idioma.
2. SIN FRASES ROBÓTICAS: Elimina "En este valioso contenido...", "Como mencioné anteriormente...", "Es importante destacar que..."
3. FRASES CORTAS: Habla como en una conversación real.
4. HUECOS HUMANOS: Después de cada punto clave añade una línea entre corchetes, ej: [Aquí añade una anécdota tuya sobre esto]. Si el guion ya incluye líneas entre corchetes ([ ... ]), consérvales o mejóralas — nunca las elimines.
5. MISMA ESTRUCTURA: Mantén hook, desarrollo, cierre, CTA — no añadas ni elimines puntos.
6. TIMESTAMPS: Si el guion incluye marcas de tiempo (ej: 0:00, 1:30), consérvelas exactamente.
7. NO INVENTES: No añadas logros, datos o historias que no estaban.

GUION ORIGINAL:
${scriptText}

Devuelve SOLO el guion reescrito, sin explicaciones.`,
    }],
  });

  return NextResponse.json({ humanized: msg.content[0].text });
}
```

- [ ] **Step 2: Probar el endpoint con curl**

```bash
curl -X POST http://localhost:3000/api/humanize-script \
  -H "Content-Type: application/json" \
  -H "Cookie: <pega_tu_cookie_de_sesion>" \
  -d '{"scriptText":"En este valioso contenido te voy a explicar 3 formas de usar IA. Como mencioné anteriormente, la IA es el futuro. Primero, usa ChatGPT para emails. Segundo, usa Notion AI para notas. Tercero, usa WRITI para guiones.", "projectId": null}'
```

Esperado: JSON `{ "humanized": "..." }` con texto más conversacional y líneas `[...]`.

- [ ] **Step 3: Crear `app/components/HumanizeButton.js`**

```javascript
'use client';
import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function HumanizeButton({ scriptText, projectId, onHumanized, size = 'normal' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleHumanize() {
    if (!scriptText?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/humanize-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText, projectId }),
      });
      if (res.status === 402) { window.dispatchEvent(new CustomEvent('show-no-credits')); return; }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { humanized } = await res.json();
      onHumanized(humanized);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isSmall = size === 'small';
  return (
    <div>
      <button onClick={handleHumanize} disabled={loading} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(255,215,0,0.08)', color: loading ? '#666' : '#FFD700',
        border: '1px solid rgba(255,215,0,0.2)', borderRadius: '10px',
        padding: isSmall ? '6px 12px' : '9px 18px',
        fontSize: isSmall ? '0.78rem' : '0.85rem',
        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
      }}>
        {loading
          ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Humanizando...</>
          : <><Sparkles size={14} /> Humanizar guion</>
        }
      </button>
      {error && <div style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px' }}>{error}</div>}
      <style jsx>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/humanize-script/route.js app/components/HumanizeButton.js
git commit -m "feat: add humanize-script API endpoint and HumanizeButton component"
```

---

## Task 8: SessionStep3Scripts.js

**Files:**
- Create: `app/dashboard/session/SessionStep3Scripts.js`

- [ ] **Step 1: Crear el componente**

```javascript
'use client';
import { useState, useEffect } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { Loader2, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import HumanizeButton from '@/app/components/HumanizeButton';

const DURATION_OPTIONS = ['60 seg', '90 seg', '2 min', '3 min'];

export default function SessionStep3Scripts() {
  const { state, dispatch, completeStep } = useSession();
  const { generatedIdeas, selectedSlotIds, scripts, projectId, sessionId, brain } = state;
  const supabase = createSupabaseClient();

  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState('');
  const [duration, setDuration]     = useState('60 seg');
  const [expandedIdx, setExpandedIdx] = useState(null);

  const selectedIdeas = generatedIdeas.filter((_, idx) => selectedSlotIds.includes(String(idx)));

  useEffect(() => {
    if (scripts.length === 0 && selectedIdeas.length > 0) generateScripts();
  }, []);

  async function generateScripts() {
    setGenerating(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const results = await Promise.all(
        selectedIdeas.map(idea =>
          fetch('/api/generate-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: idea.titulo,
              specificDetails: idea.descripcion,
              platform: 'Reels',
              tone: brain?.style_words || 'Cercano y directo',
              userId: user.id,
              projectId,
              count: 1,
              videoDuration: duration,
              intensity: 3,
            }),
          }).then(r => r.json())
        )
      );

      const allScripts = results.flatMap(r => r.scripts || []);
      const { data: inserted } = await supabase
        .from('scripts')
        .insert(allScripts.map((s, i) => ({
          user_id: user.id,
          project_id: projectId,
          session_id: sessionId,
          status: 'draft',
          titulo_guion: s.titulo_guion,
          gancho: s.gancho,
          desarrollo: s.desarrollo,
          cierre: s.cierre,
          cta: s.cta,
          copy_post: s.copy_post,
          video_duration: s.video_duration,
        }))).select();

      (inserted || allScripts).forEach(s => dispatch({ type: 'ADD_SCRIPT', payload: s }));
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAdvance() {
    await completeStep(3, { script_ids: scripts.map(s => s.id).filter(Boolean) });
  }

  function scriptToText(s) {
    return [
      `GANCHO: ${s.gancho}`,
      `\nDESARROLLO:\n${Array.isArray(s.desarrollo) ? s.desarrollo.join('\n') : s.desarrollo}`,
      `\nCIERRE: ${s.cierre}`,
      `\nCTA: ${s.cta}`,
    ].join('');
  }

  if (generating) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <Loader2 size={36} style={{ color: '#7ECECA', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
      <p style={{ color: '#888' }}>Generando {selectedIdeas.length} guion{selectedIdeas.length > 1 ? 'es' : ''}...</p>
      <style jsx>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px' }}>✍️ Tus guiones</h2>
      <p style={{ color: '#888', marginBottom: '24px' }}>Edítalos y humanízalos antes de ir al calendario.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {DURATION_OPTIONS.map(d => (
          <button key={d} onClick={() => setDuration(d)} style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            background: duration === d ? 'rgba(126,206,202,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${duration === d ? '#7ECECA' : 'rgba(255,255,255,0.1)'}`,
            color: duration === d ? '#7ECECA' : '#888',
          }}>{d}</button>
        ))}
        <button onClick={() => { dispatch({ type: 'SET_STEP', payload: 3 }); generateScripts(); }} style={{
          padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#888',
        }}>↺ Regenerar</button>
      </div>

      {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#EF4444', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
        {scripts.map((script, idx) => (
          <div key={script.id || idx} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
            <div onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>{script.titulo_guion}</div>
                <div style={{ fontSize: '0.8rem', color: '#7ECECA' }}>{script.video_duration}</div>
              </div>
              {expandedIdx === idx ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
            </div>

            {expandedIdx === idx && (
              <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'GANCHO', value: script.gancho },
                  { label: 'CIERRE', value: script.cierre },
                  { label: 'CTA', value: script.cta },
                ].map(({ label, value }) => (
                  <div key={label} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#7ECECA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>{label}</div>
                    <textarea
                      value={value || ''}
                      onChange={e => dispatch({ type: 'UPDATE_SCRIPT', payload: { id: script.id || idx, changes: { [label.toLowerCase()]: e.target.value } } })}
                      rows={2}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#7ECECA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>DESARROLLO</div>
                  {(Array.isArray(script.desarrollo) ? script.desarrollo : [script.desarrollo]).map((punto, pIdx) => (
                    <textarea key={pIdx} value={punto || ''}
                      onChange={e => {
                        const newDev = [...(Array.isArray(script.desarrollo) ? script.desarrollo : [script.desarrollo])];
                        newDev[pIdx] = e.target.value;
                        dispatch({ type: 'UPDATE_SCRIPT', payload: { id: script.id || idx, changes: { desarrollo: newDev } } });
                      }}
                      rows={3}
                      style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                    />
                  ))}
                </div>

                <HumanizeButton
                  scriptText={scriptToText(script)}
                  projectId={projectId}
                  onHumanized={humanized => {
                    // Parse humanized text back to fields (simple approach: replace gancho/desarrollo/cierre/cta)
                    dispatch({ type: 'UPDATE_SCRIPT', payload: { id: script.id || idx, changes: { gancho: humanized } } });
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleAdvance} disabled={scripts.length === 0} style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        background: scripts.length > 0 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
        color: scripts.length > 0 ? 'black' : '#555',
        border: 'none', borderRadius: '14px', padding: '16px 32px',
        fontSize: '1rem', fontWeight: 900,
        cursor: scripts.length > 0 ? 'pointer' : 'not-allowed',
      }}>
        Organizar en calendario <ChevronRight size={20} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Probar en browser**

Avanza hasta el paso 3. Esperado: guiones generados en acordeón, `HumanizeButton` en dorado bajo cada guion, campos editables inline.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/session/SessionStep3Scripts.js
git commit -m "feat(session): add SessionStep3Scripts with inline editing and HumanizeButton"
```

---

## Task 9: SessionStep4Calendar.js

**Files:**
- Create: `app/dashboard/session/SessionStep4Calendar.js`

- [ ] **Step 1: Crear el componente**

```javascript
'use client';
import { useState } from 'react';
import { useSession } from '@/app/components/SessionContext';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

function getWeeks(startDate, weeksCount) {
  const weeks = [];
  const date = new Date(startDate);
  date.setDate(date.getDate() - date.getDay() + 1); // start on Monday
  for (let w = 0; w < weeksCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function SessionStep4Calendar() {
  const { state, completeSession } = useSession();
  const { scripts, timeHorizon, sessionId, projectId } = state;
  const supabase = createSupabaseClient();
  const router = useRouter();

  const weeksCount = timeHorizon === '2weeks' ? 2 : 4;
  const today = new Date();
  const weeks = getWeeks(today, weeksCount);

  // calendar: { 'YYYY-MM-DD': scriptIdx[] }
  const [calendar, setCalendar] = useState(() => {
    // Auto-suggest: distribute scripts Mon/Wed/Fri of each week
    const AUTO_DAYS = [0, 2, 4]; // Mon=0, Wed=2, Fri=4
    const map = {};
    let scriptIdx = 0;
    outer: for (const week of weeks) {
      for (const dayOffset of AUTO_DAYS) {
        if (scriptIdx >= scripts.length) break outer;
        const day = week[dayOffset];
        const key = day.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(scriptIdx);
        scriptIdx++;
      }
    }
    return map;
  });

  const [dragging, setDragging] = useState(null); // { scriptIdx }
  const [saving, setSaving]     = useState(false);

  function handleDragStart(scriptIdx) { setDragging({ scriptIdx }); }

  function handleDrop(dateKey) {
    if (!dragging) return;
    // Remove from any previous date
    const newCal = Object.fromEntries(
      Object.entries(calendar).map(([k, v]) => [k, v.filter(i => i !== dragging.scriptIdx)])
    );
    if (!newCal[dateKey]) newCal[dateKey] = [];
    newCal[dateKey].push(dragging.scriptIdx);
    setCalendar(newCal);
    setDragging(null);
  }

  async function handleFinish() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const events = [];
    Object.entries(calendar).forEach(([date, idxs]) => {
      idxs.forEach(idx => {
        if (scripts[idx]) {
          events.push({
            user_id: user.id,
            project_id: projectId,
            session_id: sessionId,
            title: scripts[idx].titulo_guion,
            scheduled_date: date,
            status: 'scheduled',
            script_id: scripts[idx].id || null,
          });
        }
      });
    });

    const { data: inserted } = await supabase.from('calendar_events').insert(events).select();
    const eventIds = (inserted || []).map(e => e.id);

    await supabase.from('sessions').update({
      calendar_event_ids: eventIds,
    }).eq('id', sessionId);

    await completeSession();
    router.push('/dashboard/calendar');
  }

  const assignedCount = Object.values(calendar).flat().length;

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px' }}>📅 Tu calendario</h2>
      <p style={{ color: '#888', marginBottom: '24px' }}>
        Arrastra los guiones a los días que prefieras. He sugerido una distribución automática.
      </p>

      {/* Unassigned scripts */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
          Guiones (arrastra al calendario)
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {scripts.map((s, idx) => (
            <div key={idx} draggable onDragStart={() => handleDragStart(idx)} style={{
              padding: '8px 14px', borderRadius: '8px', cursor: 'grab', fontSize: '0.82rem', fontWeight: 600,
              background: 'rgba(126,206,202,0.08)', border: '1px solid rgba(126,206,202,0.2)', color: '#7ECECA',
              userSelect: 'none',
            }}>
              {s.titulo_guion?.substring(0, 35)}{(s.titulo_guion?.length || 0) > 35 ? '…' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', minWidth: '560px' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: '#666', fontWeight: 700, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d}</div>
          ))}
          {weeks.flat().map((day, i) => {
            const key = day.toISOString().split('T')[0];
            const assigned = calendar[key] || [];
            const isToday = key === today.toISOString().split('T')[0];
            return (
              <div key={i}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(key)}
                style={{
                  minHeight: '80px', borderRadius: '8px', padding: '6px',
                  background: isToday ? 'rgba(126,206,202,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isToday ? 'rgba(126,206,202,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'background 0.15s',
                }}>
                <div style={{ fontSize: '0.72rem', color: isToday ? '#7ECECA' : '#555', fontWeight: 700, marginBottom: '4px' }}>
                  {day.getDate()}
                </div>
                {assigned.map(idx => (
                  <div key={idx} draggable onDragStart={() => handleDragStart(idx)} style={{
                    fontSize: '0.7rem', padding: '3px 6px', borderRadius: '4px', marginBottom: '3px',
                    background: 'rgba(126,206,202,0.15)', color: '#7ECECA', cursor: 'grab',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {scripts[idx]?.titulo_guion?.substring(0, 20)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={handleFinish} disabled={saving} style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: 'white', border: 'none', borderRadius: '14px',
        padding: '16px 32px', fontSize: '1rem', fontWeight: 900,
        cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        <CheckCircle2 size={20} />
        {saving ? 'Guardando...' : `Finalizar sesión (${assignedCount} contenidos programados)`}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Probar en browser**

Avanza hasta el paso 4. Esperado: grid de semanas con auto-distribución lunes/miércoles/viernes. Drag & drop mueve tarjetas entre días. "Finalizar sesión" guarda eventos y redirige a `/dashboard/calendar`.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/session/SessionStep4Calendar.js
git commit -m "feat(session): add SessionStep4Calendar with drag-and-drop and auto-distribution"
```

---

## Task 10: Actualizar prompt de generate-ideas

**Files:**
- Modify: `app/api/generate-ideas/route.js`

- [ ] **Step 1: Actualizar el `systemPrompt`**

Localiza la variable `systemPrompt` en el archivo y reemplázala completa:

```javascript
// Dentro del bloque POST, después de obtener brandBrain
// Añadir extracción de contentPillars y sessionFAQs del body:
const { context, platforms, goal, count, projectId, contentPillars, sessionFAQs } = validation.data;

// Reemplazar brandContextString y systemPrompt:
const pillarsBlock = contentPillars?.length
  ? `PILARES DE CONTENIDO:\n${contentPillars.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
  : 'PILARES DE CONTENIDO: (no especificados, usa los del nicho)';

const faqsBlock = sessionFAQs?.length
  ? `PREGUNTAS FRECUENTES DE SUS CLIENTES:\n${sessionFAQs.map(f => `- ${f}`).join('\n')}`
  : '';

const systemPrompt = `Eres estratega de contenido para coaches, consultores y creadores educativos.

CEREBRO DEL CREADOR:
- Bio: ${(brandBrain.biography || '').substring(0, 800)}
- Audiencia: ${(brandBrain.audience || '').substring(0, 400)}
- Estilo: ${brandBrain.style_words || ''}

${pillarsBlock}

${faqsBlock}

REGLAS CRÍTICAS:
1. Ideas REALES y ESPECÍFICAS para este nicho — nada genérico.
2. Distribuye ideas entre los pilares (mínimo 2 ideas por pilar si hay pilares).
3. Incluye al menos 2 ideas basadas en las FAQs de clientes si las hay.
4. Cada idea tiene hook diferenciado (pregunta, dato, historia, controversia).
5. El campo "pilar" DEBE coincidir con uno de los pilares listados (o "General" si no hay pilares).

RESPONDE ÚNICAMENTE CON UN ARRAY JSON VÁLIDO:
[
  {
    "titulo": "Título llamativo",
    "hook": "Frase gancho para los 3 primeros segundos",
    "descripcion": "Qué explicarías en el video/post",
    "pilar": "nombre del pilar exacto o General",
    "tipo": "Educativo | Storytelling | Opinión | FAQ",
    "cta": "Qué pedir al final"
  }
]`;
```

- [ ] **Step 2: Actualizar `GenerateIdeasSchema` en `lib/validations.js`**

Añadir los campos opcionales al schema:

```javascript
// Dentro de GenerateIdeasSchema, añadir:
contentPillars: z.array(z.string().max(100)).max(10).optional().default([]),
sessionFAQs:    z.array(z.string().max(300)).max(20).optional().default([]),
```

- [ ] **Step 3: Probar**

Ejecuta una sesión completa: paso 1 con pilares definidos → paso 2. Verifica que las ideas generadas incluyen el campo `pilar` y están relacionadas con los pilares dados.

- [ ] **Step 4: Commit**

```bash
git add app/api/generate-ideas/route.js lib/validations.js
git commit -m "feat(ideas): update generate-ideas prompt to use content pillars and FAQs"
```

---

## Task 11: Añadir huecos humanos a generate-scripts

**Files:**
- Modify: `app/api/generate-scripts/route.js`

- [ ] **Step 1: Añadir instrucción en `buildSystemPrompt()`**

Localiza la función `buildSystemPrompt` y dentro del string del prompt, justo antes de la línea `ESTRUCTURA DEL GUION:`, añade:

```javascript
const humanGapsInstruction = `
HUECOS PARA HUMANIZAR (OBLIGATORIO — NO NEGOCIABLE):
En el bloque de desarrollo, después de cada punto explicado, incluye obligatoriamente una línea entre corchetes:
  [Aquí añade una anécdota tuya sobre este punto]
  [Comparte un ejemplo real de un cliente que vivió esto]
  [Cuéntales cuándo tú mismo experimentaste esto]
Estas líneas son para que el creador personalice el guion con su voz. NO las omitas bajo ningún concepto.
Formato correcto del desarrollo:
  "Punto 1: explicación. [Aquí añade una historia tuya sobre X]"
`;
```

Luego en el return del prompt, añadir `${humanGapsInstruction}` justo antes de `ESTRUCTURA DEL GUION:`.

- [ ] **Step 2: Verificar**

Genera un guion desde `/dashboard/session` paso 3. Verifica que el campo `desarrollo` incluye líneas con `[...]` en el texto.

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-scripts/route.js
git commit -m "feat(scripts): add human gap placeholders to script generation prompt"
```

---

## Task 12: Botón de entrada + Library integration

**Files:**
- Modify: `app/dashboard/home/page.js`
- Modify: `app/dashboard/library/page.js`

- [ ] **Step 1: Añadir botón en `app/dashboard/home/page.js`**

Localiza el bloque hero (el `<div>` con el gradiente de bienvenida) y añade este bloque **después** del botón `Nuevo Proyecto`:

```javascript
// Importar al inicio del archivo (si no está):
// import { useProject } from '@/app/components/ProjectContext';
// const { activeProject } = useProject();  // ya deberías tenerlo

// En el JSX, después del botón "Nuevo Proyecto":
<button
  onClick={() => {
    if (!activeProject?.id) {
      alert('Selecciona o crea un proyecto primero.');
      return;
    }
    router.push(`/dashboard/session?project=${activeProject.id}`);
  }}
  style={{
    display: 'inline-flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,215,0,0.1)', color: '#FFD700',
    border: '1px solid rgba(255,215,0,0.25)', borderRadius: '16px',
    padding: '16px 32px', fontSize: '1rem', fontWeight: 900,
    cursor: 'pointer', marginLeft: '12px',
    transition: 'all 0.2s',
  }}
  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.16)'; }}
  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.1)'; }}
>
  <Sparkles size={20} strokeWidth={3} /> Empezar sesión de planificación
</button>
```

- [ ] **Step 2: Probar**

Navega a `/dashboard/home`. El botón "Empezar sesión de planificación" debe aparecer junto a "Nuevo Proyecto". Al clic con proyecto activo, redirige a `/dashboard/session?project=<id>`.

- [ ] **Step 3: Añadir `HumanizeButton` en `app/dashboard/library/page.js`**

Localiza donde se renderiza cada guion en la library (busca el texto del `titulo_guion` o `gancho`). Añade el import y el botón:

```javascript
// Añadir import al inicio:
import HumanizeButton from '@/app/components/HumanizeButton';

// Dentro del JSX de cada script card, añadir:
<HumanizeButton
  size="small"
  scriptText={[script.gancho, ...(script.desarrollo || []), script.cierre, script.cta].join('\n')}
  projectId={activeProject?.id}
  onHumanized={(humanized) => {
    // Actualizar gancho con el texto humanizado (simplificado)
    // Opcional: actualizar en Supabase scripts.gancho
    console.log('Humanized:', humanized);
    // TODO: mostrar el resultado en un modal o reemplazar el contenido
  }}
/>
```

- [ ] **Step 4: Verificar flujo completo end-to-end**

1. Ir a `/dashboard/home` con un proyecto activo
2. Clic "Empezar sesión de planificación"
3. Paso 1: revisar/crear cerebro + añadir pilares y FAQs → "Confirmar"
4. Paso 2: ver ideas agrupadas por pilar, seleccionar 3 → "Generar guiones"
5. Paso 3: ver guiones, probar "Humanizar guion" en uno → "Organizar en calendario"
6. Paso 4: ver distribución automática, ajustar → "Finalizar sesión"
7. Verificar redirección a `/dashboard/calendar` con los eventos creados
8. Cerrar la sesión a mitad (recargar en paso 2) y verificar que retoma donde dejó

- [ ] **Step 5: Commit final**

```bash
git add app/dashboard/home/page.js app/dashboard/library/page.js
git commit -m "feat(session): add session entry button and HumanizeButton in library"
```

---

## Self-Review

**Spec coverage:**

| Requisito del spec | Task |
|-------------------|------|
| sessions table + ALTER TABLE | Task 1 |
| HUMANIZE_SCRIPT credit cost | Task 2 |
| HumanizeScriptSchema Zod | Task 2 |
| SessionContext + useReducer | Task 3 |
| page.js + SessionLayout + barra progreso | Task 4 |
| Step1Brain: wizard inline + review mode | Task 5 |
| Step2Ideas: grid por pilar + toggle | Task 6 |
| /api/humanize-script | Task 7 |
| HumanizeButton reutilizable | Task 7 |
| Step3Scripts: guiones + humanizar | Task 8 |
| Step4Calendar: mini calendario drag&drop | Task 9 |
| generate-ideas prompt con pilares/FAQs | Task 10 |
| generate-scripts huecos humanos | Task 11 |
| Botón entrada en home | Task 12 |
| HumanizeButton en Library | Task 12 |
| Auto-save + resume session | Task 3 (SessionContext) |
| Estado 'completed' + redirect | Task 4 (SessionLayout) |

**Notas importantes para el implementador:**

1. La tabla `content_slots` puede no tener las columnas `hook`, `description`, `pilar`, `tipo_contenido`, `cta` — verificar schema real antes de Task 6 y añadir `ALTER TABLE content_slots ADD COLUMN IF NOT EXISTS ...` si faltan.
2. La tabla `calendar_events` puede tener nombre distinto — verificar en Supabase antes de Task 9.
3. En Task 8, el `HumanizeButton.onHumanized` recibe texto plano del guion humanizado — la integración con los campos individuales (gancho/desarrollo/cierre/cta) es simplificada. Si se quiere parseo completo, extender el endpoint para devolver JSON estructurado.

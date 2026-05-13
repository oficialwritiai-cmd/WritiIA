# WRITI.AI — Modo Sesión: Design Spec
**Fecha:** 2026-05-13  
**Estado:** Aprobado por usuario — listo para implementación

---

## 1. Objetivo

Añadir `/dashboard/session` como página guiada de 4 pasos donde un coach/consultor/creador educativo entra, define su negocio, genera ideas y guiones, y monta un mini calendario — todo en una sola sesión de 30–60 minutos.

**Resultado esperado al finalizar:**
- Cerebro IA configurado (bio, audiencia, pilares, FAQs)
- 4–8 ideas de contenido seleccionadas
- 2–6 guiones con huecos para historias personales
- Mini calendario con contenidos ubicados en 2–4 semanas

---

## 2. Punto de entrada

Botón **"Empezar sesión de planificación"** en `/dashboard/home` (o en el dashboard principal). Navega a:

```
/dashboard/session?project=<project_id>
```

Si no hay `project` en la URL → mostrar mensaje "Selecciona un proyecto primero."

---

## 3. Flujo de 4 pasos

| Paso | Ruta interna | Tiempo estimado | Descripción |
|------|-------------|-----------------|-------------|
| 1 | `currentStep=1` | ~8 min | Cerebro IA (review/edit o wizard completo) |
| 2 | `currentStep=2` | ~5 min | Generación y selección de ideas |
| 3 | `currentStep=3` | ~10 min | Generación de guiones + humanizar |
| 4 | `currentStep=4` | ~5 min | Mini calendario y distribución |

---

## 4. Arquitectura — Opción C (Context + Reducer, página única)

### 4.1 Árbol de componentes

```
SessionProvider (SessionContext.js)
└── page.js  →  /dashboard/session
    └── SessionLayout.js  (barra de progreso + auto-save indicator)
        ├── SessionStep1Brain.js
        ├── SessionStep2Ideas.js
        ├── SessionStep3Scripts.js
        └── SessionStep4Calendar.js

Componente reutilizable (fuera del session flow):
└── HumanizeButton.js  (usado en Step3 Y en Library/editor)
```

### 4.2 Estructura de archivos nuevos

```
app/
  dashboard/
    session/
      page.js                  ← punto de entrada, provee SessionProvider
      SessionLayout.js         ← barra progreso sticky + guards
      SessionStep1Brain.js     ← paso 1
      SessionStep2Ideas.js     ← paso 2
      SessionStep3Scripts.js   ← paso 3
      SessionStep4Calendar.js  ← paso 4
  components/
    SessionContext.js          ← context + reducer + auto-save
    HumanizeButton.js          ← botón reutilizable (sesión + library)
  api/
    humanize-script/
      route.js                 ← NUEVO endpoint
```

**Archivos modificados:**
- `app/api/generate-ideas/route.js` — prompt actualizado (pilares + FAQs)
- `app/api/generate-scripts/route.js` — añadir huecos humanos al prompt
- `app/dashboard/home/page.js` — añadir botón "Empezar sesión"
- `app/dashboard/library/page.js` — añadir `HumanizeButton` en cada guion

---

## 5. Base de datos

### 5.1 Nueva tabla `sessions`

```sql
CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  project_id          UUID REFERENCES projects(id),
  current_step        INT DEFAULT 1,
  status              TEXT DEFAULT 'active',  -- active | completed | abandoned
  content_pillars     TEXT[] DEFAULT '{}',
  session_faqs        TEXT[] DEFAULT '{}',
  time_horizon        TEXT DEFAULT '1month',  -- '2weeks' | '1month'
  selected_idea_ids   UUID[] DEFAULT '{}',
  script_ids          UUID[] DEFAULT '{}',
  calendar_event_ids  UUID[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- Solo una sesión activa por proyecto
CREATE UNIQUE INDEX sessions_active_unique
  ON sessions(user_id, project_id) WHERE status = 'active';

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON sessions USING (auth.uid() = user_id);
```

### 5.2 Columnas a añadir en tablas existentes

```sql
-- Permite filtrar ideas y scripts por sesión sin joins complejos
ALTER TABLE ideas   ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
-- status valores: 'draft' | 'ready' | 'recorded' | 'published'
```

### 5.3 Tablas existentes reutilizadas (sin otros cambios)

| Tabla | Uso en sesión |
|-------|--------------|
| `project_brains` | Leída en paso 1; actualizada al confirmar cerebro |
| `ideas` | Insertadas en paso 2 con `session_id`; ids en `sessions.selected_idea_ids` |
| `scripts` | Insertados en paso 3 con `session_id` y `status='draft'`; ids en `sessions.script_ids` |
| `calendar_events` | Insertados en paso 4; ids en `sessions.calendar_event_ids` |

---

## 6. SessionContext — estado y acciones

### 6.1 Shape del estado

```javascript
const initialState = {
  // Meta
  sessionId: null,
  projectId: null,
  currentStep: 1,          // 1 | 2 | 3 | 4
  status: 'idle',           // idle | active | completed
  loading: true,
  saving: false,
  error: null,

  // Paso 1
  brain: null,              // objeto project_brains
  contentPillars: [],       // string[]
  sessionFAQs: [],          // string[]
  timeHorizon: '1month',    // '2weeks' | '1month'
  brainSaved: false,        // true si project_brains tiene datos

  // Paso 2
  generatedIdeas: [],       // Idea[]
  selectedIdeaIds: [],      // string[] (UUIDs)

  // Paso 3
  scripts: [],              // Script[]

  // Paso 4
  calendarEvents: [],       // CalendarEvent[]
};
```

### 6.2 Acciones del reducer

```javascript
'INIT'          // payload: Partial<SessionState> — carga inicial desde Supabase
'SET_STEP'      // payload: 1|2|3|4
'SET_BRAIN'     // payload: BrainData
'SET_PILLARS'   // payload: string[]
'SET_FAQS'      // payload: string[]
'SET_IDEAS'     // payload: Idea[]
'TOGGLE_IDEA'   // payload: string (id)
'ADD_SCRIPT'    // payload: Script
'UPDATE_SCRIPT' // payload: { id, changes }
'SET_CALENDAR'  // payload: CalendarEvent[]
'SET_SAVING'    // payload: boolean
'SET_ERROR'     // payload: string|null
'COMPLETE'      // sin payload
```

### 6.3 Helpers expuestos por el contexto

| Función | Cuándo se llama |
|---------|----------------|
| `persistStep(extra?)` | Al completar cada paso (inmediato) |
| `debouncedSave(extra?)` | Al editar campos en paso 1 (1s debounce) |
| `completeStep(step, extra?)` | Avanza `currentStep` + guarda |
| `completeSession()` | Paso 4 finaliza — marca `status='completed'` |

### 6.4 Lógica de carga inicial

1. Busca en `sessions` donde `user_id = user.id AND project_id = projectId AND status = 'active'`
2. Si existe → fetch paralelo de `project_brains`, `ideas` (selected), `scripts` → dispatch `INIT`
3. Si no existe → insert nueva fila en `sessions` → fetch `project_brains` si hay cerebro previo → dispatch `INIT`

---

## 7. Detalle de cada paso

### Paso 1 — `SessionStep1Brain.js`

**Lógica de bifurcación:**

```
¿brain existe en project_brains?
  SÍ →  Mostrar resumen (bio, audiencia, estilo) + campos editables inline
        + campos nuevos: contentPillars (textarea, 1 por línea)
        + sessionFAQs (textarea, 1 por línea)
        + timeHorizon (selector: 2 semanas / 1 mes)
        → Botón "Confirmar y generar ideas"

  NO →  Embeber BrainWizardModal como componente inline (sin overlay/modal)
        5 preguntas del wizard actual en la propia página
        + campos nuevos al final: contentPillars + sessionFAQs + timeHorizon
        → Botón "Generar Cerebro IA y continuar"
        → llama a /api/generate-brain → guarda en project_brains
        → dispatch SET_BRAIN → completeStep(1)
```

**Guardado:** debouncedSave (1s) al editar pilares/FAQs/campos del cerebro.

---

### Paso 2 — `SessionStep2Ideas.js`

- Llama a `/api/generate-ideas` con contexto: `brain + contentPillars + sessionFAQs + timeHorizon`
- Muestra 15–20 ideas agrupadas por pilar
- Usuario puede seleccionar 4–8 ideas con toggle (click)
- Botón "Generar más ideas" (costo 1 crédito, max 2 veces)
- Al avanzar: inserta ideas seleccionadas en tabla `ideas` (con `session_id`) → guarda ids en `sessions.selected_idea_ids`

**Límites UX:** mínimo 2 ideas seleccionadas para avanzar.

---

### Paso 3 — `SessionStep3Scripts.js`

- Por cada idea seleccionada, genera 1 guion llamando a `/api/generate-scripts`
- Generación en paralelo (igual que el endpoint actual)
- Cada guion muestra: hook, desarrollo (con huecos `[...]`), cierre, CTA
- Editor inline para editar el guion
- `HumanizeButton` bajo cada guion (llama a `/api/humanize-script`, costo 1 crédito)
- Toggle de formato: Reel 60s / YouTube 3min / Post texto
- Al avanzar: guiones insertados en `scripts` con `session_id` y `status='draft'`

---

### Paso 4 — `SessionStep4Calendar.js`

- Mini calendario **nuevo y simple** (no reutiliza el componente existente de calendar)
- Vista de 2 o 4 semanas según `timeHorizon`
- Muestra guiones como tarjetas arrastrables a días del calendario
- IA sugiere distribución automática (3–4 publicaciones/semana, variando pilares)
- Al finalizar: inserta `calendar_events` con `session_id` → llama a `completeSession()`
- Redirige a `/dashboard/calendar` mostrando los eventos recién creados

---

## 8. Endpoints de API

### 8.1 `/api/generate-ideas` — prompt actualizado

El `systemPrompt` incorpora `contentPillars` y `sessionFAQs`:

```
Eres estratega de contenido para coaches, consultores y creadores educativos.

CEREBRO DEL CREADOR:
- Bio: {brain.biography}
- Audiencia: {brain.audience}
- Estilo: {brain.style_words}

PILARES DE CONTENIDO:
1. {pilar1}
2. {pilar2}
...

PREGUNTAS FRECUENTES DE SUS CLIENTES:
- {faq1}
- {faq2}
...

REGLAS CRÍTICAS:
1. Ideas REALES y ESPECÍFICAS para este nicho — nada genérico.
2. Al menos 2 ideas por pilar.
3. Incluir ideas basadas en las FAQs de clientes.
4. Cada idea tiene hook diferenciado (pregunta, dato, historia, controversia).
5. El campo "pilar" DEBE coincidir con uno de los pilares listados.

Responde únicamente con JSON array:
[{ "titulo", "hook", "descripcion", "pilar", "tipo", "cta" }]
```

### 8.2 `/api/generate-scripts` — añadir huecos humanos

Añadir al `buildSystemPrompt()` existente:

```
HUECOS PARA HUMANIZAR (OBLIGATORIO):
En cada bloque de desarrollo, incluye una línea entre corchetes:
  [Aquí añade una anécdota tuya sobre esto]
  [Comparte un ejemplo real de un cliente que vivió esto]
  [Cuéntales cuándo tú mismo cometiste este error]
Estos huecos son para que el creador personalice. NO los omitas.
```

### 8.3 `/api/humanize-script/route.js` — NUEVO

**Costo:** 1 crédito  
**Modelo:** `claude-haiku-4-5-20251001`

**Prompt del sistema:**

```
Eres editor de contenido especializado en voz humana para creadores digitales.

ESTILO DE LA MARCA: {brain.style_words}
TONO: {brain.values_tone}

REGLAS (en orden de prioridad):
1. MISMO IDIOMA: Detecta el idioma del guion original y responde en ese mismo idioma.
2. SIN FRASES ROBÓTICAS: Elimina "En este valioso contenido...", 
   "Como mencioné anteriormente...", "Es importante destacar que..."
3. FRASES CORTAS: Habla como en una conversación real.
4. HUECOS HUMANOS: Después de cada punto clave añade:
   [Aquí añade una anécdota tuya sobre esto]
5. MISMA ESTRUCTURA: Mantén hook, desarrollo, cierre, CTA — no añadas ni elimines puntos.
6. TIMESTAMPS: Si el guion incluye marcas de tiempo (ej: 0:00, 1:30), consérvelas exactamente.
7. NO INVENTES: No añadas logros, datos o historias que no estaban.
```

---

## 9. Componente `HumanizeButton.js`

Reutilizable en dos contextos:

| Contexto | Ubicación |
|----------|-----------|
| Modo Sesión paso 3 | Bajo cada guion en `SessionStep3Scripts` |
| Library | Bajo cada guion en `app/dashboard/library/page.js` |
| Editor de guion | En `app/components/SheetEditor.js` |

**Props:** `{ scriptText, projectId, onHumanized }`  
**Costo:** 1 crédito por uso  
**Estado:** loading / idle  
**Error:** dispara `show-no-credits` si código 402

---

## 10. Botón de entrada en el dashboard

En `app/dashboard/home/page.js`, añadir debajo del bloque hero actual:

```jsx
<button onClick={() => router.push(`/dashboard/session?project=${activeProjectId}`)}>
  ✨ Empezar sesión de planificación del mes
</button>
```

**Texto del empty state** si no hay proyecto activo:
> "Crea un proyecto primero para iniciar una sesión de planificación."

---

## 11. Consideraciones de créditos

| Acción | Costo |
|--------|-------|
| Generar Cerebro IA | 2 créditos (sin cambio) |
| Generar ideas (initial) | 1 crédito (sin cambio) |
| Generar más ideas (extra) | 1 crédito |
| Generar 1 guion (≤2min) | según `getScriptCost()` actual |
| Humanizar guion | 1 crédito |

Los créditos se cobran progresivamente por paso, no todos al inicio.

---

## 12. Resumen de integraciones clave

- `SessionContext` sigue el mismo patrón que `ProjectContext` (ya existente) → arquitectura consistente
- `BrainWizardModal` se convierte en componente inline en Step1 (sin overlay) cuando no hay cerebro
- El calendario del paso 4 es **nuevo y simple** — no reutiliza `app/dashboard/calendar/page.js`
- Los `calendar_events` creados en paso 4 **sí aparecen** en el calendario existente (misma tabla)
- `HumanizeButton` reutiliza la misma llamada API en todos los contextos
- Session persistence: un único fetch inicial + saves por paso = mínimo tráfico a Supabase

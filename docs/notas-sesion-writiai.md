# WRITI.AI — Notas de sesión de desarrollo

> Resumen completo del trabajo realizado. Fecha: 2026-05-16

---

## 1. Qué se construyó / modificó

| Área | Descripción |
|------|-------------|
| **Landing page** | Rediseño clonando Emergent AI: galaxy background canvas + astronaut con parallax, navbar con inline styles, liquid-glass violet |
| **Dashboard shell** | Rediseño saleads.ai: sidebar 64px icon-only hover-expand, topbar 52px, breadcrumb, credits pill |
| **Dashboard Home** | "Personal Business Hub": StatCards, ActionCards, BrainCard, grid de proyectos |
| **Login page** | Aurora two-column con video background de CloudFront |
| **Matrix (wizard 4 pasos)** | Brain → Ideas → Scripts → Calendar |
| **Library** | Rediseño con SheetEditor estilo Notion |
| **Calendar** | Rediseño Google Calendar style: mini-calendar sidebar, week/month view, hour grid |

---

## 2. Archivos clave y qué hacen

### `app/landing/Landing.jsx`
- GalaxyBackground va **FUERA** del content div (fix z-index stacking context)
```jsx
<GalaxyBackground />  // z-index: 0, fuera
<div id="landing-root" style={{ position:'relative', zIndex:1 }}>
  <Navbar /><main>...</main><Footer />
</div>
```

### `app/landing/GalaxyBackground.jsx`
- Canvas warp-speed galaxy + astronaut con parallax
- Usa `window.innerWidth` (NO `canvas.clientWidth` — es read-only)
- Astronaut desde `/assets/astronaut.png`

### `app/landing-tailwind.css`
- Clases custom: `liquid-glass`, `btn-primary`, `astro-wrap`
- Reset crítico para nav links:
```css
#landing-root a, #landing-root a:link, #landing-root a:visited {
    text-decoration: none; color: inherit;
}
#landing-root ul, #landing-root ol { list-style: none; margin: 0; padding: 0; }
```

### `app/dashboard/layout.js`
- ~1240 líneas
- **NO tocar líneas 1–400** (auth, useEffects, handleCheckout, handleLogout)
- Solo editar el bloque `return()` después del loading guard
- Design tokens: bg `#0c0c0e`, sidebar `#111116`, topbar `#13131a`, accent `#7c3aed`

### `app/dashboard/home/page.js`
- ActionCard Matrix detecta si existe cerebro:
```jsx
title={brain?.biography ? "Nueva sesión Matrix" : "Plan mensual de contenido"}
btnLabel={brain?.biography ? "⚡ Generar nuevas ideas" : "Iniciar Matrix"}
```

### `app/login/page.js`
- Video: `https://d8j0ntlcm91z4.cloudfront.net/...`
- Todos los redirects apuntan a `/dashboard/home`
- `handleGoBack = () => router.push('/')`

### `app/dashboard/session/SessionStep1Brain.js`
- 6 bloques: Bio / Audiencia / Oferta / Estilo / Pilares / FAQs
- Auto-save con debounce 1.5s a `project_brains`
- `handleConfirm()` → dispatch SET_BRAIN + upsert project_brains → avanza

### `app/dashboard/session/VoiceModal.js`
- Mic animado reacciona al volumen vía Web Audio API AnalyserNode
- SpeechRecognition para transcripción en tiempo real
- Fix crítico: `stopRecording()` espera evento `recognition.onend` antes de leer `accTextRef.current`

### `app/dashboard/session/BrainImproveModal.js`
- Muestra diff antes/después
- Soporte `target: 'field'` con prop `customFields`
- Texto mejorado (verde) arriba, original (tachado) abajo

### `app/dashboard/session/SessionStep2Ideas.js`
- 24 ideas via full brain context, cookie auth
- `appendMode` param para preservar selecciones al generar más
- Auto-guarda ideas en library
- Crea content_plan primero (plan_id NOT NULL constraint):
```js
const { data: planData } = await supabase.from('content_plans').insert({
    user_id: user.id, project_id: projectId || null,
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    frequency: 'diaria', platforms: ['Reels','TikTok','YouTube Shorts'],
    focus: '...',
}).select().single();
```

### `app/dashboard/session/SessionStep3Scripts.js`
- Cards con Hook (borde púrpura), Desarrollo, CTA (borde verde), Copy post
- Auto-guarda en library con columnas correctas: `titulo`, `script_full_text`, `content` (JSONB)

### `app/dashboard/session/SessionStep4Calendar.js`
- `getPostingDays(needed)` genera suficientes Lun/Mié/Vie para todos los slots
- `forceSave()` guarda en DOS tablas: `content_slots.scheduled_date` + `calendar_events`
- Date picker nativo con colorScheme dark

### `app/api/optimize-brain/route.js`
- Cookie auth (no Bearer token)
- Targets: `field`, `brain`, `context`, `suggestions`, `brand_audit`
- `parseClaudeResponse()` maneja tanto objeto como string

### `app/api/generate-ideas/route.js`
- Cookie auth
- Contexto completo del cerebro en el prompt: pilares, FAQs, learning_notes
- count: 24, prompt viral-focused año 2026

### `app/components/SheetEditor.js`
- Estilo Notion, auto-save 1.5s debounce
- Secciones: Hook (borde izq. púrpura), Desarrollo, CTA (verde), Copy (azul), Texto completo
- Status: "Guardando…" / "Guardado ✓"

### `app/dashboard/library/page.js`
- Query SIN filtro project_id → muestra TODOS los items del usuario
- Cards abren SheetEditor al click

### `app/dashboard/calendar/page.js`
- Google Calendar style dark mode
- Sidebar izq. con mini-calendario
- Topbar: botón Today, nav, tabs Día/Semana/Mes
- Week view con hour grid + bloques de eventos coloreados
- Month view con pills de eventos
- Panel con botón "Editor completo" → SheetEditor

### `lib/anthropic.js`
- Modelos actualizados: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`
- Interceptor de errores de billing

### `lib/validations.js`
- `GenerateIdeasSchema`: context max 2000, pillars max 500, FAQs max 1000

### `middleware.js`
- Anti-loop redirect → `/dashboard/home`

### `next.config.js`
- CSP: `media-src https://d8j0ntlcm91z4.cloudfront.net`
- Permissions-Policy micrófono: `(self)`

---

## 3. Bugs resueltos y sus fixes

| Bug | Causa | Fix |
|-----|-------|-----|
| GalaxyBackground invisible | z-index stacking context: bg div tapaba canvas | Mover fuera del content div |
| Links nav azules | `a:link` pseudo [0,1,0,1] > Tailwind [0,1,0,0] | `#landing-root a:link { color: inherit }` |
| Botones blanco-sobre-blanco | Tailwind JIT no escanea clases en ternarios | Inline styles para colores críticos |
| `canvas.clientWidth` error | Propiedad read-only | Usar `canvas.style.width` + `canvas.width` |
| "No autorizado" en API | `getServerSession` necesita Bearer, browser manda cookies | `createServerClient` con SSR cookies |
| "Datos inválidos" | Schema max(100) por pilar, voz lo excedía | Aumentar a max(500/1000) |
| content_slots error columnas | Columnas inventadas no existen en DB | Solo usar columnas reales del generate-plan route |
| plan_id NOT NULL error | content_slots requiere plan_id | Insertar en content_plans primero |
| `a?.replace is not a function` | lib/anthropic.js devuelve objeto, no string | `parseClaudeResponse()` verifica typeof |
| Suggestions vacías | processResponse extrae array directo `["p1","p2"]` | Prompts en texto plano, parsear línea a línea |
| Library no muestra scripts | Query filtraba por project_id | Quitar filtro |
| Eventos calendario no guardaban | Solo actualizaba content_slots | Insertar también en calendar_events |
| Transcripción voz no guardaba | `recognition.stop()` es async | Esperar evento `onend` antes de leer ref |

---

## 4. Patrones establecidos

### Cookie auth (todas las rutas de API browser-originated)
```js
import { createServerClient } from '@supabase/ssr';
const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
);
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
```

### parseClaudeResponse() — maneja objeto o string
```js
function parseClaudeResponse(response) {
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null) {
        return response.text || response.content || JSON.stringify(response);
    }
    return String(response);
}
```

### Debounced auto-save
```js
const saveTimerRef = useRef(null);
function debouncedSave(newData) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => actualSave(newData), 1500);
}
```

### Estrategia de dos tablas para el calendario
- `content_slots.scheduled_date` — para el paso 4 del Matrix
- `calendar_events` — fuente de verdad que lee el calendario

---

## 5. Tablas Supabase usadas

| Tabla | Para qué |
|-------|----------|
| `project_brains` | Cerebro del usuario (6 bloques) + learning_notes |
| `content_plans` | Plan mensual (requerido antes de content_slots) |
| `content_slots` | Ideas/guiones individuales con scheduled_date |
| `calendar_events` | Eventos del calendario (fuente de verdad) |
| `library` | Guiones guardados: `user_id, project_id, type, platform, goal, titulo, script_full_text, content JSONB` |

---

## 6. Stack técnico

- **Framework:** Next.js 14 App Router
- **Auth/DB:** Supabase SSR (`@supabase/ssr`)
- **AI:** Anthropic Claude (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`)
- **CSS:** Inline styles + `<style>` tags (NO Tailwind en dashboard), Tailwind v3 solo en `app/landing/**`
- **Icons:** lucide-react
- **Voice:** Web Speech API (SpeechRecognition)
- **Audio viz:** Web Audio API (AnalyserNode)
- **Deploy:** Vercel (branch main → auto-deploy)

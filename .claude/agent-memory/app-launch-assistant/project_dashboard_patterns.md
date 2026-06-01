---
name: WRITI.AI Dashboard page.js patterns
description: Estados UX críticos, estructura de bloques condicionales, convenciones de inline styles en app/dashboard/page.js (~4800+ líneas)
type: project
---

## Archivo
`app/dashboard/page.js` — Next.js 14, 'use client', ~4900 líneas. NO Tailwind, SOLO inline styles.

## Estados UX añadidos (commit 6337c2c)
- `activeScriptTab` (useState 0): índice del tab activo en step===3 single. Controla qué guión se muestra.
- `planPhase` (useState 1): disponible para fases del plan mensual (no usado aún en wizard, preparado).

## Bloques condicionales clave
- `step === 1 && generationMode === 'single'` → línea ~2266: Wizard 4 pasos (wizardStep 1-4)
- `step === 1 && generationMode === 'plan'` → línea ~3013: Plan wizard (planWizardStep 1-4)
- `step === 2` → loader (GenerationProgress)
- `step === 3 && generationMode === 'single'` → línea ~3523: Editor de guiones con tabs
- `step === 3 && generationMode === 'plan'` → línea ~4272: Grid de plan slots

## Reglas ABSOLUTAS de edición
- NO tocar: handleGenerateSingle, handleGeneratePlan, handleSaveAll, handleGenerateSlotScript
- NO tocar: sistema de créditos, Stripe, Cerebro IA (brainProfile, projectBrain)
- NO cambiar: datos enviados a API en los fetch()

## Convenciones de color del sistema
- Púrpura primario: #7c3aed / rgba(124,58,237,...)
- Púrpura claro texto: #a78bfa
- Teal legacy: #7ECECA (mantener en secciones plan para consistencia)
- Fondo cards oscuro: rgba(255,255,255,0.03)
- Bordes sutiles: rgba(255,255,255,0.08)

## Patrón .map() con índice activo (tabs)
El map de scripts usa `filter + map` con índice explícito:
```js
scripts.filter((_, i) => scripts.length === 1 || i === activeScriptTab).map((s, _mapIdx) => {
    const i = scripts.length === 1 ? 0 : activeScriptTab;
    return (...);
})
```
El cierre usa `); }` (no `))`) porque el map body usa llaves `{}`.

## Plan slots grid
`step===3 plan` usa `display: grid, gridTemplateColumns: repeat(auto-fill, minmax(300px, 1fr))`.
Cada card tiene animación `cardFadeIn` escalonada con `i * 0.04s`.

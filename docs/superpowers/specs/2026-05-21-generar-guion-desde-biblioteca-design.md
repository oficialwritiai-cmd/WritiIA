# Generar guión desde idea en Biblioteca

**Fecha:** 2026-05-21  
**Estado:** Aprobado

---

## Problema

Las ideas guardadas en la biblioteca que no tienen guión asociado no ofrecen ninguna acción directa para generar uno. El usuario tiene que salir manualmente, ir al Matrix, escribir la idea de nuevo y luego guardar. Flujo innecesariamente largo.

---

## Objetivo

Desde la biblioteca, el usuario puede generar un guión para cualquier idea que no tenga uno — con la idea pre-rellena automáticamente — y guardarlo vinculado a la idea original. Si el guión ya está también en el calendario, ambos se sincronizan al actualizar.

---

## Cambios en scope

### 1. Detectar ideas sin guión (solo cliente, sin llamada a DB extra)

Al cargar la biblioteca ya se tienen todos los items. Se construye un `Set` con los `source_idea_id` de los items `type === 'guion'`:

```js
const ideasConGuion = new Set(
  scripts
    .filter(s => s.type === 'guion' && s.source_idea_id)
    .map(s => s.source_idea_id)
);
// idea sin guión = !ideasConGuion.has(item.id)
```

### 2. Cambios visuales en tarjeta de idea

Solo en tarjetas con `type === 'idea'` y sin guión:

- **Badge "Sin guión"** — junto al badge de tipo, color verde pálido (`rgba(52,211,153,0.15)` / `#34d399`)
- **Botón "Generar guión"** — en el footer, entre "Planificar" y "Copiar", con icono `Sparkles`

Las ideas que ya tienen guión muestran un badge **"Con guión"** (violeta) y no muestran el botón.

### 3. Flujo al pulsar "Generar guión"

Sin modal intermedio. Directamente:

```js
sessionStorage.setItem('from_idea_context', JSON.stringify({
  from_idea: true,
  idea_title: item.titulo || item.content?.titulo || item.content?.titulo_idea,
  source_idea_id: item.id,
  source_type: 'library',
  platform: item.platform || 'Reels',
}));
router.push('/dashboard?from_idea=1');
```

El wizard del Matrix lee este contexto al montar (`ScriptWizardFlow.js` ya tiene esta lógica), pre-rellena `topic` y `platform`, salta a fase 3.

El post-save del Matrix ya vincula `source_idea_id` en el item de biblioteca y actualiza `calendar_event.has_script + script_id` si existe contexto de calendario. Para `source_type: 'library'` solo necesita guardar el `source_idea_id` en el nuevo item de biblioteca.

### 4. Sincronización biblioteca ↔ calendario

**Cuándo:** cuando se actualiza un item `type === 'guion'` en la biblioteca (título via `handleUpdateItem`).

**Cómo:** tras el `update` en `library`, buscar si existe un `calendar_event` con `script_id = item.id`. Si existe, actualizar `calendar_events.title` con el nuevo título. Silencioso — sin toast ni modal.

```js
// En handleUpdateItem, si updates incluye 'titulo':
const { data: event } = await supabase
  .from('calendar_events')
  .select('id')
  .eq('script_id', id)
  .single();

if (event) {
  await supabase
    .from('calendar_events')
    .update({ title: updates.titulo })
    .eq('id', event.id);
}
```

---

## Fuera de scope

- Sincronizar el contenido completo del guión en el evento de calendario (solo título)
- Modal de configuración antes de navegar al Matrix
- Generar el guión inline en la biblioteca
- Cambios en la API, webhook, créditos o Stripe

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `app/dashboard/library/page.js` | Detectar ideas sin guión, badge, botón, flujo sessionStorage + navigate, sync en handleUpdateItem |

No se toca ningún otro archivo.

---
name: WRITI.AI Supabase Schema Key Tables
description: Tablas Supabase correctas para queries en dashboard home (verificadas en código)
type: project
---

Tablas confirmadas en uso activo:

- `library` — guiones e ideas. Campos clave: `user_id`, `type` ('guion' | 'idea'), contenido
- `project_brains` — cerebro IA por proyecto. Campos: `project_id`, `biography`, `audience`, `products_services`, `style_words`, `content_pillars` (array), `faqs` (array)
- `sessions` — sesiones Matrix. Campos: `user_id`, `current_step`, `status` ('active'), `created_at`
- `projects` — proyectos del usuario. Campos: `user_id`, `name`, `description`, `is_deleted`, `metadata`
- `users_profiles` — perfil. Campos: `id`, `full_name`, `name`, `email`, `credits_balance`, `plan`
- `activity_logs` — logs de acciones. Campos: `user_id`, `project_id`, `action`

**Why:** El contador de guiones estaba roto porque consultaba `content_slots` en lugar de `library`. La tabla correcta es `library` con `type = 'guion'`.

**How to apply:** Siempre verificar tabla `library` para estadísticas de guiones, NO `content_slots`.

TABLA INCORRECTA (no usar para contar guiones):
- ~~`content_slots` con `script_content not null`~~ — era el query buggy original

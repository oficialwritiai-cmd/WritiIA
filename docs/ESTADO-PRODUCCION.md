# WRITI.AI — Estado de Producción
**Versión:** v1.0-stable-post-audit  
**Fecha:** 2026-05-17  
**Deploy:** Vercel (auto-deploy en push a `main`)  
**Repositorio:** github.com/oficialwritiai-cmd/WritiIA

---

## ✅ FUNCIONA EN PRODUCCIÓN

### Core — Matrix (4 pasos)
| Función | Estado | Notas |
|---|---|---|
| Step 1 — Cerebro IA (6 bloques) | ✅ | Bio/Audiencia/Oferta/Estilo/Pilares/FAQs. Auto-save 1.5s. Voz en cada bloque. |
| Cerebro IA — botón Mejorar | ✅ | API `/api/optimize-brain` con cookie auth |
| Cerebro IA — BrandAudit | ✅ | Análisis completo + export PDF |
| Step 2 — Generación de 24 ideas | ✅ | Context completo del cerebro. `appendMode` para "Generar más" |
| Step 2 — Ideas guardadas en Biblioteca | ✅ | Auto-save al generar |
| Step 3 — Generación de guiones | ✅ | API `/api/slots/[id]/generate-script`. Auto-save en Biblioteca. |
| Step 3 — Variantes (Storytelling/Educativo/Provocador) | ✅ | Sin sobreescribir original |
| Step 4 — Calendario Matrix | ✅ | Fechas Lun/Mié/Vie. Guarda en `calendar_events` Y `content_slots` |
| Fast-track "Saltar directo a Ideas" | ✅ | Cuando brain ya existe |

### Generación Rápida de Guiones
| Función | Estado | Notas |
|---|---|---|
| Flujo 3 fases (Idea → Historia → Detalles) | ✅ | ScriptWizardFlow component |
| Transcripción de voz en tiempo real | ✅ | SpeechRecognition browser API |
| Historia con voz (/dashboard/voice) | ✅ | sessionStorage (no URL) — privado |
| Pantalla de carga animada con tips | ✅ | GenerationProgress component |
| Fast-track desde dashboard (brain configurado) | ✅ | Salta a fase 4 directamente |
| Descarga .docx profesional | ✅ | Librería `docx` v9.6.1 |

### Plan Mensual de Contenido
| Función | Estado | Notas |
|---|---|---|
| Flujo 4 pasos del wizard | ✅ | Plataformas → Estrategia → Voz → Confirmar |
| Estrategia Confirmada (paso 4) | ✅ | Parsea markdown de la IA en pillars visuales |
| Cards de ideas resultado | ✅ | Lista columna única, expandible |
| Generación masiva de guiones | ✅ | `handleBatchGenerateScripts` secuencial |
| Sincronizar al calendario | ✅ | `handleConfirmAndSync` |

### Biblioteca
| Función | Estado | Notas |
|---|---|---|
| Muestra TODOS los guiones del usuario | ✅ | Sin filtro de proyecto (intencional) |
| Búsqueda multi-campo | ✅ | titulo, gancho, script_full_text, goal |
| Filtro plataforma / tipo / favoritos | ✅ | |
| SheetEditor estilo Notion (editor completo) | ✅ | 2 columnas, stats, auto-save 800ms, descarga .docx |
| Feedback 👍/👎 por guión | ✅ | Guarda en `script_performance` |
| Modal de métricas (views/likes/comentarios) | ✅ | Alimenta `cerebro_learning_signals` |
| Sistema de aprendizaje automático | ✅ | Score por hook_style y tono |
| Compartir guión (link público) | ✅ | `/share/[token]` con CTA viral |

### Calendario
| Función | Estado | Notas |
|---|---|---|
| Vista Mes (default) | ✅ | Pills estilo Google Calendar |
| Vista Semana + franja "Todo el día" | ✅ | Slots del Matrix en franja superior |
| Vista Día | ✅ | |
| Crear / Editar / Eliminar eventos | ✅ | Botón Eliminar visible en panel |
| Guardar notas en panel | ✅ | Solo `calendar_events` (no content_slots) |
| Color picker por evento | ✅ | 7 colores, guarda inmediato |
| Selección múltiple + eliminar | ✅ | Botón "☑ Seleccionar varios" en topbar |
| Sincronización calendar ↔ biblioteca | ✅ | `reference_id` apunta a `library.id` real |
| Editor completo (SheetEditor) desde calendario | ✅ | Busca guión por ID real, luego por título |

### Dashboard
| Función | Estado | Notas |
|---|---|---|
| Stats (guiones mes, biblioteca, horas ahorradas) | ✅ | Con iconos Lucide, animación countUp |
| CTA dinámico según estado del usuario | ✅ | Sin brain / Con brain sin guiones / Con guiones |
| Barra progreso Cerebro IA (% completado) | ✅ | Lee 6 bloques de project_brains |
| Widget "Tu Cerebro IA está aprendiendo" | ✅ | Señales dominantes cuando hay 3+ feedbacks |
| Fast-track "Crear guión ahora" | ✅ | Visible cuando brain está configurado |
| Card "Cuenta tu historia con voz" | ✅ | Lleva a /dashboard/voice |
| Horas ahorradas en home | ✅ | guiones × 0.75h |

### Observabilidad
| Función | Estado | Notas |
|---|---|---|
| Sentry (errores) | ✅ | DSN configurado, esperando primer error |
| PostHog (analytics) | ✅ | Key en Vercel env vars |
| Admin logs (/admin/logs) | ✅ | Solo acceso para ss.companyes@gmail.com |
| Tabla `app_logs` en Supabase | ✅ | Creada con RLS |

---

## 🔴 BUGS RESUELTOS EN AUDITORÍA v1.0

1. **Créditos cobrados antes de la IA** → cobro ahora es post-éxito
2. **Pilares/FAQs no persistían en project_brains** → `handleConfirm` y `debouncedBrainSave` los incluyen
3. **Transcript de voz en URL** → ahora usa sessionStorage
4. **content_slots columnas inexistentes** → solo se actualizan las columnas que existen
5. **Calendar events no guardaban** → dos tablas: content_slots + calendar_events
6. **Library mostraba 0 guiones** → query sin filtro de project_id
7. **Auto-save SheetEditor stale closure** → latestRef pattern
8. **`copy_content` column not found** → eliminado del update
9. **Duplicados en calendario** → solo se cargan calendar_events, no content_slots

---

## 🗄️ BASE DE DATOS — Tablas usadas

| Tabla | Para qué |
|---|---|
| `auth.users` | Supabase auth nativa |
| `users_profiles` | Plan, créditos, email |
| `projects` | Multi-proyecto |
| `project_brains` | Cerebro IA: bio, audience, products_services, style_words, content_pillars, session_faqs |
| `sessions` | Estado de sesión Matrix (current_step, content_pillars, session_faqs) |
| `content_plans` | Plan mensual (requerido antes de content_slots) |
| `content_slots` | Ideas/guiones del Matrix con scheduled_date |
| `scripts` | Guiones generados (tabla secundaria, non-fatal si falla) |
| `library` | Fuente de verdad de guiones: titulo, platform, type, script_full_text, content JSONB, goal |
| `calendar_events` | Eventos del calendario. `reference_id` → library.id |
| `brand_brain` | Cerebro legacy (fallback si no hay project_brains) |
| `script_performance` | Feedback 👍/👎 + métricas por guión |
| `cerebro_learning_signals` | Señales aprendidas: hook_style, tone, performance_score |
| `app_logs` | Logs internos del sistema |

---

## 🔑 VARIABLES DE ENTORNO EN VERCEL

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
ADMIN_EMAIL=ss.companyes@gmail.com
```

---

## 📦 DEPENDENCIAS CLAVE

- `next` 14 App Router
- `@supabase/ssr` — auth via cookies
- `@sentry/nextjs` — observabilidad
- `posthog-js` — analytics
- `docx` v9.6.1 — exportar Word
- `jspdf` v4.2 — PDF (disponible)
- `lucide-react` — iconos

---

## 🚀 DEPLOY

```bash
git push origin main  # → Vercel auto-despliega en ~2 min
git tag v1.x.x && git push origin v1.x.x  # para versionar
```

**URL producción:** https://www.writi-ai.com

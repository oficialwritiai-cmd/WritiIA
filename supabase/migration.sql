-- ═══════════════════════════════════════════════
-- WRITI.AI — Migración de base de datos
-- Ejecutar en el editor SQL de Supabase
-- ═══════════════════════════════════════════════

-- ── Tabla: users_profiles ──
CREATE TABLE IF NOT EXISTS public.users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  brand_name TEXT DEFAULT '',
  default_tone TEXT DEFAULT 'Profesional',
  plan TEXT DEFAULT 'free',
  email TEXT,
  is_trial_active BOOLEAN DEFAULT false,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Tabla: scripts ──
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  tone TEXT NOT NULL,
  topic TEXT NOT NULL,
  scripts_content JSONB NOT NULL,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Índices ──
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_is_saved ON public.scripts(is_saved);

-- ── Tabla: access_keys ──
CREATE TABLE IF NOT EXISTS public.access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

-- ── Políticas: users_profiles ──
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON public.users_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON public.users_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.users_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Políticas: access_keys ──
CREATE POLICY "Permitir leer llaves a todos" ON public.access_keys FOR SELECT USING (true);
CREATE POLICY "Permitir actualizar llaves a todos" ON public.access_keys FOR UPDATE USING (true);

-- ── Políticas: scripts ──
CREATE POLICY "Los usuarios pueden ver sus propios guiones"
  ON public.scripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios guiones"
  ON public.scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios guiones"
  ON public.scripts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios guiones"
  ON public.scripts FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- Trigger: crear perfil automáticamente al registrarse
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, name, brand_name, default_tone, plan)
  VALUES (NEW.id, '', '', 'Profesional', 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe (para re-ejecución segura)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════
-- Planificador de 30 Días
-- ═══════════════════════════════════════════════

-- ── Tabla: content_plans ──
CREATE TABLE IF NOT EXISTS public.content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  focus TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Tabla: content_slots ──
CREATE TABLE IF NOT EXISTS public.content_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  idea_title TEXT NOT NULL,
  goal TEXT NOT NULL,
  has_script BOOLEAN DEFAULT false,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Índices para content plans/slots ──
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.content_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON public.content_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_plan_id ON public.content_slots(plan_id);

-- ── Políticas: content_plans ──
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios planes" ON public.content_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus planes" ON public.content_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus planes" ON public.content_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden eliminar sus planes" ON public.content_plans FOR DELETE USING (auth.uid() = user_id);

-- ── Políticas: content_slots ──
ALTER TABLE public.content_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios slots" ON public.content_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus slots" ON public.content_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus slots" ON public.content_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden eliminar sus slots" ON public.content_slots FOR DELETE USING (auth.uid() = user_id);

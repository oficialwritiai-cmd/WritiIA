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

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

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

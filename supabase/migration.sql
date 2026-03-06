-- migration.sql: Actualización de la BD para Historial y Ideas Virales

-- 1. Añadir campos de trial a users_profiles
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS trial_active boolean DEFAULT false;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS access_key_used text;

-- 2. Crear tabla access_keys para llaves de acceso
CREATE TABLE IF NOT EXISTS access_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key_value text UNIQUE NOT NULL,
  max_uses integer DEFAULT 1,
  uses_count integer DEFAULT 0,
  credits_amount integer DEFAULT 200,
  trial_days integer DEFAULT 7,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- RLS para access_keys (solo admins pueden gestionar)
ALTER TABLE access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active access keys" 
ON access_keys FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 3. Actualizar tabla scripts
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS source_reference_id uuid;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS titulo_angulo text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS gancho text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS desarrollo_1 text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS desarrollo_2 text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS desarrollo_3 text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS cta text;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Opcional: Para asegurar que el created_at e is_saved estén, aunque is_saved ya existía
-- ALTER TABLE scripts ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- 2. Crear tabla viral_ideas
CREATE TABLE IF NOT EXISTS viral_ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma text,
  tipo_idea text,
  titulo_idea text,
  descripcion text,
  objetivo text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS (Row Level Security) - Asegurar que el usuario solo puede ver sus ideas
ALTER TABLE viral_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propias ideas" 
ON viral_ideas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propias ideas" 
ON viral_ideas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias ideas" 
ON viral_ideas FOR DELETE 
USING (auth.uid() = user_id);

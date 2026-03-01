-- Habilitar Row Level Security (RLS) explícitamente en todas las tablas
ALTER TABLE brand_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de brand_brain
DROP POLICY IF EXISTS "brain_select_policy" ON brand_brain;
DROP POLICY IF EXISTS "brain_insert_policy" ON brand_brain;
DROP POLICY IF EXISTS "brain_update_policy" ON brand_brain;
DROP POLICY IF EXISTS "brain_delete_policy" ON brand_brain;

CREATE POLICY "brain_select_policy" ON brand_brain FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brain_insert_policy" ON brand_brain FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brain_update_policy" ON brand_brain FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "brain_delete_policy" ON brand_brain FOR DELETE USING (auth.uid() = user_id);

-- 2. Políticas de scripts
DROP POLICY IF EXISTS "scripts_select_policy" ON scripts;
DROP POLICY IF EXISTS "scripts_insert_policy" ON scripts;
DROP POLICY IF EXISTS "scripts_update_policy" ON scripts;
DROP POLICY IF EXISTS "scripts_delete_policy" ON scripts;

CREATE POLICY "scripts_select_policy" ON scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scripts_insert_policy" ON scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scripts_update_policy" ON scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scripts_delete_policy" ON scripts FOR DELETE USING (auth.uid() = user_id);

-- 3. Políticas de ai_credits
DROP POLICY IF EXISTS "credits_select_policy" ON ai_credits;
DROP POLICY IF EXISTS "credits_insert_policy" ON ai_credits;
DROP POLICY IF EXISTS "credits_update_policy" ON ai_credits;

CREATE POLICY "credits_select_policy" ON ai_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_insert_policy" ON ai_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credits_update_policy" ON ai_credits FOR UPDATE USING (auth.uid() = user_id);

-- 4. Políticas de content_plans
DROP POLICY IF EXISTS "plans_select_policy" ON content_plans;
DROP POLICY IF EXISTS "plans_insert_policy" ON content_plans;
DROP POLICY IF EXISTS "plans_update_policy" ON content_plans;
DROP POLICY IF EXISTS "plans_delete_policy" ON content_plans;

CREATE POLICY "plans_select_policy" ON content_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plans_insert_policy" ON content_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update_policy" ON content_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plans_delete_policy" ON content_plans FOR DELETE USING (auth.uid() = user_id);

-- 5. Políticas de content_slots
DROP POLICY IF EXISTS "slots_select_policy" ON content_slots;
DROP POLICY IF EXISTS "slots_insert_policy" ON content_slots;
DROP POLICY IF EXISTS "slots_update_policy" ON content_slots;
DROP POLICY IF EXISTS "slots_delete_policy" ON content_slots;

CREATE POLICY "slots_select_policy" ON content_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "slots_insert_policy" ON content_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "slots_update_policy" ON content_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "slots_delete_policy" ON content_slots FOR DELETE USING (auth.uid() = user_id);

-- 6. Políticas de usage_logs
DROP POLICY IF EXISTS "logs_select_policy" ON usage_logs;
DROP POLICY IF EXISTS "logs_insert_policy" ON usage_logs;

CREATE POLICY "logs_select_policy" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "logs_insert_policy" ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Políticas de viral_ideas
DROP POLICY IF EXISTS "ideas_select_policy" ON viral_ideas;
DROP POLICY IF EXISTS "ideas_insert_policy" ON viral_ideas;
DROP POLICY IF EXISTS "ideas_update_policy" ON viral_ideas;
DROP POLICY IF EXISTS "ideas_delete_policy" ON viral_ideas;

CREATE POLICY "ideas_select_policy" ON viral_ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ideas_insert_policy" ON viral_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ideas_update_policy" ON viral_ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ideas_delete_policy" ON viral_ideas FOR DELETE USING (auth.uid() = user_id);

-- 8. Políticas de users_profiles (el id de auth.users es igual al id de users_profiles)
DROP POLICY IF EXISTS "profiles_select_policy" ON users_profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON users_profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON users_profiles;

CREATE POLICY "profiles_select_policy" ON users_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_policy" ON users_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_policy" ON users_profiles FOR UPDATE USING (auth.uid() = id);

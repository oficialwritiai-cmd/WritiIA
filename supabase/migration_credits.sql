-- migration_credits.sql: Sistema Unificado de Créditos

-- 1. Crear tabla de historial de uso si no existe
CREATE TABLE IF NOT EXISTS credits_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  action_type text NOT NULL, -- 'generate_ideas', 'generate_scripts', etc.
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE credits_usage ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view their own credit usage" ON credits_usage;
CREATE POLICY "Users can view their own credit usage" 
ON credits_usage FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Función RPC para descontar créditos de forma atómica
-- Asegura que el balance no sea negativo
CREATE OR REPLACE FUNCTION decrement_credits_balance(u_id uuid, amount integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance integer;
    new_balance integer;
BEGIN
    -- Obtener balance actual
    SELECT credits_balance INTO current_balance 
    FROM users_profiles 
    WHERE id = u_id 
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Validar saldo
    IF current_balance < amount THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- Actualizar balance
    UPDATE users_profiles 
    SET credits_balance = current_balance - amount 
    WHERE id = u_id 
    RETURNING credits_balance INTO new_balance;

    RETURN json_build_object(
        'success', true,
        'new_balance', new_balance
    );
END;
$$;

-- 3. Función RPC para depositar créditos (usada por Stripe Webhook)
CREATE OR REPLACE FUNCTION deposit_credits(u_id uuid, amount integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance integer;
BEGIN
    UPDATE users_profiles 
    SET credits_balance = COALESCE(credits_balance, 0) + amount 
    WHERE id = u_id 
    RETURNING credits_balance INTO new_balance;

    RETURN json_build_object(
        'success', true,
        'new_balance', new_balance
    );
END;
$$;

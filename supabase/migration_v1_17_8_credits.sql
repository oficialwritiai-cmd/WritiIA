-- migration_v1_17_8_credits.sql: Actualización del RPC de créditos y bypass de Admin

-- 1. Actualizar la función para soportar los 4 argumentos que envía chargeCredits y registrar el historial
CREATE OR REPLACE FUNCTION decrement_credits_balance(
    u_id uuid,
    amount numeric,
    action_type text,
    p_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance numeric;
    new_balance numeric;
    is_admin_user boolean;
BEGIN
    -- Verificar si el usuario es administrador
    SELECT is_admin INTO is_admin_user 
    FROM users_profiles 
    WHERE id = u_id;

    -- Obtener balance actual
    SELECT credits_balance INTO current_balance 
    FROM users_profiles 
    WHERE id = u_id 
    FOR UPDATE;

    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Validar saldo (Los admins pueden tener saldo negativo o cero sin ser bloqueados)
    IF current_balance < amount AND is_admin_user IS NOT TRUE THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- Actualizar balance
    UPDATE users_profiles 
    SET credits_balance = current_balance - amount 
    WHERE id = u_id 
    RETURNING credits_balance INTO new_balance;

    -- Registrar el uso en el historial
    IF amount > 0 THEN
        INSERT INTO credits_usage (user_id, amount, action_type, created_at)
        VALUES (u_id, amount, action_type, now());
    END IF;

    RETURN json_build_object(
        'success', true,
        'new_balance', new_balance
    );
END;
$$;

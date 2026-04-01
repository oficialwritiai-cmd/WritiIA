-- migration_add_credits_rpc.sql
-- Función atómica para agregar créditos (compras via Stripe).
-- Usa FOR UPDATE para evitar race conditions cuando llegan múltiples webhooks.

CREATE OR REPLACE FUNCTION add_credits_balance(
    u_id uuid,
    amount numeric,
    p_idempotency_key text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance numeric;
BEGIN
    -- Verificar idempotencia: si ya se procesó esta sesión, salir sin hacer nada
    IF EXISTS (
        SELECT 1 FROM credits_usage
        WHERE idempotency_key = p_idempotency_key
    ) THEN
        RETURN json_build_object('success', true, 'skipped', true);
    END IF;

    -- Bloquear la fila para evitar race conditions
    PERFORM credits_balance
    FROM users_profiles
    WHERE id = u_id
    FOR UPDATE;

    -- Incremento atómico
    UPDATE users_profiles
    SET
        credits_balance = credits_balance + amount,
        last_credits_purchase_at = now()
    WHERE id = u_id
    RETURNING credits_balance INTO new_balance;

    IF new_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found for id %', u_id;
    END IF;

    -- Registrar en historial con idempotency_key
    INSERT INTO credits_usage (user_id, amount, action_type, idempotency_key, created_at)
    VALUES (u_id, amount, 'purchase_credits', p_idempotency_key, now());

    RETURN json_build_object('success', true, 'new_balance', new_balance, 'skipped', false);
END;
$$;

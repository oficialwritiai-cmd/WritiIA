import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Faltan env vars SUPABASE');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testCreditsValidation() {
    console.log('🔍 DIAGNÓSTICO DE VALIDACIÓN DE CRÉDITOS\n');

    try {
        // 1. Buscar usuario con créditos negativos
        const { data: negativeUsers } = await supabase
            .from('users_profiles')
            .select('id, email, credits_balance, is_admin')
            .lt('credits_balance', 0)
            .limit(3);

        console.log('📊 Usuarios con créditos negativos:');
        if (negativeUsers && negativeUsers.length > 0) {
            negativeUsers.forEach(u => {
                console.log(`  - ${u.email}: ${u.credits_balance} créditos (admin: ${u.is_admin})`);
            });
        } else {
            console.log('  ✅ Ninguno encontrado');
        }

        // 2. Probar RPC con usuario sin créditos
        if (negativeUsers && negativeUsers.length > 0) {
            const testUser = negativeUsers[0];
            console.log(`\n🧪 Probando RPC con usuario ${testUser.email}:`);
            console.log(`   Balance actual: ${testUser.credits_balance}`);
            console.log(`   Intentando cargar 5 créditos...`);

            const { data, error } = await supabase.rpc('decrement_credits_balance', {
                u_id: testUser.id,
                amount: 5,
                action_type: 'test_diagnosis',
                p_id: null
            });

            if (error) {
                console.log(`   ❌ RPC ERROR (esperado): ${error.message}`);
            } else {
                console.log(`   ⚠️  RPC SUCCESS (PROBLEMA!): ${JSON.stringify(data)}`);
                console.log(`   🔴 EL RPC DEBERÍA HABER FALLADO PERO PASÓ`);
            }
        }

        // 3. Revisar logs de credits_usage
        console.log('\n📋 Últimos usos de créditos (últimas 10):');
        const { data: usage } = await supabase
            .from('credits_usage')
            .select('user_id, action_type, amount, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (usage) {
            usage.forEach(u => {
                console.log(`  - ${u.action_type}: ${u.amount} créditos (${new Date(u.created_at).toLocaleString()})`);
            });
        }

        // 4. Verificar tabla users_profiles schema
        console.log('\n📄 Verificando columnas de users_profiles:');
        const { data: schema } = await supabase
            .from('users_profiles')
            .select('*')
            .limit(0);

        console.log('   Columnas encontradas:', Object.keys(schema || {}));

    } catch (err) {
        console.error('❌ Error durante diagnóstico:', err.message);
    }
}

testCreditsValidation();

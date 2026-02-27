'use client';

import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, Rocket } from 'lucide-react';

export default function TrialExpiredPage() {
    const supabase = createSupabaseClient();
    const router = useRouter();

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', padding: '20px', color: 'white' }}>
            <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(126, 206, 202, 0.1)' }}>
                    <Rocket size={40} color="#7ECECA" />
                </div>

                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>Tu prueba gratuita de 7 días ha terminado</h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '40px', lineHeight: '1.6' }}>
                    Esperamos que hayas disfrutado la potencia de WRITI.AI. Sigue usando la plataforma sin límites con el plan Pro.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="btn-primary"
                        style={{ height: '56px', fontSize: '1.1rem', fontWeight: 800, width: '100%' }}
                    >
                        Contratar plan Pro por €39/mes →
                    </button>

                    <button
                        onClick={handleLogout}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', marginTop: '12px' }}
                    >
                        <LogOut size={16} /> Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}

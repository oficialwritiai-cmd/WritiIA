'use client';

import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Rocket, Key } from 'lucide-react';

export default function TrialExpiredPage() {
    const supabase = createSupabaseClient();
    const router = useRouter();
    const [isNewUser, setIsNewUser] = useState(false);

    useEffect(() => {
        async function checkProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase
                .from('users_profiles')
                .select('subscription_status, trial_started_at')
                .eq('id', user.id)
                .single();
            // pending + no trial = brand new user, never had access
            if (profile?.subscription_status === 'pending' && !profile?.trial_started_at) {
                setIsNewUser(true);
            }
        }
        checkProfile();
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', padding: '20px', color: 'white' }}>
            <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(126, 206, 202, 0.2), rgba(91, 181, 177, 0.1))', boxShadow: '0 0 20px rgba(126, 206, 202, 0.2)' }}>
                    {isNewUser ? <Key size={40} color="#7ECECA" /> : <Rocket size={40} color="#7ECECA" />}
                </div>

                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', background: 'linear-gradient(135deg, #FFF, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isNewUser ? 'Activa tu acceso' : 'Tu periodo de acceso ha terminado'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '40px', lineHeight: '1.6', fontSize: '1.1rem' }}>
                    {isNewUser
                        ? <>Para usar <strong style={{ color: '#7ECECA' }}>Writi AI</strong> necesitas una llave de acceso o activar el Plan Pro. Contacta con nosotros si no tienes una llave.</>
                        : <>Esperamos que hayas disfrutado la potencia de <strong style={{ color: '#7ECECA' }}>Writi AI</strong>. Tu acceso se ha pausado, pero tu contenido sigue a salvo. Activa el Plan Pro para continuar creando.</>
                    }
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        style={{
                            height: '64px',
                            fontSize: '1.1rem',
                            fontWeight: 900,
                            width: '100%',
                            background: 'linear-gradient(135deg, #7ECECA, #5BB5B1)',
                            color: 'black',
                            border: 'none',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(126, 206, 202, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isNewUser ? 'Activar Plan Pro →' : 'Desbloquear Plan Pro →'}
                    </button>

                    <button
                        onClick={handleLogout}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', padding: '12px', borderRadius: '12px', transition: '0.2s' }}
                    >
                        <LogOut size={16} /> Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, BookOpen, Brain, CalendarDays, BarChart2, Settings, LogOut, Menu, Sparkles, Target, Coins } from 'lucide-react';
import Logo from '@/app/components/Logo';
import CreditsModal from '@/app/components/CreditsModal';

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState('Verificando acceso...');
    const [authError, setAuthError] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createSupabaseClient();

    const fetchProfile = async (userId) => {
        try {
            // Set a 4s timeout for profile fetch specifically
            const profilePromise = supabase
                .from('users_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile Timeout')), 4000));

            const { data: profileData, error } = await Promise.race([profilePromise, timeoutPromise]);

            if (error) console.error('Error fetching profile:', error);
            if (profileData) {
                setProfile(profileData);
                return profileData;
            }
        } catch (err) {
            console.error('FetchProfile catch:', err);
        }
        return null;
    };

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            if (!isMounted) return;
            setLoadingStatus('Verificando sesión...');

            try {
                // Short timeout for the initial session check - increased speed
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session Timeout')), 2500)
                );

                const { data: { session }, error: sessionError } = await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise
                ]);

                if (!isMounted) return;

                if (sessionError || !session) {
                    router.replace('/login');
                    setLoading(false);
                    return;
                }

                setUser(session.user);

                // RADICAL OPTIMIZATION: Reveal UI IMMEDIATELY after session is found
                // Don't wait for profile.
                setLoading(false);

                // Fetch profile in background
                fetchProfile(session.user.id);
            } catch (err) {
                console.warn('Initial session check timed out or failed:', err.message);
                setAuthError(true);
                // Even on timeout, try to let onAuthStateChange handle it or show the retry UI
                setLoading(false);
            }
        };

        checkAuth();

        // EMERGENCY OVERRIDE: If after 5.5 seconds it's still loading, show the skip option
        const forceTimer = setTimeout(() => {
            if (isMounted) setAuthError(true);
        }, 5500);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                if (event === 'SIGNED_OUT' || !session) {
                    setUser(null);
                    setProfile(null);
                    router.replace('/login');
                    setLoading(false);
                } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    setUser(session.user);
                    // Background profile load
                    fetchProfile(session.user.id);
                    setLoading(false);
                    setAuthError(false);
                }
            }
        );

        const handleRefreshProfile = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser && isMounted) fetchProfile(currentUser.id);
        };
        window.addEventListener('refresh-profile', handleRefreshProfile);

        // Handle URL params for credits
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('credits_purchased')) {
                router.replace('/dashboard');
                handleRefreshProfile();
            } else if (urlParams.get('open_credits')) {
                setIsCreditsModalOpen(true);
                router.replace('/dashboard');
            }
        }

        return () => {
            isMounted = false;
            clearTimeout(forceTimer);
            subscription.unsubscribe();
            window.removeEventListener('refresh-profile', handleRefreshProfile);
        };
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/login');
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div className="emergency-spinner"></div>
                <p style={{ color: '#FFD700', fontSize: '1rem', fontWeight: 900, animation: 'pulse 2s infinite', letterSpacing: '1px' }}>
                    {loadingStatus} (v1.6.8)
                </p>

                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease', marginTop: '30px', padding: '0 20px' }}>
                    <p style={{ color: '#666', marginBottom: '20px', maxWidth: '350px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Si el acelerador de IA tarda demasiado, puedes forzar la entrada manual:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={() => setLoading(false)}
                            className="btn-primary"
                            style={{ background: 'var(--accent-gradient)', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 0 20px rgba(126, 206, 202, 0.3)' }}
                        >
                            ⚡ FORZAR ENTRADA AL DASHBOARD
                        </button>
                        <button
                            onClick={() => window.location.reload(true)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                            LIMPIAR CACHÉ Y RECARGAR
                        </button>
                    </div>
                </div>

                <style jsx>{`
                    .emergency-spinner {
                        width: 60px;
                        height: 60px;
                        border: 4px solid rgba(255, 215, 0, 0.1);
                        border-top: 4px solid #FFD700;
                        border-radius: 50%;
                        animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                `}</style>
            </div>
        );
    }

    const navItems = [
        { href: '/dashboard', icon: PenLine, label: 'Nuevo Guión' },
        { href: '/dashboard/estrategia', icon: Target, label: 'Estrategia' },
        { href: '/dashboard/ideas-virales', icon: Sparkles, label: 'Ideas virales' },
        { href: '/dashboard/library', icon: BookOpen, label: 'Biblioteca' },
        { href: '/dashboard/knowledge', icon: Brain, label: 'Cerebro IA' },
        { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendario' },
        { href: '/dashboard/stats', icon: BarChart2, label: 'Métricas' },
        { href: '/dashboard/settings', icon: Settings, label: 'Configuración' },
    ];

    return (
        <div className="app-layout" style={{ background: '#050505' }}>
            {/* Sidebar Lucide (Icons Only) */}
            <aside className="sidebar">
                <div style={{ marginBottom: '40px' }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <Logo mobile={true} />
                    </Link>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onMouseEnter={() => setHoveredItem(item.label)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: isActive ? 'rgba(126, 206, 202, 0.1)' : 'transparent',
                                    color: isActive ? '#7ECECA' : '#888888',
                                    transition: 'all 0.2s ease',
                                    textDecoration: 'none'
                                }}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />

                                {/* Tooltip */}
                                {hoveredItem === item.label && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '60px',
                                        background: '#1A1A1A',
                                        color: 'white',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        zIndex: 100,
                                        pointerEvents: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px' }}>
                    <button
                        onClick={handleLogout}
                        onMouseEnter={() => setHoveredItem('Cerrar sesión')}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                            position: 'relative',
                            background: 'none',
                            border: 'none',
                            color: '#888888',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            transition: '0.2s'
                        }}
                    >
                        <LogOut size={22} />
                        {hoveredItem === 'Cerrar sesión' && (
                            <div style={{
                                position: 'absolute',
                                left: '60px',
                                background: '#1A1A1A',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                zIndex: 100,
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                Salir
                            </div>
                        )}
                    </button>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#7ECECA',
                        textAlign: 'center',
                        fontWeight: 900,
                        marginTop: '10px',
                        letterSpacing: '0.05em'
                    }}>
                        v1.6.8
                    </div>
                </div>
            </aside>

            <div className="main-wrapper">
                {/* Mobile menu button */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                        display: 'none',
                        position: 'fixed',
                        bottom: 20,
                        left: 20,
                        zIndex: 1000,
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(157, 0, 255, 0.5)',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Menu size={24} />
                </button>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            zIndex: 999,
                            display: 'flex'
                        }}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <aside style={{
                            width: '260px',
                            background: 'var(--bg-sidebar)',
                            padding: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20
                        }}>
                            <div style={{ marginBottom: 20 }}>
                                <Link href="/" style={{ textDecoration: 'none' }}>
                                    <Logo mobile={true} />
                                </Link>
                            </div>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '14px 16px',
                                                borderRadius: 12,
                                                background: isActive ? 'rgba(126, 206, 202, 0.1)' : 'transparent',
                                                color: isActive ? '#7ECECA' : '#888888',
                                                textDecoration: 'none',
                                                fontSize: '0.95rem',
                                                fontWeight: 500
                                            }}
                                        >
                                            <Icon size={20} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <button
                                onClick={() => { handleLogout(); setSidebarOpen(false); }}
                                style={{
                                    marginTop: 'auto',
                                    background: 'none',
                                    border: 'none',
                                    color: '#888888',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '14px 16px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500
                                }}
                            >
                                <LogOut size={20} />
                                Cerrar sesión
                            </button>
                        </aside>
                    </div>
                )}
                {/* Topbar refined */}
                <header className="topbar" style={{ height: '72px', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
                            <Logo />
                        </Link>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', padding: '4px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '0.9rem' }}>👤</span>
                                <span style={{ fontSize: '0.75rem', color: '#FFD700', fontWeight: 900, marginRight: '8px' }}>v1.6.8</span>
                                <p style={{
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '120px',
                                    margin: 0
                                }} title={user?.email}>
                                    {user?.email?.split('@')[0] || 'User'}
                                </p>
                                <span className="badge" style={{
                                    fontSize: '0.6rem',
                                    padding: '2px 8px',
                                    background: profile?.plan === 'pro' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
                                    color: profile?.plan === 'pro' ? 'black' : 'white',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    marginLeft: '4px'
                                }}>
                                    {profile?.plan?.toUpperCase() || 'FREE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                                onClick={() => setIsCreditsModalOpen(true)}
                                className="btn-primary"
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '0.8rem',
                                    fontWeight: 900,
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    borderRadius: '100px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                🪙 COMPRAR CRÉDITOS
                            </button>
                            <Link href="/dashboard/settings" style={{ textDecoration: 'none', flexShrink: 0 }}>
                                <button className="btn-primary" style={{
                                    padding: '8px 16px',
                                    fontSize: '0.8rem',
                                    fontWeight: 900,
                                    background: 'var(--accent-gradient)',
                                    color: 'black',
                                    borderRadius: '100px',
                                    boxShadow: '0 0 15px rgba(126, 206, 202, 0.4)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}>
                                    🚀 PLAN PRO
                                </button>
                            </Link>
                        </div>
                        <div className="credit-badge" onClick={() => setIsCreditsModalOpen(true)} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '100px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            transition: '0.2s',
                            border: '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0
                        }}>
                            <span style={{ fontSize: '1rem' }}>🪙</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{profile?.credits_balance || 0}</span>
                            <button style={{
                                background: 'none',
                                border: 'none',
                                color: '#7ECECA',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                padding: '2px 4px',
                                whiteSpace: 'nowrap'
                            }}>
                                + DEPOSITAR
                            </button>
                        </div>

                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}></div>

                        <div style={{ display: 'flex', gap: '14px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                            <span style={{ cursor: 'pointer' }}>🔔</span>
                            <span style={{ cursor: 'pointer' }}>🔍</span>
                            <Link href="/dashboard/settings" style={{ textDecoration: 'none', color: 'inherit' }}>⚙️</Link>
                        </div>
                    </div>
                </header>

                <main className="main-content" style={{ padding: '32px', background: 'var(--bg-dark)', width: '100%', maxWidth: '100%' }}>
                    {children}
                </main>

                <CreditsModal
                    isOpen={isCreditsModalOpen}
                    onClose={() => setIsCreditsModalOpen(false)}
                    balance={profile?.credits_balance || 0}
                    user={user}
                />
            </div>

            <style jsx>{`
                .app-layout { display: flex; height: 100vh; overflow: hidden; }
                .sidebar { width: 72px; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; background: var(--bg-sidebar); flex-shrink: 0; }
                .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
                .topbar { flex-shrink: 0; }
                .main-content { flex: 1; overflow-y: auto; }
                .sidebar-nav { display: flex; flex-direction: column; }
                .sidebar-btn { display: flex; align-items: center; gap: 12px; text-decoration: none; transition: 0.2s; }
                
                @media (max-width: 768px) {
                    .app-layout { position: relative; }
                    .sidebar { display: none !important; }
                    .main-wrapper { width: 100% !important; max-width: 100% !important; }
                    .main-content { padding: 16px !important; width: 100% !important; max-width: 100% !important; }
                }

                @media (max-width: 900px) {
                    .credit-badge { display: none !important; }
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(126, 206, 202, 0.1);
                    border-top: 3px solid #7ECECA;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

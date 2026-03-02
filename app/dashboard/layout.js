'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, BookOpen, Brain, CalendarDays, BarChart2, Settings, LogOut, Menu, Sparkles } from 'lucide-react';
import Logo from '@/app/components/Logo';

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createSupabaseClient();

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) {
                router.replace('/login');
            } else {
                setUser(session.user);

                // Fetch profile to check trial status
                const { data: profileData } = await supabase
                    .from('users_profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);

                    // Check trial expiry
                    const now = new Date();
                    const trialEnds = profileData.trial_ends_at ? new Date(profileData.trial_ends_at) : null;

                    if (profileData.plan === 'trial' && trialEnds && trialEnds < now) {
                        if (pathname !== '/dashboard/expired' && pathname !== '/dashboard/settings') {
                            router.replace('/dashboard/expired');
                        }
                    }
                }

                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!session) {
                    router.replace('/login');
                } else {
                    setUser(session.user);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [pathname]);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/login');
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    const navItems = [
        { href: '/dashboard', icon: PenLine, label: 'Nuevo Guión' },
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
                <header className="topbar" style={{ height: '72px', borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <Logo />
                        </Link>
                        <div className="desktop-only" style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                                <span style={{ fontSize: '0.9rem' }}>👤</span>
                            </div>
                            <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.email?.split('@')[0] || 'User'}</p>
                            <span className="badge" style={{
                                fontSize: '0.6rem',
                                padding: '2px 8px',
                                background: profile?.plan === 'pro' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
                                color: profile?.plan === 'pro' ? 'black' : 'white',
                                fontWeight: 800
                            }}>
                                {profile?.plan?.toUpperCase() || 'FREE'}
                            </span>
                        </div>
                    </div>

                    <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Deposit Credits</button>

                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>

                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                            <span style={{ cursor: 'pointer' }}>🔔</span>
                            <span style={{ cursor: 'pointer' }}>🔍</span>
                            <Link href="/dashboard/settings" style={{ textDecoration: 'none', color: 'inherit' }}>⚙️</Link>
                        </div>
                    </div>
                </header>

                <main className="main-content" style={{ padding: '32px', background: 'var(--bg-dark)', width: '100%', maxWidth: '100%' }}>
                    {children}
                </main>
            </div>

            <style jsx>{`
                .app-layout { display: flex; height: 100vh; overflow: hidden; }
                .sidebar { width: 240px; padding: 24px; display: flex; flex-direction: column; background: var(--bg-sidebar); flex-shrink: 0; }
                .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
                .main-content { flex: 1; overflow-y: auto; }
                .sidebar-nav { display: flex; flex-direction: column; }
                .sidebar-btn { display: flex; align-items: center; gap: 12px; text-decoration: none; transition: 0.2s; }
                
                @media (max-width: 768px) {
                    .app-layout { position: relative; }
                    .sidebar { display: none !important; }
                    .main-wrapper { width: 100% !important; max-width: 100% !important; }
                    .main-content { padding: 16px !important; width: 100% !important; max-width: 100% !important; }
                }
            `}</style>
        </div>
    );
}

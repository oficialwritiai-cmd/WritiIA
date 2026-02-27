import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, BookOpen, Brain, CalendarDays, BarChart2, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createSupabaseClient();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.replace('/login');
            } else {
                setUser(session.user);
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
    }, []);

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
        { href: '/dashboard/library', icon: BookOpen, label: 'Biblioteca' },
        { href: '/dashboard/knowledge', icon: Brain, label: 'Cerebro IA' },
        { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendario' },
        { href: '/dashboard/stats', icon: BarChart2, label: 'Métricas' },
        { href: '/dashboard/settings', icon: Settings, label: 'Configuración' },
    ];

    return (
        <div className="app-layout" style={{ background: '#050505' }}>
            {/* Sidebar Lucide (Icons Only) */}
            <aside className="sidebar" style={{
                width: '80px',
                padding: '24px 0',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#050505'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--accent-gradient)', borderRadius: '8px' }}></div>
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
                {/* Topbar refined */}
                <header className="topbar" style={{ height: '72px', borderBottom: '1px solid var(--border)', padding: '0 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                            <span style={{ fontSize: '0.9rem' }}>👤</span>
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.email?.split('@')[0] || 'User'}</p>
                        <span className="badge" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>FREE</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Deposit Credits</button>

                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>

                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                            <span style={{ cursor: 'pointer' }}>🔔</span>
                            <span style={{ cursor: 'pointer' }}>🔍</span>
                            <Link href="/dashboard/settings" style={{ textDecoration: 'none', color: 'inherit' }}>⚙️</Link>
                        </div>
                    </div>
                </header>

                <main className="main-content" style={{ padding: '32px', background: 'var(--bg-dark)' }}>
                    {children}
                </main>
            </div>

            <style jsx>{`
                .app-layout { display: flex; height: 100vh; overflow: hidden; }
                .sidebar { width: 240px; padding: 24px; display: flex; flex-direction: column; background: var(--bg-sidebar); }
                .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .sidebar-nav { display: flex; flex-direction: column; }
                .sidebar-btn { display: flex; align-items: center; gap: 12px; text-decoration: none; transition: 0.2s; }
            `}</style>
        </div>
    );
}

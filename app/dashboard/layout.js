'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
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

    const getInitials = () => {
        if (!user?.email) return 'U';
        return user.email.charAt(0).toUpperCase();
    };

    const navItems = [
        { href: '/dashboard', icon: '💎', label: 'Escritorio' },
        { href: '/dashboard/knowledge', icon: '🧠', label: 'Cerebro IA' },
        { href: '/dashboard/library', icon: '📁', label: 'Biblioteca' },
        { href: '/dashboard/viral', icon: '⚡', label: 'Motor Viral' },
    ];

    const bottomItems = [
        { href: '/dashboard/settings', icon: '⚙️', label: 'Ajustes' },
    ];

    return (
        <div className="app-layout">
            {/* Sidebar Stakent Style */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '0 12px', marginBottom: '10px' }}>
                    <div className="logo" style={{ fontSize: '1.4rem', color: 'white' }}>
                        <span style={{ color: 'var(--accent)' }}>W</span>RITI.AI
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 16px', marginBottom: '12px' }}>General</p>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-btn ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}

                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 16px', margin: '24px 0 12px 0' }}>Soporte</p>
                    {bottomItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-btn ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>¿Necesitas ayuda premium?</p>
                    <button className="btn-primary" style={{ width: '100%', fontSize: '0.8rem' }}>
                        Upgrade Plan
                    </button>
                    <button onClick={handleLogout} className="btn-danger" style={{ width: '100%', marginTop: '16px' }}>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <div className="main-wrapper">
                {/* Topbar Stakent Style */}
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ fontSize: '1.2rem', color: 'white' }}>
                            ☰
                        </button>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bienvenido de nuevo,</p>
                            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.email?.split('@')[0] || 'User'}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ position: 'relative', background: 'var(--bg-soft)', borderRadius: '20px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.9rem' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '120px' }}
                            />
                        </div>

                        <button className="btn-primary" style={{ fontSize: '0.8rem' }}>
                            <span>✨</span> Generar Pro
                        </button>

                        <div className="avatar" style={{ background: 'var(--accent-gradient)', color: 'white', width: '36px', height: '36px', border: '2px solid rgba(255,255,255,0.1)' }}>
                            {getInitials()}
                        </div>
                    </div>
                </header>

                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

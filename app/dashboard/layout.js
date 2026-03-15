'use client';
/**
 * FORCE BUILD: 2026-03-15 17:35:00
 * Version: v4.4.16
 */

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, BookOpen, Brain, CalendarDays, BarChart2, Settings, LogOut, Menu, Sparkles, Target, Coins, Home, ChevronDown, FolderOpen, Type, MessageSquare, Megaphone } from 'lucide-react';
import Logo from '@/app/components/Logo';
import CreditsModal from '@/app/components/CreditsModal';
import { useProject } from '@/app/components/ProjectContext';
import ProjectSelector from '@/app/components/ProjectSelector';
import { Bell, Search, LogOut as LogOutIcon, User, Settings as SettingsIcon, X as CloseIcon } from 'lucide-react';
import { useLanguage } from '@/app/components/LanguageContext';
import { Globe } from 'lucide-react';

// LanguageSelector Component inside DashboardLayout file or as separate component
function LanguageSelector() {
    const { locale, setLocale } = useLanguage();
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Globe size={14} style={{ color: '#7ECECA' }} />
            <select 
                value={locale} 
                onChange={(e) => setLocale(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
            >
                <option value="es" style={{ background: '#1a1a1a' }}>ES</option>
                <option value="en" style={{ background: '#1a1a1a' }}>EN</option>
            </select>
        </div>
    );
}

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();
    const [loadingStatus, setLoadingStatus] = useState(t('common.loading'));
    const [authError, setAuthError] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
    const [planCheckoutLoading, setPlanCheckoutLoading] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] = useState(false);
    const [purchasedCredits, setPurchasedCredits] = useState(0);
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
        
        const handleOpenCredits = () => {
            if (isMounted) setIsCreditsModalOpen(true);
        };
        window.addEventListener('open-credits', handleOpenCredits);

        // Handle URL params for credits and plans
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const cp = urlParams.get('credits_purchased');
            const pa = urlParams.get('plan_activated');
            
            if (cp) {
                setPurchasedCredits(parseInt(cp) || 0);
                setIsPaymentSuccessModalOpen(true);
                router.replace('/dashboard');
                
                // Polling Refresh: The webhook might take a few seconds
                handleRefreshProfile();
                setTimeout(handleRefreshProfile, 3000);
                setTimeout(handleRefreshProfile, 7000);
            } else if (pa === 'true') {
                // Instantly poll after plan activation to show PRO badge
                router.replace('/dashboard');
                
                // Ensure profile is updated properly
                handleRefreshProfile();
                setTimeout(handleRefreshProfile, 3000);
                setTimeout(handleRefreshProfile, 7000);
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
            window.removeEventListener('open-credits', handleOpenCredits);
        };
    }, []);

    const [daysRemaining, setDaysRemaining] = useState(null);

    useEffect(() => {
        if (!profile) {
            setDaysRemaining(null);
            return;
        }

        const now = new Date();
        let targetDate = null;

        if ((profile.plan === 'trial' || profile.plan === 'free') && profile.trial_ends_at) {
            targetDate = new Date(profile.trial_ends_at);
        } else if (profile.plan === 'pro') {
            if (profile.subscription_period_end) {
                targetDate = new Date(profile.subscription_period_end);
            } else {
                // If it's Pro but no date, it's unlimited / active indefinitely for now
                setDaysRemaining('Activa');
                return;
            }
        }

        if (targetDate) {
            const diff = targetDate - now;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            setDaysRemaining(Math.max(0, days));

            // Auto-deactivate trial if expired
            if ((profile.plan === 'trial' || profile.plan === 'free') && days <= 0 && profile.trial_active) {
                supabase.from('users_profiles').update({ trial_active: false }).eq('id', profile.id);
            }
        } else {
            setDaysRemaining(null);
        }
    }, [profile]);

    useEffect(() => {
        const handleShowNoCredits = () => setShowNoCreditsModal(true);
        window.addEventListener('show-no-credits', handleShowNoCredits);
        return () => window.removeEventListener('show-no-credits', handleShowNoCredits);
    }, []);

    // NEW: Enforce access restriction
    // If trial is over and no plan is active, redirect to /dashboard/expired
    useEffect(() => {
        if (loading || !profile || !pathname) return;

        // Permanent ignore paths
        if (pathname === '/dashboard/expired' || pathname === '/dashboard/settings') return;

        const hasActivePlan = profile.plan === 'pro' ||
            profile.subscription_status === 'active' ||
            profile.subscription_status === 'trialing';

        const isTrialStillActive = profile.trial_active && (daysRemaining === null || daysRemaining > 0);
        const isPending = profile.plan === 'pending';

        if ((!hasActivePlan && !isTrialStillActive) || isPending) {
            router.replace('/dashboard/expired');
        }
    }, [profile, daysRemaining, pathname, loading, router]);

    async function handleCheckoutPlan() {
        if (profile?.plan === 'pro') {
            router.push('/dashboard/settings');
            return;
        }

        setPlanCheckoutLoading(true);
        try {
            const res = await fetch('/api/stripe/checkout-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, email: user.email }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Error');
            }
        } catch (err) {
            console.error('Error checkout plan:', err);
            alert('Error al conectar con Stripe: ' + err.message);
        } finally {
            setPlanCheckoutLoading(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/login');
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div className="emergency-spinner"></div>
                <p style={{ color: '#FFD700', fontSize: '1rem', fontWeight: 900, animation: 'pulse 2s infinite', letterSpacing: '1px' }}>
                    {loadingStatus} (v4.4.15)
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
                            ⚠️ FORZAR ENTRADA AL DASHBOARD
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
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes scaleIn {
                        from { opacity: 0; transform: translateX(-50%) scale(0.95); }
                        to { opacity: 1; transform: translateX(-50%) scale(1); }
                    }
                    .menu-item-hover:hover {
                        background: rgba(255,255,255,0.05) !important;
                    }
                `}</style>
            </div>
        );
    }

    const navItems = [
        { href: '/dashboard/home', icon: Home, label: t('nav.home') },
        { href: '/dashboard/asistente', icon: MessageSquare, label: t('nav.assistant'), highlight: true },
        { href: '/dashboard', icon: PenLine, label: t('nav.new_script') },
        { href: '/dashboard/copys', icon: Type, label: t('nav.copys') },
        { href: '/dashboard/estrategia', icon: Target, label: t('nav.strategy') },
        { href: '/dashboard/ideas-virales', icon: Sparkles, label: t('nav.viral_ideas') },
        { href: '/dashboard/library', icon: BookOpen, label: t('nav.library') },
        { href: '/dashboard/knowledge', icon: Brain, label: t('nav.brain') },
        { href: '/dashboard/calendar', icon: CalendarDays, label: t('nav.calendar') },
        { href: '/dashboard/stats', icon: BarChart2, label: t('nav.stats') },
        { href: '/dashboard/settings', icon: Settings, label: t('nav.settings') },
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
                                        background: isActive ? 'rgba(126, 206, 202, 0.1)' : item.highlight ? 'rgba(126,206,202,0.05)' : 'transparent',
                                        color: isActive ? '#7ECECA' : item.highlight ? '#7ECECA' : '#888888',
                                        transition: 'all 0.2s ease',
                                        textDecoration: 'none',
                                        boxShadow: item.highlight && !isActive ? '0 0 12px rgba(126,206,202,0.15)' : 'none',
                                        border: item.highlight && !isActive ? '1px solid rgba(126,206,202,0.2)' : 'none',
                                    }}
                                >
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.highlight && !isActive && (
                                        <span style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#7ECECA', boxShadow: '0 0 5px #7ECECA' }} />
                                    )}

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
                                    {t('nav.exit')}
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
                            v4.4.15
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
                            <aside onClick={(e) => e.stopPropagation()} style={{
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

                                {/* Project Selector in Mobile Sidebar */}
                                <div style={{ marginBottom: '10px' }}>
                                    <ProjectSelector mobile={true} />
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
                                    {t('nav.logout')}
                                </button>
                            </aside>
                        </div>
                    )}
                    {/* Topbar refined */}
                    <header className="topbar" style={{ height: '72px', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minWidth: 0, position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                            <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
                                <Logo />
                            </Link>
                            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}></div>
                                <ProjectSelector />
                                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}></div>
                            </div>

                            {/* User Profile Menu */}
                            <div style={{ position: 'relative' }}>
                                <div
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(255,255,255,0.01)',
                                        borderRadius: '20px',
                                        padding: '4px 12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        transition: '0.2s'
                                    }}
                                    className="user-profile-badge"
                                    title={t('dashboard.my_account')}
                                >
                                    <span style={{ fontSize: '0.75rem' }}>👤</span>
                                    <span style={{ fontSize: '0.75rem', color: '#FFD700', fontWeight: 900, marginRight: '8px' }}>v4.4.15</span>
                                    <p className="desktop-only" style={{
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        whiteWhiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '120px',
                                        margin: 0
                                    }}>
                                        {user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                </div>

                                {isUserMenuOpen && (
                                    <>
                                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} onClick={() => setIsUserMenuOpen(false)} />
                                        <div style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 10px)',
                                            left: 0,
                                            width: '200px',
                                            background: '#1a1a1a',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            zIndex: 999,
                                            overflow: 'hidden',
                                            animation: 'fadeInUp 0.2s ease'
                                        }}>
                                            <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>{t('dashboard.connected_as')}</p>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                                            </div>
                                            <Link href="/dashboard/settings" onClick={() => setIsUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#ccc', textDecoration: 'none', fontSize: '0.9rem', transition: '0.2s' }} className="menu-item-hover">
                                                <User size={16} /> {t('dashboard.profile')}
                                            </Link>
                                            <Link href="/dashboard/settings" onClick={() => setIsUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#ccc', textDecoration: 'none', fontSize: '0.9rem', transition: '0.2s' }} className="menu-item-hover">
                                                <SettingsIcon size={16} /> {t('nav.settings')}
                                            </Link>
                                            <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#ff4d4d', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }} className="menu-item-hover">
                                                <LogOutIcon size={16} /> {t('nav.logout')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                <LanguageSelector />
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
                                    {t('dashboard.buy_credits')}
                                </button>
                                <button
                                    onClick={handleCheckoutPlan}
                                    disabled={planCheckoutLoading}
                                    className="btn-primary"
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        background: profile?.plan === 'pro' ? 'rgba(126, 206, 202, 0.2)' : 'var(--accent-gradient)',
                                        color: profile?.plan === 'pro' ? '#7ECECA' : 'black',
                                        borderRadius: '100px',
                                        boxShadow: profile?.plan === 'pro' ? 'none' : '0 0 15px rgba(126, 206, 202, 0.4)',
                                        border: profile?.plan === 'pro' ? '1px solid rgba(126, 206, 202, 0.3)' : 'none',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {planCheckoutLoading ? '⏳' : profile?.plan === 'pro' ? t('dashboard.pro_badge') : t('dashboard.plan_pro')}
                                </button>
                            </div>
                            <div className="credit-badge" onClick={() => setIsCreditsModalOpen(true)} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: (profile?.credits_balance || 0) > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.1)',
                                padding: '8px 16px',
                                borderRadius: '100px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                transition: '0.2s',
                                flexShrink: 0
                            }}>
                                <span style={{ fontSize: '1rem' }}>💎</span>
                                <span style={{ color: (profile?.credits_balance || 0) > 0 ? '#7ECECA' : '#FF4D4D', fontWeight: 800, fontSize: '0.9rem' }}>
                                    {profile?.credits_balance || 0}
                                </span>
                            </div>
                            
                            {/* Membership Status Badge */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(126, 206, 202, 0.05)',
                                padding: '8px 16px',
                                borderRadius: '100px',
                                border: '1px solid rgba(126, 206, 202, 0.2)',
                                flexShrink: 0
                            }}>
                                <span style={{ fontSize: '0.9rem' }}>💎</span>
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                                    <span style={{ color: '#7ECECA', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                        {profile?.plan === 'pro' ? t('dashboard.membership_pro') : t('dashboard.free_trial')}
                                    </span>
                                    <span style={{ color: (typeof daysRemaining === 'number' && daysRemaining <= 2) ? '#FF4D4D' : '#FFD700', fontSize: '0.75rem', fontWeight: 800 }}>
                                        {daysRemaining !== null ? (typeof daysRemaining === 'number' ? t('dashboard.days_remaining', { days: daysRemaining }) : daysRemaining) : '...'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}></div>

                            <div style={{ display: 'flex', gap: '14px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        title="Notificaciones"
                                    >
                                        <Bell size={20} />
                                    </button>
                                    {isNotificationsOpen && (
                                        <>
                                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} onClick={() => setIsNotificationsOpen(false)} />
                                            <div style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 20px)',
                                                right: 0,
                                                width: '300px',
                                                background: '#1a1a1a',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                                                zIndex: 999,
                                                padding: '20px',
                                                animation: 'fadeInUp 0.2s ease'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Notificaciones</h3>
                                                    <CloseIcon size={16} style={{ cursor: 'pointer', color: '#666' }} onClick={() => setIsNotificationsOpen(false)} />
                                                </div>
                                                <div style={{ textAlign: 'center', padding: '20px 0', color: '#666' }}>
                                                    <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Próximamente: Notificaciones en tiempo real.</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        title="Buscar"
                                    >
                                        <Search size={20} />
                                    </button>
                                    {isSearchOpen && (
                                        <>
                                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setIsSearchOpen(false)} />
                                            <div style={{
                                                position: 'fixed',
                                                top: '15%',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '90%',
                                                maxWidth: '600px',
                                                background: '#1a1a1a',
                                                borderRadius: '20px',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                                                zIndex: 999,
                                                padding: '24px',
                                                animation: 'scaleIn 0.2s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <Search size={20} style={{ color: '#7ECECA' }} />
                                                    <input
                                                        autoFocus
                                                        placeholder="Buscar proyectos o ideas..."
                                                        style={{ background: 'none', border: 'none', color: 'white', fontSize: '1rem', width: '100%', outline: 'none' }}
                                                    />
                                                </div>
                                                <p style={{ margin: '16px 0 0', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>Buscador global en desarrollo. Próximamente integrado.</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <Link
                                    href="/dashboard/settings"
                                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}
                                    title="Configuración"
                                >
                                    <SettingsIcon size={20} />
                                </Link>
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

                    {showNoCreditsModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                        }} onClick={() => setShowNoCreditsModal(false)}>
                            <div style={{
                                background: '#1a1a1a', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '90%',
                                border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'
                            }} onClick={e => e.stopPropagation()}>
                                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔄</div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>
                                    Activa WRITI
                                </h2>
                                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                                    Necesitas créditos o un plan activo para usar las funciones de IA.
                                    {profile?.is_trial_active && daysRemaining > 0 && (
                                        <><br /><span style={{ color: '#9D00FF' }}>¡Tienes {daysRemaining} días de prueba gratis!</span></>
                                    )}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button
                                        onClick={() => { setShowNoCreditsModal(false); handleCheckoutPlan(); }}
                                        className="btn-primary"
                                        style={{ padding: '16px 32px', fontSize: '1rem', fontWeight: 800, height: 'auto' }}
                                    >
                                        🎯 Elegir Plan Pro
                                    </button>
                                    <button
                                        onClick={() => { setShowNoCreditsModal(false); setIsCreditsModalOpen(true); }}
                                        className="btn-secondary"
                                        style={{ padding: '16px 32px', fontSize: '1rem', fontWeight: 800, height: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                    >
                                        💎 Depositar Créditos
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowNoCreditsModal(false)}
                                    style={{ marginTop: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                    {isPaymentSuccessModalOpen && (
                        <SuccessModal
                            isOpen={isPaymentSuccessModalOpen}
                            onClose={() => setIsPaymentSuccessModalOpen(false)}
                            title="¡Créditos Añadidos! 💎"
                            message={`Has adquirido ${purchasedCredits} créditos correctamente. Ya puedes seguir generando contenido sin límites.`}
                            actionLabel="Ver mi Saldo"
                            actionOnClick={() => {
                                setIsPaymentSuccessModalOpen(false);
                                setIsCreditsModalOpen(true);
                            }}
                        />
                    )}
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
                    .desktop-only { display: none !important; }
                }

                 @media (max-width: 900px) {
                    .credit-badge { padding: 4px 10px !important; }
                    .credit-badge span:last-child { display: none; }
                }

                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(126, 206, 202, 0.1);
                    border-top: 3px solid #7ECECA;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                `}</style>
            </div>
    );
}

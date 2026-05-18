'use client';
/**
 * Version: v1.17.6.2 (Omega Asistente Fix)
 */

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import { PenLine, BookOpen, Brain, CalendarDays, BarChart2, Settings, LogOut, Menu, Sparkles, Target, Coins, Home, ChevronDown, FolderOpen, Type, MessageSquare, Megaphone } from 'lucide-react';
import Logo from '@/app/components/Logo';
import CreditsModal from '@/app/components/CreditsModal';
import SuccessModal from '@/app/components/SuccessModal';
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
    useEffect(() => {
        console.log('%c🚀 WRITIAI Dashboard v1.17.8.1 (Smart Buttons) LOADED', 'background: #7ECECA; color: #000; padding: 4px 8px; font-weight: bold; border-radius: 4px;');
    }, []);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();
    const { activeProject } = useProject();
    const activeProjectId = activeProject?.id || null;
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
    const [sidebarHovered, setSidebarHovered] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createSupabaseClient();

    const fetchProfile = async (userId) => {
        try {
            const profilePromise = supabase
                .from('users_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile Timeout')), 4000));

            const { data: profileData, error } = await Promise.race([profilePromise, timeoutPromise]);

            if (profileData) {
                setProfile(profileData);
                return profileData;
            }

            // ── SECURITY: New OAuth user with no profile → no access ──────
            // Do NOT create trial automatically. Only users you approve get access.
            // They will be redirected to /dashboard/expired by the subscription gate.
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

                // SECURITY: Wait for profile before showing UI
                // This prevents OAuth users from seeing the dashboard before subscription check
                const profileData = await fetchProfile(session.user.id);

                // If no profile exists this user has no subscription — block immediately
                if (!profileData) {
                    router.replace('/dashboard/expired');
                    setLoading(false);
                    return;
                }

                setLoading(false);
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
                router.replace('/dashboard/home');

                // Polling Refresh: The webhook might take a few seconds
                handleRefreshProfile();
                setTimeout(handleRefreshProfile, 3000);
                setTimeout(handleRefreshProfile, 7000);
            } else if (pa === 'true') {
                // Instantly poll after plan activation to show PRO badge
                router.replace('/dashboard/home');

                // Ensure profile is updated properly
                handleRefreshProfile();
                setTimeout(handleRefreshProfile, 3000);
                setTimeout(handleRefreshProfile, 7000);
            } else if (urlParams.get('open_credits')) {
                setIsCreditsModalOpen(true);
                router.replace('/dashboard/home');
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
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!profile) {
            setDaysRemaining(null);
            setIsExpired(false);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // v1.17.8: Admin Bypass for Expiration Check
        // ─────────────────────────────────────────────────────────────
        if (profile.is_admin) {
            setDaysRemaining('Activa');
            setIsExpired(false);
            return;
        }

        const calculateTime = () => {
            const now = new Date();
            let targetDate = null;

            if ((profile.plan === 'trial' || profile.plan === 'free') && profile.trial_ends_at) {
                targetDate = new Date(profile.trial_ends_at);
            } else if (profile.plan === 'pro') {
                if (profile.subscription_period_end) {
                    targetDate = new Date(profile.subscription_period_end);
                } else {
                    setDaysRemaining('Activa');
                    setIsExpired(false);
                    return;
                }
            }

            if (targetDate) {
                const diff = targetDate - now;
                if (diff <= 0) {
                    setDaysRemaining('Expirado');
                    setIsExpired(true);

                    // Solo intentar desactivar si no se ha hecho ya
                    if ((profile.plan === 'trial' || profile.plan === 'free') && profile.trial_active) {
                        supabase.from('users_profiles').update({ trial_active: false }).eq('id', profile.id).then(() => {});
                    }
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                    if (days > 0) {
                        setDaysRemaining(`${days}d ${hours}h`);
                    } else {
                        setDaysRemaining(`${hours}h`);
                    }
                    setIsExpired(false);
                }
            } else {
                setDaysRemaining(null);
                setIsExpired(false);
            }
        };

        calculateTime();
        // Actualizar cada minuto para que el contador de horas sea fluido
        const interval = setInterval(calculateTime, 60000);
        return () => clearInterval(interval);
    }, [profile]);

    useEffect(() => {
        const handleShowNoCredits = () => {
            // v1.17.8: Prevenir modal si es admin
            if (profile?.is_admin) return;
            setShowNoCreditsModal(true);
        };
        window.addEventListener('show-no-credits', handleShowNoCredits);
        return () => window.removeEventListener('show-no-credits', handleShowNoCredits);
    }, [profile]);

    // SECURITY: Server-side plan check on EVERY route change — cannot be bypassed
    useEffect(() => {
        if (!pathname) return;
        if (pathname === '/dashboard/expired' || pathname === '/dashboard/settings') return;

        fetch('/api/auth/check-plan', { cache: 'no-store' })
            .then(res => {
                if (!res.ok) router.replace('/dashboard/expired');
            })
            .catch(() => router.replace('/dashboard/expired'));
    }, [pathname]); // Fires on EVERY navigation

    // Secondary client-side check (fallback using React state)
    useEffect(() => {
        if (loading || !pathname) return;
        if (pathname === '/dashboard/expired' || pathname === '/dashboard/settings') return;
        if (!profile) { router.replace('/dashboard/expired'); return; }

        const hasActivePlan = profile.plan === 'pro' ||
            profile.subscription_status === 'active' ||
            profile.subscription_status === 'trialing';
        const isTrialStillActive = profile.trial_active && !isExpired;
        const isPending = profile.plan === 'pending';

        if ((!hasActivePlan && !isTrialStillActive) || isPending) {
            router.replace('/dashboard/expired');
        }
    }, [profile, isExpired, pathname, loading, router]);

    // v4.6.2: Ensure body scroll is recovered when sidebar closes
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [sidebarOpen]);

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
            <div style={{ minHeight: '100vh', background: '#0c0c0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'wSpin 0.8s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', fontWeight: 500, margin: 0 }}>
                    WRITI.AI
                </p>

                <style>{`@keyframes wSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Breadcrumb helper
    // ─────────────────────────────────────────────────────────────
    const breadcrumbMap = {
        '/dashboard/home':         'Inicio',
        '/dashboard/asistente':    'Asistente IA',
        '/dashboard/session':      'Matrix',
        '/dashboard/copys':        'Copys',
        '/dashboard/estrategia':   'Estrategia',
        '/dashboard/ideas-virales':'Ideas Virales',
        '/dashboard/library':      'Biblioteca',
        '/dashboard/knowledge':    'Cerebro IA',
        '/dashboard/brain':        'Cerebro IA',
        '/dashboard/calendar':     'Calendario',
        '/dashboard/stats':        'Estadísticas',
        '/dashboard/settings':     'Ajustes',
        '/dashboard':              'Inicio',
    };
    const currentPageLabel = breadcrumbMap[pathname] || 'Dashboard';

    const sessionHref = activeProjectId
        ? `/dashboard/session?project=${activeProjectId}`
        : '/dashboard/session';

    const navItems = [
        // ── Principal ──────────────────────────────────
        { href: '/dashboard/home',          icon: Home,          label: t('nav.home') },
        { href: sessionHref,                icon: Sparkles,      label: 'Matrix',              highlight: true },
        { href: '/dashboard/library',       icon: BookOpen,      label: t('nav.library') },
        { href: '/dashboard/calendar',      icon: CalendarDays,  label: t('nav.calendar') },
        { href: '/dashboard/settings',      icon: Settings,      label: t('nav.settings') },
        // ── Secundario ─────────────────────────────────
        { href: '/dashboard/asistente',     icon: MessageSquare, label: t('nav.assistant'),    secondary: true },
        { href: '/dashboard',               icon: PenLine,       label: t('nav.new_script'),   secondary: true },
        { href: '/dashboard/copys',         icon: Type,          label: 'Textos rápidos',      secondary: true },
        { href: '/dashboard/ideas-virales', icon: Megaphone,     label: t('nav.viral_ideas'),  secondary: true },
        { href: '/dashboard/estrategia',    icon: Target,        label: t('nav.strategy'),     secondary: true },
        { href: '/dashboard/stats',         icon: BarChart2,     label: t('nav.stats'),        secondary: true },
    ];

    // User avatar initial
    const avatarInitial = (profile?.full_name || profile?.name || user?.email || 'U').charAt(0).toUpperCase();

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0c0c0e' }}>

            {/* ── Desktop Sidebar ─────────────────────────────────── */}
            <aside
                onMouseEnter={() => setSidebarHovered(true)}
                onMouseLeave={() => setSidebarHovered(false)}
                style={{
                    width: sidebarHovered ? '220px' : '64px',
                    transition: 'width 0.22s ease',
                    overflow: 'hidden',
                    height: '100vh',
                    background: '#111116',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px 0',
                    flexShrink: 0,
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    zIndex: 50,
                }} className="desktop-sidebar">

                {/* Logo */}
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Logo mobile={true} />
                    </Link>
                </div>

                {/* Divider */}
                <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />

                {/* Nav items */}
                <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, width: '100%', padding: '0 8px' }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                        return (
                            <React.Fragment key={item.href + item.label}>
                                {/* Separador entre principal y secundario */}
                                {item.secondary && navItems.findIndex(i => i.secondary) === navItems.indexOf(item) && (
                                    <div style={{
                                        margin: '8px 10px',
                                        height: '1px',
                                        background: 'rgba(255,255,255,0.06)',
                                    }} />
                                )}
                                <Link
                                    href={item.href}
                                    onMouseEnter={() => setHoveredItem(item.label)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: sidebarHovered ? 'flex-start' : 'center',
                                        paddingLeft: sidebarHovered ? '14px' : 0,
                                        gap: '10px',
                                        width: '100%',
                                        height: '44px',
                                        borderRadius: '10px',
                                        background: isActive
                                            ? 'rgba(124,58,237,0.18)'
                                            : item.highlight && !isActive
                                                ? 'rgba(124,58,237,0.08)'
                                                : 'transparent',
                                        color: isActive
                                            ? '#a78bfa'
                                            : item.highlight
                                                ? '#a78bfa'
                                                : 'rgba(255,255,255,0.38)',
                                        opacity: item.secondary && !isActive ? 0.5 : 1,
                                        transition: 'background 0.15s ease, color 0.15s ease, opacity 0.15s ease',
                                        textDecoration: 'none',
                                        border: isActive
                                            ? '1px solid rgba(124,58,237,0.35)'
                                            : item.highlight && !isActive
                                                ? '1px solid rgba(124,58,237,0.2)'
                                                : '1px solid transparent',
                                        boxSizing: 'border-box',
                                    }}
                                    className="sidebar-nav-link"
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink: 0 }} />

                                    {sidebarHovered && (
                                        <span style={{
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            color: 'inherit',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                        }}>
                                            {item.label}
                                        </span>
                                    )}

                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <span style={{
                                            position: 'absolute',
                                            left: '-8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '3px',
                                            height: '20px',
                                            borderRadius: '0 2px 2px 0',
                                            background: '#7c3aed',
                                        }} />
                                    )}

                                    {/* Highlight pulse dot */}
                                    {item.highlight && !isActive && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            width: '5px',
                                            height: '5px',
                                            borderRadius: '50%',
                                            background: '#a78bfa',
                                            boxShadow: '0 0 6px #a78bfa',
                                        }} />
                                    )}

                                    {/* Tooltip — only when collapsed */}
                                    {!sidebarHovered && hoveredItem === item.label && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '56px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: '#1e1e26',
                                            color: 'white',
                                            padding: '6px 10px',
                                            borderRadius: '7px',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            zIndex: 200,
                                            pointerEvents: 'none',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            letterSpacing: '0.01em',
                                        }}>
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            </React.Fragment>
                        );
                    })}
                </nav>

                {/* Bottom actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingBottom: '12px', width: '100%', padding: '0 8px 12px' }}>
                    <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }} />

                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        onMouseEnter={() => setHoveredItem('__logout__')}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                            position: 'relative',
                            background: 'transparent',
                            border: '1px solid transparent',
                            color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarHovered ? 'flex-start' : 'center',
                            paddingLeft: sidebarHovered ? '14px' : 0,
                            gap: '10px',
                            width: '100%',
                            height: '44px',
                            borderRadius: '10px',
                            transition: 'background 0.15s ease, color 0.15s ease',
                            boxSizing: 'border-box',
                        }}
                        className="sidebar-logout-btn"
                    >
                        <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />

                        {sidebarHovered && (
                            <span style={{
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: 'inherit',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                            }}>
                                {t('nav.logout')}
                            </span>
                        )}

                        {/* Tooltip — only when collapsed */}
                        {!sidebarHovered && hoveredItem === '__logout__' && (
                            <div style={{
                                position: 'absolute',
                                left: '56px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#1e1e26',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                zIndex: 200,
                                pointerEvents: 'none',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                {t('nav.logout')}
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* ── Main area (topbar + content) ────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* ── Topbar ──────────────────────────────────────── */}
                <header style={{
                    height: '52px',
                    background: '#13131a',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    flexShrink: 0,
                    gap: '12px',
                    position: 'relative',
                    zIndex: 40,
                }}>

                    {/* Left: hamburger (mobile) + breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            style={{
                                display: 'none',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                padding: '4px',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            className="mobile-hamburger"
                        >
                            <Menu size={20} />
                        </button>

                        {/* Breadcrumb */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span style={{
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.3)',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                            }}>
                                WRITI
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>/</span>
                            <span style={{
                                fontSize: '0.82rem',
                                color: 'rgba(255,255,255,0.75)',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {currentPageLabel}
                            </span>
                        </div>

                        {/* Project selector (desktop) */}
                        <div className="topbar-project-selector" style={{ marginLeft: '8px' }}>
                            <ProjectSelector />
                        </div>
                    </div>

                    {/* Right: credits + plan + language + avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

                        {/* Language selector */}
                        <div className="topbar-lang">
                            <LanguageSelector />
                        </div>

                        {/* Credits pill */}
                        <button
                            onClick={() => setIsCreditsModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '100px',
                                padding: '5px 12px',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                                flexShrink: 0,
                            }}
                            className="credits-pill-btn"
                            title="Ver créditos"
                        >
                            <span style={{
                                fontSize: '0.75rem',
                                color: (profile?.credits_balance || 0) > 0 ? '#a78bfa' : '#f87171',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                            }}>
                                {profile?.credits_balance ?? '—'} Créditos
                            </span>
                        </button>

                        {/* Plan expiration badge */}
                        {daysRemaining !== null && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: isExpired ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isExpired ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.07)'}`,
                                borderRadius: '100px',
                                padding: '5px 10px',
                                flexShrink: 0,
                            }} className="topbar-expiry-badge">
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: isExpired ? '#f87171' : 'rgba(255,255,255,0.45)',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {daysRemaining}
                                </span>
                            </div>
                        )}

                        {/* Mejorar plan button — only if not pro */}
                        {profile?.plan !== 'pro' && (
                            <button
                                onClick={handleCheckoutPlan}
                                disabled={planCheckoutLoading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: 'transparent',
                                    border: '1px solid rgba(124,58,237,0.5)',
                                    borderRadius: '100px',
                                    padding: '5px 12px',
                                    color: '#a78bfa',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'background 0.15s ease, border-color 0.15s ease',
                                    flexShrink: 0,
                                }}
                                className="upgrade-plan-btn"
                            >
                                {planCheckoutLoading ? '...' : 'Mejorar plan'}
                            </button>
                        )}

                        {/* PRO badge */}
                        {profile?.plan === 'pro' && (
                            <div style={{
                                background: 'rgba(124,58,237,0.15)',
                                border: '1px solid rgba(124,58,237,0.35)',
                                borderRadius: '100px',
                                padding: '4px 10px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: '#a78bfa',
                                letterSpacing: '0.06em',
                                flexShrink: 0,
                            }}>
                                PRO
                            </div>
                        )}

                        {/* Divider */}
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} className="topbar-divider" />

                        {/* User avatar button */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                                    border: '2px solid rgba(124,58,237,0.4)',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'border-color 0.15s ease',
                                }}
                                title={user?.email}
                            >
                                {avatarInitial}
                            </button>

                            {/* User dropdown */}
                            {isUserMenuOpen && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                                        onClick={() => setIsUserMenuOpen(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        right: 0,
                                        width: '220px',
                                        background: '#1a1a24',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.09)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                                        zIndex: 99,
                                        overflow: 'hidden',
                                        animation: 'topbarMenuFadeIn 0.15s ease',
                                    }}>
                                        {/* User info header */}
                                        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>
                                                Conectado como
                                            </p>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.82rem',
                                                fontWeight: 600,
                                                color: 'white',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {user?.email}
                                            </p>
                                        </div>

                                        {/* Menu links */}
                                        <Link
                                            href="/dashboard/settings"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: '0.85rem', transition: 'background 0.1s' }}
                                            className="user-menu-item"
                                        >
                                            <User size={15} />
                                            {t('dashboard.profile')}
                                        </Link>
                                        <Link
                                            href="/dashboard/settings"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: '0.85rem', transition: 'background 0.1s' }}
                                            className="user-menu-item"
                                        >
                                            <SettingsIcon size={15} />
                                            {t('nav.settings')}
                                        </Link>

                                        {/* Logout */}
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '11px 16px',
                                                color: '#f87171',
                                                background: 'none',
                                                border: 'none',
                                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                textAlign: 'left',
                                                transition: 'background 0.1s',
                                            }}
                                            className="user-menu-item"
                                        >
                                            <LogOutIcon size={15} />
                                            {t('nav.logout')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Content ─────────────────────────────────────── */}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: '#0c0c0e',
                    padding: '28px 32px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                }}>
                    {children}
                </main>
            </div>

            {/* ── Mobile sidebar overlay ───────────────────────────── */}
            {sidebarOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.82)',
                        zIndex: 200,
                        display: 'flex',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setSidebarOpen(false)}
                >
                    <aside
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '280px',
                            height: '100%',
                            maxHeight: '100dvh',
                            background: '#111116',
                            padding: '20px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            overflowY: 'auto',
                            scrollbarWidth: 'none',
                            boxShadow: '8px 0 32px rgba(0,0,0,0.6)',
                            borderRight: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        {/* Mobile sidebar header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <Link href="/" style={{ textDecoration: 'none' }} onClick={() => setSidebarOpen(false)}>
                                <Logo mobile={true} />
                            </Link>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                            >
                                <CloseIcon size={18} />
                            </button>
                        </div>

                        {/* Mobile user info */}
                        <div style={{
                            padding: '14px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            marginBottom: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    flexShrink: 0,
                                }}>
                                    {avatarInitial}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <div style={{
                                    padding: '3px 8px',
                                    background: profile?.plan === 'pro' ? 'rgba(124,58,237,0.15)' : 'rgba(255,184,0,0.1)',
                                    borderRadius: '100px',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    color: profile?.plan === 'pro' ? '#a78bfa' : '#fbbf24',
                                    border: profile?.plan === 'pro' ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(251,191,36,0.2)',
                                }}>
                                    {profile?.plan === 'pro' ? 'PRO' : 'TRIAL'}
                                </div>
                                {daysRemaining !== null && (
                                    <div style={{
                                        padding: '3px 8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '100px',
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        color: isExpired ? '#f87171' : 'rgba(255,255,255,0.5)',
                                    }}>
                                        {daysRemaining}
                                    </div>
                                )}
                                <div style={{
                                    padding: '3px 8px',
                                    background: 'rgba(124,58,237,0.08)',
                                    borderRadius: '100px',
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    color: '#a78bfa',
                                    cursor: 'pointer',
                                }}
                                onClick={() => { setSidebarOpen(false); setIsCreditsModalOpen(true); }}
                                >
                                    {profile?.credits_balance ?? 0} créditos
                                </div>
                            </div>
                        </div>

                        {/* Mobile project selector */}
                        <div style={{ marginBottom: '12px' }}>
                            <ProjectSelector mobile={true} />
                        </div>

                        {/* Mobile nav */}
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href + item.label}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '11px 14px',
                                            borderRadius: '10px',
                                            background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                                            color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                                            textDecoration: 'none',
                                            fontSize: '0.9rem',
                                            fontWeight: isActive ? 600 : 500,
                                            border: isActive ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                                            transition: 'background 0.12s ease',
                                        }}
                                    >
                                        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Mobile logout */}
                        <button
                            onClick={() => { setSidebarOpen(false); handleLogout(); }}
                            style={{
                                marginTop: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '11px 14px',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                borderRadius: '10px',
                                width: '100%',
                                textAlign: 'left',
                                marginTop: '8px',
                            }}
                        >
                            <LogOut size={18} strokeWidth={1.8} />
                            {t('nav.logout')}
                        </button>
                    </aside>
                </div>
            )}

            {/* ── Modals ──────────────────────────────────────────── */}
            <CreditsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                balance={profile?.credits_balance || 0}
                user={user}
            />

            {showNoCreditsModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000,
                    }}
                    onClick={() => setShowNoCreditsModal(false)}
                >
                    <div
                        style={{
                            background: '#1a1a24',
                            borderRadius: '20px',
                            padding: '36px',
                            maxWidth: '460px',
                            width: '90%',
                            border: '1px solid rgba(255,255,255,0.09)',
                            textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '3.5rem', marginBottom: '14px' }}>🔄</div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '12px', color: 'white' }}>
                            Activa WRITI
                        </h2>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: '1.6' }}>
                            Necesitas créditos o un plan activo para usar las funciones de IA.
                            {profile?.is_trial_active && !isExpired && (
                                <><br /><span style={{ color: '#a78bfa' }}>¡Te quedan {daysRemaining} de acceso exclusivo!</span></>
                            )}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => { setShowNoCreditsModal(false); handleCheckoutPlan(); }}
                                className="btn-primary"
                                style={{ padding: '14px 28px', fontSize: '0.95rem', fontWeight: 800, height: 'auto' }}
                            >
                                Elegir PLAN PRO
                            </button>
                            <button
                                onClick={() => { setShowNoCreditsModal(false); setIsCreditsModalOpen(true); }}
                                style={{
                                    padding: '14px 28px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    cursor: 'pointer',
                                }}
                            >
                                Depositar Créditos
                            </button>
                        </div>
                        <button
                            onClick={() => setShowNoCreditsModal(false)}
                            style={{ marginTop: '20px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.85rem' }}
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

            {/* ── Global styles ────────────────────────────────────── */}
            <style jsx>{`
                .desktop-sidebar::-webkit-scrollbar { display: none; }

                .sidebar-nav-link:hover {
                    background: rgba(255,255,255,0.05) !important;
                    color: rgba(255,255,255,0.7) !important;
                }

                .sidebar-logout-btn:hover {
                    background: rgba(248,113,113,0.08) !important;
                    color: #f87171 !important;
                    border-color: rgba(248,113,113,0.2) !important;
                }

                .credits-pill-btn:hover {
                    background: rgba(124,58,237,0.12) !important;
                }

                .upgrade-plan-btn:hover {
                    background: rgba(124,58,237,0.12) !important;
                    border-color: rgba(124,58,237,0.7) !important;
                }

                .user-menu-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                }

                @keyframes topbarMenuFadeIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                @keyframes scaleIn {
                    from { opacity: 0; transform: translateX(-50%) scale(0.95); }
                    to   { opacity: 1; transform: translateX(-50%) scale(1); }
                }

                /* ── Responsive ──────────────────────────────────── */
                @media (max-width: 768px) {
                    .desktop-sidebar { display: none !important; }
                    .mobile-hamburger { display: flex !important; }
                    .topbar-project-selector { display: none !important; }
                    .topbar-lang { display: none !important; }
                    .topbar-divider { display: none !important; }
                    .topbar-expiry-badge { display: none !important; }
                }
            `}</style>
        </div>
    );
}

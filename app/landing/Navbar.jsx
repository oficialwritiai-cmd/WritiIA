'use client';
import { useEffect, useState } from "react";
import { useLang } from "./LanguageLanding";
import { Sparkles } from "lucide-react";

function track(event) {
  if (typeof window !== 'undefined' && window.gtag) window.gtag('event', event);
}

const Navbar = () => {
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  const scrollToPricing = (e) => {
    e.preventDefault();
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header data-testid="navbar" className="fixed top-0 left-0 right-0 z-50">
      {/* ── Urgency bar ── */}
      <div style={{
        background: '#7C3AED',
        textAlign: 'center',
        padding: '9px 16px',
        fontSize: '0.78rem',
        fontWeight: 500,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <span>⚡ Lanzamiento — Onboarding personal incluido para los primeros 20 usuarios</span>
        <a
          href="#pricing"
          onClick={scrollToPricing}
          style={{
            background: '#fff',
            color: '#7C3AED',
            borderRadius: '99px',
            padding: '3px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Aprovecha →
        </a>
      </div>

      {/* ── Navbar ── */}
      <div className={`transition-all duration-500 ${scrolled ? "py-2" : "py-4"}`}>
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <nav
            className="flex items-center justify-between px-4 sm:px-5 py-2.5 rounded-full transition-all duration-500"
            style={{
              background: "rgba(20, 8, 50, 0.70)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(180, 140, 255, 0.18)",
              boxShadow: scrolled ? "0 8px 30px rgba(80,40,160,0.4)" : "inset 0 1px 1px rgba(200,170,255,0.10)",
            }}
          >
            {/* Logo */}
            <a href="#top" className="flex items-center gap-2 pl-2" data-testid="logo-link">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </span>
              <span style={{ fontFamily: "'Outfit', sans-serif", color: '#fff', fontWeight: 600, letterSpacing: '-0.025em', fontSize: '1.125rem' }}>
                WRITI<span style={{ color: 'rgba(255,255,255,0.4)' }}>.AI</span>
              </span>
            </a>

            {/* Links */}
            <ul className="hidden md:flex items-center gap-7 text-sm list-none m-0 p-0">
              {[
                { href: "#system",  label: t("nav.system")  },
                { href: "#forwho",  label: t("nav.forWho")  },
                { href: "#pricing", label: t("nav.pricing") },
                { href: "#faq",     label: t("nav.faq")     },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <div
                className="hidden sm:flex items-center rounded-full p-0.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: '0.75rem',
                }}
                data-testid="lang-toggle"
              >
                {["es", "en"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    data-testid={`lang-${l}`}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '9999px',
                      transition: 'all 0.2s',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                      background: lang === l ? '#ffffff' : 'transparent',
                      color:      lang === l ? '#000000' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Iniciar sesión */}
              <a
                href="/login"
                className="hidden md:inline-flex"
                style={{
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              >
                {t("nav.login")}
              </a>

              {/* CTA principal */}
              <a
                href="/login"
                data-testid="nav-cta"
                onClick={() => track('nav_cta_click')}
                className="inline-flex items-center justify-center"
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  background: '#7C3AED',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 16px rgba(124,58,237,0.5)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#7C3AED'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {t("nav.cta")}
              </a>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

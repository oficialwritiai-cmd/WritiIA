'use client';
import { useEffect, useState } from "react";
import { useLang } from "./LanguageLanding";
import { Sparkles } from "lucide-react";

const Navbar = () => {
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3" : "py-5"}`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <nav
          className={`flex items-center justify-between px-4 sm:px-5 py-2.5 rounded-full transition-all duration-500 ${scrolled ? "shadow-[0_8px_30px_rgba(80,40,160,0.4)]" : ""}`}
          style={{
            background: "rgba(20, 8, 50, 0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(180, 140, 255, 0.18)",
            boxShadow: "inset 0 1px 1px rgba(200, 170, 255, 0.10)",
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
          <ul className="hidden md:flex items-center gap-8 text-sm list-none m-0 p-0">
            {[
              { href: "#system",       label: t("nav.system")       },
              { href: "#forwho",       label: t("nav.forWho")       },
              { href: "#pricing",      label: t("nav.pricing")      },
              { href: "#testimonials", label: t("nav.testimonials") },
            ].map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s' }}
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
              className="flex items-center rounded-full p-0.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
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
                    padding: '6px 12px',
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

            {/* CTA */}
            <a
              href="/login"
              data-testid="nav-cta"
              className="hidden sm:inline-flex items-center justify-center"
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                background: '#ffffff',
                color: '#000000',
                fontSize: '0.75rem',
                fontWeight: 500,
                transition: 'transform 0.2s',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {t("nav.cta")}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

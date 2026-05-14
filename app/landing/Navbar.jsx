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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <nav
          className={`flex items-center justify-between px-4 sm:px-5 py-2.5 rounded-full transition-all duration-500 ${
            scrolled ? "shadow-[0_8px_30px_rgba(80,40,160,0.4)]" : ""
          }`}
          style={{
            background: "rgba(20, 8, 50, 0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(180, 140, 255, 0.18)",
            boxShadow: "inset 0 1px 1px rgba(200, 170, 255, 0.10)",
          }}
        >
          <a href="#top" className="flex items-center gap-2 pl-2" data-testid="logo-link">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-white font-semibold tracking-tight text-lg" style={{ fontFamily: "'Outfit', sans-serif" }}>
              WRITI<span className="text-white/40">.AI</span>
            </span>
          </a>

          <ul className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <li><a className="hover:text-white transition-colors" href="#system" data-testid="nav-system">{t("nav.system")}</a></li>
            <li><a className="hover:text-white transition-colors" href="#forwho" data-testid="nav-forwho">{t("nav.forWho")}</a></li>
            <li><a className="hover:text-white transition-colors" href="#pricing" data-testid="nav-pricing">{t("nav.pricing")}</a></li>
            <li><a className="hover:text-white transition-colors" href="#testimonials" data-testid="nav-testimonials">{t("nav.testimonials")}</a></li>
          </ul>

          <div className="flex items-center gap-2">
            <div className="liquid-glass flex items-center rounded-full p-0.5 text-xs" data-testid="lang-toggle">
              <button
                onClick={() => setLang("es")}
                data-testid="lang-es"
                className={`px-3 py-1.5 rounded-full transition-all ${lang === "es" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
              >ES</button>
              <button
                onClick={() => setLang("en")}
                data-testid="lang-en"
                className={`px-3 py-1.5 rounded-full transition-all ${lang === "en" ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
              >EN</button>
            </div>
            <a
              href="/login"
              data-testid="nav-cta"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full bg-white text-black text-xs font-medium hover:scale-[1.03] transition-transform"
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

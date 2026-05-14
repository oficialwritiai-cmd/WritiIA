'use client';
import { useLang } from "./LanguageLanding";
import { Sparkles } from "lucide-react";

const Footer = () => {
  const { t } = useLang();
  const links = t("footer.links");

  return (
    <footer className="relative py-14 border-t border-white/[0.06]" data-testid="footer">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 flex flex-col md:flex-row gap-8 md:items-end md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-white font-semibold tracking-tight text-lg" style={{ fontFamily: "'Outfit', sans-serif" }}>
              WRITI<span className="text-white/40">.AI</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-white/45 leading-relaxed">{t("footer.sys")}</p>
        </div>

        <div className="grid grid-cols-3 gap-8 text-sm">
          {Object.entries(links).map(([k, v]) => (
            <div key={k}>
              <p className="micro-label mb-3">{v}</p>
              <ul className="space-y-2 text-white/55">
                <li><a className="hover:text-white transition-colors" href="#system">{t("nav.system")}</a></li>
                <li><a className="hover:text-white transition-colors" href="#pricing">{t("nav.pricing")}</a></li>
                <li><a className="hover:text-white transition-colors" href="#testimonials">{t("nav.testimonials")}</a></li>
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 lg:px-8 mt-10 pt-6 border-t border-white/[0.05] flex items-center justify-between text-xs text-white/35">
        <span>© {new Date().getFullYear()} WRITI.AI</span>
        <span>{t("footer.rights")}</span>
      </div>
    </footer>
  );
};

export default Footer;

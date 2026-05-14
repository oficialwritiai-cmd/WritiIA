'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { ArrowUpRight, ShieldCheck, Lock, Crown } from "lucide-react";

const icons = [Crown, ShieldCheck, Lock];

const FinalCTA = () => {
  const { t } = useLang();
  const badges = t("final.badges");

  return (
    <section id="final" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <Reveal>
          <div className="liquid-glass-strong p-7 sm:p-10 lg:p-16 text-center overflow-hidden relative">
            <p className="micro-label" data-testid="final-eyebrow">{t("final.eyebrow")}</p>
            <h2
              className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] text-white font-medium leading-[1.05]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
              data-testid="final-title"
            >
              <span className="font-serif-accent text-white/85">{t("final.title")}</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              {t("final.sub")}
            </p>

            <div className="mt-10 flex justify-center">
              <a href="/login" className="btn-primary group" data-testid="final-cta">
                {t("final.cta")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-2.5">
              {badges.map((b, i) => {
                const Icon = icons[i];
                return (
                  <span key={i} className="pill" data-testid={`final-badge-${i}`}>
                    {Icon && <Icon className="h-3.5 w-3.5 text-white/70" />}
                    {b}
                  </span>
                );
              })}
            </div>

            <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[280px] h-[280px] sm:w-[520px] sm:h-[520px] rounded-full pointer-events-none opacity-50"
                 style={{ background: "radial-gradient(circle, rgba(167,139,250,0.18) 0%, rgba(0,0,0,0) 60%)" }} />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default FinalCTA;

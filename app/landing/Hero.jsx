'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { ArrowUpRight, Sparkles, Brain, Calendar, FileText, Play, CheckCircle2 } from "lucide-react";

const Hero = () => {
  const { t } = useLang();
  const pills = t("hero.pills");
  const dash = t("hero.dash");

  return (
    <section id="top" className="relative min-h-screen w-full pt-28 lg:pt-32 pb-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-stretch">
          {/* LEFT */}
          <Reveal className="w-full lg:w-[52%]">
            <div className="liquid-glass-strong p-7 sm:p-10 lg:p-12 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                <span className="pill" data-testid="hero-pill">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 ambient-pulse" />
                  {t("hero.pill")}
                </span>
              </div>

              <h1
                className="text-[42px] sm:text-5xl lg:text-[64px] xl:text-[72px] leading-[1.02] tracking-[-0.035em] text-white font-medium"
                style={{ fontFamily: "'Outfit', sans-serif" }}
                data-testid="hero-h1"
              >
                {t("hero.h1Pre")}{" "}
                <span className="font-serif-accent text-white/80">{t("hero.h1Italic")}</span>{" "}
                {t("hero.h1Post")}
              </h1>

              <p className="mt-6 text-base sm:text-lg text-white/65 max-w-xl leading-relaxed">
                {t("hero.sub")}
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <a href="/login" className="btn-primary group" data-testid="hero-cta-primary">
                  {t("hero.ctaPrimary")}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
                <a href="#system" className="btn-secondary group" data-testid="hero-cta-secondary">
                  <Play className="h-3.5 w-3.5" />
                  {t("hero.ctaSecondary")}
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-2.5">
                {pills.map((p, i) => (
                  <span key={i} className="pill" data-testid={`hero-feature-pill-${i}`}>
                    {i === 0 && <Brain className="h-3.5 w-3.5 text-white/70" />}
                    {i === 1 && <FileText className="h-3.5 w-3.5 text-white/70" />}
                    {i === 2 && <Calendar className="h-3.5 w-3.5 text-white/70" />}
                    {p}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-12 flex items-center gap-4">
                <span className="micro-label">{`— V I S I Ó N · ${new Date().getFullYear()}`}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          </Reveal>

          {/* RIGHT — Dashboard preview */}
          <Reveal delay={150} className="w-full lg:w-[48%]">
            <div className="relative flex flex-col gap-5 h-full">
              <div className="liquid-glass p-5 flex items-center justify-between" data-testid="hero-dash-label">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <Sparkles className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{dash.label}</p>
                    <p className="text-sm text-white">{dash.title}</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-300/90 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Live
                </span>
              </div>

              <div className="liquid-glass-strong p-6 lg:p-7 flex-1 flex flex-col gap-6 float-slow">
                <div className="grid grid-cols-2 gap-3">
                  <div className="liquid-glass p-4">
                    <p className="micro-label">{dash.stat1}</p>
                    <p className="mt-2 text-3xl text-white font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>31</p>
                    <p className="text-[11px] text-white/40 mt-1">+12 esta semana</p>
                  </div>
                  <div className="liquid-glass p-4">
                    <p className="micro-label">{dash.stat2}</p>
                    <p className="mt-2 text-3xl text-white font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      194<span className="text-white/30 text-lg">/194</span>
                    </p>
                    <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-white/80 to-violet-300/70" />
                    </div>
                  </div>
                </div>

                <div className="liquid-glass p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-400/20">
                        <Brain className="h-4 w-4 text-violet-200" />
                      </span>
                      <div>
                        <p className="text-sm text-white">{dash.brand}</p>
                        <p className="text-[11px] text-white/45">{dash.brandSub}</p>
                      </div>
                    </div>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ambient-pulse" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {dash.pillars.map((p, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] text-white/70 border border-white/[0.06]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href="#system"
                  data-testid="hero-dash-cta"
                  className="liquid-glass p-4 flex items-center justify-between hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                      <Calendar className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm text-white">{dash.cta}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-white/60" />
                </a>
              </div>

              <div className="absolute -left-3 -top-3 hidden lg:flex liquid-glass px-3 py-2 items-center gap-2 text-[11px] text-white/70 float-slow" style={{ animationDelay: "1.2s" }}>
                <Sparkles className="h-3 w-3 text-white" /> 60 min · 1 sesión
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Hero;

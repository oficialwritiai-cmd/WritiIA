'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { Check, ShieldCheck, Clock, Sparkles, ArrowUpRight } from "lucide-react";

const ValueStack = () => {
  const { t } = useLang();
  const items = t("value.items");
  const benefits = t("value.planBenefits");

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <div className="max-w-3xl">
            <p className="micro-label" data-testid="value-eyebrow">{t("value.eyebrow")}</p>
            <h2
              className="mt-4 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-medium"
              style={{ fontFamily: "'Outfit', sans-serif" }}
              data-testid="value-title"
            >
              {t("value.title")}
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Reveal className="lg:col-span-7">
            <div className="liquid-glass p-5 sm:p-7 lg:p-9 h-full">
              <ul className="divide-y divide-white/[0.06]" data-testid="value-stack-list">
                {items.map((it, i) => (
                  <li key={i} className="py-4 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08]">
                        <Check className="h-3.5 w-3.5 text-white/80" />
                      </span>
                      <span className="text-sm sm:text-base text-white/85 leading-snug">{it.k}</span>
                    </div>
                    <span className="text-sm sm:text-base text-white/55 whitespace-nowrap">{it.v}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="micro-label">{t("value.total")}</p>
                  <p className="text-2xl text-white/40 line-through mt-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {t("value.totalValue")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="micro-label">{t("value.today")}</p>
                  <p className="text-3xl sm:text-4xl text-white mt-1.5 font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {t("value.todayValue")}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150} className="lg:col-span-5">
            <div className="liquid-glass-strong p-5 sm:p-7 lg:p-9 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <span className="pill" data-testid="plan-title">
                  <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                  {t("value.planTitle")}
                </span>
              </div>
              <div className="mt-7">
                <p
                  className="text-4xl sm:text-5xl md:text-6xl text-white font-medium tracking-[-0.03em]"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {t("value.planPrice")}
                  <span className="text-base text-white/45 font-normal ml-1.5">
                    {t("value.planFreq")}
                  </span>
                </p>
              </div>
              <ul className="mt-7 space-y-3" data-testid="plan-benefits">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/75">
                    <Check className="h-4 w-4 text-violet-300 mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <a href="/login" data-testid="plan-cta" className="mt-8 btn-primary justify-center">
                {t("value.cta")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Reveal>
            <div className="liquid-glass p-7 h-full" data-testid="guarantee-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                </span>
                <h3 className="text-lg text-white font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {t("value.guaranteeTitle")}
                </h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{t("value.guarantee")}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="liquid-glass p-7 h-full" data-testid="urgency-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-400/20">
                  <Clock className="h-4 w-4 text-violet-200" />
                </span>
                <h3 className="text-lg text-white font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {t("value.urgencyTitle")}
                </h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{t("value.urgency")}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default ValueStack;

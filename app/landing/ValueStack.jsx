'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { Check, ShieldCheck, Clock, Sparkles, ArrowUpRight } from "lucide-react";
import { trackPixelEvent } from "@/app/lib/pixel";

function track(event) {
  if (typeof window !== 'undefined' && window.gtag) window.gtag('event', event);
}

const ValueStack = () => {
  const { t } = useLang();
  const benefits = t("value.planBenefits");

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label text-center mb-4" data-testid="value-eyebrow">{t("value.eyebrow")}</p>
        </Reveal>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Pricing card */}
          <Reveal className="lg:col-span-7">
            <div
              className="liquid-glass-strong p-8 sm:p-10 flex flex-col"
              style={{ border: '1px solid rgba(124,58,237,0.3)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="pill" data-testid="plan-title">
                  <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                  {t("value.planTitle")}
                </span>
              </div>

              <div className="mb-6">
                <p
                  className="text-5xl sm:text-6xl text-white font-medium tracking-[-0.03em]"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {t("value.planPrice")}
                  <span className="text-base text-white/45 font-normal ml-2">
                    {t("value.planFreq")}
                  </span>
                </p>
              </div>

              <ul className="space-y-3 mb-8" data-testid="plan-benefits">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 border border-violet-400/30 shrink-0">
                      <Check className="h-3 w-3 text-violet-300" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <a
                href="/login"
                data-testid="plan-cta"
                onClick={() => {
                  track('pricing_click');
                  trackPixelEvent('InitiateCheckout');
                }}
                className="btn-primary justify-center"
                style={{
                  background: '#7C3AED',
                  boxShadow: '0 0 24px rgba(124,58,237,0.45)',
                  padding: '15px 28px',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                {t("value.cta")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>

          {/* Side cards */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Guarantee */}
            <Reveal delay={80}>
              <div
                className="liquid-glass p-6"
                data-testid="guarantee-card"
                style={{ border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.04)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-400/20 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  </span>
                  <h3 className="text-base text-white font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {t("value.guaranteeTitle")}
                  </h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{t("value.guarantee")}</p>
              </div>
            </Reveal>

            {/* Urgency */}
            <Reveal delay={160}>
              <div
                className="liquid-glass p-6"
                data-testid="urgency-card"
                style={{ border: '1px solid rgba(124,58,237,0.2)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-400/20 shrink-0">
                    <Clock className="h-5 w-5 text-violet-300" />
                  </span>
                  <h3 className="text-base text-white font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {t("value.urgencyTitle")}
                  </h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{t("value.urgency")}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueStack;

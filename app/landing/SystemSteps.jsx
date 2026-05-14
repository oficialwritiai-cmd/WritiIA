'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { Brain, Lightbulb, FileText, CalendarDays } from "lucide-react";

const icons = [Brain, Lightbulb, FileText, CalendarDays];

const SystemSteps = () => {
  const { t } = useLang();
  const steps = t("system.steps");

  return (
    <section id="system" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-3xl">
              <p className="micro-label" data-testid="system-eyebrow">{t("system.eyebrow")}</p>
              <h2
                className="mt-4 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-medium"
                style={{ fontFamily: "'Outfit', sans-serif" }}
                data-testid="system-title"
              >
                {t("system.title")}
              </h2>
            </div>
            <p className="text-sm text-white/55 max-w-md leading-relaxed">{t("system.sub")}</p>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
          {steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={i} delay={i * 90}>
                <div
                  className="liquid-glass p-7 h-full flex flex-col relative overflow-hidden transition-all duration-500 hover:bg-white/[0.05] hover:-translate-y-1"
                  data-testid={`system-step-${i}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    <span
                      className="text-[40px] leading-none text-white/15 font-medium"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3
                    className="mt-7 text-lg text-white font-medium tracking-tight"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {s.k}
                  </h3>
                  <p className="mt-3 text-sm text-white/55 leading-relaxed">{s.v}</p>
                  <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/40">
                    <span className="tracking-[0.2em]">STEP {s.n}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SystemSteps;

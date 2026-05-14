'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { AlertCircle, BookX, CalendarOff } from "lucide-react";

const icons = [AlertCircle, BookX, CalendarOff];

const Problem = () => {
  const { t } = useLang();
  const items = t("problem.items");

  return (
    <section id="problem" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label" data-testid="problem-eyebrow">{t("problem.eyebrow")}</p>
          <h2
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-medium max-w-3xl"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            data-testid="problem-title"
          >
            {t("problem.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {items.map((it, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={i} delay={i * 110}>
                <div className="liquid-glass p-7 h-full group hover:bg-white/[0.05] transition-all duration-500" data-testid={`problem-card-${i}`}>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06]">
                      <Icon className="h-4 w-4 text-white/70" />
                    </span>
                    <span className="text-[11px] text-white/30 tracking-[0.2em]">0{i + 1}</span>
                  </div>
                  <h3 className="text-lg text-white font-medium mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {it.k}
                  </h3>
                  <p className="text-sm text-white/55 leading-relaxed">{it.v}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={300}>
          <div className="mt-20 lg:mt-24 max-w-4xl">
            <h3
              className="text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-[-0.03em] text-white/80 font-medium"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <span className="block">{t("problem.outroA")}</span>
              <span className="block mt-2">
                <span className="font-serif-accent text-white">{t("problem.outroB")}</span>
              </span>
              <span className="block mt-3 text-white">{t("problem.outroC")}</span>
            </h3>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Problem;

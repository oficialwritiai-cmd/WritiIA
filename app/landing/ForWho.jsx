'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { Briefcase, Mic, Building2 } from "lucide-react";

const icons = [Briefcase, Mic, Building2];

const ForWho = () => {
  const { t } = useLang();
  const cards = t("forwho.cards");

  return (
    <section id="forwho" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label" data-testid="forwho-eyebrow">{t("forwho.eyebrow")}</p>
          <h2
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-medium max-w-3xl"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            data-testid="forwho-title"
          >
            {t("forwho.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {cards.map((c, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={i} delay={i * 110}>
                <div
                  className="liquid-glass p-7 lg:p-8 h-full flex flex-col group transition-all duration-500 hover:bg-white/[0.05] hover:-translate-y-1"
                  data-testid={`forwho-card-${i}`}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.08] mb-7 group-hover:bg-white/[0.10] transition-colors">
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="text-xl text-white font-medium tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {c.k}
                  </h3>
                  <p className="mt-3 text-sm text-white/55 leading-relaxed flex-1">{c.v}</p>
                  <a
                    href="#pricing"
                    onClick={e => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="mt-5 text-sm text-violet-300/70 hover:text-violet-300 transition-colors"
                    style={{ textDecoration: 'none' }}
                  >
                    Soy {c.k.split(' ')[0].toLowerCase()} →
                  </a>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ForWho;

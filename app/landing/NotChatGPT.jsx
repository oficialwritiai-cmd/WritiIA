'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { X, Layers } from "lucide-react";

const NotChatGPT = () => {
  const { t } = useLang();
  const blocks = t("notai.blocks");

  return (
    <section id="notai" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label" data-testid="notai-eyebrow">{t("notai.eyebrow")}</p>
          <h2
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-medium max-w-3xl"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            data-testid="notai-title"
          >
            {t("notai.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {blocks.map((b, i) => (
            <Reveal key={i} delay={i * 110}>
              <div className="liquid-glass p-7 h-full transition-all duration-500 hover:bg-white/[0.05]" data-testid={`notai-block-${i}`}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-400/20">
                  <X className="h-4 w-4 text-rose-300" />
                </span>
                <h3 className="mt-6 text-lg text-white font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>{b.k}</h3>
                <p className="mt-3 text-sm text-white/55 leading-relaxed">{b.v}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="mt-12 liquid-glass-strong p-7 lg:p-10 flex flex-col md:flex-row md:items-center gap-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Layers className="h-5 w-5 text-white" />
            </span>
            <p className="text-lg lg:text-xl text-white leading-relaxed max-w-4xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {t("notai.outro")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default NotChatGPT;

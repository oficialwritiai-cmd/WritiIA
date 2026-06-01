'use client';
import { useState } from "react";
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { Plus, Minus } from "lucide-react";

function track(event) {
  if (typeof window !== 'undefined' && window.gtag) window.gtag('event', event);
}

const FAQ = () => {
  const { t } = useLang();
  const items = t("faq.items");
  const [open, setOpen] = useState(null);

  function toggle(i) {
    setOpen(open === i ? null : i);
    track('faq_click');
  }

  return (
    <section id="faq" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label text-center mb-2">{t("faq.eyebrow")}</p>
          <h2
            className="mt-4 text-3xl sm:text-4xl tracking-tight text-white font-medium text-center mb-12"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {t("faq.title")}
          </h2>
        </Reveal>

        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 60}>
              <div
                className="liquid-glass overflow-hidden"
                style={{ border: open === i ? '1px solid rgba(124,58,237,0.35)' : undefined }}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <span className="text-sm sm:text-base text-white/90 font-medium leading-snug">
                    {item.q}
                  </span>
                  <span className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.10]">
                    {open === i
                      ? <Minus className="h-3.5 w-3.5 text-violet-300" />
                      : <Plus  className="h-3.5 w-3.5 text-white/60" />
                    }
                  </span>
                </button>
                {open === i && (
                  <div className="px-6 pb-6">
                    <p className="text-sm text-white/55 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

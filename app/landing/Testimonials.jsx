'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { Star } from "lucide-react";

const avatars = [
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=256&h=256",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256&h=256",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=256&h=256",
];

const Testimonials = () => {
  const { t } = useLang();
  const items = t("testimonials.items");

  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label" data-testid="test-eyebrow">{t("testimonials.eyebrow")}</p>
          <h2
            className="mt-4 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-medium max-w-3xl"
            style={{ fontFamily: "'Outfit', sans-serif" }}
            data-testid="test-title"
          >
            {t("testimonials.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 110}>
              <div
                className="liquid-glass p-7 h-full flex flex-col transition-all duration-500 hover:bg-white/[0.05] hover:-translate-y-1"
                data-testid={`testimonial-${i}`}
              >
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-3.5 w-3.5 fill-white text-white" />
                  ))}
                </div>
                <p className="text-[15px] text-white/80 leading-relaxed flex-1">"{it.text}"</p>
                <div className="mt-7 flex items-center gap-3 pt-5 border-t border-white/[0.06]">
                  <img
                    src={avatars[i]}
                    alt={it.name}
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15"
                  />
                  <div>
                    <p className="text-sm text-white">{it.name}</p>
                    <p className="text-[11px] text-white/45">{it.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

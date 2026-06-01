'use client';
import { useLang } from "./LanguageLanding";
import Reveal from "./Reveal";
import { ArrowUpRight, Users } from "lucide-react";

// Actualiza este número manualmente cuando cambien las plazas
const PLAZAS_DISPONIBLES = 13;

function track(event) {
  if (typeof window !== 'undefined' && window.gtag) window.gtag('event', event);
}

const Testimonials = () => {
  const { t } = useLang();
  const d = t("launch");

  return (
    <section id="launch" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <Reveal>
          <p className="micro-label text-center mb-6">{d.eyebrow}</p>
          <div
            className="liquid-glass-strong p-8 sm:p-12 text-center"
            style={{ border: '1px solid rgba(124,58,237,0.35)' }}
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-400/20 mb-6">
              <Users className="h-6 w-6 text-violet-300" />
            </div>

            <h2
              className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-4"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {d.title}
            </h2>

            <p className="text-white/65 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8">
              {d.body}
            </p>

            {/* Plazas counter */}
            <div
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-8"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
            >
              <span className="h-2 w-2 rounded-full bg-violet-400" style={{ animation: 'pulse 1.5s infinite' }} />
              <span className="text-sm font-semibold text-white/80">
                Quedan: <span className="text-violet-300 text-base font-bold">{PLAZAS_DISPONIBLES}</span> plazas
              </span>
            </div>

            <div>
              <a
                href="/login"
                onClick={() => track('launch_cta_click')}
                className="btn-primary justify-center"
                style={{
                  background: '#7C3AED',
                  boxShadow: '0 0 20px rgba(124,58,237,0.4)',
                  padding: '14px 32px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                }}
              >
                {d.cta}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Testimonials;

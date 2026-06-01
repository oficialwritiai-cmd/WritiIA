'use client';
import "../landing-tailwind.css";
import { useEffect } from "react";
import { LanguageLandingProvider } from "./LanguageLanding";
import GalaxyBackground from "./GalaxyBackground";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Problem from "./Problem";
import SystemSteps from "./SystemSteps";
import NotChatGPT from "./NotChatGPT";
import ForWho from "./ForWho";
import ValueStack from "./ValueStack";
import Testimonials from "./Testimonials";
import FAQ from "./FAQ";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";
import VideoSection from "./VideoSection";
import LandingIntro from "./LandingIntro";

function ScrollTracker() {
  useEffect(() => {
    let fired50 = false, fired100 = false;
    function onScroll() {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (!fired50 && pct >= 50) { fired50 = true; if (window.gtag) window.gtag('event', 'scroll_50'); }
      if (!fired100 && pct >= 95) { fired100 = true; if (window.gtag) window.gtag('event', 'scroll_100'); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return null;
}

const Landing = () => {
  return (
    <LanguageLandingProvider>
      <LandingIntro />
      <GalaxyBackground />
      <ScrollTracker />

      <div
        id="landing-root"
        className="relative min-h-screen w-full text-white"
        data-testid="landing-root"
        style={{ fontFamily: "'Inter', sans-serif", overflowX: "hidden", position: "relative", zIndex: 1 }}
      >
        {/* 1. Navbar (urgency bar incluida) */}
        <Navbar />

        <main>
          {/* 2. Hero */}
          <Hero />
          {/* 3. Video */}
          <VideoSection />
          {/* 4. El problema real */}
          <Problem />
          {/* 5. Sistema 4 pasos */}
          <SystemSteps />
          {/* 6. No es otro ChatGPT */}
          <NotChatGPT />
          {/* 7. Para quién */}
          <ForWho />
          {/* 8. Precios + Garantía */}
          <ValueStack />
          {/* 9. Plazas limitadas */}
          <Testimonials />
          {/* 10. FAQ */}
          <FAQ />
          {/* 11. CTA final */}
          <FinalCTA />
        </main>

        <Footer />
      </div>
    </LanguageLandingProvider>
  );
};

export default Landing;

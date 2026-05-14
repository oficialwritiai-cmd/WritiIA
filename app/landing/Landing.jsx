'use client';
import "../landing-tailwind.css";
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
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";

const Landing = () => {
  return (
    <LanguageLandingProvider>
      {/* Fondo galáctico — z-index 0, fijo en viewport */}
      <GalaxyBackground />

      {/* Contenido — z-index 1, encima del fondo */}
      <div
        id="landing-root"
        className="relative min-h-screen w-full text-white"
        data-testid="landing-root"
        style={{
          fontFamily: "'Inter', sans-serif",
          overflowX: "hidden",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Navbar />
        <main>
          <Hero />
          <Problem />
          <SystemSteps />
          <NotChatGPT />
          <ForWho />
          <ValueStack />
          <Testimonials />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </LanguageLandingProvider>
  );
};

export default Landing;

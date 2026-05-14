'use client';
import { useEffect, useRef } from "react";

const ASTRO_URL = "/assets/astronaut.png";

const GalaxyBackground = () => {
  const canvasRef = useRef(null);
  const astroRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    let streaks = [];
    let dust = [];
    const nebulas = [];
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const seed = () => {
      const n = Math.floor((w * h) / 5500);
      streaks = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 60 + Math.random() * Math.max(w, h) * 0.7;
        streaks.push({
          a, d,
          len: 40 + Math.random() * 120,
          sp: 0.6 + Math.random() * 1.6,
          alpha: 0.15 + Math.random() * 0.55,
          hue: 265 + Math.random() * 25,
        });
      }
      dust = [];
      const nd = Math.floor((w * h) / 22000);
      for (let i = 0; i < nd; i++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.5 + Math.random() * 1.4,
          tw: Math.random() * Math.PI * 2,
        });
      }
      nebulas.length = 0;
      const palette = [
        [125, 70, 220, 0.14],
        [160, 90, 255, 0.10],
        [80, 30, 180, 0.10],
        [200, 160, 255, 0.06],
      ];
      for (let i = 0; i < 5; i++) {
        nebulas.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 320 + Math.random() * 520,
          c: palette[i % palette.length],
          a: Math.random() * Math.PI * 2,
          s: 0.0002 + Math.random() * 0.0004,
        });
      }
    };

    const drawNebulas = () => {
      for (const n of nebulas) {
        n.a += n.s;
        const ox = Math.cos(n.a) * 30;
        const oy = Math.sin(n.a) * 30;
        const grad = ctx.createRadialGradient(n.x + ox, n.y + oy, 0, n.x + ox, n.y + oy, n.r);
        const [r, g, b, alpha] = n.c;
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(n.x + ox - n.r, n.y + oy - n.r, n.r * 2, n.r * 2);
      }
    };

    const drawStreaks = () => {
      const cx = w * 0.5 + mx * 18;
      const cy = h * 0.5 + my * 18;
      ctx.lineCap = "round";
      for (const s of streaks) {
        s.d += s.sp;
        if (s.d > Math.hypot(w, h)) s.d = 60;
        const x1 = cx + Math.cos(s.a) * s.d;
        const y1 = cy + Math.sin(s.a) * s.d;
        const x2 = cx + Math.cos(s.a) * (s.d - s.len);
        const y2 = cy + Math.sin(s.a) * (s.d - s.len);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `hsla(${s.hue}, 80%, 80%, ${s.alpha})`);
        grad.addColorStop(1, `hsla(${s.hue}, 80%, 60%, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    const drawDust = () => {
      for (const d of dust) {
        d.tw += 0.015;
        const a = 0.25 + Math.sin(d.tw) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = `rgba(220, 200, 255, ${a})`;
        ctx.arc(d.x + mx * 4, d.y + my * 4, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;
      ctx.clearRect(0, 0, w, h);

      const base = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
      base.addColorStop(0, "#160a2e");
      base.addColorStop(0.45, "#0a0518");
      base.addColorStop(1, "#03020a");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      drawNebulas();
      drawStreaks();
      drawDust();

      const core = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, 460);
      core.addColorStop(0, "rgba(160, 110, 255, 0.18)");
      core.addColorStop(1, "rgba(160, 110, 255, 0)");
      ctx.fillStyle = core;
      ctx.fillRect(w * 0.5 - 460, h * 0.5 - 460, 920, 920);

      if (!prefersReduced) rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      tmx = (e.clientX - cx) / cx;
      tmy = (e.clientY - cy) / cy;
      if (astroRef.current) {
        astroRef.current.style.setProperty("--mx", tmx.toFixed(3));
        astroRef.current.style.setProperty("--my", tmy.toFixed(3));
      }
    };

    const onScroll = () => {
      if (!astroRef.current) return;
      const y = window.scrollY;
      astroRef.current.style.setProperty("--sy", `${y * 0.15}px`);
      astroRef.current.style.setProperty("--ss", `${1 + Math.min(y, 600) * 0.00035}`);
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} data-testid="galaxy-background">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      <div
        ref={astroRef}
        className="absolute inset-0 flex items-center justify-center astro-wrap"
        style={{ "--sy": "0px", "--ss": "1", "--mx": "0", "--my": "0" }}
      >
        <img
          src={ASTRO_URL}
          alt=""
          loading="eager"
          className="astro-img select-none"
          draggable="false"
        />
      </div>
      <div className="absolute inset-0 pointer-events-none"
           style={{
             background: "radial-gradient(ellipse at 50% 45%, transparent 0%, transparent 35%, rgba(5,2,15,0.55) 70%, rgba(3,2,10,0.92) 100%)",
           }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[40vh] pointer-events-none"
           style={{
             background: "linear-gradient(to bottom, rgba(3,2,10,0) 0%, rgba(3,2,10,0.85) 60%, #050214 100%)",
           }}
      />
      <div className="grain" />
    </div>
  );
};

export default GalaxyBackground;

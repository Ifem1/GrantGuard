"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle drifting gold particle field. Pure canvas, no deps.
 * Respects prefers-reduced-motion.
 */
export function ParticleField({
  density = 0.00009,
  className = "",
}: {
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; ta: number }[] = [];

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.min(140, Math.floor(w * h * density)));
      particles = Array.from({ length: count }, () => spawn(w, h));
    }

    function spawn(w: number, h: number) {
      const a = Math.random() * 0.5 + 0.15;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -Math.random() * 0.12 - 0.02,
        r: Math.random() * 1.2 + 0.4,
        a,
        ta: a,
      };
    }

    function frame() {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.a += (p.ta - p.a) * 0.02;
        if (Math.random() < 0.005) p.ta = Math.random() * 0.5 + 0.15;
        if (p.y < -4 || p.x < -4 || p.x > w + 4) {
          Object.assign(p, spawn(w, h));
          p.y = h + 4;
        }
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(199,154,59,${p.a.toFixed(3)})`;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    if (!reduced) frame();
    else {
      // Static field for reduced-motion users.
      ctx!.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(199,154,59,${p.a.toFixed(3)})`;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return <canvas ref={ref} className={`pointer-events-none w-full h-full ${className}`} aria-hidden />;
}

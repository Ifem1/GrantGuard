"use client";

import { useEffect, useRef, useState } from "react";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "risk";
}) {
  const accent =
    tone === "good" ? "text-sage" : tone === "warn" ? "text-gold" : tone === "risk" ? "text-rust" : "text-softwhite";
  return (
    <div className="panel p-4 fade-up">
      <div className="label-eyebrow mb-2">{label}</div>
      <div className={`font-display text-3xl ${accent} tabular-nums`}>
        <AnimatedValue value={value} />
      </div>
      {hint && <div className="text-xs text-muted mt-2 font-mono">{hint}</div>}
    </div>
  );
}

function AnimatedValue({ value }: { value: string | number }) {
  const { target, prefix, suffix } = parseValue(value);
  const [display, setDisplay] = useState(target === null ? null : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (target === null) return;
    if (startedRef.current) {
      setDisplay(target);
      return;
    }
    startedRef.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(target);
      return;
    }
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (target === null) return <>{value}</>;
  return (
    <>
      {prefix}
      {(display ?? 0).toLocaleString()}
      {suffix}
    </>
  );
}

function parseValue(value: string | number): { target: number | null; prefix: string; suffix: string } {
  if (typeof value === "number") return { target: value, prefix: "", suffix: "" };
  const m = value.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return { target: null, prefix: "", suffix: "" };
  const n = Number(m[2].replace(/,/g, ""));
  if (!isFinite(n)) return { target: null, prefix: "", suffix: "" };
  return { target: n, prefix: m[1], suffix: m[3] };
}

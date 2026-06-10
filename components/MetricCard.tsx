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
    <div className="panel p-4">
      <div className="label-eyebrow mb-2">{label}</div>
      <div className={`font-display text-3xl ${accent} tabular-nums`}>{value}</div>
      {hint && <div className="text-xs text-muted mt-2 font-mono">{hint}</div>}
    </div>
  );
}

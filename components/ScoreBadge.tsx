export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tone = score >= 85 ? "text-sage" : score >= 70 ? "text-gold" : score >= 50 ? "text-muted" : "text-rust";
  const sz = size === "lg" ? "text-5xl" : size === "sm" ? "text-xl" : "text-3xl";
  return (
    <div className={`font-display ${sz} ${tone} tabular-nums`}>
      {score}
      <span className="text-muted text-xs ml-1 font-mono align-top">/100</span>
    </div>
  );
}

export function ScoreBar({ label, value, weight }: { label: string; value: number; weight?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="label-eyebrow">{label}{weight ? ` · ${weight}%` : ""}</span>
        <span className="font-mono text-xs text-softwhite tabular-nums">{value}</span>
      </div>
      <div className="h-1 bg-bronze/30 rounded-sm overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold to-sand"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

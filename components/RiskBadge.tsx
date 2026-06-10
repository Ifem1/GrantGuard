import type { RiskLevel } from "@/lib/types";

export function RiskBadge({ level, label }: { level: RiskLevel; label?: string }) {
  const tone: Record<RiskLevel, string> = {
    LOW: "text-sage border-sage/40 bg-sage/10",
    MEDIUM: "text-gold border-gold/40 bg-gold/10",
    HIGH: "text-rust border-rust/40 bg-rust/10",
    CRITICAL: "text-rust border-rust/60 bg-rust/20",
  };
  return (
    <span className={`px-2 py-1 text-[10px] font-mono tracking-widest border rounded-sm ${tone[level]}`}>
      {label ? `${label}: ` : ""}{level}
    </span>
  );
}

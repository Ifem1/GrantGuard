export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    Draft: "bg-bronze/20 text-muted border-bronze/40",
    Open: "bg-sage/15 text-sage border-sage/40",
    Reviewing: "bg-gold/15 text-gold border-gold/40",
    Finalised: "bg-ivory/10 text-softwhite border-ivory/20",
    Archived: "bg-charcoal text-muted border-bronze/40",
    SUBMITTED: "bg-sage/15 text-sage border-sage/40",
    UNDER_REVIEW: "bg-gold/15 text-gold border-gold/40",
    AI_REVIEWED: "bg-gold/15 text-gold border-gold/40",
    MANUAL_REVIEW_REQUIRED: "bg-rust/20 text-rust border-rust/40",
    REVISION_REQUESTED: "bg-gold/15 text-gold border-gold/40",
    SHORTLISTED: "bg-sage/15 text-sage border-sage/40",
    ACCEPTED: "bg-sage/20 text-sage border-sage/50",
    REJECTED: "bg-rust/20 text-rust border-rust/40",
    FINALIZED: "bg-ivory/10 text-softwhite border-ivory/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] tracking-widest uppercase font-mono border rounded-sm ${
        tone[status] ?? "bg-charcoal text-muted border-bronze/40"
      }`}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-80" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

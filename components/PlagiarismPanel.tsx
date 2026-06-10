import type { SimilarityFinding } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

export function PlagiarismPanel({ finding }: { finding?: SimilarityFinding }) {
  if (!finding) {
    return (
      <div className="panel p-5">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-display text-lg text-softwhite">Similarity</h4>
          <RiskBadge level="LOW" />
        </div>
        <p className="text-xs text-muted font-mono">No matches above threshold in this round.</p>
      </div>
    );
  }
  return (
    <div className="panel p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-display text-lg text-softwhite">Similarity</h4>
          <div className="label-eyebrow mt-1">
            score {finding.similarity_score}/100 · vs {finding.compared_against ?? "round"}
          </div>
        </div>
        <RiskBadge level={finding.similarity_level} />
      </div>
      <p className="text-sm text-softwhite/90 mb-4 leading-relaxed">{finding.reasoning_summary}</p>
      <div className="label-eyebrow mb-2">Matched sections</div>
      <ul className="space-y-1 mb-4">
        {finding.matched_sections.map((s, i) => (
          <li key={i} className="text-xs text-muted font-mono">— {s}</li>
        ))}
      </ul>
      <div className="pt-3 border-t hairline border-t-bronze/40 flex justify-between items-center">
        <span className="label-eyebrow">Recommended action</span>
        <span className="font-mono text-xs text-rust">{finding.recommended_action}</span>
      </div>
    </div>
  );
}

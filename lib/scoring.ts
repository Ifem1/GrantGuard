import type { CriteriaWeights, ReviewResult, RiskLevel } from "./types";

export const DEFAULT_WEIGHTS: CriteriaWeights = {
  originality: 20,
  technical_feasibility: 25,
  ecosystem_alignment: 20,
  team_capability: 15,
  impact: 15,
  budget_reasonableness: 5,
};

export function weightedScore(r: ReviewResult, w: CriteriaWeights = DEFAULT_WEIGHTS): number {
  const total =
    r.originality_score * w.originality +
    r.technical_feasibility_score * w.technical_feasibility +
    r.ecosystem_alignment_score * w.ecosystem_alignment +
    r.team_capability_score * w.team_capability +
    r.impact_score * w.impact +
    r.budget_reasonableness_score * w.budget_reasonableness;
  const wsum = Object.values(w).reduce((a, b) => a + b, 0);
  return Math.round(total / wsum);
}

export function riskPenalty(level: RiskLevel): number {
  return { LOW: 0, MEDIUM: 5, HIGH: 15, CRITICAL: 30 }[level];
}

export function riskAdjustedScore(r: ReviewResult, w?: CriteriaWeights): number {
  const base = weightedScore(r, w);
  const penalty = Math.max(
    riskPenalty(r.plagiarism_risk),
    riskPenalty(r.similarity_risk),
    riskPenalty(r.delivery_risk)
  );
  return Math.max(0, base - penalty);
}

export function decisionFromScore(score: number, plagiarism: RiskLevel) {
  if (plagiarism === "CRITICAL") return "FLAG_FOR_MANUAL_REVIEW";
  if (plagiarism === "HIGH") return "FLAG_FOR_MANUAL_REVIEW";
  if (score >= 90) return "STRONG_ACCEPT";
  if (score >= 80) return "ACCEPT";
  if (score >= 65) return "WAITLIST";
  if (score >= 50) return "REQUEST_REVISION";
  return "REJECT";
}

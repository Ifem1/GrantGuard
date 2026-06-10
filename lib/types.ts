export type RoundStatus = "Draft" | "Open" | "Reviewing" | "Finalised" | "Archived";

export type ProposalStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "AI_REVIEWED"
  | "MANUAL_REVIEW_REQUIRED"
  | "REVISION_REQUESTED"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REJECTED"
  | "FINALIZED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RecommendedDecision =
  | "STRONG_ACCEPT"
  | "ACCEPT"
  | "REQUEST_REVISION"
  | "WAITLIST"
  | "REJECT"
  | "FLAG_FOR_MANUAL_REVIEW";

export type FinalDecision = "ACCEPTED" | "REJECTED" | "WAITLISTED" | "REVISION_REQUIRED" | "DISQUALIFIED";

export interface CriteriaWeights {
  originality: number;
  technical_feasibility: number;
  ecosystem_alignment: number;
  team_capability: number;
  impact: number;
  budget_reasonableness: number;
}

export interface GrantRound {
  round_id: string;
  title: string;
  ecosystem: string;
  description: string;
  funding_pool: number;
  deadline: string;
  criteria_weights: CriteriaWeights;
  plagiarism_sensitivity: "LOW" | "MEDIUM" | "HIGH";
  visibility: "public" | "private";
  status: RoundStatus;
  applicant_count: number;
  creator?: string;
}

export interface Proposal {
  proposal_id: string;
  round_id: string;
  project_name: string;
  team_name: string;
  wallet: string;
  contact: string;
  summary: string;
  problem: string;
  solution: string;
  why_ecosystem: string;
  architecture: string;
  milestones: string;
  timeline: string;
  budget: number;
  team_background: string;
  prior_work: string;
  links: string;
  disclosure: string;
  honesty_confirmed: boolean;
  proposal_hash: string;
  status: ProposalStatus;
  submitted_at: string;
}

export interface ReviewResult {
  proposal_id: string;
  overall_score: number;
  originality_score: number;
  technical_feasibility_score: number;
  ecosystem_alignment_score: number;
  team_capability_score: number;
  impact_score: number;
  budget_reasonableness_score: number;
  plagiarism_risk: RiskLevel;
  similarity_risk: RiskLevel;
  delivery_risk: RiskLevel;
  strengths: string[];
  weaknesses: string[];
  red_flags: string[];
  reviewer_questions: string[];
  recommended_decision: RecommendedDecision;
  summary: string;
  ranking_rationale: string;
}

export interface SimilarityFinding {
  similarity_level: RiskLevel;
  similarity_score: number;
  matched_sections: string[];
  reasoning_summary: string;
  recommended_action: "NO_ACTION" | "MANUAL_REVIEW" | "REQUEST_CLARIFICATION" | "POSSIBLE_DISQUALIFICATION";
  compared_against?: string;
}

export interface Ranking {
  round_id: string;
  ranked_proposals: {
    proposal_id: string;
    rank: number;
    overall_score: number;
    risk_adjusted_score: number;
    recommended_decision: RecommendedDecision;
    rationale: string;
  }[];
  summary: string;
}

export interface CommitteeDecision {
  proposal_id: string;
  decision: FinalDecision;
  funding_amount: string;
  committee_note: string;
  milestones_required: string[];
  timestamp: string;
}

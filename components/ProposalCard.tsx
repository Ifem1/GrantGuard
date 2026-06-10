import Link from "next/link";
import type { Proposal, ReviewResult } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { ScoreBadge } from "./ScoreBadge";
import { RiskBadge } from "./RiskBadge";

export function ProposalCard({ proposal, review }: { proposal: Proposal; review?: ReviewResult }) {
  return (
    <Link
      href={`/proposals/${proposal.proposal_id}`}
      className="panel p-5 block hover:border-gold/50 hover:bg-ivory/[0.04] transition"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 pr-4">
          <div className="label-eyebrow mb-1">{proposal.team_name}</div>
          <h4 className="font-display text-xl text-softwhite truncate">{proposal.project_name}</h4>
        </div>
        {review ? <ScoreBadge score={review.overall_score} size="sm" /> : <StatusPill status={proposal.status} />}
      </div>
      <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3">{proposal.summary}</p>
      <div className="flex gap-2 flex-wrap">
        {review && <RiskBadge level={review.plagiarism_risk} label="plag" />}
        {review && <RiskBadge level={review.delivery_risk} label="deliv" />}
        <span className="px-2 py-1 text-[10px] font-mono tracking-widest border rounded-sm border-bronze/40 text-muted">
          ${proposal.budget.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

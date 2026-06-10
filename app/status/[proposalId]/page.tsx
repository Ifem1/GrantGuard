import Link from "next/link";
import { notFound } from "next/navigation";
import { getProposal, getReview, getDecision } from "@/lib/genlayer";
import { StatusPill } from "@/components/StatusPill";
import { ScoreBadge } from "@/components/ScoreBadge";

const TIMELINE = ["SUBMITTED", "UNDER_REVIEW", "AI_REVIEWED", "SHORTLISTED", "FINALIZED"];

export default async function BuilderStatus({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const proposal = await getProposal(proposalId);
  if (!proposal) notFound();
  const review = await getReview(proposalId);
  const decision = await getDecision(proposalId);
  const reached = Math.max(0, TIMELINE.indexOf(proposal.status));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="label-eyebrow mb-2">Applicant view</div>
      <h1 className="font-display text-4xl text-softwhite mb-2">{proposal.project_name}</h1>
      <div className="flex gap-3 items-center mb-10">
        <StatusPill status={proposal.status} />
        <span className="text-xs text-muted font-mono">hash {proposal.proposal_hash.slice(0, 14)}…</span>
      </div>

      <div className="panel p-6 mb-6">
        <h3 className="font-display text-lg text-softwhite mb-5">Review progress</h3>
        <ol className="space-y-3">
          {TIMELINE.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${i <= reached ? "bg-gold" : "bg-bronze/40"}`} />
              <span className={`font-mono text-xs tracking-widest ${i <= reached ? "text-softwhite" : "text-muted"}`}>
                {s.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {review && (
        <div className="panel p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="label-eyebrow mb-1">Public review summary</div>
              <p className="text-sm text-softwhite/90 leading-relaxed mt-2 max-w-md">{review.summary}</p>
            </div>
            <ScoreBadge score={review.overall_score} />
          </div>
        </div>
      )}

      {decision && (
        <div className="panel p-6">
          <div className="label-eyebrow mb-2">Final committee decision</div>
          <div className="font-display text-2xl text-gold">{decision.decision}</div>
          {decision.funding_amount && (
            <div className="text-sm text-softwhite mt-1">${Number(decision.funding_amount).toLocaleString()}</div>
          )}
          {decision.committee_note && <p className="text-sm text-muted mt-3">{decision.committee_note}</p>}
        </div>
      )}

      <div className="mt-10">
        <Link href={`/proposals/${proposalId}`} className="label-eyebrow hover:text-softwhite">
          View full dossier →
        </Link>
      </div>
    </div>
  );
}

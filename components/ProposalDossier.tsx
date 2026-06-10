import type { Proposal, ReviewResult, SimilarityFinding } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { ScoreBadge, ScoreBar } from "./ScoreBadge";
import { RiskBadge } from "./RiskBadge";
import { PlagiarismPanel } from "./PlagiarismPanel";
import { DecisionPanel } from "./DecisionPanel";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";

export function ProposalDossier({
  proposal,
  review,
  similarity,
}: {
  proposal: Proposal;
  review?: ReviewResult;
  similarity?: SimilarityFinding;
}) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 lg:col-span-3 space-y-4">
        <div className="panel p-5">
          <div className="label-eyebrow mb-2">Dossier</div>
          <h1 className="font-display text-2xl text-softwhite leading-tight">{proposal.project_name}</h1>
          <div className="text-sm text-muted mt-1">{proposal.team_name}</div>
          <div className="mt-4"><StatusPill status={proposal.status} /></div>

          <dl className="mt-5 space-y-3 text-xs">
            <Row k="Requested" v={`$${proposal.budget.toLocaleString()}`} />
            <Row k="Timeline" v={proposal.timeline} />
            <Row k="Wallet" v={proposal.wallet.slice(0, 10) + "…"} />
            <Row k="Hash" v={proposal.proposal_hash.slice(0, 12) + "…"} />
            <Row k="Submitted" v={proposal.submitted_at} />
          </dl>
        </div>
        <div className="panel p-5">
          <div className="label-eyebrow mb-2">Summary</div>
          <p className="text-sm text-softwhite/90 leading-relaxed">{proposal.summary}</p>
        </div>
      </aside>

      <main className="col-span-12 lg:col-span-6 space-y-6">
        {review ? (
          <div className="panel p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="label-eyebrow mb-1">GenLayer consensus review</div>
                <h2 className="font-display text-xl text-softwhite">Overall</h2>
              </div>
              <ScoreBadge score={review.overall_score} size="lg" />
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <ScoreBar label="Originality" value={review.originality_score} weight={DEFAULT_WEIGHTS.originality} />
              <ScoreBar label="Technical feasibility" value={review.technical_feasibility_score} weight={DEFAULT_WEIGHTS.technical_feasibility} />
              <ScoreBar label="Ecosystem alignment" value={review.ecosystem_alignment_score} weight={DEFAULT_WEIGHTS.ecosystem_alignment} />
              <ScoreBar label="Team capability" value={review.team_capability_score} weight={DEFAULT_WEIGHTS.team_capability} />
              <ScoreBar label="Impact" value={review.impact_score} weight={DEFAULT_WEIGHTS.impact} />
              <ScoreBar label="Budget reasonableness" value={review.budget_reasonableness_score} weight={DEFAULT_WEIGHTS.budget_reasonableness} />
            </div>
            <div className="mt-6 pt-5 border-t hairline border-t-bronze/40">
              <div className="label-eyebrow mb-2">Ranking rationale</div>
              <p className="text-sm text-softwhite/90 leading-relaxed">{review.ranking_rationale}</p>
            </div>
          </div>
        ) : (
          <div className="panel p-6 text-center text-muted">No review yet.</div>
        )}

        <Section title="Problem">{proposal.problem}</Section>
        <Section title="Proposed solution">{proposal.solution}</Section>
        <Section title="Architecture">{proposal.architecture}</Section>
        <Section title="Milestones">{proposal.milestones}</Section>

        {review && (
          <>
            <ListPanel title="Strengths" items={review.strengths} tone="sage" />
            <ListPanel title="Weaknesses" items={review.weaknesses} tone="gold" />
            {review.red_flags.length > 0 && <ListPanel title="Red flags" items={review.red_flags} tone="rust" />}
            <ListPanel title="Reviewer questions" items={review.reviewer_questions} tone="muted" />
          </>
        )}
      </main>

      <aside className="col-span-12 lg:col-span-3 space-y-4">
        {review && (
          <div className="panel p-5">
            <h4 className="font-display text-lg text-softwhite mb-3">Risk profile</h4>
            <div className="space-y-2">
              <Risk label="Plagiarism" level={review.plagiarism_risk} />
              <Risk label="Similarity" level={review.similarity_risk} />
              <Risk label="Delivery" level={review.delivery_risk} />
            </div>
            <div className="mt-5 pt-4 border-t hairline border-t-bronze/40">
              <div className="label-eyebrow mb-2">Recommended</div>
              <div className="font-mono text-sm text-gold">{review.recommended_decision}</div>
            </div>
          </div>
        )}
        <PlagiarismPanel finding={similarity} />
        <DecisionPanel proposal={proposal} />
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="label-eyebrow">{k}</dt>
      <dd className="font-mono text-softwhite text-xs">{v}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children || (typeof children === "string" && !children.trim())) return null;
  return (
    <div className="panel p-5">
      <div className="label-eyebrow mb-2">{title}</div>
      <p className="text-sm text-softwhite/90 leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}

function ListPanel({ title, items, tone }: { title: string; items: string[]; tone: "sage" | "gold" | "rust" | "muted" }) {
  if (!items.length) return null;
  const dot = { sage: "bg-sage", gold: "bg-gold", rust: "bg-rust", muted: "bg-muted" }[tone];
  return (
    <div className="panel p-5">
      <div className="label-eyebrow mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-softwhite/90 leading-relaxed flex gap-3">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Risk({ label, level }: { label: string; level: any }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted font-mono">{label}</span>
      <RiskBadge level={level} />
    </div>
  );
}

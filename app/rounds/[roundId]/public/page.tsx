import Link from "next/link";
import { notFound } from "next/navigation";
import { getRound, getProposals, getReview, getRoundRanking, getDecision } from "@/lib/genlayer";

export default async function PublicRankings({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const round = await getRound(roundId);
  if (!round) notFound();
  const proposals = await getProposals(roundId);
  const ranking = await getRoundRanking(roundId);
  const byId = Object.fromEntries(proposals.map((p) => [p.proposal_id, p]));
  const reviews = await Promise.all(ranking.ranked_proposals.map((r) => getReview(r.proposal_id)));
  const decisions = await Promise.all(ranking.ranked_proposals.map((r) => getDecision(r.proposal_id)));

  function band(score: number) {
    if (score >= 90) return "S";
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    return "D";
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href={`/rounds/${roundId}`} className="label-eyebrow hover:text-softwhite">← Round</Link>
      <div className="mt-3 mb-10">
        <div className="label-eyebrow mb-2">Public results</div>
        <h1 className="font-display text-4xl text-softwhite">{round.title}</h1>
        <p className="text-muted mt-2">{round.ecosystem} · pool ${round.funding_pool.toLocaleString()}</p>
      </div>

      <div className="panel">
        {ranking.ranked_proposals.map((r, i) => {
          const p = byId[r.proposal_id];
          const rev = reviews[i];
          const dec = decisions[i];
          return (
            <div key={r.proposal_id} className="px-6 py-5 border-b last:border-0 hairline border-b-bronze/30">
              <div className="flex items-baseline gap-6">
                <div className="font-display text-3xl text-gold tabular-nums w-12">{String(r.rank).padStart(2, "0")}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <div className="font-display text-xl text-softwhite">{p?.project_name}</div>
                    <div className="font-mono text-xs text-muted">band {band(r.risk_adjusted_score)}</div>
                  </div>
                  <p className="text-sm text-muted mt-1 line-clamp-2">{p?.summary}</p>
                  {rev && <p className="text-xs text-softwhite/80 mt-2 italic">{rev.summary}</p>}
                  {dec && (
                    <div className="mt-2 font-mono text-xs text-gold">
                      {dec.decision} · ${Number(dec.funding_amount).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

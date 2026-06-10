import Link from "next/link";
import type { Ranking, Proposal } from "@/lib/types";

export function RankingTable({
  ranking,
  proposals,
}: {
  ranking: Ranking;
  proposals: Proposal[];
}) {
  const byId = Object.fromEntries(proposals.map((p) => [p.proposal_id, p]));
  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b hairline border-b-bronze/40 flex justify-between items-center">
        <h3 className="font-display text-lg text-softwhite">Ranking</h3>
        <span className="label-eyebrow">risk-adjusted</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left label-eyebrow">
            <th className="px-5 py-2 w-12">#</th>
            <th className="px-5 py-2">Project</th>
            <th className="px-5 py-2 text-right">Score</th>
            <th className="px-5 py-2 text-right">Adj.</th>
            <th className="px-5 py-2">Decision</th>
          </tr>
        </thead>
        <tbody>
          {ranking.ranked_proposals.map((r) => {
            const p = byId[r.proposal_id];
            return (
              <tr key={r.proposal_id} className="border-t hairline border-t-bronze/30 hover:bg-ivory/[0.03]">
                <td className="px-5 py-3 font-mono text-gold">{String(r.rank).padStart(2, "0")}</td>
                <td className="px-5 py-3">
                  <Link href={`/proposals/${r.proposal_id}`} className="text-softwhite hover:text-gold">
                    {p?.project_name ?? r.proposal_id}
                  </Link>
                  <div className="text-xs text-muted">{p?.team_name}</div>
                </td>
                <td className="px-5 py-3 text-right font-mono text-softwhite tabular-nums">{r.overall_score}</td>
                <td className="px-5 py-3 text-right font-mono text-gold tabular-nums">{r.risk_adjusted_score}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-muted">{r.recommended_decision}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

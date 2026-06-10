"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProposal, getReview } from "@/lib/genlayer";
import { useWallet } from "@/lib/wallet";
import type { Proposal, ReviewResult } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { ScoreBadge } from "@/components/ScoreBadge";

export default function MySubmissionsPage() {
  const { address, connect } = useWallet();
  const [items, setItems] = useState<{ proposal: Proposal; review?: ReviewResult }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let local: Proposal[] = [];
      try {
        local = JSON.parse(localStorage.getItem("gg.proposals") ?? "[]");
      } catch {}

      // Refresh each local proposal against the chain (status may have advanced).
      const refreshed = await Promise.all(
        local.map(async (p) => {
          const onchain = await getProposal(p.proposal_id);
          const proposal = onchain ?? p;
          const review = await getReview(p.proposal_id);
          return { proposal, review };
        })
      );

      // Anything in this browser's localStorage was submitted from here — keep all of it.
      // We don't filter by wallet because the applicant's typed-in wallet field might
      // differ from the wallet they're currently connected with.
      setItems(refreshed);
      setLoading(false);
    })();
  }, [address]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-10 gap-6">
        <div>
          <div className="label-eyebrow mb-2">Applicant</div>
          <h1 className="font-display text-4xl text-softwhite">My submissions</h1>
          <p className="text-muted text-sm mt-2">
            Proposals you have submitted from this browser
            {address && <> as <span className="font-mono text-softwhite">{address.slice(0, 8)}…{address.slice(-4)}</span></>}.
          </p>
        </div>
        <Link
          href="/submit"
          className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-4 py-2.5 rounded-sm hover:bg-sand"
        >
          + New submission
        </Link>
      </div>

      {!address && (
        <div className="panel p-5 mb-6 border-l-2 border-l-gold">
          <p className="text-sm text-softwhite/90 mb-3">
            Connect your wallet so we can filter to only submissions made by your address.
          </p>
          <button
            onClick={() => connect()}
            className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-4 py-2 rounded-sm hover:bg-sand"
          >
            Connect wallet
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-muted font-mono text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="label-eyebrow mb-3">Empty</div>
          <h2 className="font-display text-2xl text-softwhite mb-2">You haven't submitted anything yet.</h2>
          <p className="text-muted text-sm max-w-md mx-auto mb-6">
            Submissions you make appear here. Pick a round and apply.
          </p>
          <Link
            href="/rounds"
            className="font-mono text-xs tracking-widest uppercase text-gold hover:text-sand"
          >
            Browse rounds →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ proposal, review }) => (
            <Link
              key={proposal.proposal_id}
              href={`/proposals/${proposal.proposal_id}`}
              className="panel p-5 flex items-center gap-6 hover:border-gold/50 hover:bg-ivory/[0.04] transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display text-xl text-softwhite truncate">{proposal.project_name || "(untitled)"}</h3>
                  <StatusPill status={proposal.status} />
                </div>
                <div className="text-xs text-muted font-mono">
                  {proposal.team_name} · {proposal.round_id} · submitted {proposal.submitted_at}
                </div>
                <p className="text-sm text-softwhite/80 mt-2 line-clamp-1">{proposal.summary}</p>
              </div>
              <div className="text-right shrink-0">
                {review ? (
                  <ScoreBadge score={review.overall_score} size="sm" />
                ) : (
                  <div className="font-mono text-[10px] tracking-widest uppercase text-muted">no review yet</div>
                )}
                <div className="font-mono text-xs text-muted mt-1">${proposal.budget.toLocaleString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted font-mono mt-8">
        Note: this list reads from the local cache written when you submitted. On a different browser, only the proposals you re-submit from that device will appear.
      </p>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getRound, getProposals, getReview, getRoundRanking, getContractOwner } from "@/lib/genlayer";
import { useWallet, sameAddr } from "@/lib/wallet";
import type { GrantRound, Proposal, ReviewResult, Ranking } from "@/lib/types";
import { ProposalCard } from "@/components/ProposalCard";
import { StatusPill } from "@/components/StatusPill";
import { MetricCard } from "@/components/MetricCard";
import { RankingTable } from "@/components/RankingTable";

export default function RoundDetail({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = use(params);
  const { address, connect } = useWallet();
  const [round, setRound] = useState<GrantRound | null | undefined>(undefined);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reviews, setReviews] = useState<(ReviewResult | undefined)[]>([]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Retry briefly — fresh create_round txs may not be queryable in the first
      // moment after writeContract resolves.
      let r = await getRound(roundId);
      for (let i = 0; !r && i < 5; i++) {
        await new Promise((res) => setTimeout(res, 1500));
        r = await getRound(roundId);
      }
      setRound(r ?? null);
      if (r) {
        const ps = await getProposals(roundId);
        setProposals(ps);
        setReviews(await Promise.all(ps.map((p) => getReview(p.proposal_id))));
        setRanking(await getRoundRanking(roundId));
      }
      setOwnerAddr(await getContractOwner());
    })();
  }, [roundId]);

  if (round === undefined) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-muted font-mono text-sm">Loading round…</div>;
  }
  if (round === null) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="label-eyebrow mb-3">404</div>
        <h1 className="font-display text-3xl text-softwhite mb-3">Round not found</h1>
        <Link href="/rounds" className="font-mono text-xs tracking-widest uppercase text-gold">← All rounds</Link>
      </div>
    );
  }

  const totalReq = proposals.reduce((s, p) => s + p.budget, 0);
  const isCreator = sameAddr(address, round.creator);
  const isOwner = sameAddr(address, ownerAddr);
  const canSeeProposals = isCreator || isOwner || round.visibility === "public";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <Link href="/rounds" className="label-eyebrow hover:text-softwhite">← All rounds</Link>
        <div className="flex items-end justify-between mt-3 gap-6">
          <div>
            <div className="label-eyebrow mb-2">{round.ecosystem}</div>
            <h1 className="font-display text-4xl text-softwhite">{round.title}</h1>
            <p className="text-muted mt-2 max-w-2xl">{round.description}</p>
            {round.creator && (
              <div className="text-xs font-mono text-muted mt-3">
                creator <span className="text-softwhite">{round.creator.slice(0, 8)}…{round.creator.slice(-4)}</span>
                {isCreator && <span className="ml-2 text-gold">· you</span>}
              </div>
            )}
          </div>
          <StatusPill status={round.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MetricCard label="Pool" value={`$${round.funding_pool.toLocaleString()}`} />
        <MetricCard label="Submissions" value={proposals.length} />
        <MetricCard label="Requested" value={`$${totalReq.toLocaleString()}`} />
        <MetricCard label="Deadline" value={round.deadline} />
      </div>

      {!canSeeProposals ? (
        <AccessDenied address={address} onConnect={connect} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {ranking && <RankingTable ranking={ranking} proposals={proposals} />}
            <div>
              <h3 className="font-display text-xl text-softwhite mb-4">All proposals</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {proposals.length === 0 && (
                  <div className="text-sm text-muted col-span-2 font-mono">No submissions yet.</div>
                )}
                {proposals.map((p, i) => (
                  <ProposalCard key={p.proposal_id} proposal={p} review={reviews[i] ?? undefined} />
                ))}
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            {ranking && (
              <div className="panel p-5">
                <h4 className="font-display text-lg text-softwhite mb-3">Round summary</h4>
                <p className="text-sm text-muted leading-relaxed">{ranking.summary}</p>
              </div>
            )}
            <div className="panel p-5">
              <h4 className="font-display text-lg text-softwhite mb-3">Criteria weights</h4>
              <ul className="space-y-2 text-xs font-mono">
                {Object.entries(round.criteria_weights).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-muted uppercase tracking-widest">{k.replace(/_/g, " ")}</span>
                    <span className="text-softwhite">{v}%</span>
                  </li>
                ))}
              </ul>
            </div>
            {!isCreator && !isOwner ? (
              <div className="panel p-5">
                <h4 className="font-display text-lg text-softwhite mb-3">Apply</h4>
                <Link
                  href={`/submit?round=${roundId}`}
                  className="block text-center bg-gold text-ink font-mono text-xs tracking-widest uppercase py-2.5 rounded-sm hover:bg-sand"
                >
                  Submit a proposal
                </Link>
              </div>
            ) : (
              <div className="panel p-5">
                <h4 className="font-display text-lg text-softwhite mb-3">Manage round</h4>
                <p className="text-xs text-muted mb-4">
                  You are the {isCreator ? "creator" : "site owner"} of this round. Use the admin terminal to trigger reviews and set final decisions.
                </p>
                <Link
                  href="/admin"
                  className="block text-center bg-gold text-ink font-mono text-xs tracking-widest uppercase py-2.5 rounded-sm hover:bg-sand"
                >
                  Open admin terminal
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function AccessDenied({ address, onConnect }: { address: string | null; onConnect: () => Promise<string> }) {
  return (
    <div className="panel p-10 text-center">
      <div className="label-eyebrow mb-3 text-rust">Restricted</div>
      <h2 className="font-display text-2xl text-softwhite mb-3">Only the round creator and the site owner can see submissions to this round.</h2>
      <p className="text-muted text-sm max-w-xl mx-auto mb-6">
        {address ? (
          <>
            You are connected as <span className="font-mono text-softwhite">{address.slice(0, 8)}…{address.slice(-4)}</span>,
            which is neither the round creator nor the site owner.
          </>
        ) : (
          <>Connect the wallet you created the round with, or the contract-owner wallet.</>
        )}
      </p>
      {!address && (
        <button
          onClick={() => onConnect()}
          className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-5 py-2.5 rounded-sm hover:bg-sand"
        >
          Connect wallet
        </button>
      )}
      <div className="mt-8">
        <Link href={`/rounds/${"" /* roundId via URL */}`.replace("//", "/")} className="label-eyebrow hover:text-softwhite">
          Public results may be available via /public on the round URL.
        </Link>
      </div>
    </div>
  );
}

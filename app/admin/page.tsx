"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRounds,
  getRound,
  getProposals,
  getReview,
  getSimilarity,
  getRoundRanking,
  getContractOwner,
  contractAddress,
  usingMock,
} from "@/lib/genlayer";
import { useWallet, sameAddr } from "@/lib/wallet";
import type { GrantRound, Proposal, ReviewResult, SimilarityFinding, Ranking } from "@/lib/types";
import { MetricCard } from "@/components/MetricCard";
import { RankingTable } from "@/components/RankingTable";
import { StatusPill } from "@/components/StatusPill";
import { RiskBadge } from "@/components/RiskBadge";
import { RunReviewsButton } from "@/components/RunReviewsButton";

export default function AdminDashboard() {
  const { address, connect } = useWallet();
  const [allRounds, setAllRounds] = useState<GrantRound[]>([]);
  const [myRounds, setMyRounds] = useState<GrantRound[]>([]);
  const [active, setActive] = useState<GrantRound | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reviews, setReviews] = useState<(ReviewResult | undefined)[]>([]);
  const [sims, setSims] = useState<(SimilarityFinding | undefined)[]>([]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);
  const isSiteOwner = sameAddr(address, ownerAddr);

  useEffect(() => {
    (async () => {
      setOwnerAddr(await getContractOwner());
      const rs = await getRounds();
      // Also include rounds the user created via this browser (stored locally).
      let extraIds: string[] = [];
      try { extraIds = JSON.parse(localStorage.getItem("gg.myRounds") ?? "[]"); } catch {}
      const extra: GrantRound[] = [];
      for (const id of extraIds) {
        if (rs.find((r) => r.round_id === id)) continue;
        const r = await getRound(id);
        if (r) extra.push(r);
      }
      setAllRounds([...extra, ...rs]);
    })();
  }, []);

  useEffect(() => {
    if (!address) return setMyRounds([]);
    const mine = allRounds.filter((r) => sameAddr(address, r.creator) || isSiteOwner);
    setMyRounds(mine);
    if (!active && mine[0]) setActive(mine[0]);
  }, [address, allRounds, isSiteOwner, active]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const ps = await getProposals(active.round_id);
      setProposals(ps);
      setReviews(await Promise.all(ps.map((p) => getReview(p.proposal_id))));
      setSims(await Promise.all(ps.map((p) => getSimilarity(p.proposal_id))));
      setRanking(await getRoundRanking(active.round_id));
    })();
  }, [active]);

  if (!address) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="label-eyebrow mb-3">Admin</div>
        <h1 className="font-display text-3xl text-softwhite mb-3">Connect your wallet to view the rounds you manage.</h1>
        <p className="text-muted text-sm max-w-xl mx-auto mb-6">
          The admin terminal only shows rounds you created, plus all rounds if you are the site owner.
        </p>
        <button
          onClick={() => connect()}
          className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-5 py-2.5 rounded-sm hover:bg-sand"
        >
          Connect wallet
        </button>
      </div>
    );
  }

  if (myRounds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="label-eyebrow mb-3">Admin</div>
        <h1 className="font-display text-3xl text-softwhite mb-3">You have no rounds yet.</h1>
        <p className="text-muted text-sm max-w-xl mx-auto mb-6">
          Connected as <span className="font-mono">{address.slice(0, 8)}…{address.slice(-4)}</span>
          {isSiteOwner && <span className="text-gold"> · site owner</span>}.
        </p>
        <Link
          href="/admin/rounds/new"
          className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-5 py-2.5 rounded-sm hover:bg-sand"
        >
          + Create round
        </Link>
      </div>
    );
  }

  if (!active) return null;

  const reviewed = reviews.filter(Boolean).length;
  const avgScore = Math.round(
    reviews.filter(Boolean).reduce((s, r) => s + (r?.overall_score ?? 0), 0) / Math.max(1, reviewed)
  );
  const highRisk = sims.filter((s) => s && (s.similarity_level === "HIGH" || s.similarity_level === "CRITICAL")).length;
  const needsManual = reviews.filter((r) => r?.recommended_decision === "FLAG_FOR_MANUAL_REVIEW").length;
  const totalReq = proposals.reduce((s, p) => s + p.budget, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-6 gap-6">
        <div>
          <div className="label-eyebrow mb-2">Admin · review terminal {isSiteOwner && <span className="text-gold">· site owner</span>}</div>
          <h1 className="font-display text-4xl text-softwhite">{active.title}</h1>
          <div className="text-muted text-sm mt-1">{active.ecosystem} · pool ${active.funding_pool.toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={active.status} />
          <Link
            href="/admin/rounds/new"
            className="border border-bronze/60 text-softwhite font-mono text-xs tracking-widest uppercase px-4 py-2 rounded-sm hover:border-gold hover:text-gold"
          >
            + New round
          </Link>
        </div>
      </div>

      {myRounds.length > 1 && (
        <div className="panel p-3 mb-8 flex items-center gap-3 flex-wrap">
          <span className="label-eyebrow">switch round</span>
          {myRounds.map((r) => (
            <button
              key={r.round_id}
              onClick={() => setActive(r)}
              className={`font-mono text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-sm border ${
                r.round_id === active.round_id ? "border-gold text-gold" : "border-bronze/50 text-muted hover:text-softwhite"
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <MetricCard label="Submissions" value={proposals.length} />
        <MetricCard label="AI reviewed" value={`${reviewed}/${proposals.length}`} tone="warn" />
        <MetricCard label="Avg score" value={isNaN(avgScore) ? 0 : avgScore} tone="warn" />
        <MetricCard label="Risk flags" value={highRisk} tone={highRisk ? "risk" : "good"} />
        <MetricCard label="Manual review" value={needsManual} tone={needsManual ? "risk" : "good"} hint={`$${totalReq.toLocaleString()} requested`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          {ranking && <RankingTable ranking={ranking} proposals={proposals} />}
        </div>
        <div className="space-y-4">
          <ScoreDistribution reviews={reviews.filter(Boolean) as any} />
          <div className="panel p-5">
            <h4 className="font-display text-lg text-softwhite mb-3">GenLayer status</h4>
            <ul className="space-y-2 text-xs font-mono">
              <li className="flex justify-between gap-3"><span className="text-muted">Network</span><span className="text-softwhite">GenLayer Studio</span></li>
              <li className="flex justify-between gap-3"><span className="text-muted">Contract</span><span className="text-softwhite truncate" title={contractAddress || "(mock)"}>
                {usingMock ? "MOCK" : `${contractAddress.slice(0, 6)}…${contractAddress.slice(-4)}`}
              </span></li>
              <li className="flex justify-between"><span className="text-muted">Mode</span><span className={usingMock ? "text-rust" : "text-sage"}>{usingMock ? "mock fallback" : "live · llm-judge"}</span></li>
              {ownerAddr && (
                <li className="flex justify-between gap-3"><span className="text-muted">Site owner</span><span className="text-softwhite">{ownerAddr.slice(0, 6)}…{ownerAddr.slice(-4)}</span></li>
              )}
            </ul>
          </div>
          <RunReviewsButton roundId={active.round_id} proposalIds={proposals.map((p) => p.proposal_id)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel p-5">
          <h3 className="font-display text-lg text-softwhite mb-4">High-risk plagiarism queue</h3>
          <div className="space-y-3">
            {proposals.map((p, i) => {
              const s = sims[i];
              if (!s || (s.similarity_level !== "HIGH" && s.similarity_level !== "CRITICAL")) return null;
              return (
                <Link
                  key={p.proposal_id}
                  href={`/proposals/${p.proposal_id}`}
                  className="flex justify-between items-center py-2 border-b hairline border-b-bronze/30 hover:text-gold"
                >
                  <div>
                    <div className="text-sm text-softwhite">{p.project_name}</div>
                    <div className="text-xs text-muted">vs {s.compared_against}</div>
                  </div>
                  <RiskBadge level={s.similarity_level} />
                </Link>
              );
            })}
            {!sims.some((s) => s && (s.similarity_level === "HIGH" || s.similarity_level === "CRITICAL")) && (
              <p className="text-xs text-muted font-mono">Queue clear.</p>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="font-display text-lg text-softwhite mb-4">Needs manual review</h3>
          <div className="space-y-3">
            {proposals.map((p, i) => {
              const r = reviews[i];
              if (!r || r.recommended_decision !== "FLAG_FOR_MANUAL_REVIEW") return null;
              return (
                <Link
                  key={p.proposal_id}
                  href={`/proposals/${p.proposal_id}`}
                  className="flex justify-between items-center py-2 border-b hairline border-b-bronze/30 hover:text-gold"
                >
                  <div>
                    <div className="text-sm text-softwhite">{p.project_name}</div>
                    <div className="text-xs text-muted">{r.summary.slice(0, 64)}…</div>
                  </div>
                  <span className="font-mono text-xs text-rust">FLAG</span>
                </Link>
              );
            })}
            {!reviews.some((r) => r?.recommended_decision === "FLAG_FOR_MANUAL_REVIEW") && (
              <p className="text-xs text-muted font-mono">Nothing pending committee attention.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreDistribution({ reviews }: { reviews: { overall_score: number }[] }) {
  const buckets = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const s = r.overall_score;
    if (s >= 90) buckets[4]++;
    else if (s >= 80) buckets[3]++;
    else if (s >= 65) buckets[2]++;
    else if (s >= 50) buckets[1]++;
    else buckets[0]++;
  });
  const max = Math.max(1, ...buckets);
  const labels = ["<50", "50-64", "65-79", "80-89", "90+"];
  return (
    <div className="panel p-5">
      <h4 className="font-display text-lg text-softwhite mb-4">Score distribution</h4>
      <div className="flex items-end gap-2 h-32">
        {buckets.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div className="w-full bg-gradient-to-t from-bronze/40 to-gold rounded-sm" style={{ height: `${(b / max) * 100}%` }} />
            <div className="label-eyebrow">{labels[i]}</div>
            <div className="font-mono text-xs text-softwhite">{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

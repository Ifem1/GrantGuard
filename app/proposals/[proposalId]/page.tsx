"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getProposal, getReview, getSimilarity, getRound, getContractOwner } from "@/lib/genlayer";
import { useWallet, sameAddr } from "@/lib/wallet";
import type { Proposal, ReviewResult, SimilarityFinding } from "@/lib/types";
import { ProposalDossier } from "@/components/ProposalDossier";

export default function ProposalPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = use(params);
  const { address, connect } = useWallet();
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined);
  const [review, setReview] = useState<ReviewResult | undefined>(undefined);
  const [similarity, setSimilarity] = useState<SimilarityFinding | undefined>(undefined);
  const [creator, setCreator] = useState<string | null>(null);
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let p = await getProposal(proposalId);
      if (!p) {
        try {
          const local: Proposal[] = JSON.parse(localStorage.getItem("gg.proposals") ?? "[]");
          p = local.find((x) => x.proposal_id === proposalId);
        } catch {}
      }
      if (!p) {
        setProposal(null);
        return;
      }
      setProposal(p);
      setReview(await getReview(proposalId));
      setSimilarity(await getSimilarity(proposalId));
      const r = await getRound(p.round_id);
      if (r?.creator) setCreator(r.creator);
      setOwnerAddr(await getContractOwner());
    })();
  }, [proposalId]);

  const isCreator = sameAddr(address, creator);
  const isOwner = sameAddr(address, ownerAddr);
  const isApplicant = sameAddr(address, proposal?.wallet);
  const canSee = isCreator || isOwner || isApplicant;

  if (proposal === undefined) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-muted font-mono text-sm">Loading dossier…</div>;
  }
  if (proposal === null) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="label-eyebrow mb-3">404</div>
        <h1 className="font-display text-3xl text-softwhite mb-3">Proposal not found</h1>
        <p className="text-muted mb-6">
          This proposal id isn&apos;t in the demo dataset or your local submissions.
        </p>
        <Link href="/rounds" className="font-mono text-xs tracking-widest uppercase text-gold hover:text-sand">
          ← Back to rounds
        </Link>
      </div>
    );
  }

  if (!canSee) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="label-eyebrow mb-3 text-rust">Restricted</div>
        <h1 className="font-display text-3xl text-softwhite mb-3">Only the round creator, the site owner, or the applicant can view this dossier.</h1>
        <p className="text-muted text-sm max-w-xl mx-auto mb-6">
          {address ? (
            <>You are connected as <span className="font-mono">{address.slice(0, 8)}…{address.slice(-4)}</span>, which is none of those.</>
          ) : (
            <>Connect the wallet that created the round, owns the contract, or submitted the proposal.</>
          )}
        </p>
        {!address && (
          <button
            onClick={() => connect()}
            className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-5 py-2.5 rounded-sm hover:bg-sand"
          >
            Connect wallet
          </button>
        )}
        <div className="mt-6">
          <Link href={`/rounds/${proposal.round_id}`} className="label-eyebrow hover:text-softwhite">← Round overview</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link href={`/rounds/${proposal.round_id}`} className="label-eyebrow hover:text-softwhite">
        ← Back to round
      </Link>
      {!review && (
        <div className="mt-4 panel p-4 border-l-2 border-l-gold">
          <div className="label-eyebrow mb-1">Pending GenLayer review</div>
          <p className="text-sm text-softwhite/90">
            Your proposal is stored with hash <span className="font-mono text-xs">{proposal.proposal_hash.slice(0, 18)}…</span>.
            In live mode, the GrantGuard contract would now run AI consensus review. In this demo build the seeded proposals are
            already reviewed — open one of those to see a full dossier.
          </p>
        </div>
      )}
      <div className="mt-4">
        <ProposalDossier proposal={proposal} review={review} similarity={similarity} />
      </div>
    </div>
  );
}

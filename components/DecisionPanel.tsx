"use client";

import { useState } from "react";
import type { CommitteeDecision, FinalDecision, Proposal } from "@/lib/types";
import { setDecision } from "@/lib/genlayer";

const DECISIONS: FinalDecision[] = ["ACCEPTED", "REJECTED", "WAITLISTED", "REVISION_REQUIRED", "DISQUALIFIED"];

export function DecisionPanel({ proposal, existing }: { proposal: Proposal; existing?: CommitteeDecision }) {
  const [decision, setD] = useState<FinalDecision>(existing?.decision ?? "ACCEPTED");
  const [amount, setAmount] = useState(existing?.funding_amount ?? String(proposal.budget));
  const [note, setNote] = useState(existing?.committee_note ?? "");
  const [saved, setSaved] = useState(false);

  async function save() {
    await setDecision({
      proposal_id: proposal.proposal_id,
      decision,
      funding_amount: amount,
      committee_note: note,
      milestones_required: [],
      timestamp: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  return (
    <div className="panel p-5">
      <h4 className="font-display text-lg text-softwhite mb-4">Committee decision</h4>
      <label className="label-eyebrow block mb-1">Outcome</label>
      <select
        value={decision}
        onChange={(e) => setD(e.target.value as FinalDecision)}
        className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite mb-3"
      >
        {DECISIONS.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <label className="label-eyebrow block mb-1">Funding amount (USD)</label>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite mb-3"
      />
      <label className="label-eyebrow block mb-1">Committee note</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm text-softwhite mb-4"
        placeholder="Reasoning the committee wants on record…"
      />
      <button
        onClick={save}
        className="w-full bg-gold text-ink font-mono text-xs tracking-widest uppercase py-2.5 rounded-sm hover:bg-sand"
      >
        {saved ? "Saved · on-chain" : "Commit decision"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { triggerReview, triggerSimilarity, triggerRanking, usingMock } from "@/lib/genlayer";

export function RunReviewsButton({
  roundId,
  proposalIds,
}: {
  roundId: string;
  proposalIds: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function run() {
    if (usingMock) {
      alert("Mock mode — no contract configured. Set NEXT_PUBLIC_GRANTGUARD_CONTRACT in .env.local.");
      return;
    }
    setBusy(true);
    setLog([]);
    const append = (s: string) => setLog((l) => [...l, s]);

    for (const pid of proposalIds) {
      try {
        append(`review · ${pid} · submitting…`);
        const { txHash } = await triggerReview(roundId, pid);
        append(`review · ${pid} · tx ${txHash?.slice(0, 14) ?? "(no hash)"}`);
      } catch (e: any) {
        append(`review · ${pid} · FAILED · ${e?.message ?? e}`);
      }
      try {
        append(`similarity · ${pid} · submitting…`);
        const { txHash } = await triggerSimilarity(roundId, pid);
        append(`similarity · ${pid} · tx ${txHash?.slice(0, 14) ?? "(no hash)"}`);
      } catch (e: any) {
        append(`similarity · ${pid} · FAILED · ${e?.message ?? e}`);
      }
    }

    try {
      append(`ranking · ${roundId} · submitting…`);
      const { txHash } = await triggerRanking(roundId);
      append(`ranking · tx ${txHash?.slice(0, 14) ?? "(no hash)"}`);
    } catch (e: any) {
      append(`ranking · FAILED · ${e?.message ?? e}`);
    }

    setBusy(false);
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-lg text-softwhite">Run GenLayer review</h4>
        <span className="label-eyebrow">{proposalIds.length} proposals</span>
      </div>
      <p className="text-xs text-muted leading-relaxed mb-4">
        Triggers <span className="font-mono">review_proposal</span>, <span className="font-mono">compare_similarity</span>,
        and <span className="font-mono">rank_round</span> on the deployed contract. Each call runs LLM consensus across
        validators and stores a structured result on-chain.
      </p>
      <button
        onClick={run}
        disabled={busy || proposalIds.length === 0}
        className="w-full bg-gold text-ink font-mono text-xs tracking-widest uppercase py-2.5 rounded-sm hover:bg-sand disabled:opacity-40"
      >
        {busy ? "Running consensus…" : "Trigger review + ranking"}
      </button>
      {log.length > 0 && (
        <pre className="mt-4 text-[10px] font-mono text-muted whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto bg-ink/60 p-3 rounded-sm border border-bronze/40">
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRounds, getRound, getAllRoundIds, usingMock } from "@/lib/genlayer";
import { mockRounds } from "@/lib/mockData";
import type { GrantRound } from "@/lib/types";
import { GrantRoundCard } from "@/components/GrantRoundCard";

export default function RoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<GrantRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualId, setManualId] = useState("");
  const [lookupErr, setLookupErr] = useState("");

  useEffect(() => {
    (async () => {
      const all = await getRounds();
      let visible: GrantRound[] = all;

      if (!usingMock) {
        const mockIds = new Set(mockRounds.map((r) => r.round_id));
        const nonMock = all.filter((r) => !mockIds.has(r.round_id));

        // Source 1: on-chain enumeration (requires the updated contract)
        const onchainIds = await getAllRoundIds();
        // Source 2: localStorage of rounds you created from this browser
        let myIds: string[] = [];
        try { myIds = JSON.parse(localStorage.getItem("gg.myRounds") ?? "[]"); } catch {}

        const allIds = Array.from(new Set([...onchainIds, ...myIds]));
        const fetched: GrantRound[] = [];
        for (const id of allIds) {
          if (nonMock.find((r) => r.round_id === id)) continue;
          const r = await getRound(id);
          if (r) fetched.push(r);
        }
        visible = [...fetched, ...nonMock];
      }

      setRounds(visible);
      setLoading(false);
    })();
  }, []);

  async function loadById(e: React.FormEvent) {
    e.preventDefault();
    setLookupErr("");
    const id = manualId.trim();
    if (!id) return;
    const r = await getRound(id);
    if (!r) {
      setLookupErr(`Round "${id}" not found on the contract.`);
      return;
    }
    // Cache it locally so it shows next time too.
    try {
      const existing = JSON.parse(localStorage.getItem("gg.myRounds") ?? "[]");
      if (!existing.includes(id)) {
        localStorage.setItem("gg.myRounds", JSON.stringify([id, ...existing]));
      }
    } catch {}
    router.push(`/rounds/${id}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="label-eyebrow mb-2">Grant rounds</div>
          <h1 className="font-display text-4xl text-softwhite">All rounds</h1>
          {!usingMock && (
            <p className="text-xs text-muted font-mono mt-2">
              Live mode · showing rounds present on the deployed contract
            </p>
          )}
        </div>
        <Link
          href="/admin/rounds/new"
          className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-4 py-2.5 rounded-sm hover:bg-sand"
        >
          + New round
        </Link>
      </div>

      {!usingMock && (
        <form onSubmit={loadById} className="panel p-4 mb-8 flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="label-eyebrow block mb-1">Load round by ID</label>
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="grant_round_xxxxxx"
              className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite focus:border-gold outline-none"
            />
          </div>
          <button
            type="submit"
            className="border border-bronze/60 text-softwhite font-mono text-xs tracking-widest uppercase px-4 py-2 rounded-sm hover:border-gold hover:text-gold"
          >
            Open
          </button>
          {lookupErr && <p className="w-full text-xs font-mono text-rust">{lookupErr}</p>}
          <p className="w-full text-xs text-muted font-mono">
            Paste the round id from the URL after you created it, or from the create_round call on the explorer.
          </p>
        </form>
      )}

      {loading ? (
        <div className="text-muted font-mono text-sm">Loading rounds…</div>
      ) : rounds.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="label-eyebrow mb-3">Empty</div>
          <h2 className="font-display text-2xl text-softwhite mb-2">No rounds discovered yet.</h2>
          <p className="text-muted text-sm max-w-md mx-auto mb-6">
            If you just created one, paste its ID above. Otherwise, create the first round — anyone can.
          </p>
          <Link
            href="/admin/rounds/new"
            className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-5 py-2.5 rounded-sm hover:bg-sand"
          >
            + Create a round
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {rounds.map((r) => (
            <GrantRoundCard key={r.round_id} round={r} />
          ))}
        </div>
      )}
    </div>
  );
}

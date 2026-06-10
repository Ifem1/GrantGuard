/**
 * GenLayer client wrapper.
 *
 * Routes reads/writes through the genlayer-js SDK when a contract address is
 * configured via NEXT_PUBLIC_GRANTGUARD_CONTRACT. Falls back to mock data
 * (and localStorage for newly submitted proposals) so the demo flow works
 * end-to-end even without a deployment.
 */

import type {
  GrantRound,
  Proposal,
  ReviewResult,
  SimilarityFinding,
  Ranking,
  CommitteeDecision,
} from "./types";
import { mockRounds, mockProposals, mockReviews, mockSimilarities, mockDecisions } from "./mockData";
import { riskAdjustedScore } from "./scoring";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GRANTGUARD_CONTRACT ?? "").trim();
const CHAIN_NAME = (process.env.NEXT_PUBLIC_GENLAYER_CHAIN ?? "localnet").trim();
export const usingMock = !CONTRACT_ADDRESS;
export const contractAddress = CONTRACT_ADDRESS;

// ---------- Live client (lazy) ----------

let _client: any = null;
let _account: any = null;

async function getClient(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (!CONTRACT_ADDRESS) return null;
  if (_client) return _client;

  const sdk = await import("genlayer-js");
  const chains = await import("genlayer-js/chains");
  const chain = (chains as any)[CHAIN_NAME] ?? (chains as any).localnet;

  // Try to use the injected wallet account first; otherwise generate a throwaway local account.
  const eth = (window as any).ethereum;
  if (eth?.request) {
    try {
      const accs = await eth.request({ method: "eth_requestAccounts" });
      if (accs?.[0]) _account = accs[0];
    } catch {}
  }
  if (!_account) {
    const pk = sdk.generatePrivateKey();
    _account = sdk.createAccount(pk);
  }

  _client = sdk.createClient({ chain, account: _account });
  return _client;
}

async function safeRead<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const v = await fn();
    return v as T;
  } catch (e) {
    console.warn("[genlayer] read failed, using fallback:", e);
    return fallback;
  }
}

// ---------- In-memory mock store (fallback) ----------

let rounds = [...mockRounds];
let proposals = [...mockProposals];
let reviews = { ...mockReviews };
let similarities = { ...mockSimilarities };
let decisions = { ...mockDecisions };

// ---------- Rounds ----------

export async function getRounds(): Promise<GrantRound[]> {
  // In live mode, enumerate from the chain (get_all_round_ids) and fetch each.
  // Never mix in mock rounds — they don't exist on-chain.
  if (!usingMock) {
    const ids = await getAllRoundIds();
    const fetched: GrantRound[] = [];
    for (const id of ids) {
      const r = await getRound(id);
      if (r) fetched.push(r);
    }
    return fetched;
  }
  return rounds;
}

export async function getRound(id: string): Promise<GrantRound | undefined> {
  const client = await getClient();
  if (client) {
    const json = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_round", args: [id] }),
      ""
    );
    if (json && typeof json === "string") {
      try {
        const data = JSON.parse(json);
        return { ...data, round_id: id } as GrantRound;
      } catch {}
    }
    // Live mode: do NOT fall back to mock — a round that isn't on-chain shouldn't appear as if it were.
    return undefined;
  }
  return rounds.find((r) => r.round_id === id);
}

export async function createRound(round: GrantRound): Promise<void> {
  const client = await getClient();
  if (client) {
    const { round_id, ...payload } = round;
    await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "create_round",
      args: [round_id, JSON.stringify(payload)],
      value: 0n,
    });
  }
  rounds = [round, ...rounds];
}

// ---------- Proposals ----------

export async function getProposals(roundId?: string): Promise<Proposal[]> {
  return roundId ? proposals.filter((p) => p.round_id === roundId) : proposals;
}

export async function getProposal(id: string): Promise<Proposal | undefined> {
  const client = await getClient();
  if (client) {
    const json = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_proposal", args: [id] }),
      ""
    );
    if (json && typeof json === "string") {
      try {
        const data = JSON.parse(json);
        return { ...data, proposal_id: id } as Proposal;
      } catch {}
    }
  }
  return proposals.find((p) => p.proposal_id === id);
}

export async function submitProposal(p: Proposal): Promise<{ txHash?: string }> {
  const client = await getClient();
  let txHash: string | undefined;
  if (client) {
    const { proposal_id, round_id, proposal_hash, ...rest } = p;
    const payload = { ...rest, round_id };
    const result = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "submit_proposal",
      args: [round_id, proposal_id, JSON.stringify(payload), proposal_hash],
      value: 0n,
    });
    txHash = typeof result === "string" ? result : result?.hash ?? result?.transactionHash;
    // Wait for finalization and verify execution actually succeeded; the SDK
    // resolves writeContract as soon as the tx is accepted, so an assertion
    // revert inside the contract would otherwise look like a successful submit.
    if (txHash) {
      try {
        const receipt: any = await client.waitForTransactionReceipt({ hash: txHash, retries: 60, interval: 2000 });
        const consensus = receipt?.consensus_data ?? receipt?.consensusData ?? {};
        const txResult = receipt?.tx_data_decoded?.result ?? consensus?.leader_receipt?.[0]?.execution_result ?? receipt?.result ?? receipt?.executionResult;
        const ok = String(txResult ?? "").toUpperCase() === "SUCCESS";
        if (!ok) {
          // Try to extract a human-readable error from the leader receipt.
          const stderr =
            consensus?.leader_receipt?.[0]?.error ??
            consensus?.leader_receipt?.[0]?.stderr ??
            receipt?.error ??
            "Contract execution failed";
          throw new Error(typeof stderr === "string" ? stderr : JSON.stringify(stderr));
        }
      } catch (e: any) {
        // If we can't read the receipt or it failed, surface the error.
        throw new Error(e?.message ?? `On-chain execution failed (tx ${txHash})`);
      }
    }
  }
  proposals = [p, ...proposals];
  return { txHash };
}

// ---------- Reviews / similarity / ranking ----------

export async function triggerReview(roundId: string, proposalId: string): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  const result = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "review_proposal",
    args: [roundId, proposalId],
    value: 0n,
  });
  const txHash = typeof result === "string" ? result : result?.hash ?? result?.transactionHash;
  return { txHash };
}

export async function triggerSimilarity(roundId: string, proposalId: string): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  const result = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "compare_similarity",
    args: [roundId, proposalId, "ROUND_ONLY"],
    value: 0n,
  });
  const txHash = typeof result === "string" ? result : result?.hash ?? result?.transactionHash;
  return { txHash };
}

export async function triggerRanking(roundId: string): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  const result = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "rank_round",
    args: [roundId],
    value: 0n,
  });
  const txHash = typeof result === "string" ? result : result?.hash ?? result?.transactionHash;
  return { txHash };
}

export async function getReview(proposalId: string): Promise<ReviewResult | undefined> {
  const client = await getClient();
  if (client) {
    const json = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_review", args: [proposalId] }),
      ""
    );
    if (json && typeof json === "string") {
      try {
        return { ...JSON.parse(json), proposal_id: proposalId } as ReviewResult;
      } catch {}
    }
  }
  return reviews[proposalId];
}

export async function getSimilarity(proposalId: string): Promise<SimilarityFinding | undefined> {
  const client = await getClient();
  if (client) {
    const json = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_similarity", args: [proposalId] }),
      ""
    );
    if (json && typeof json === "string") {
      try {
        return JSON.parse(json) as SimilarityFinding;
      } catch {}
    }
  }
  return similarities[proposalId];
}

export async function setDecision(d: CommitteeDecision): Promise<{ txHash?: string }> {
  const client = await getClient();
  let txHash: string | undefined;
  if (client) {
    const result = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "set_final_decision",
      args: [/* round_id */ "", d.proposal_id, JSON.stringify(d)],
      value: 0n,
    });
    txHash = typeof result === "string" ? result : result?.hash ?? result?.transactionHash;
  }
  decisions[d.proposal_id] = d;
  proposals = proposals.map((p) =>
    p.proposal_id === d.proposal_id
      ? {
          ...p,
          status:
            d.decision === "ACCEPTED" ? "ACCEPTED" : d.decision === "REJECTED" ? "REJECTED" : "FINALIZED",
        }
      : p
  );
  return { txHash };
}

export async function getDecision(proposalId: string): Promise<CommitteeDecision | undefined> {
  const client = await getClient();
  if (client) {
    const json = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_final_decision", args: [proposalId] }),
      ""
    );
    if (json && typeof json === "string") {
      try {
        return JSON.parse(json) as CommitteeDecision;
      } catch {}
    }
  }
  return decisions[proposalId];
}

export async function getRoundRanking(roundId: string): Promise<Ranking> {
  const client = await getClient();
  if (client) {
    const json = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_round_rankings", args: [roundId] }),
      ""
    );
    if (json && typeof json === "string") {
      try {
        return JSON.parse(json) as Ranking;
      } catch {}
    }
  }
  // Derive a ranking locally from whatever reviews we have.
  const ps = proposals.filter((p) => p.round_id === roundId);
  const ranked = ps
    .map((p) => {
      const r = reviews[p.proposal_id];
      if (!r) return null;
      return {
        proposal_id: p.proposal_id,
        rank: 0,
        overall_score: r.overall_score,
        risk_adjusted_score: riskAdjustedScore(r),
        recommended_decision: r.recommended_decision,
        rationale: r.ranking_rationale,
      };
    })
    .filter(Boolean) as Ranking["ranked_proposals"];

  ranked.sort((a, b) => b.risk_adjusted_score - a.risk_adjusted_score);
  ranked.forEach((p, i) => (p.rank = i + 1));

  return {
    round_id: roundId,
    ranked_proposals: ranked,
    summary:
      "Risk-adjusted ranking. Critical similarity risk demotes high-raw-score entries below feasibility-strong peers.",
  };
}

export async function getAllRoundIds(): Promise<string[]> {
  const client = await getClient();
  if (!client) return [];
  try {
    const json = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_all_round_ids",
      args: [],
    });
    if (typeof json === "string" && json) {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
    }
  } catch {
    // Old contract version without the enumeration view — fall back to caller.
  }
  return [];
}

export async function getContractOwner(): Promise<string | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    const o = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_owner",
      args: [],
    });
    return typeof o === "string" ? o : null;
  } catch {
    return null;
  }
}

export function hashProposal(p: Pick<Proposal, "project_name" | "summary" | "solution" | "wallet">): string {
  const s = `${p.project_name}|${p.summary}|${p.solution}|${p.wallet}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "0x" + (h >>> 0).toString(16).padStart(8, "0") + Date.now().toString(16);
}

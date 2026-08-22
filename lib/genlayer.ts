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
const CHAIN_NAME = (process.env.NEXT_PUBLIC_GENLAYER_CHAIN ?? "studionet").trim();
const RPC_ENDPOINT = (process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio.genlayer.com/api").trim();
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
  const chain = (chains as any)[CHAIN_NAME] ?? (chains as any).studionet;

  // Live writes must use the user's wallet. Throwaway accounts are only for explicit mock mode.
  const eth = (window as any).ethereum;
  if (eth?.request) {
    try {
      const accs = await eth.request({ method: "eth_requestAccounts" });
      if (accs?.[0]) _account = accs[0];
    } catch {}
  }
  if (!_account) {
    throw new Error("Connect a wallet before sending live GenLayer transactions.");
  }

  _client = sdk.createClient({ chain, account: _account, endpoint: RPC_ENDPOINT, provider: eth } as any);
  if (typeof _client.connect === "function") {
    await _client.connect(CHAIN_NAME);
  }
  return _client;
}

async function writeAndWaitForFinality(functionName: string, args: unknown[]): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  const types = await import("genlayer-js/types").catch(() => null as any);
  const result = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  });
  const txHash = typeof result === "string" ? result : result?.hash ?? result?.transactionHash;
  if (!txHash) throw new Error(`No transaction hash returned for ${functionName}.`);
  const receipt: any = await client.waitForTransactionReceipt({
    hash: txHash,
    status: types?.TransactionStatus?.FINALIZED ?? types?.TransactionStatus?.ACCEPTED,
    fullTransaction: false,
  });
  const consensus = receipt?.consensus_data ?? receipt?.consensusData ?? {};
  const txResult =
    receipt?.tx_data_decoded?.result ??
    consensus?.leader_receipt?.[0]?.execution_result ??
    receipt?.result ??
    receipt?.executionResult ??
    receipt?.status;
  const normalized = String(txResult ?? "").toUpperCase();
  const ok = normalized === "SUCCESS" || normalized === "FINALIZED" || normalized === "ACCEPTED";
  if (!ok) {
    const stderr =
      consensus?.leader_receipt?.[0]?.error ??
      consensus?.leader_receipt?.[0]?.stderr ??
      receipt?.error ??
      `${functionName} execution failed`;
    throw new Error(typeof stderr === "string" ? stderr : JSON.stringify(stderr));
  }
  return { txHash };
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

export async function createRound(round: GrantRound): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (client) {
    const { round_id, ...payload } = round;
    return writeAndWaitForFinality("create_round", [round_id, JSON.stringify(payload)]);
  }
  rounds = [round, ...rounds];
  return {};
}

// ---------- Proposals ----------

export async function getProposals(roundId?: string): Promise<Proposal[]> {
  if (!usingMock && roundId) {
    const client = await getClient();
    if (!client) return [];
    const idsJson = await safeRead<string>(
      () => client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_proposals_by_round", args: [roundId] }),
      "[]"
    );
    const ids = JSON.parse(idsJson || "[]").filter((x: unknown) => typeof x === "string");
    const fetched = await Promise.all(ids.map((id: string) => getProposal(id)));
    return fetched.filter(Boolean) as Proposal[];
  }
  if (!usingMock && !roundId) {
    const roundIds = await getAllRoundIds();
    const batches = await Promise.all(roundIds.map((id) => getProposals(id)));
    return batches.flat();
  }
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
  if (client) {
    const { proposal_id, round_id, proposal_hash, ...rest } = p;
    const payload = { ...rest, round_id };
    return writeAndWaitForFinality("submit_proposal", [round_id, proposal_id, JSON.stringify(payload), proposal_hash]);
  }
  proposals = [p, ...proposals];
  return {};
}

// ---------- Reviews / similarity / ranking ----------

export async function triggerReview(roundId: string, proposalId: string): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  return writeAndWaitForFinality("review_proposal", [roundId, proposalId]);
}

export async function triggerSimilarity(roundId: string, proposalId: string): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  return writeAndWaitForFinality("compare_similarity", [roundId, proposalId, "ROUND_ONLY"]);
}

export async function triggerRanking(roundId: string): Promise<{ txHash?: string }> {
  const client = await getClient();
  if (!client) return {};
  return writeAndWaitForFinality("rank_round", [roundId]);
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
  if (client) {
    const proposal = await getProposal(d.proposal_id);
    if (!proposal?.round_id) throw new Error("Cannot finalize without the proposal round_id.");
    return writeAndWaitForFinality("set_final_decision", [proposal.round_id, d.proposal_id, JSON.stringify(d)]);
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
  return {};
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

export async function hashProposal(p: Proposal): Promise<string> {
  const immutable = {
    round_id: p.round_id,
    project_name: p.project_name,
    team_name: p.team_name,
    wallet: p.wallet,
    contact: p.contact,
    summary: p.summary,
    problem: p.problem,
    solution: p.solution,
    why_ecosystem: p.why_ecosystem,
    architecture: p.architecture,
    milestones: p.milestones,
    timeline: p.timeline,
    budget: p.budget,
    team_background: p.team_background,
    prior_work: p.prior_work,
    links: p.links,
    disclosure: p.disclosure,
    honesty_confirmed: p.honesty_confirmed,
  };
  const canonical = JSON.stringify(Object.keys(immutable).sort().reduce((acc, key) => {
    (acc as any)[key] = (immutable as any)[key];
    return acc;
  }, {} as Record<string, unknown>));
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "0x" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

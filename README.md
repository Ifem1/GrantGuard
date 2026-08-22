# GrantGuard

GrantGuard is a GenLayer-powered grant review platform for ecosystem funding rounds. It stores grant rounds and proposals on-chain, then uses GenLayer consensus for the parts normal deterministic contracts cannot do well: proposal quality assessment, semantic similarity review, and comparative ranking.

## Problem

Grant committees often receive more proposals than they can review consistently. The hard parts are subjective: originality, technical feasibility, ecosystem fit, team credibility, impact, budget realism, and whether two submissions are suspiciously similar. GrantGuard makes those judgments explicit, bounded, and auditable.

## Why GenLayer

Deterministic smart contracts can enforce state transitions and authorization. They cannot independently judge whether a roadmap is realistic or whether two proposals materially overlap. GrantGuard keeps deterministic state deterministic and uses GenLayer leader/validator consensus only for semantic judgment.

## Architecture

- `contracts/GrantGuardProtocol.py`: GenLayer Intelligent Contract.
- `lib/genlayer.ts`: frontend wrapper for live contract reads/writes and explicit mock mode.
- `app/`: Next.js App Router pages for rounds, submissions, admin review, dossiers, and public rankings.
- `components/`: UI panels for scores, risk, rankings, final decisions, and review triggering.
- `tests/test_contract_consensus.py`: direct tests for consensus thresholds and commitment behavior.
- `DECISION.md`: reviewer-focused design rationale.

## Lifecycle

1. Grant round is created with criteria weights.
2. Applicants submit structured proposals with a SHA-256 commitment over immutable fields.
3. `review_proposal` runs independent leader/validator assessment.
4. `compare_similarity` compares each proposal against a bounded same-round corpus.
5. `rank_round` ranks already reviewed proposals with close-call tolerance rules.
6. Round creator or contract owner records final committee decisions.

## Consensus Design

GrantGuard does not use byte-identical strict equality for open-ended LLM judgments. The contract uses `gl.vm.run_nondet_unsafe` and explicit comparison helpers.

Proposal review agreement requires weighted overall score within 8 points, category scores within 10 points, risk bands within one tier, material plagiarism agreement, and same or adjacent recommended decision bands. The contract computes weighted overall scores deterministically from category scores and round weights.

Similarity agreement uses a sorted, capped same-round corpus of up to 8 other proposals. Empty corpus returns LOW similarity without an LLM call. LOW versus HIGH/CRITICAL rejects.

Ranking agreement requires the same proposal set. Adjacent swaps are tolerated only for close scores; major inversions reject.

See [DECISION.md](DECISION.md) for the full design.

## Local Setup

```bash
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

## Environment

```bash
NEXT_PUBLIC_GRANTGUARD_CONTRACT=
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
NEXT_PUBLIC_GENLAYER_RPC=https://studio.genlayer.com/api
```

When `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is empty, the app runs in explicit mock mode with bundled seed data. Live mode never mixes mock proposals into chain state and requires a connected browser wallet.

Studionet:

- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Chain ID: `61999`

## Commands

```bash
npm run lint
npm run build
npm test
npm run test:contract
npm run test:integration
```

`npm run test:integration` is a harness and skips unless live Studionet credentials are provided. It does not fake deployment evidence.

## Verified Local Results

- `npm run lint`: PASS (`tsc --noEmit`)
- `npm run build`: PASS
- `npm test`: PASS, 13 tests
- `genvm-lint check contracts/GrantGuardProtocol.py`: PASS, 3 checks, validation passed

`genvm-lint` reports a newer runner hash is available, but this local Windows environment could not validate that newer SDK cache. The contract remains pinned to the runner that validates locally.

## Studionet Deployment

Canonical source commit: not recorded yet.

Canonical contract: not deployed in this run.

Deployment transaction: not available.

Explorer: [GenLayer Studio Explorer](https://explorer-studio.genlayer.com)

Live app: not deployed in this run.

Deployment/source parity is not yet confirmed because this workspace does not include a completed Studionet deployment, transaction hash, or pushed final commit.

## Frontend Chain Behavior

In live mode, rounds are enumerated from `get_all_round_ids`, proposals are enumerated from `get_proposals_by_round`, and each proposal is read with `get_proposal`. Writes use a shared finality helper for round creation, proposal submission, review, similarity, ranking, and final decisions. Final decisions pass the actual proposal round ID so creator/owner authorization is enforced by the contract.

## Known Limitations

- No Studionet deployment proof is included yet.
- No on-chain end-to-end workflow transaction hashes are included yet.
- Global-history similarity is intentionally disabled until a bounded authoritative corpus exists.
- The direct tests cover consensus helper boundaries, not a full GenVM lifecycle simulator.
- The integration harness documents required credentials but does not yet automate the full Studionet workflow.

## License

MIT. See [LICENSE](LICENSE).

# GrantGuard

GrantGuard is a GenLayer-powered grant review platform for ecosystem funding rounds. It stores grant rounds and proposals on-chain, then uses GenLayer consensus for proposal quality assessment, semantic similarity review, and comparative ranking.

## Why GenLayer

Deterministic smart contracts can enforce authorization, commitments, round state, and final committee decisions. They cannot independently judge originality, technical feasibility, ecosystem fit, delivery risk, budget realism, or suspicious semantic overlap. GrantGuard keeps deterministic state deterministic and uses GenLayer leader/validator consensus only for those semantic judgments.

## Architecture

- `contracts/GrantGuardProtocol.py`: GenLayer Intelligent Contract.
- `lib/genlayer.ts`: frontend wrapper for live contract reads/writes and explicit mock mode.
- `app/`: Next.js App Router pages for rounds, submissions, admin review, dossiers, and public rankings.
- `components/`: UI panels for scores, risk, rankings, final decisions, and review triggering.
- `tests/test_contract_consensus.py`: direct contract tests for commitments, lifecycle, consensus, similarity, and ranking guardrails.
- `scripts/studionet_integration.py`: live Studionet workflow script.
- `DECISION.md`: reviewer-focused design rationale.

## Lifecycle

1. Round creator creates a round in `Draft` with criteria weights and a proposal cap.
2. Creator or contract owner moves the round to `Open`.
3. Applicants submit structured proposals with a SHA-256 commitment over immutable fields.
4. Creator or owner moves the round to `Reviewing`.
5. `review_proposal` runs independent leader/validator assessment.
6. `compare_similarity` compares each proposal against every other same-round proposal in deterministic batches of 8.
7. `rank_round` ranks proposals only after every proposal has an authoritative stored review and similarity result.
8. Creator or owner records final committee decisions.
9. The round can be moved to `Finalised` and then `Archived`.

Allowed transitions are `Draft -> Open -> Reviewing -> Finalised -> Archived`, with `Archived` also allowed from any active status. Deadlines are informational; status changes are explicit on-chain writes.

## Consensus Design

GrantGuard does not use byte-identical strict equality for open-ended LLM judgments. The contract uses `gl.vm.run_nondet_unsafe` and explicit comparison helpers.

Proposal review agreement requires weighted overall score within 8 points, category scores within 10 points, risk bands within one tier, material plagiarism agreement, and same or adjacent recommended decision bands. The contract computes weighted overall scores deterministically from category scores and round weights.

Similarity is authoritative and stored separately from proposal review. Empty same-round corpora return LOW similarity without an LLM call. Otherwise, the target proposal is compared against every other same-round proposal in sorted proposal-ID order, chunked by `MAX_SIMILARITY_COMPARISONS = 8`; the highest material risk result is stored.

Ranking uses the stored review and stored similarity records. It refuses to rank if any proposal is missing either record and refuses rounds above `MAX_RANKING_ITEMS = 25`, which is also enforced as the round proposal cap before storage.

See [DECISION.md](DECISION.md) for the full design.

## Local Setup

```bash
npm install
npm run dev
```

Open the local Next.js URL printed by the dev server.

## Production

Production app: [https://grantguard-orcin.vercel.app/](https://grantguard-orcin.vercel.app/)

## Environment

```bash
NEXT_PUBLIC_GRANTGUARD_CONTRACT=0xA894c75ab8b5E559735b363Aa88B34cAc0757696
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
NEXT_PUBLIC_GENLAYER_RPC=https://studio.genlayer.com/api
```

When `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is empty, the app runs in explicit mock mode with bundled seed data. When a contract address is configured, live reads do not fall back to mock state and writes require a connected browser wallet.

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
genvm-lint check contracts/GrantGuardProtocol.py
```

`npm run test:integration` skips unless `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is set and `GENLAYER_USE_CLI_ACCOUNT=1`. With those variables set, it creates a fresh Studionet round, opens it, submits proposals, moves to review, runs review/similarity/ranking, records final decisions for every proposal, finalises the round, verifies a rejected negative path, and reads the on-chain results back.

## Verified Results

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm test`: PASS, 25 Python contract tests plus 5 receipt parser fixtures.
- `npm run test:contract`: PASS, 25 Python contract tests.
- `npm run test:integration`: PASS on Studionet with live env; SKIP without live env.
- `genvm-lint check contracts/GrantGuardProtocol.py`: PASS, 3 checks, validation passed, 18 methods.

The installed `genlayer`/`genvm-lint` CLI does not expose a separate `gltest` direct-test runner command in this environment, so direct contract coverage is provided by `tests/test_contract_consensus.py` and GenVM validation is provided by `genvm-lint`.

## Studionet Deployment

- Contract source commit: `7596373eafde537671dd5065f4c67e58d873bf72`
- Canonical contract: `0xA894c75ab8b5E559735b363Aa88B34cAc0757696`
- Deployment transaction: `0xb26d3870c7c27300491656d4deef9128510d1d62433b252728a75c943b7cbf94`
- Contract explorer search: [GenLayer Studio Explorer](https://explorer-studio.genlayer.com)
- Deployment transaction: [0xb26d3870...b7cbf94](https://explorer-studio.genlayer.com/tx/0xb26d3870c7c27300491656d4deef9128510d1d62433b252728a75c943b7cbf94)
- Live integration round: `gg_integration_20260822150425`

Live proof transactions:

- `create_round`: `0x9624ccc25e1e99bf463edd4a0a10f67b6170f12d9f2d7e351e6f5968b5365e88`
- `open_round`: `0xe732377bbffc7dcf514a19850343b23406cb1ec3e882a05812304cdb6a5e6ca2`
- `submit_A`: `0xf0143e40801118dba9e0f547f420680a69198cc7ba3d8f46d41d33f913c03b10`
- `submit_B`: `0x309bc3b8d65e270a7dc082d7312963ad4048049853edb0d52fc96dfb15874b8b`
- `submit_C`: `0x3d445161682eb872c07883a68addfd08e92538208acaf41df6aa7382173a699d`
- `set_reviewing`: `0xbb115d948be436a5a489e4740dec4ab96ada5204b45e863b9b1b24deb0abccfb`
- `review_A`: `0xfbf5233c2922f843c1d87e50768aaa4fa93d340da6f995e662e91e19f719e386`
- `similarity_A`: `0xad1fc148b79c0544eaf3510a1cc3cb3c1b8cea64602cfcf69e61dec787145bcc`
- `review_B`: `0x831ffd25a5838d1dd978fbdc049430b11543ad82ae4dec355ff9bb3998566daa`
- `similarity_B`: `0x58926ba7234f95b2a868fecf795a4c7383cfafe02efee31fdee803fdedae0988`
- `review_C`: `0xbb0c023661a97892536ec9179e39bd9def8a800aff907b014934097c3f076fcf`
- `similarity_C`: `0x10220d16b65600227c119ca4da4f9949a890ad2bcc82162f9a5f50eb6227fccb`
- `ranking`: `0x8e6e6b5964404ed5f98a4baa4502966992bd2b3b6d7da0ceadc11e1afc1aeb3a`
- `final_decision_A`: `0xe7bedb4c352696bd664eae0a66030e5320eafe209aafbdc13ce433ffd6d1cfc8`
- `final_decision_B`: `0xe136f88b306e28424ecf447aecef1dd0f4b940b37c8fa52f95b4762a9b385528`
- `final_decision_C`: `0xb0f899c23aaf6e673a71b479d15ec7f469d31420224275ada29e03bba064bcb1`
- `finalise_round`: `0x8b04f519bb7beb7190830518f92f33ffd2671e92f82b409b58d8c2db164410c2`
- Negative path, repeat similarity before ranking: `0xb94b8607a194c532c5673bf601b0a4094cd87634b946c3237ef3686a9624a5a5`, rejected with `AssertionError: proposal similarity already recorded`.
- Negative path, repeat similarity after finalisation: `0xda1c0e50b5f5b637244227b8bb787c241a171a9fa274f130393a241dabb43260`, rejected with `AssertionError: round not reviewing`.

The deployment receipt and integration write receipts had leader execution result `SUCCESS`. Some receipts show cancelled validators after quorum; those are expected GenLayer quorum artifacts, not failed writes.

## Frontend Chain Behavior

In live mode, rounds are enumerated from `get_all_round_ids`, proposals are enumerated from `get_proposals_by_round`, and each proposal is read with `get_proposal`. Writes use a shared finality helper that checks GenVM execution success from consensus data instead of treating finality status alone as success. Admin lifecycle controls call `set_round_status` and only expose valid transitions. Review/ranking controls are disabled unless the round is `Reviewing`.

## Known Limitations

- Round deadlines are informational; lifecycle close/open/finalise is explicitly controlled by creator or owner transactions.
- Ranking is intentionally capped at 25 proposals so GenLayer comparative ranking stays bounded.
- The installed CLI exposes deploy/call/write/receipt/trace and GenVM lint/validation, but no separate direct GenLayer test-runner command.

## License

MIT. See [LICENSE](LICENSE).

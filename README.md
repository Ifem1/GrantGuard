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

## Environment

```bash
NEXT_PUBLIC_GRANTGUARD_CONTRACT=0x7566aB07a7517b884033036950fda216c6258e2A
NEXT_PUBLIC_GENLAYER_CHAIN=studionet
NEXT_PUBLIC_GENLAYER_RPC=https://studio.genlayer.com/api
```

When `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is empty, the app runs in explicit mock mode with bundled seed data. When a contract address is configured, live reads do not fall back to mock state and writes require a connected browser wallet.

Studionet:

- RPC: `https://studio.genlayer.com/api`
- Explorer base: `https://genlayer-explorer.vercel.app`
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

`npm run test:integration` skips unless `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is set and `GENLAYER_USE_CLI_ACCOUNT=1`. With those variables set, it creates a fresh Studionet round, submits proposals, opens review, runs review/similarity/ranking, records a final decision, and reads the on-chain results back.

## Verified Results

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm test`: PASS, 20 tests.
- `npm run test:contract`: PASS, 20 tests.
- `npm run test:integration`: PASS on Studionet with live env; SKIP without live env.
- `genvm-lint check contracts/GrantGuardProtocol.py`: PASS, 3 checks, validation passed, 18 methods.

The installed `genlayer`/`genvm-lint` CLI does not expose a separate `gltest` direct-test runner command in this environment, so direct contract coverage is provided by `tests/test_contract_consensus.py` and GenVM validation is provided by `genvm-lint`.

## Studionet Deployment

- Contract source commit: `f46c92c3ff225ff4309b1ee874a2272ade0081c0`
- Canonical contract: `0x7566aB07a7517b884033036950fda216c6258e2A`
- Deployment transaction: `0xc3d23790e1757f1132906883b05e7bc1ed88d663ede7c7f91200fe5bdce8ed34`
- Explorer base: [GenLayer Explorer](https://genlayer-explorer.vercel.app)
- Live integration round: `gg_integration_20260822142027`

Live proof transactions:

- `create_round`: `0x0f9f7a18e90af24f92dbcebab959ee3478be81d6ffa588efdeb6eb155a13ec7c`
- `submit_A`: `0xfa46277866d8fdd3214c378be58ff163534a5f23a888595f77400b84ab10dc05`
- `submit_B`: `0x7a26685547b858eb3782b3084d0a0de7ff5cb7cecf9839568d43a6386292d8ed`
- `submit_C`: `0x39a93f5d7536bd259d66c424ae0a8060489a6e548200db698b7fce4d7f9a1099`
- `set_reviewing`: `0xff77193c388dd0d93f5fe6290dc77a0b8ed2d5397ddf960274e33dce6b2d5510`
- `review_A`: `0xd05daa65543c4473d86a3d570092c7f5440648fdcc27c2565be6ec2d6fcbbd40`
- `similarity_A`: `0x2c8c251bc860a5608500d75378f6fd1790c9d991b27a2246f7bfc1febc4ccb6f`
- `review_B`: `0xeb8834c941cd4f1a8aab336b73fa87e55806b432414e63da9db8bb7a13d97ee7`
- `similarity_B`: `0xf83a0258db4c26487a1032c0441a33da2da2cc3354578d8eb2603f5989a565d9`
- `review_C`: `0x75050fcbffc2dd13944e36358794cf64394c87989d6f8c49b9a443febebd1ba6`
- `similarity_C`: `0x2d2c4fa60a7b5b075c180c589d1b0aa6669a9908619cab5d1c98bba4e48dc608`
- `ranking`: `0x1978124764d5895236d83a69fff53eba19f00dc0385d4e3aefe659e8e1bb22a5`
- `final_decision`: `0x4af5686ccec9d4cb28160bfb85c5e12bf0adaeeca81577842b07d8ab302341db`

The deployment receipt and integration write receipts had leader execution result `SUCCESS`. Some receipts show cancelled validators after quorum; those are expected GenLayer quorum artifacts, not failed writes.

## Frontend Chain Behavior

In live mode, rounds are enumerated from `get_all_round_ids`, proposals are enumerated from `get_proposals_by_round`, and each proposal is read with `get_proposal`. Writes use a shared finality helper that now checks GenVM execution success from consensus data instead of treating finality status alone as success. Final decisions pass the actual proposal round ID so creator/owner authorization is enforced by the contract.

## Known Limitations

- The Vercel app was not redeployed from this workspace. Set the env values above in Vercel and redeploy to point the frontend at the canonical contract.
- Round deadlines are informational; lifecycle close/open/finalise is explicitly controlled by creator or owner transactions.
- Ranking is intentionally capped at 25 proposals so GenLayer comparative ranking stays bounded.
- The installed CLI exposes deploy/call/write/receipt/trace and GenVM lint/validation, but no separate direct GenLayer test-runner command.

## License

MIT. See [LICENSE](LICENSE).

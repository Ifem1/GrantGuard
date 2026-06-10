# GrantGuard

**The intelligence layer for ecosystem grants.**

GrantGuard is a GenLayer-powered grant review platform. Ecosystems open grant rounds, builders submit structured proposals, and a GenLayer intelligent contract runs each submission through AI consensus to:

- score originality, feasibility, ecosystem alignment, team capability, impact, and budget;
- flag plagiarism and suspicious similarity across the round;
- produce a risk-adjusted ranking with written rationales;
- record every judgement on-chain as an auditable trail.

## Why GenLayer

Normal smart contracts can store proposals and votes — they cannot judge whether a proposal is feasible, original, or suspiciously similar to another. Those judgements are non-deterministic and require interpretation. That's exactly what GenLayer's consensus-backed LLM judges are for.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **GenLayer JS** SDK against **Studionet**
- **GrantGuardProtocol** — one Python intelligent contract (`contracts/GrantGuardProtocol.py`)

## Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

Without a deployed contract the app runs against bundled mock data so the full demo flow works end-to-end. The seed round (`grant_round_001`) showcases a strong proposal, a medium proposal, a weak buzzword proposal, and a plagiarism case (CopyFund vs CreatorCourt).

## Deploy the contract

1. Install the GenLayer CLI / Studio.
2. Deploy `contracts/GrantGuardProtocol.py` to Studionet.
3. Copy the contract address into `.env.local`:

```bash
NEXT_PUBLIC_GRANTGUARD_CONTRACT=0x...
```

4. Restart `npm run dev`. The wrapper in `lib/genlayer.ts` will route reads/writes to the deployed contract.

## Demo flow

1. **Landing** (`/`) — overview, problem, GenLayer explanation, dossier preview.
2. **Create a round** (`/admin/rounds/new`) — title, ecosystem, pool, deadline, criteria weights, plagiarism sensitivity.
3. **Submit a proposal** (`/submit`) — structured proposal form with honesty disclosure; hash is committed on-chain.
4. **Admin dashboard** (`/admin`) — submission metrics, ranking table, score distribution, plagiarism queue, manual-review queue.
5. **Proposal dossier** (`/proposals/[id]`) — overall + category scores, strengths/weaknesses, red flags, reviewer questions, risk profile, similarity findings, committee decision panel.
6. **Round detail** (`/rounds/[id]`) — public-facing ranking and submissions view.

## Non-deterministic review

The contract uses GenLayer consensus in three places:

- `review_proposal` — LLM judge scores the proposal against the round criteria and returns strict JSON.
- `compare_similarity` — LLM judge compares the proposal against other submissions in the round.
- `rank_round` — LLM judge produces a risk-adjusted ranking and a written rationale.

All three are wrapped by `gl.eq_principle_strict_eq` so validators reach consensus on the structured output.

## Project structure

```
grantguard/
  app/                     # Next.js routes
  components/              # UI components (dossier, ranking, panels, badges)
  contracts/
    GrantGuardProtocol.py  # GenLayer intelligent contract
  lib/
    genlayer.ts            # SDK wrapper + mock fallback
    mockData.ts            # demo seed
    scoring.ts             # weights + risk adjustment
    types.ts
  styles/globals.css       # editorial dark theme
```

## Screenshots

_Add screenshots of `/`, `/admin`, and a proposal dossier here._

## License

MIT.

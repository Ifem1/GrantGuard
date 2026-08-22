# GrantGuard Engineering Decisions

## Why GrantGuard Needs GenLayer

GrantGuard reviews ecosystem grant proposals. Deterministic contracts can store rounds, submissions, hashes, rankings, and committee decisions, but they cannot judge feasibility, originality, ecosystem relevance, delivery risk, suspicious semantic overlap, or the comparative quality of close proposals. Those are interpretive tasks, so GrantGuard uses GenLayer consensus for the judgment layer while keeping lifecycle state and arithmetic deterministic.

## Non-Determinism Budget

Only three contract writes are nondeterministic:

- `review_proposal`: independent proposal assessment.
- `compare_similarity`: same-round similarity assessment against an authoritative bounded corpus.
- `rank_round`: comparative ranking from already reviewed proposals and stored similarity records.

Round creation, round status transitions, proposal submission, proposal commitment verification, weighted score calculation, round/proposal binding, authorization, duplicate checks, final decisions, and read methods are deterministic.

## Round Lifecycle

Rounds use explicit statuses: `Draft`, `Open`, `Reviewing`, `Finalised`, and `Archived`.

Submissions are accepted only while a round is `Open`. Reviews, similarity checks, and ranking are accepted only while a round is `Reviewing`. Final decisions can be recorded by the round creator or contract owner while a round is `Reviewing` or `Finalised`.

The allowed forward path is `Draft -> Open -> Reviewing -> Finalised -> Archived`, with `Archived` available from any non-archived state. Deadlines remain useful display and policy metadata, but the canonical lifecycle is the on-chain status.

## Proposal Commitments

Applicants submit a SHA-256 commitment over immutable proposal fields. The canonical JSON spec is:

- sorted object keys;
- compact separators `,` and `:`;
- Unicode preserved with `ensure_ascii=False`;
- UTF-8 bytes;
- SHA-256 hex digest.

The Python contract and browser helper are covered by cross-language parity tests, including ASCII, accented text, non-Latin text, emoji, quotes, newlines, and backslashes.

## Proposal-Review Consensus

The leader and validator receive the same round criteria and proposal payload. Both independently score originality, technical feasibility, ecosystem alignment, team capability, impact, and budget reasonableness, then assign risk bands and a recommended decision. Proposal content is treated as untrusted evidence; embedded instructions must not override the review rubric.

The contract computes the weighted overall score from category scores and round weights. The leader is accepted only if the validator independently lands within the explicit tolerance policy:

- weighted overall score within 8 points;
- each category score within 10 points;
- delivery and similarity risk bands no more than one tier apart;
- major plagiarism flag materially agrees;
- recommended decisions are the same or adjacent in the defined decision ladder.

Material disagreement causes GenLayer consensus to reject rather than storing a silent accept/reject outcome. Conservative outcomes such as `INSUFFICIENT_INFORMATION`, `CONSENSUS_NOT_REACHED`, and `MANUAL_REVIEW_REQUIRED` are stored as manual-review proposal status.

## Similarity Consensus

Similarity is separate from general review because plagiarism cannot be proven from one proposal viewed in isolation. `compare_similarity` compares a target proposal against every other proposal in the same round, sorted by proposal ID and chunked into batches of `MAX_SIMILARITY_COMPARISONS = 8`.

The leader and validator independently produce a similarity level, numeric score, matched sections, rationale, and recommended action for each batch. Adjacent tiers can agree, but LOW versus HIGH/CRITICAL or a high-risk leader with a `NO_ACTION` validator fails. The stored similarity result is the highest material risk result across the batches.

Global-history comparison is deliberately disabled until a real bounded global corpus exists.

## Ranking Consensus

`rank_round` uses stored proposal reviews and stored similarity records only. It refuses to rank if any same-round proposal is missing either authoritative input. It also refuses rounds above `MAX_RANKING_ITEMS = 25`; the same limit is enforced as the proposal cap before storage so a round cannot be filled beyond the rankable bound.

The ranking judge receives deterministic weighted scores, delivery risk, stored similarity level/score/action, and recommended decisions. Adjacent swaps are tolerated only for close-score cases; major inversions across non-close scores reject.

## Frontend Live/Mock Boundary

The frontend uses mock data only when `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is empty. Once a contract address is configured, live reads do not fall back to mock proposals, reviews, similarities, rankings, or decisions. Missing or failed live reads surface as empty or unavailable live state.

Transaction finality is also separated from execution success. The frontend waits for finality, then parses GenVM consensus data and treats only leader execution result `SUCCESS` or leader result status `return` as a successful write.

## Deterministic Boundaries

The contract validates round weights and score bounds, computes weighted overall scores, verifies SHA-256 proposal commitments, enforces one review and one similarity record per proposal, enforces round/proposal matching, validates lifecycle state, and records final decisions only from the round creator or contract owner.

## Security

Prompts explicitly identify proposal text, URLs, summaries, and disclosures as untrusted evidence. Duplicate round IDs and proposal IDs fail. Invalid statuses, malformed scores, unsupported final decisions, round/proposal mismatches, unsupported similarity scopes, missing authoritative ranking inputs, and unsupported lifecycle transitions fail conservatively.

## Deployment And Source Parity

The canonical Studionet deployment is:

- Contract source commit: `f46c92c3ff225ff4309b1ee874a2272ade0081c0`
- Contract: `0x7566aB07a7517b884033036950fda216c6258e2A`
- Deployment transaction: `0xc3d23790e1757f1132906883b05e7bc1ed88d663ede7c7f91200fe5bdce8ed34`

Later documentation and integration-script commits do not change `contracts/GrantGuardProtocol.py`; the deployed source remains tied to the source commit above.

## Runner And Tooling Note

`genvm-lint check contracts/GrantGuardProtocol.py` passes with validation on the installed toolchain. The linter reports a newer `py-genlayer` runner is available, but the contract validates locally on the installed runner. The installed `genlayer` and `genvm-lint` commands expose deploy/call/write/receipt/trace and lint/validation flows, but no separate direct GenLayer test-runner command.

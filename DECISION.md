# GrantGuard Engineering Decisions

## Why GrantGuard Needs GenLayer

GrantGuard reviews ecosystem grant proposals. Deterministic contracts can store rounds, submissions, commitments, rankings, and committee decisions, but they cannot judge feasibility, originality, ecosystem relevance, delivery risk, semantic overlap, or comparative proposal quality. GrantGuard uses GenLayer consensus for that judgment layer while keeping lifecycle state and arithmetic deterministic.

## Non-Determinism Budget

Only three contract writes are nondeterministic:

- `review_proposal`: independent proposal assessment.
- `compare_similarity`: same-round similarity assessment against a bounded corpus.
- `rank_round`: comparative ranking from stored proposal reviews and stored similarity records.

Round creation, lifecycle transitions, proposal submission, proposal commitment verification, weighted score calculation, authorization, duplicate checks, final decisions, and read methods are deterministic.

## Round Lifecycle

Rounds use explicit statuses: `Draft`, `Open`, `Reviewing`, `Finalised`, and `Archived`.

Submissions are accepted only while a round is `Open`. Reviews, similarity checks, and ranking are accepted only while a round is `Reviewing`. Final decisions can be recorded only after both the authoritative proposal review and authoritative similarity result exist. A round can move to `Finalised` only after every proposal has a final decision.

The allowed forward path is `Draft -> Open -> Reviewing -> Finalised -> Archived`, with `Archived` also available from any active status. Deadlines remain useful display and policy metadata, but the canonical lifecycle is the on-chain status.

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

Similarity fields returned during general review are preliminary signals only. The dedicated `compare_similarity` result is authoritative for plagiarism risk, ranking, and final decision readiness.

## Similarity Consensus

`compare_similarity` compares a target proposal against every other proposal in the same round, sorted by proposal ID and chunked into batches of `MAX_SIMILARITY_COMPARISONS = 8`.

The leader and validator independently produce a similarity level, numeric score, matched sections, rationale, and recommended action for each batch. Adjacent tiers can agree, but LOW versus HIGH/CRITICAL fails, and HIGH/CRITICAL paired with `NO_ACTION` fails symmetrically no matter which side produced the high-risk result. Each proposal can receive only one authoritative similarity record.

Global-history comparison is deliberately disabled until a real bounded global corpus exists.

## Ranking Consensus

`rank_round` uses stored proposal reviews and stored similarity records only. It refuses to rank if any same-round proposal is missing either authoritative input. It also refuses rounds above `MAX_RANKING_ITEMS = 25`; the same limit is enforced as the proposal cap before storage so a round cannot be filled beyond the rankable bound. Each round can receive only one authoritative ranking.

The ranking judge receives deterministic weighted scores, delivery risk, stored similarity level/score/action, and recommended decisions. Adjacent swaps are tolerated only for close-score cases; major inversions across non-close scores reject.

## Frontend Live/Mock Boundary

The frontend uses mock data only when `NEXT_PUBLIC_GRANTGUARD_CONTRACT` is empty. Once a contract address is configured, live reads do not fall back to mock proposals, reviews, similarities, rankings, or decisions. Missing or failed live reads surface as empty or unavailable live state.

Admin lifecycle controls call `set_round_status` and expose only valid forward transitions. Review and ranking controls are disabled unless the active round is `Reviewing`.

Transaction finality is separated from execution success. The frontend waits for finality, then parses GenVM consensus data and treats only `FINISHED_WITH_RETURN`, `SUCCESS`, or leader result status `return` as successful writes. `FINISHED_WITH_ERROR`, explicit error statuses, contract errors, and finality-only receipts are failures.

## Deterministic Boundaries

The contract validates round weights and score bounds, computes weighted overall scores, verifies SHA-256 proposal commitments, enforces one review and one similarity record per proposal, enforces one ranking per round, validates lifecycle state, and records final decisions only from the round creator or contract owner.

## Security

Prompts explicitly identify proposal text, URLs, summaries, and disclosures as untrusted evidence. Duplicate round IDs and proposal IDs fail. Invalid statuses, malformed scores, unsupported final decisions, round/proposal mismatches, unsupported similarity scopes, missing authoritative ranking inputs, missing final-decision inputs, unsupported lifecycle transitions, and incomplete finalisation attempts fail conservatively.

## Deployment And Source Parity

The canonical Studionet deployment is:

- Contract source commit: `7596373eafde537671dd5065f4c67e58d873bf72`
- Contract: `0xA894c75ab8b5E559735b363Aa88B34cAc0757696`
- Deployment transaction: `0xb26d3870c7c27300491656d4deef9128510d1d62433b252728a75c943b7cbf94`
- Explorer: `https://explorer-studio.genlayer.com`

Later documentation and integration-script commits do not change `contracts/GrantGuardProtocol.py`; the deployed source remains tied to the source commit above.

## Runner And Tooling Note

`genvm-lint check contracts/GrantGuardProtocol.py` passes with validation on the installed toolchain. The installed `genlayer` and `genvm-lint` commands expose deploy/call/write/receipt/trace and lint/validation flows, but no separate direct GenLayer test-runner command in this environment.

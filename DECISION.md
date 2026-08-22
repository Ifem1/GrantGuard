# GrantGuard Engineering Decisions

## Why GrantGuard Needs GenLayer

GrantGuard reviews ecosystem grant proposals. Deterministic contracts can store rounds, submissions, hashes, rankings, and committee decisions, but they cannot judge feasibility, originality, ecosystem relevance, delivery risk, suspicious semantic overlap, or the comparative quality of close proposals. Those are interpretive tasks, so GrantGuard uses GenLayer consensus for the judgment layer while keeping lifecycle state and arithmetic deterministic.

## Non-Determinism Budget

Only three contract writes are nondeterministic:

- `review_proposal`: independent proposal assessment.
- `compare_similarity`: same-round similarity assessment against a bounded corpus.
- `rank_round`: comparative ranking from already reviewed proposals.

Round creation, proposal submission, proposal commitment verification, weighted score calculation, round/proposal binding, authorization, duplicate checks, final decisions, and read methods are deterministic.

## Proposal-Review Consensus

The leader and validator receive the same round criteria and proposal payload. Both independently score originality, technical feasibility, ecosystem alignment, team capability, impact, and budget reasonableness, then assign risk bands and a recommended decision. Proposal content is treated as untrusted evidence; embedded instructions must not override the review rubric.

The contract computes the weighted overall score from category scores and round weights. The leader is accepted only if the validator independently lands within the explicit tolerance policy:

- weighted overall score within 8 points;
- each category score within 10 points;
- delivery and similarity risk bands no more than one tier apart;
- major plagiarism flag materially agrees;
- recommended decisions are the same or adjacent in the defined decision ladder.

Material disagreement causes GenLayer consensus to reject rather than storing a silent accept/reject outcome.

## Similarity Consensus

Similarity is separate from general review because plagiarism cannot be proven from one proposal viewed in isolation. `compare_similarity` compares a target proposal against a deterministic same-round corpus selected by sorted proposal ID, capped at 8 other proposals. Global-history comparison is deliberately disabled until a real bounded global corpus exists.

The leader and validator independently produce a similarity level, numeric score, matched sections, rationale, and recommended action. Adjacent tiers can agree, but LOW versus HIGH/CRITICAL or a high-risk leader with a `NO_ACTION` validator fails.

## Ranking Consensus

`rank_round` uses reviewed proposals only. It requires every same-round proposal to have a stored review and caps ranking at 25 items. The ranking judge receives deterministic weighted scores, risk bands, and recommended decisions. Adjacent swaps are tolerated only for close-score cases; major inversions across non-close scores reject.

## Deterministic Boundaries

The contract validates round weights and score bounds, computes weighted overall scores, verifies SHA-256 proposal commitments, enforces one review per proposal, enforces round/proposal matching, and records final decisions only from the round creator or contract owner.

## Security

Prompts explicitly identify proposal text, URLs, summaries, and disclosures as untrusted evidence. The proposal commitment hashes immutable submission fields using canonical JSON and SHA-256. Duplicate round IDs and proposal IDs fail. Invalid statuses, malformed scores, unsupported final decisions, round/proposal mismatches, and unsupported similarity scopes fail conservatively.

## Failure Modes

The contract supports conservative review states such as `INSUFFICIENT_INFORMATION`, `CONSENSUS_NOT_REACHED`, and `MANUAL_REVIEW_REQUIRED`. If leader and validator materially disagree, GenLayer consensus rejects and no final grant decision is fabricated.

## Runner And Tooling Note

`genvm-lint check contracts/GrantGuardProtocol.py` passes on the pinned `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` runner. The local linter reports a newer runner hash, but validation of that newer hash failed in this Windows environment because the linter could not access its extracted SDK cache. The repository therefore keeps the validated pinned runner until the deployment environment can validate the newer runner cleanly.

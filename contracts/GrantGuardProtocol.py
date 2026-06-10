# GrantGuardProtocol — GenLayer Intelligent Contract
#
# Stores grant rounds and proposals, and uses GenLayer's non-deterministic
# AI consensus to review proposals, detect plagiarism/similarity, and
# produce risk-adjusted rankings.

from genlayer import *
import json
import typing


REVIEW_PROMPT = """You are GrantGuard, an impartial grant proposal review engine for blockchain ecosystem grants.

Review the proposal according to the grant round criteria.

You must assess:
1. Originality
2. Technical feasibility
3. Ecosystem alignment
4. Team capability
5. Impact potential
6. Budget reasonableness
7. Delivery risk
8. Plagiarism or suspicious similarity risk

Return ONLY valid JSON matching this schema:
{
  "overall_score": int,
  "originality_score": int,
  "technical_feasibility_score": int,
  "ecosystem_alignment_score": int,
  "team_capability_score": int,
  "impact_score": int,
  "budget_reasonableness_score": int,
  "plagiarism_risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "similarity_risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "delivery_risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "strengths": [string],
  "weaknesses": [string],
  "red_flags": [string],
  "reviewer_questions": [string],
  "recommended_decision": "STRONG_ACCEPT|ACCEPT|REQUEST_REVISION|WAITLIST|REJECT|FLAG_FOR_MANUAL_REVIEW",
  "summary": string,
  "ranking_rationale": string
}

Rules:
- Scores are integers 0..100.
- Do not include markdown or commentary.
- Be strict but fair.
- Flag vague claims, unrealistic timelines, copied language, inflated budgets, and weak technical plans.
- Do not reward buzzwords without implementation detail.
"""

SIMILARITY_PROMPT = """You are GrantGuard's similarity judge. Compare a proposal against other proposals from the same round.
Decide whether they are independent, overlapping, heavily overlapping, suspiciously copied, or near duplicate.

Return ONLY valid JSON:
{
  "similarity_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "similarity_score": int,
  "matched_sections": [string],
  "reasoning_summary": string,
  "recommended_action": "NO_ACTION|MANUAL_REVIEW|REQUEST_CLARIFICATION|POSSIBLE_DISQUALIFICATION"
}
"""

RANKING_PROMPT = """You are GrantGuard's ranking judge. You will receive reviewed proposals with their scores and risk levels.
Produce a risk-adjusted ranking. Close calls require a written rationale explaining the relative ordering.

Return ONLY valid JSON:
{
  "round_id": string,
  "ranked_proposals": [
    {
      "proposal_id": string,
      "rank": int,
      "overall_score": int,
      "risk_adjusted_score": int,
      "recommended_decision": string,
      "rationale": string
    }
  ],
  "summary": string
}
"""


class GrantGuardProtocol(gl.Contract):
    owner: Address
    round_count: u256
    proposal_count: u256
    review_count: u256

    rounds: TreeMap[str, str]
    round_ids_json: str  # JSON array of every round_id ever created
    proposals: TreeMap[str, str]
    round_proposals: TreeMap[str, str]
    reviews: TreeMap[str, str]
    similarities: TreeMap[str, str]
    rankings: TreeMap[str, str]
    final_decisions: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.round_count = u256(0)
        self.proposal_count = u256(0)
        self.review_count = u256(0)
        self.round_ids_json = "[]"

    # ---------- helpers ----------

    def _append_round_proposal(self, round_id: str, proposal_id: str) -> None:
        existing = self.round_proposals.get(round_id) or "[]"
        ids = json.loads(existing)
        if proposal_id not in ids:
            ids.append(proposal_id)
        self.round_proposals[round_id] = json.dumps(ids)

    # ---------- writes ----------

    @gl.public.write
    def create_round(self, round_id: str, round_json: str) -> None:
        # Open to anyone — the address that creates the round is recorded as its creator.
        assert round_id, "round_id required"
        assert round_id not in self.rounds, "round exists"
        data = json.loads(round_json)
        assert "title" in data and "funding_pool" in data, "invalid round payload"
        # Stamp the creator so the frontend (and set_final_decision) can do access control.
        data["creator"] = str(gl.message.sender_address)
        self.rounds[round_id] = json.dumps(data)
        ids = json.loads(self.round_ids_json)
        ids.append(round_id)
        self.round_ids_json = json.dumps(ids)
        self.round_count = u256(int(self.round_count) + 1)

    @gl.public.write
    def submit_proposal(
        self,
        round_id: str,
        proposal_id: str,
        proposal_json: str,
        proposal_hash: str,
    ) -> None:
        assert round_id in self.rounds, "round not found"
        round_data = json.loads(self.rounds[round_id])
        assert round_data.get("status") in ("Open", "Reviewing"), "round not accepting submissions"
        assert proposal_id, "proposal_id required"
        assert proposal_id not in self.proposals, "proposal id taken"
        assert proposal_json, "empty proposal"
        assert proposal_hash, "empty hash"

        data = json.loads(proposal_json)
        data["status"] = "SUBMITTED"
        data["proposal_hash"] = proposal_hash
        data["round_id"] = round_id
        self.proposals[proposal_id] = json.dumps(data)
        self._append_round_proposal(round_id, proposal_id)
        self.proposal_count = u256(int(self.proposal_count) + 1)

    @gl.public.write
    def review_proposal(self, round_id: str, proposal_id: str) -> None:
        """Non-deterministic GenLayer review. Validators reach consensus on the structured JSON output."""
        assert round_id in self.rounds, "round not found"
        assert proposal_id in self.proposals, "proposal not found"

        round_data = self.rounds[round_id]
        proposal_data = self.proposals[proposal_id]

        def run_review() -> str:
            payload = (
                REVIEW_PROMPT
                + "\n\n=== GRANT ROUND ===\n"
                + round_data
                + "\n\n=== PROPOSAL ===\n"
                + proposal_data
            )
            raw = gl.nondet.exec_prompt(payload).strip()
            obj = json.loads(raw)
            required = [
                "overall_score",
                "originality_score",
                "technical_feasibility_score",
                "ecosystem_alignment_score",
                "team_capability_score",
                "impact_score",
                "budget_reasonableness_score",
                "plagiarism_risk",
                "similarity_risk",
                "delivery_risk",
                "recommended_decision",
                "summary",
                "ranking_rationale",
            ]
            for k in required:
                assert k in obj, "missing field: " + k
            return json.dumps(obj)

        review_json = gl.eq_principle_strict_eq(run_review)
        self.reviews[proposal_id] = review_json

        prop = json.loads(self.proposals[proposal_id])
        prop["status"] = "AI_REVIEWED"
        self.proposals[proposal_id] = json.dumps(prop)
        self.review_count = u256(int(self.review_count) + 1)

    @gl.public.write
    def compare_similarity(self, round_id: str, proposal_id: str, comparison_scope: str) -> None:
        assert proposal_id in self.proposals, "proposal not found"
        assert comparison_scope in ("ROUND_ONLY", "GLOBAL_HISTORY", "MANUAL_PAIR"), "bad scope"

        target = self.proposals[proposal_id]
        ids_json = self.round_proposals.get(round_id) or "[]"
        other_ids = [pid for pid in json.loads(ids_json) if pid != proposal_id]

        parts = []
        for pid in other_ids:
            if pid in self.proposals:
                parts.append(self.proposals[pid])
        others = "\n\n---\n\n".join(parts) if parts else "(none)"

        def run_similarity() -> str:
            payload = (
                SIMILARITY_PROMPT
                + "\n\n=== PROPOSAL A ===\n"
                + target
                + "\n\n=== OTHER PROPOSALS IN ROUND ===\n"
                + others
            )
            raw = gl.nondet.exec_prompt(payload).strip()
            obj = json.loads(raw)
            for k in ("similarity_level", "similarity_score", "recommended_action"):
                assert k in obj, "missing field: " + k
            return json.dumps(obj)

        finding = gl.eq_principle_strict_eq(run_similarity)
        self.similarities[proposal_id] = finding

    @gl.public.write
    def rank_round(self, round_id: str) -> None:
        assert round_id in self.rounds, "round not found"
        ids_json = self.round_proposals.get(round_id) or "[]"
        ids = json.loads(ids_json)

        items = []
        for pid in ids:
            if pid in self.reviews:
                prop = json.loads(self.proposals[pid])
                rev = json.loads(self.reviews[pid])
                items.append({
                    "proposal_id": pid,
                    "project_name": prop.get("project_name", pid),
                    "overall_score": rev["overall_score"],
                    "plagiarism_risk": rev["plagiarism_risk"],
                    "similarity_risk": rev["similarity_risk"],
                    "delivery_risk": rev["delivery_risk"],
                    "recommended_decision": rev["recommended_decision"],
                    "summary": rev.get("summary", ""),
                })
        corpus = json.dumps({"round_id": round_id, "items": items})

        def run_ranking() -> str:
            payload = RANKING_PROMPT + "\n\n=== INPUT ===\n" + corpus
            raw = gl.nondet.exec_prompt(payload).strip()
            obj = json.loads(raw)
            assert "ranked_proposals" in obj, "missing ranked_proposals"
            return json.dumps(obj)

        ranking_json = gl.eq_principle_strict_eq(run_ranking)
        self.rankings[round_id] = ranking_json

    @gl.public.write
    def set_final_decision(self, round_id: str, proposal_id: str, decision_json: str) -> None:
        assert proposal_id in self.proposals, "proposal not found"
        # The round's creator OR the contract owner can set the final decision.
        if round_id and round_id in self.rounds:
            rdata = json.loads(self.rounds[round_id])
            creator = rdata.get("creator", "")
            sender = str(gl.message.sender_address)
            assert sender == creator or sender == str(self.owner), "only round creator or site owner"
        else:
            assert gl.message.sender_address == self.owner, "site owner only"
        decision = json.loads(decision_json)
        assert decision.get("decision") in (
            "ACCEPTED",
            "REJECTED",
            "WAITLISTED",
            "REVISION_REQUIRED",
            "DISQUALIFIED",
        ), "bad decision"
        self.final_decisions[proposal_id] = decision_json

        prop = json.loads(self.proposals[proposal_id])
        d = decision["decision"]
        if d == "ACCEPTED":
            prop["status"] = "ACCEPTED"
        elif d == "REJECTED":
            prop["status"] = "REJECTED"
        else:
            prop["status"] = "FINALIZED"
        self.proposals[proposal_id] = json.dumps(prop)

    # ---------- views ----------

    @gl.public.view
    def get_round(self, round_id: str) -> str:
        return self.rounds.get(round_id) or ""

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> str:
        return self.proposals.get(proposal_id) or ""

    @gl.public.view
    def get_review(self, proposal_id: str) -> str:
        return self.reviews.get(proposal_id) or ""

    @gl.public.view
    def get_similarity(self, proposal_id: str) -> str:
        return self.similarities.get(proposal_id) or ""

    @gl.public.view
    def get_round_rankings(self, round_id: str) -> str:
        return self.rankings.get(round_id) or ""

    @gl.public.view
    def get_final_decision(self, proposal_id: str) -> str:
        return self.final_decisions.get(proposal_id) or ""

    @gl.public.view
    def get_proposals_by_round(self, round_id: str) -> str:
        return self.round_proposals.get(round_id) or "[]"

    @gl.public.view
    def get_total_rounds(self) -> int:
        return int(self.round_count)

    @gl.public.view
    def get_total_proposals(self) -> int:
        return int(self.proposal_count)

    @gl.public.view
    def get_owner(self) -> str:
        return str(self.owner)

    @gl.public.view
    def get_all_round_ids(self) -> str:
        return self.round_ids_json

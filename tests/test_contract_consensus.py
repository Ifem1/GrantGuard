import importlib.util
import pathlib
import sys
import types
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "GrantGuardProtocol.py"


def load_contract_module():
    fake = types.ModuleType("genlayer")
    fake.gl = types.SimpleNamespace(
        Contract=object,
        public=types.SimpleNamespace(write=lambda f: f, view=lambda f: f),
        message=types.SimpleNamespace(sender_address="0xowner"),
        vm=types.SimpleNamespace(Return=type("Return", (), {})),
    )
    fake.Address = str
    fake.u256 = int
    fake.TreeMap = dict
    sys.modules["genlayer"] = fake
    spec = importlib.util.spec_from_file_location("grantguard_contract", CONTRACT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


gg = load_contract_module()


ROUND = {
    "criteria_weights": {
        "originality": 20,
        "technical_feasibility": 20,
        "ecosystem_alignment": 20,
        "team_capability": 15,
        "impact": 15,
        "budget_reasonableness": 10,
    }
}


def review(**overrides):
    base = {
        "originality_score": 82,
        "technical_feasibility_score": 80,
        "ecosystem_alignment_score": 78,
        "team_capability_score": 76,
        "impact_score": 84,
        "budget_reasonableness_score": 74,
        "plagiarism_risk": "LOW",
        "similarity_risk": "LOW",
        "delivery_risk": "MEDIUM",
        "strengths": ["clear plan"],
        "weaknesses": ["some delivery risk"],
        "red_flags": [],
        "reviewer_questions": [],
        "recommended_decision": "ACCEPT",
        "summary": "Solid proposal.",
        "ranking_rationale": "Good risk-adjusted fit.",
    }
    base.update(overrides)
    return base


class ConsensusToleranceTests(unittest.TestCase):
    def test_review_close_scores_accept(self):
        self.assertTrue(gg.reviews_agree(ROUND, review(), review(originality_score=88, technical_feasibility_score=74)))

    def test_review_category_boundary_rejects(self):
        self.assertFalse(gg.reviews_agree(ROUND, review(), review(originality_score=93)))

    def test_review_risk_band_adjacent_accepts(self):
        self.assertTrue(gg.reviews_agree(ROUND, review(delivery_risk="LOW"), review(delivery_risk="MEDIUM")))

    def test_review_risk_band_large_gap_rejects(self):
        self.assertFalse(gg.reviews_agree(ROUND, review(delivery_risk="LOW"), review(delivery_risk="CRITICAL")))

    def test_review_major_plagiarism_disagreement_rejects(self):
        self.assertFalse(gg.reviews_agree(ROUND, review(plagiarism_risk="LOW"), review(plagiarism_risk="HIGH")))

    def test_review_adjacent_decision_accepts(self):
        self.assertTrue(gg.reviews_agree(ROUND, review(recommended_decision="ACCEPT"), review(recommended_decision="REQUEST_REVISION")))

    def test_review_distant_decision_rejects(self):
        self.assertFalse(gg.reviews_agree(ROUND, review(recommended_decision="STRONG_ACCEPT"), review(recommended_decision="REJECT")))

    def test_similarity_empty_corpus_policy_is_low(self):
        obj = gg.normalize_similarity({
            "similarity_level": "LOW",
            "similarity_score": 0,
            "matched_sections": [],
            "reasoning_summary": "No corpus.",
            "recommended_action": "NO_ACTION",
        })
        self.assertEqual(obj["similarity_level"], "LOW")

    def test_similarity_adjacent_tiers_accept(self):
        self.assertTrue(gg.similarities_agree(
            {"similarity_level": "HIGH", "similarity_score": 78, "matched_sections": [], "reasoning_summary": "", "recommended_action": "MANUAL_REVIEW"},
            {"similarity_level": "CRITICAL", "similarity_score": 89, "matched_sections": [], "reasoning_summary": "", "recommended_action": "POSSIBLE_DISQUALIFICATION"},
        ))

    def test_similarity_low_high_rejects(self):
        self.assertFalse(gg.similarities_agree(
            {"similarity_level": "LOW", "similarity_score": 20, "matched_sections": [], "reasoning_summary": "", "recommended_action": "NO_ACTION"},
            {"similarity_level": "HIGH", "similarity_score": 77, "matched_sections": [], "reasoning_summary": "", "recommended_action": "MANUAL_REVIEW"},
        ))

    def test_ranking_adjacent_close_swap_accepts(self):
        items = [{"proposal_id": "a", "overall_score": 82}, {"proposal_id": "b", "overall_score": 80}, {"proposal_id": "c", "overall_score": 60}]
        leader = {"ranked_proposals": [{"proposal_id": "a", "rank": 1}, {"proposal_id": "b", "rank": 2}, {"proposal_id": "c", "rank": 3}]}
        validator = {"ranked_proposals": [{"proposal_id": "b", "rank": 1}, {"proposal_id": "a", "rank": 2}, {"proposal_id": "c", "rank": 3}]}
        self.assertTrue(gg.rankings_agree(items, leader, validator))

    def test_ranking_major_inversion_rejects(self):
        items = [{"proposal_id": "a", "overall_score": 90}, {"proposal_id": "b", "overall_score": 70}, {"proposal_id": "c", "overall_score": 50}]
        leader = {"ranked_proposals": [{"proposal_id": "a", "rank": 1}, {"proposal_id": "b", "rank": 2}, {"proposal_id": "c", "rank": 3}]}
        validator = {"ranked_proposals": [{"proposal_id": "c", "rank": 1}, {"proposal_id": "b", "rank": 2}, {"proposal_id": "a", "rank": 3}]}
        self.assertFalse(gg.rankings_agree(items, leader, validator))

    def test_commitment_hash_is_canonical_and_sensitive(self):
        proposal = {
            "project_name": "A",
            "team_name": "T",
            "wallet": "0xabc",
            "summary": "S",
            "solution": "Build it",
            "honesty_confirmed": True,
        }
        first = gg.canonical_proposal_commitment("round", proposal)
        second = gg.canonical_proposal_commitment("round", dict(reversed(list(proposal.items()))))
        changed = gg.canonical_proposal_commitment("round", {**proposal, "solution": "Different"})
        self.assertEqual(first, second)
        self.assertNotEqual(first, changed)


if __name__ == "__main__":
    unittest.main()

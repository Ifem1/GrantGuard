import importlib.util
import json
import pathlib
import subprocess
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
        vm=types.SimpleNamespace(Return=type("Return", (), {}), run_nondet_unsafe=lambda leader, validator: leader()),
        nondet=types.SimpleNamespace(exec_prompt=lambda prompt: "{}"),
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
    "title": "Round",
    "funding_pool": 100000,
    "status": "Open",
    "max_proposals": 25,
    "criteria_weights": {
        "originality": 20,
        "technical_feasibility": 20,
        "ecosystem_alignment": 20,
        "team_capability": 15,
        "impact": 15,
        "budget_reasonableness": 10,
    }
}


def make_contract(sender="0xowner"):
    gg.gl.message.sender_address = sender
    c = gg.GrantGuardProtocol()
    c.rounds = {}
    c.round_ids_json = "[]"
    c.proposals = {}
    c.round_proposals = {}
    c.reviews = {}
    c.similarities = {}
    c.rankings = {}
    c.final_decisions = {}
    return c


def proposal(**overrides):
    base = {
        "project_name": "GrantGuard",
        "team_name": "Team",
        "wallet": "0xabc",
        "contact": "team@example.com",
        "summary": "Summary",
        "problem": "Problem",
        "solution": "Solution",
        "why_ecosystem": "Why",
        "architecture": "Arch",
        "milestones": "M1",
        "timeline": "4 weeks",
        "budget": 1000,
        "team_background": "Builders",
        "prior_work": "Prior",
        "links": "https://example.com",
        "disclosure": "None",
        "honesty_confirmed": True,
    }
    base.update(overrides)
    return base


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

    def test_similarity_high_risk_action_check_is_symmetric(self):
        self.assertFalse(gg.similarities_agree(
            {"similarity_level": "HIGH", "similarity_score": 82, "matched_sections": [], "reasoning_summary": "", "recommended_action": "MANUAL_REVIEW"},
            {"similarity_level": "MEDIUM", "similarity_score": 76, "matched_sections": [], "reasoning_summary": "", "recommended_action": "NO_ACTION"},
        ))
        self.assertFalse(gg.similarities_agree(
            {"similarity_level": "MEDIUM", "similarity_score": 76, "matched_sections": [], "reasoning_summary": "", "recommended_action": "NO_ACTION"},
            {"similarity_level": "HIGH", "similarity_score": 82, "matched_sections": [], "reasoning_summary": "", "recommended_action": "MANUAL_REVIEW"},
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

    def test_unicode_commitment_matches_javascript_vectors(self):
        vectors = [
            "GrantGuard",
            "Caf\u00e9",
            "\u4e2d\u6587",
            "\U0001f680",
            "quotes ' \" \n backslash \\",
        ]
        js = r"""
const crypto = require('crypto');
const value = process.argv[1];
const obj = {
  architecture: value, budget: 1000, contact: value, disclosure: value,
  honesty_confirmed: true, links: value, milestones: value, prior_work: value,
  problem: value, project_name: value, round_id: 'round', solution: value,
  summary: value, team_background: value, team_name: value, timeline: value,
  wallet: value, why_ecosystem: value
};
const ordered = Object.keys(obj).sort().reduce((acc, key) => { acc[key] = obj[key]; return acc; }, {});
process.stdout.write('0x' + crypto.createHash('sha256').update(JSON.stringify(ordered), 'utf8').digest('hex'));
"""
        for value in vectors:
            p = proposal(
                project_name=value, team_name=value, wallet=value, contact=value,
                summary=value, problem=value, solution=value, why_ecosystem=value,
                architecture=value, milestones=value, timeline=value,
                team_background=value, prior_work=value, links=value, disclosure=value,
            )
            py_hash = gg.canonical_proposal_commitment("round", p)
            js_hash = subprocess.check_output(["node", "-e", js, value], cwd=ROOT, text=True)
            self.assertEqual(py_hash, js_hash)

    def test_round_lifecycle_and_authorization(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        self.assertIn("r1", c.rounds)
        with self.assertRaises(AssertionError):
            c.set_round_status("r1", "Finalised")
        gg.gl.message.sender_address = "0xother"
        with self.assertRaises(AssertionError):
            c.set_round_status("r1", "Reviewing")
        gg.gl.message.sender_address = "0xcreator"
        c.set_round_status("r1", "Reviewing")
        c.set_round_status("r1", "Finalised")
        c.set_round_status("r1", "Archived")
        with self.assertRaises(AssertionError):
            c.set_round_status("r1", "Open")

    def test_submission_only_open_and_cap_boundary(self):
        c = make_contract("0xcreator")
        round_data = {**ROUND, "max_proposals": 2}
        c.create_round("r1", json.dumps(round_data))
        for pid in ("p1", "p2"):
            p = proposal(project_name=pid)
            h = gg.canonical_proposal_commitment("r1", p)
            c.submit_proposal("r1", pid, json.dumps(p), h)
        with self.assertRaises(AssertionError):
            p = proposal(project_name="p3")
            c.submit_proposal("r1", "p3", json.dumps(p), gg.canonical_proposal_commitment("r1", p))
        c.set_round_status("r1", "Reviewing")
        with self.assertRaises(AssertionError):
            p = proposal(project_name="late")
            c.submit_proposal("r1", "late", json.dumps(p), gg.canonical_proposal_commitment("r1", p))

    def test_wrong_commitment_rejected(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        with self.assertRaises(AssertionError):
            c.submit_proposal("r1", "p1", json.dumps(proposal()), "0x" + "00" * 32)

    def test_manual_review_required_status_is_not_ai_reviewed(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        p = proposal()
        c.submit_proposal("r1", "p1", json.dumps(p), gg.canonical_proposal_commitment("r1", p))
        c.set_round_status("r1", "Reviewing")
        old_runner = gg.gl.vm.run_nondet_unsafe
        gg.gl.vm.run_nondet_unsafe = lambda leader, validator: gg.manual_review_result("bad json")
        try:
            c.review_proposal("r1", "p1")
        finally:
            gg.gl.vm.run_nondet_unsafe = old_runner
        self.assertEqual(json.loads(c.proposals["p1"])["status"], "MANUAL_REVIEW_REQUIRED")

    def test_ranking_requires_authoritative_similarity(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        p = proposal()
        c.submit_proposal("r1", "p1", json.dumps(p), gg.canonical_proposal_commitment("r1", p))
        c.set_round_status("r1", "Reviewing")
        c.reviews["p1"] = json.dumps(gg.normalize_review(ROUND, review()))
        with self.assertRaises(AssertionError):
            c.rank_round("r1")
        c.similarities["p1"] = json.dumps({
            "similarity_level": "LOW",
            "similarity_score": 0,
            "matched_sections": [],
            "reasoning_summary": "single proposal",
            "recommended_action": "NO_ACTION",
        })
        c.rank_round("r1")
        self.assertIn("p1", c.rankings["r1"])

    def test_similarity_is_immutable_once_recorded(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        p = proposal()
        c.submit_proposal("r1", "p1", json.dumps(p), gg.canonical_proposal_commitment("r1", p))
        c.set_round_status("r1", "Reviewing")
        c.compare_similarity("r1", "p1", "ROUND_ONLY")
        with self.assertRaises(AssertionError):
            c.compare_similarity("r1", "p1", "ROUND_ONLY")

    def test_ranking_is_immutable_once_recorded(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        p = proposal()
        c.submit_proposal("r1", "p1", json.dumps(p), gg.canonical_proposal_commitment("r1", p))
        c.set_round_status("r1", "Reviewing")
        c.reviews["p1"] = json.dumps(gg.normalize_review(ROUND, review()))
        c.similarities["p1"] = json.dumps({
            "similarity_level": "LOW",
            "similarity_score": 0,
            "matched_sections": [],
            "reasoning_summary": "single proposal",
            "recommended_action": "NO_ACTION",
        })
        c.rank_round("r1")
        with self.assertRaises(AssertionError):
            c.rank_round("r1")

    def test_final_decision_requires_review_and_similarity(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        p = proposal()
        c.submit_proposal("r1", "p1", json.dumps(p), gg.canonical_proposal_commitment("r1", p))
        c.set_round_status("r1", "Reviewing")
        decision = {"proposal_id": "p1", "decision": "ACCEPTED", "funding_amount": 1000, "rationale": "ok"}
        with self.assertRaises(AssertionError):
            c.set_final_decision("r1", "p1", json.dumps(decision))
        c.reviews["p1"] = json.dumps(gg.normalize_review(ROUND, review()))
        with self.assertRaises(AssertionError):
            c.set_final_decision("r1", "p1", json.dumps(decision))
        c.similarities["p1"] = json.dumps({
            "similarity_level": "LOW",
            "similarity_score": 0,
            "matched_sections": [],
            "reasoning_summary": "single proposal",
            "recommended_action": "NO_ACTION",
        })
        c.set_final_decision("r1", "p1", json.dumps(decision))
        self.assertIn("p1", c.final_decisions)

    def test_finalised_round_requires_decisions_for_all_proposals(self):
        c = make_contract("0xcreator")
        c.create_round("r1", json.dumps(ROUND))
        for pid in ("p1", "p2"):
            p = proposal(project_name=pid)
            c.submit_proposal("r1", pid, json.dumps(p), gg.canonical_proposal_commitment("r1", p))
            c.reviews[pid] = json.dumps(gg.normalize_review(ROUND, review()))
            c.similarities[pid] = json.dumps({
                "similarity_level": "LOW",
                "similarity_score": 0,
                "matched_sections": [],
                "reasoning_summary": "ok",
                "recommended_action": "NO_ACTION",
            })
        c.set_round_status("r1", "Reviewing")
        c.set_final_decision("r1", "p1", json.dumps({"proposal_id": "p1", "decision": "ACCEPTED"}))
        with self.assertRaises(AssertionError):
            c.set_round_status("r1", "Finalised")
        c.set_final_decision("r1", "p2", json.dumps({"proposal_id": "p2", "decision": "REJECTED"}))
        c.set_round_status("r1", "Finalised")
        self.assertEqual(json.loads(c.rounds["r1"])["status"], "Finalised")

    def test_similarity_batch_aggregation_selects_highest_material_result(self):
        low = {
            "similarity_level": "LOW",
            "similarity_score": 5,
            "matched_sections": [],
            "reasoning_summary": "low",
            "recommended_action": "NO_ACTION",
        }
        critical = {
            "similarity_level": "CRITICAL",
            "similarity_score": 98,
            "matched_sections": ["solution"],
            "reasoning_summary": "duplicate",
            "recommended_action": "POSSIBLE_DISQUALIFICATION",
        }
        self.assertEqual(gg.aggregate_similarity([low, critical])["similarity_score"], 98)


if __name__ == "__main__":
    unittest.main()

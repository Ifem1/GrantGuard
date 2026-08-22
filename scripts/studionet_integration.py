"""Live Studionet integration harness for GrantGuard.

The script never fabricates chain evidence. It skips unless a deployed contract
address is configured and GENLAYER_USE_CLI_ACCOUNT=1 is set for a funded,
unlocked GenLayer CLI account.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time


CONTRACT = os.getenv("NEXT_PUBLIC_GRANTGUARD_CONTRACT", "").strip()
USE_CLI = os.getenv("GENLAYER_USE_CLI_ACCOUNT", "").strip() == "1"
TX_RE = re.compile(r"Write Transaction Hash:\s*(0x[a-fA-F0-9]{64})")
GENLAYER = shutil.which("genlayer") or shutil.which("genlayer.cmd") or "genlayer"


def canonical_hash(round_id: str, proposal: dict) -> str:
    keys = [
        "project_name",
        "team_name",
        "wallet",
        "contact",
        "summary",
        "problem",
        "solution",
        "why_ecosystem",
        "architecture",
        "milestones",
        "timeline",
        "team_background",
        "prior_work",
        "links",
        "disclosure",
    ]
    immutable = {"round_id": round_id, **{k: str(proposal.get(k, "")) for k in keys}}
    immutable["budget"] = proposal.get("budget", 0)
    immutable["honesty_confirmed"] = proposal.get("honesty_confirmed", False)
    payload = json.dumps(immutable, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return "0x" + hashlib.sha256(payload).hexdigest()


def run(args: list[str]) -> tuple[str, str | None]:
    proc = subprocess.run(args, cwd=os.getcwd(), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(proc.stdout)
    if proc.returncode != 0:
        raise RuntimeError("Command failed: " + " ".join(args))
    match = TX_RE.search(proc.stdout)
    return proc.stdout, match.group(1) if match else None


def expect_failure(method: str, args: list[str]) -> str:
    proc = subprocess.run([GENLAYER, "write", CONTRACT, method, "--args", *args], cwd=os.getcwd(), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(proc.stdout)
    rejected = (
        proc.returncode != 0
        or "AssertionError" in proc.stdout
        or "contract_error" in proc.stdout
        or "FINISHED_WITH_ERROR" in proc.stdout
    )
    if not rejected:
        raise RuntimeError("Expected command to fail: " + method)
    if "proposal similarity already recorded" in proc.stdout:
        return "rejected: proposal similarity already recorded"
    if "round not reviewing" in proc.stdout:
        return "rejected: round not reviewing"
    if "AssertionError" in proc.stdout:
        return "rejected: AssertionError"
    return "rejected: " + " ".join(proc.stdout.strip().splitlines()[-3:])[:500]


def write(method: str, args: list[str]) -> str:
    _, tx = run([GENLAYER, "write", CONTRACT, method, "--args", *args])
    if not tx:
        raise RuntimeError("No transaction hash found for " + method)
    return tx


def call(method: str, args: list[str]) -> str:
    out, _ = run([GENLAYER, "call", CONTRACT, method, "--args", *args])
    return out


def proposal(name: str, suffix: str, budget: int) -> dict:
    return {
        "project_name": name,
        "team_name": "Integration Team " + suffix,
        "wallet": "integration-wallet-" + suffix,
        "contact": "integration@example.com",
        "summary": "Integration proof proposal " + suffix,
        "problem": "Grant reviewers need reproducible on-chain workflow evidence.",
        "solution": "Run a full GrantGuard lifecycle through Studionet.",
        "why_ecosystem": "GenLayer consensus is required for subjective review and similarity checks.",
        "architecture": "Next.js frontend, GenLayer Intelligent Contract, deterministic records.",
        "milestones": "Create, submit, review, compare, rank, finalize.",
        "timeline": "2 weeks",
        "budget": budget,
        "team_background": "Protocol and frontend engineers.",
        "prior_work": "GrantGuard",
        "links": "https://github.com/Ifem1/GrantGuard",
        "disclosure": "Live integration test.",
        "honesty_confirmed": True,
        "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def main() -> int:
    if not CONTRACT or not USE_CLI:
        print("SKIP: set NEXT_PUBLIC_GRANTGUARD_CONTRACT and GENLAYER_USE_CLI_ACCOUNT=1 to run live Studionet integration.")
        return 0

    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    round_id = "gg_integration_" + stamp
    round_payload = {
        "title": "GrantGuard Integration " + stamp,
        "ecosystem": "GenLayer",
        "description": "Automated live Studionet integration proof.",
        "funding_pool": 100000,
        "deadline": "informational: creator-controlled closing",
        "criteria_weights": {
            "originality": 20,
            "technical_feasibility": 20,
            "ecosystem_alignment": 20,
            "team_capability": 15,
            "impact": 15,
            "budget_reasonableness": 10,
        },
        "plagiarism_sensitivity": "HIGH",
        "visibility": "public",
        "status": "Draft",
        "applicant_count": 0,
        "max_proposals": 25,
    }

    txs: dict[str, str] = {}
    txs["create_round"] = write("create_round", [round_id, json.dumps(round_payload, separators=(",", ":"), ensure_ascii=False)])
    txs["open_round"] = write("set_round_status", [round_id, "Open"])

    proposals = {
        "A": proposal("Integration Alpha", "A", 30000),
        "B": proposal("Integration Beta", "B", 31000),
        "C": proposal("Integration Alpha Mirror", "C", 30000),
    }
    proposals["C"].update({
        "summary": proposals["A"]["summary"],
        "problem": proposals["A"]["problem"],
        "solution": proposals["A"]["solution"],
        "architecture": proposals["A"]["architecture"],
        "milestones": proposals["A"]["milestones"],
        "disclosure": "Intentional duplicate for integration similarity proof.",
    })

    for label, data in proposals.items():
        pid = "gg_int_" + stamp + "_" + label.lower()
        data["_pid"] = pid
        payload = json.dumps({k: v for k, v in data.items() if k != "_pid"}, separators=(",", ":"), ensure_ascii=False)
        txs["submit_" + label] = write("submit_proposal", [round_id, pid, payload, canonical_hash(round_id, data)])

    txs["set_reviewing"] = write("set_round_status", [round_id, "Reviewing"])
    for label, data in proposals.items():
        txs["review_" + label] = write("review_proposal", [round_id, data["_pid"]])
        txs["similarity_" + label] = write("compare_similarity", [round_id, data["_pid"], "ROUND_ONLY"])
    negative_path = expect_failure("compare_similarity", [round_id, proposals["A"]["_pid"], "ROUND_ONLY"])
    txs["ranking"] = write("rank_round", [round_id])
    for label, data in proposals.items():
        decision = {
            "proposal_id": data["_pid"],
            "decision": "REJECTED" if label == "C" else "WAITLISTED",
            "funding_amount": "0",
            "committee_note": "Integration proof final decision for proposal " + label,
            "milestones_required": [],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        txs["final_decision_" + label] = write("set_final_decision", [round_id, data["_pid"], json.dumps(decision, separators=(",", ":"), ensure_ascii=False)])
    txs["finalise_round"] = write("set_round_status", [round_id, "Finalised"])

    call("get_round_rankings", [round_id])
    call("get_final_decision", [proposals["C"]["_pid"]])
    call("get_round", [round_id])

    print("STUDIONET INTEGRATION PASSED")
    print(json.dumps({"round_id": round_id, "transactions": txs, "negative_path": negative_path}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

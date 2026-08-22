"""Studionet integration harness for GrantGuard.

This script deliberately refuses to fake a chain proof. Provide a deployed
contract address and run the documented workflow from a funded Studionet wallet
or CI secret before marking integration evidence as passed.
"""

import os
import sys


def main() -> int:
    contract = os.getenv("NEXT_PUBLIC_GRANTGUARD_CONTRACT", "").strip()
    private_key = os.getenv("GENLAYER_PRIVATE_KEY", "").strip()
    if not contract or not private_key:
        print("SKIP: set NEXT_PUBLIC_GRANTGUARD_CONTRACT and GENLAYER_PRIVATE_KEY to run Studionet integration.")
        return 0
    print("BLOCKED: live Studionet workflow is not implemented in this local harness yet.")
    print("Use the frontend or GenLayer CLI to create a round, submit proposals, run review/similarity/ranking, and read results.")
    return 1


if __name__ == "__main__":
    sys.exit(main())

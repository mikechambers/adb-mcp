#!/usr/bin/env python3
"""Run the testing hardening gate used before structural refactors."""

from __future__ import annotations

import subprocess

from common.paths import REPO_ROOT


def run(cmd: list[str]) -> None:
    print(f"> {' '.join(cmd)}")
    subprocess.run(cmd, cwd=REPO_ROOT, check=True)


def main() -> int:
    run(["python", "scripts/generate_contract.py"])
    run(["python", "scripts/generate_command_fixtures.py"])
    run(["python", "scripts/check_contract_invariants.py"])
    run(["cargo", "check"])
    run(["cargo", "test"])
    run(["python", "scripts/smoke_mcp_stdio.py"])
    print("Hardening gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

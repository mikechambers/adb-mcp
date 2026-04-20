#!/usr/bin/env python3
"""Run the testing hardening gate used before structural refactors."""

from __future__ import annotations

import subprocess

from common.paths import REPO_ROOT


def run_step(name: str, cmd: list[str], remediation: str) -> None:
    print(f"[gate] {name}")
    print(f"> {' '.join(cmd)}")
    try:
        subprocess.run(cmd, cwd=REPO_ROOT, check=True)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"[gate:failed] {name}\n"
            f"command: {' '.join(cmd)}\n"
            f"exit_code: {exc.returncode}\n"
            f"next: {remediation}"
        ) from exc


def main() -> int:
    run_step(
        "generate-contract",
        ["python", "scripts/generate_contract.py"],
        "Verify reference/mcp sources parse and script imports resolve.",
    )
    run_step(
        "generate-fixtures",
        ["python", "scripts/generate_command_fixtures.py"],
        "Inspect contracts/mcp_compat_manifest.json fields used by fixture generator.",
    )
    run_step(
        "contract-invariants",
        ["python", "scripts/check_contract_invariants.py"],
        "Fix manifest/fixture drift or duplicate tool keys.",
    )
    run_step(
        "cargo-check",
        ["cargo", "check"],
        "Resolve compile errors before test execution.",
    )
    run_step(
        "cargo-test",
        ["cargo", "test"],
        "Fix failing unit/integration tests in rust-mcp.",
    )
    run_step(
        "smoke",
        ["python", "scripts/smoke_mcp_stdio.py"],
        "Inspect MCP stdio handshake and request/response behavior.",
    )
    print("Hardening gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

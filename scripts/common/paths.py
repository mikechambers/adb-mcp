from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
REFERENCE_MCP_DIR = REPO_ROOT / "reference" / "mcp"
CONTRACTS_DIR = REPO_ROOT / "contracts"

MANIFEST_FILE = CONTRACTS_DIR / "mcp_compat_manifest.json"
FIXTURES_FILE = CONTRACTS_DIR / "command_packet_fixtures.json"

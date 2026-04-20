#!/usr/bin/env python3
"""Validate generated contract artifacts for drift and consistency."""

from __future__ import annotations

from common.json_io import read_json
from common.paths import FIXTURES_FILE, MANIFEST_FILE


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> int:
    manifest = read_json(MANIFEST_FILE)
    fixtures = read_json(FIXTURES_FILE)

    servers = manifest.get("servers", [])
    ensure(isinstance(servers, list) and servers, "Manifest must contain non-empty servers array.")

    server_keys: list[str] = []
    tool_index: dict[tuple[str, str], dict] = {}
    for server in servers:
        server_key = server.get("server_key")
        ensure(isinstance(server_key, str) and server_key, "Each server must include non-empty server_key.")
        server_keys.append(server_key)
        ensure(isinstance(server.get("mcp_name"), str) and server["mcp_name"], f"{server_key}: missing mcp_name")
        ensure(
            isinstance(server.get("application"), str) and server["application"],
            f"{server_key}: missing application",
        )
        for tool in server.get("tools", []):
            tool_name = tool.get("name")
            ensure(isinstance(tool_name, str) and tool_name, f"{server_key}: tool missing name")
            ensure(tool.get("action"), f"{server_key}/{tool_name}: missing action mapping")
            tool_index[(server_key, tool_name)] = tool

    ensure(len(server_keys) == len(set(server_keys)), "server_key values must be unique.")

    fixture_rows = fixtures.get("fixtures", [])
    ensure(isinstance(fixture_rows, list), "Fixtures must include fixtures array.")
    for row in fixture_rows:
        server_key = row.get("server_key")
        tool_name = row.get("tool")
        ensure((server_key, tool_name) in tool_index, f"Fixture references unknown tool: {server_key}/{tool_name}")
        packet = row.get("command_packet", {})
        ensure(packet.get("action") == row.get("action"), f"{server_key}/{tool_name}: fixture action mismatch")

    print("Contract invariants: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

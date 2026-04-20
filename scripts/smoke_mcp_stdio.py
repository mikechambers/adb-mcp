#!/usr/bin/env python3
"""Basic MCP stdio smoke tests for Rust server surface parity."""

from __future__ import annotations

import subprocess

from common.json_io import read_json
from common.mcp_stdio import request
from common.paths import MANIFEST_FILE, REPO_ROOT
from common.runtime import build_rust_server_cmd
from common.servers import SERVER_KEYS


def expected_count_for(server_key: str, manifest: dict) -> int:
    for server in manifest["servers"]:
        if server.get("server_key") == server_key:
            return server["tool_count"]
    raise KeyError(f"missing server in manifest: {server_key}")


def main() -> int:
    manifest = read_json(MANIFEST_FILE)
    for server_key in SERVER_KEYS:
        proc = subprocess.Popen(
            build_rust_server_cmd(server_key),
            cwd=REPO_ROOT,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        try:
            init = request(proc, 1, "initialize", {})
            if init.get("error"):
                raise RuntimeError(f"{server_key} initialize failed: {init['error']}")

            tools = request(proc, 2, "tools/list", {})
            expected = expected_count_for(server_key, manifest)
            actual = len(tools["result"]["tools"])
            if actual != expected:
                raise RuntimeError(f"{server_key} tool count mismatch: expected {expected}, got {actual}")

            invalid_resource = request(proc, 3, "resources/read", {"uri": "config://invalid"})
            if not invalid_resource.get("error"):
                raise RuntimeError(f"{server_key} expected invalid resources/read to return error")

            invalid_call = request(proc, 4, "tools/call", {"arguments": {}})
            if not invalid_call.get("error"):
                raise RuntimeError(f"{server_key} expected tools/call missing name to return error")

            print(f"[ok] {server_key}: tools={actual}, invalid-path checks passed")
        finally:
            proc.terminate()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

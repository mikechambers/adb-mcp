#!/usr/bin/env python3
"""Dual-runtime launcher for adb-mcp servers.

By default this launches the Rust server. Set ADB_MCP_RUNTIME=python to use legacy Python servers.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys

from common.paths import REFERENCE_MCP_DIR, REPO_ROOT
from common.runtime import build_rust_server_cmd
from common.servers import SERVER_BY_KEY, SERVER_KEYS


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch adb-mcp server using Rust (default) or Python fallback.")
    parser.add_argument("--server", required=True, choices=SERVER_KEYS, help="Server key to launch (e.g. ps, pr, ai).")
    parser.add_argument("--proxy-url", default="http://localhost:3001", help="Command proxy URL.")
    parser.add_argument("--timeout-secs", type=int, default=20, help="Socket command timeout in seconds.")
    args = parser.parse_args()

    runtime = os.environ.get("ADB_MCP_RUNTIME", "rust").strip().lower()
    if runtime == "python":
        py_file = REFERENCE_MCP_DIR / SERVER_BY_KEY[args.server].python_file
        cmd = [sys.executable, str(py_file)]
    else:
        cmd = build_rust_server_cmd(args.server, proxy_url=args.proxy_url, timeout_secs=args.timeout_secs)

    result = subprocess.run(cmd, cwd=REPO_ROOT)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())

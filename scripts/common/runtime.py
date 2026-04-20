from __future__ import annotations

from .paths import REPO_ROOT


def build_rust_server_cmd(server_key: str, proxy_url: str | None = None, timeout_secs: int | None = None) -> list[str]:
    cmd = [
        "cargo",
        "run",
        "--quiet",
        "--bin",
        "adb-mcp-rust",
        "--",
        "--server",
        server_key,
    ]
    if proxy_url is not None:
        cmd.extend(["--proxy-url", proxy_url])
    if timeout_secs is not None:
        cmd.extend(["--timeout-secs", str(timeout_secs)])
    return cmd


def run_cwd() -> str:
    return str(REPO_ROOT)

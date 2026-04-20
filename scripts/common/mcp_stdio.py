from __future__ import annotations

import json
import subprocess
from typing import Any


def send_frame(proc: subprocess.Popen[Any], payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8")
    if proc.stdin is None:
        raise RuntimeError("Process stdin is unavailable.")
    proc.stdin.write(header + body)
    proc.stdin.flush()


def read_frame(proc: subprocess.Popen[Any]) -> dict[str, Any]:
    if proc.stdout is None:
        raise RuntimeError("Process stdout is unavailable.")

    content_length = None
    while True:
        line = proc.stdout.readline().decode("utf-8")
        if not line:
            raise RuntimeError("Process exited while waiting for response.")
        line = line.strip("\r\n")
        if line == "":
            break
        if line.lower().startswith("content-length:"):
            content_length = int(line.split(":", 1)[1].strip())

    if content_length is None:
        raise RuntimeError("Missing Content-Length in response.")

    body = proc.stdout.read(content_length)
    return json.loads(body.decode("utf-8"))


def request(proc: subprocess.Popen[Any], request_id: int, method: str, params: dict[str, Any]) -> dict[str, Any]:
    send_frame(
        proc,
        {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params,
        },
    )
    return read_frame(proc)

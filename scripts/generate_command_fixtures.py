#!/usr/bin/env python3
"""Generate golden command packet fixtures from compatibility manifest."""

from __future__ import annotations

from common.json_io import read_json, write_json
from common.paths import FIXTURES_FILE, MANIFEST_FILE


def example_value(annotation: str | None) -> object:
    # This is intentionally shallow: fixtures validate packet shape, not semantic argument values.
    kind = (annotation or "").lower()
    if kind in {"int", "float"}:
        return 1
    if kind == "bool":
        return True
    if kind == "str":
        return "example"
    if kind == "list":
        return []
    return {}


def main() -> None:
    manifest = read_json(MANIFEST_FILE)
    fixtures = []
    for server in manifest["servers"]:
        for tool in server["tools"]:
            options = {
                p["name"]: example_value(p.get("annotation"))
                for p in tool["params"]
                if p.get("required")
            }
            fixtures.append(
                {
                    "server_key": server["server_key"],
                    "server": server["mcp_name"],
                    "tool": tool["name"],
                    "action": tool.get("action"),
                    "command_packet": {
                        "application": server["application"],
                        "action": tool.get("action"),
                        "options": options,
                    },
                }
            )
    write_json(FIXTURES_FILE, {"fixtures": fixtures})
    print(f"Wrote {FIXTURES_FILE}")


if __name__ == "__main__":
    main()

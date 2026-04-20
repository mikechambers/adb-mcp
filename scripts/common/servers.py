from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ServerSpec:
    server_key: str
    display_name: str
    python_file: str
    application: str


SERVER_SPECS: tuple[ServerSpec, ...] = (
    ServerSpec("ps", "Adobe Photoshop MCP Server", "ps-mcp.py", "photoshop"),
    ServerSpec("ps-batch-play", "Adobe Photoshop Batch Play MCP Server", "ps-batch-play.py", "photoshop"),
    ServerSpec("pr", "Adobe Premiere MCP Server", "pr-mcp.py", "premiere"),
    ServerSpec("id", "Adobe InDesign MCP Server", "id-mcp.py", "indesign"),
    ServerSpec("ae", "Adobe After Effects MCP Server", "ae-mcp.py", "aftereffects"),
    ServerSpec("ai", "Adobe Illustrator MCP Server", "ai-mcp.py", "illustrator"),
)

SERVER_KEYS: tuple[str, ...] = tuple(spec.server_key for spec in SERVER_SPECS)
SERVER_BY_KEY: dict[str, ServerSpec] = {spec.server_key: spec for spec in SERVER_SPECS}
SERVER_BY_DISPLAY_NAME: dict[str, ServerSpec] = {spec.display_name: spec for spec in SERVER_SPECS}

#!/usr/bin/env python3
"""Generate MCP compatibility manifest from Python server definitions."""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Any

from common.json_io import write_json
from common.paths import MANIFEST_FILE, REFERENCE_MCP_DIR, REPO_ROOT
from common.servers import SERVER_SPECS


def unparse(node: ast.AST | None) -> str | None:
    if node is None:
        return None
    return ast.unparse(node)


def find_assignment(module: ast.Module, target_name: str) -> Any:
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == target_name:
                    if isinstance(node.value, ast.Constant):
                        return node.value.value
                    return unparse(node.value)
    return None


def extract_action_name(function: ast.FunctionDef) -> str | None:
    for node in ast.walk(function):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "createCommand":
            if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                return node.args[0].value
    return None


def get_defaults(fn: ast.FunctionDef) -> dict[str, ast.AST]:
    args = fn.args.args
    defaults = fn.args.defaults
    if not defaults:
        return {}
    return {arg.arg: default for arg, default in zip(args[-len(defaults) :], defaults)}


def extract_tool(fn: ast.FunctionDef) -> dict[str, Any]:
    default_map = get_defaults(fn)
    params = []
    for arg in fn.args.args:
        if arg.arg in {"self", "cls"}:
            continue
        has_default = arg.arg in default_map
        params.append(
            {
                "name": arg.arg,
                "annotation": unparse(arg.annotation),
                "required": not has_default,
                "default": unparse(default_map.get(arg.arg)) if has_default else None,
            }
        )

    return {
        "name": fn.name,
        "action": extract_action_name(fn),
        "doc": ast.get_docstring(fn),
        "params": params,
    }


def extract_resource_uri(fn: ast.FunctionDef) -> str | None:
    for dec in fn.decorator_list:
        if not isinstance(dec, ast.Call):
            continue
        if not isinstance(dec.func, ast.Attribute):
            continue
        if dec.func.attr != "resource":
            continue
        if dec.args and isinstance(dec.args[0], ast.Constant):
            return dec.args[0].value
    return None


def parse_server(path: Path, server_key: str) -> dict[str, Any]:
    module = ast.parse(path.read_text(encoding="utf-8"))
    app_name = find_assignment(module, "APPLICATION")
    proxy_url = find_assignment(module, "PROXY_URL")
    proxy_timeout = find_assignment(module, "PROXY_TIMEOUT")
    mcp_name = find_assignment(module, "mcp_name")

    tools: list[dict[str, Any]] = []
    resources: list[dict[str, Any]] = []
    for node in module.body:
        if not isinstance(node, ast.FunctionDef):
            continue
        has_tool = any(
            isinstance(dec, ast.Call)
            and isinstance(dec.func, ast.Attribute)
            and dec.func.attr == "tool"
            for dec in node.decorator_list
        )
        if has_tool:
            tools.append(extract_tool(node))
            continue

        resource_uri = extract_resource_uri(node)
        if resource_uri:
            resources.append(
                {
                    "uri": resource_uri,
                    "function": node.name,
                    "doc": ast.get_docstring(node),
                }
            )

    return {
        "server_key": server_key,
        "file": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
        "mcp_name": mcp_name,
        "application": app_name,
        "proxy_url": proxy_url,
        "proxy_timeout": proxy_timeout,
        "tool_count": len(tools),
        "resource_count": len(resources),
        "tools": tools,
        "resources": resources,
    }


def main() -> None:
    servers = []
    for spec in SERVER_SPECS:
        server_path = REFERENCE_MCP_DIR / spec.python_file
        servers.append(parse_server(server_path, spec.server_key))

    manifest = {
        "format_version": 1,
        "generated_from": "python-mcp-ast",
        "servers": servers,
    }
    write_json(MANIFEST_FILE, manifest)
    print(f"Wrote {MANIFEST_FILE}")


if __name__ == "__main__":
    main()

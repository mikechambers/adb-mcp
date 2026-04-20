use anyhow::{anyhow, Context, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub(crate) struct Manifest {
    pub(crate) servers: Vec<ServerDef>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ServerDef {
    pub(crate) server_key: Option<String>,
    pub(crate) mcp_name: String,
    pub(crate) application: String,
    pub(crate) tools: Vec<ToolDef>,
    pub(crate) resources: Vec<ResourceDef>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ToolDef {
    pub(crate) name: String,
    pub(crate) action: Option<String>,
    pub(crate) doc: Option<String>,
    pub(crate) params: Vec<ParamDef>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ParamDef {
    pub(crate) name: String,
    pub(crate) annotation: Option<String>,
    pub(crate) required: bool,
    pub(crate) default: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ResourceDef {
    pub(crate) uri: String,
    pub(crate) function: String,
    pub(crate) doc: Option<String>,
}

pub(crate) fn load_manifest() -> Result<Manifest> {
    // Contract embed compile-time. Regenerate contracts before build when Python source changes.
    let raw = include_str!("../../contracts/mcp_compat_manifest.json");
    serde_json::from_str(raw).context("failed to parse compatibility manifest")
}

pub(crate) fn pick_server(manifest: &Manifest, server_key: &str) -> Result<ServerDef> {
    if let Some(server) = manifest
        .servers
        .iter()
        .find(|server| server.server_key.as_deref() == Some(server_key))
    {
        return Ok(server.clone());
    }

    // Backward compat fallback for older manifest without `server_key`.
    let legacy_name = legacy_display_name(server_key)?;
    manifest
        .servers
        .iter()
        .find(|server| server.mcp_name == legacy_name)
        .cloned()
        .with_context(|| format!("server key not found in manifest: {server_key}"))
}

fn legacy_display_name(server_key: &str) -> Result<&'static str> {
    match server_key {
        "ps" => Ok("Adobe Photoshop MCP Server"),
        "ps-batch-play" => Ok("Adobe Photoshop Batch Play MCP Server"),
        "pr" => Ok("Adobe Premiere MCP Server"),
        "id" => Ok("Adobe InDesign MCP Server"),
        "ae" => Ok("Adobe After Effects MCP Server"),
        "ai" => Ok("Adobe Illustrator MCP Server"),
        _ => Err(anyhow!("unsupported server key: {server_key}")),
    }
}

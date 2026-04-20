use crate::manifest::{ResourceDef, ServerDef, ToolDef};
use crate::transport::send_command;
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

pub(crate) const JSONRPC_VERSION: &str = "2.0";
const MCP_PROTOCOL_VERSION: &str = "2024-11-05";
const SERVER_VERSION: &str = "0.1.0";
const MIME_TEXT_PLAIN: &str = "text/plain";
const RESOURCE_INSTRUCTIONS_URI: &str = "config://get_instructions";

pub(crate) const METHOD_INITIALIZE: &str = "initialize";
pub(crate) const METHOD_TOOLS_LIST: &str = "tools/list";
pub(crate) const METHOD_TOOLS_CALL: &str = "tools/call";
pub(crate) const METHOD_RESOURCES_LIST: &str = "resources/list";
pub(crate) const METHOD_RESOURCES_READ: &str = "resources/read";
pub(crate) const METHOD_NOTIFICATION_INITIALIZED: &str = "notifications/initialized";

#[derive(Debug, Deserialize)]
pub(crate) struct JsonRpcRequest {
    pub(crate) id: Option<Value>,
    pub(crate) method: String,
    #[serde(default)]
    pub(crate) params: Value,
}

#[derive(Debug, Serialize)]
pub(crate) struct JsonRpcResponse<'a> {
    pub(crate) jsonrpc: &'a str,
    pub(crate) id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
pub(crate) struct JsonRpcError {
    pub(crate) code: i64,
    pub(crate) message: String,
}

pub(crate) fn parse_request(payload: &[u8]) -> Result<JsonRpcRequest> {
    serde_json::from_slice(payload).context("invalid JSON-RPC payload")
}

pub(crate) fn ok_response(id: Value, result: Value) -> JsonRpcResponse<'static> {
    JsonRpcResponse {
        jsonrpc: JSONRPC_VERSION,
        id,
        result: Some(result),
        error: None,
    }
}

pub(crate) fn err_response(id: Value, code: i64, message: String) -> JsonRpcResponse<'static> {
    JsonRpcResponse {
        jsonrpc: JSONRPC_VERSION,
        id,
        result: None,
        error: Some(JsonRpcError { code, message }),
    }
}

pub(crate) fn handle_request(server_def: &ServerDef, request: JsonRpcRequest, proxy_url: &str, timeout_secs: u64) -> Result<Value> {
    match request.method.as_str() {
        METHOD_INITIALIZE => Ok(initialize_response(server_def)),
        METHOD_TOOLS_LIST => Ok(json!({
            "tools": server_def.tools.iter().map(tool_to_mcp_schema).collect::<Vec<_>>()
        })),
        METHOD_TOOLS_CALL => call_tool(server_def, request.params, proxy_url, timeout_secs),
        METHOD_RESOURCES_LIST => Ok(json!({
            "resources": server_def.resources.iter().map(resource_to_mcp_schema).collect::<Vec<_>>()
        })),
        METHOD_RESOURCES_READ => read_resource(server_def, request.params),
        _ => Err(anyhow!("unsupported MCP method: {}", request.method)),
    }
}

fn initialize_response(server_def: &ServerDef) -> Value {
    json!({
        "protocolVersion": MCP_PROTOCOL_VERSION,
        "serverInfo": {
            "name": server_def.mcp_name,
            "version": SERVER_VERSION
        },
        "capabilities": {
            "tools": { "listChanged": false },
            "resources": { "listChanged": false }
        }
    })
}

fn tool_to_mcp_schema(tool: &ToolDef) -> Value {
    let mut properties = Map::new();
    let mut required = Vec::new();
    for param in &tool.params {
        properties.insert(
            param.name.clone(),
            json!({
                "type": map_annotation_to_json_type(param.annotation.as_deref()),
                "description": param.default.as_ref()
                    .map(|d| format!("Default: {d}"))
                    .unwrap_or_default(),
            }),
        );
        if param.required {
            required.push(param.name.clone());
        }
    }
    json!({
        "name": tool.name,
        "description": tool.doc.clone().unwrap_or_else(|| "No description provided".to_string()),
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": true
        }
    })
}

fn resource_to_mcp_schema(resource: &ResourceDef) -> Value {
    json!({
        "uri": resource.uri,
        "name": resource.function,
        "description": resource.doc.clone().unwrap_or_else(|| "Instruction resource".to_string()),
        "mimeType": MIME_TEXT_PLAIN,
    })
}

fn read_resource(server_def: &ServerDef, params: Value) -> Result<Value> {
    let uri = params
        .get("uri")
        .and_then(Value::as_str)
        .context("resources/read missing params.uri")?;

    if uri != RESOURCE_INSTRUCTIONS_URI {
        return Err(anyhow!("unsupported resource URI: {uri}"));
    }

    let tool_names = server_def
        .tools
        .iter()
        .map(|t| format!("- {}", t.name))
        .collect::<Vec<_>>()
        .join("\n");
    let content = format!(
        "{} instructions.\n\nAvailable tools:\n{}",
        server_def.mcp_name, tool_names
    );
    Ok(json!({
        "contents": [{
            "uri": uri,
            "mimeType": MIME_TEXT_PLAIN,
            "text": content
        }]
    }))
}

fn call_tool(server_def: &ServerDef, params: Value, proxy_url: &str, timeout_secs: u64) -> Result<Value> {
    let tool_name = params
        .get("name")
        .and_then(Value::as_str)
        .context("tools/call missing params.name")?;
    let tool_args = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let tool = server_def
        .tools
        .iter()
        .find(|t| t.name == tool_name)
        .with_context(|| format!("tool not found: {tool_name}"))?;

    validate_required(tool, &tool_args)?;
    let action = tool
        .action
        .clone()
        .with_context(|| format!("no action mapped for tool: {}", tool.name))?;
    let response = send_command(&server_def.application, proxy_url, timeout_secs, &action, tool_args)?;

    Ok(json!({
        "content": [{
            "type": "text",
            "text": serde_json::to_string_pretty(&response)?
        }],
        "structuredContent": response
    }))
}

fn validate_required(tool: &ToolDef, tool_args: &Value) -> Result<()> {
    let obj = tool_args.as_object().context("tool arguments must be object")?;
    for required in tool.params.iter().filter(|p| p.required) {
        if !obj.contains_key(&required.name) {
            return Err(anyhow!(
                "missing required argument '{}' for tool '{}'",
                required.name,
                tool.name
            ));
        }
    }
    Ok(())
}

fn map_annotation_to_json_type(annotation: Option<&str>) -> &'static str {
    match annotation.unwrap_or("object") {
        "int" | "float" => "number",
        "bool" => "boolean",
        "str" => "string",
        "list" => "array",
        _ => "object",
    }
}


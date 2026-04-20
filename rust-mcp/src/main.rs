use anyhow::{anyhow, Context, Result};
use clap::Parser;
use rust_socketio::{ClientBuilder, Payload, TransportType};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::io::{self, BufRead, BufReader, Read, Write};
use std::sync::mpsc;
use std::time::Duration;

const JSONRPC_VERSION: &str = "2.0";
const MCP_PROTOCOL_VERSION: &str = "2024-11-05";
const SERVER_VERSION: &str = "0.1.0";
const DEFAULT_PROXY_URL: &str = "http://localhost:3001";
const DEFAULT_TIMEOUT_SECS: u64 = 20;
const JSONRPC_INTERNAL_ERROR: i64 = -32000;

const METHOD_INITIALIZE: &str = "initialize";
const METHOD_TOOLS_LIST: &str = "tools/list";
const METHOD_TOOLS_CALL: &str = "tools/call";
const METHOD_RESOURCES_LIST: &str = "resources/list";
const METHOD_RESOURCES_READ: &str = "resources/read";
const METHOD_NOTIFICATION_INITIALIZED: &str = "notifications/initialized";

const RESOURCE_INSTRUCTIONS_URI: &str = "config://get_instructions";
const MIME_TEXT_PLAIN: &str = "text/plain";
const SOCKET_EVENT_COMMAND_PACKET: &str = "command_packet";
const SOCKET_EVENT_PACKET_RESPONSE: &str = "packet_response";
const COMMAND_PACKET_TYPE: &str = "command";
const PLUGIN_STATUS_FAILURE: &str = "FAILURE";

#[derive(Parser, Debug)]
#[command(name = "adb-mcp-rust")]
struct Cli {
    #[arg(long, value_parser = ["ps", "ps-batch-play", "pr", "id", "ae", "ai"])]
    server: String,
    #[arg(long, default_value = DEFAULT_PROXY_URL)]
    proxy_url: String,
    #[arg(long, default_value_t = DEFAULT_TIMEOUT_SECS)]
    timeout_secs: u64,
}

#[derive(Debug, Deserialize)]
struct Manifest {
    servers: Vec<ServerDef>,
}

#[derive(Debug, Clone, Deserialize)]
struct ServerDef {
    server_key: Option<String>,
    mcp_name: String,
    application: String,
    tools: Vec<ToolDef>,
    resources: Vec<ResourceDef>,
}

#[derive(Debug, Clone, Deserialize)]
struct ToolDef {
    name: String,
    action: Option<String>,
    doc: Option<String>,
    params: Vec<ParamDef>,
}

#[derive(Debug, Clone, Deserialize)]
struct ParamDef {
    name: String,
    annotation: Option<String>,
    required: bool,
    default: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct ResourceDef {
    uri: String,
    function: String,
    doc: Option<String>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse<'a> {
    jsonrpc: &'a str,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i64,
    message: String,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let manifest = load_manifest()?;
    let server_def = pick_server(&manifest, &cli.server)?;
    run_stdio_loop(server_def, &cli.proxy_url, cli.timeout_secs)
}

fn load_manifest() -> Result<Manifest> {
    // Contract is embedded at compile-time, so regenerate contracts before build if Python changes.
    let raw = include_str!("../../contracts/mcp_compat_manifest.json");
    serde_json::from_str(raw).context("failed to parse compatibility manifest")
}

fn pick_server(manifest: &Manifest, server_key: &str) -> Result<ServerDef> {
    if let Some(server) = manifest
        .servers
        .iter()
        .find(|server| server.server_key.as_deref() == Some(server_key))
    {
        return Ok(server.clone());
    }

    // Compatibility fallback for older manifest files that did not include `server_key`.
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

fn run_stdio_loop(server_def: ServerDef, proxy_url: &str, timeout_secs: u64) -> Result<()> {
    let stdin = io::stdin();
    let mut reader = BufReader::new(stdin.lock());
    let stdout = io::stdout();
    let mut writer = stdout.lock();

    loop {
        let Some(payload) = read_lsp_frame(&mut reader)? else {
            break;
        };
        let request = parse_request(&payload)?;
        if request.id.is_none() {
            if request.method == METHOD_NOTIFICATION_INITIALIZED {
                continue;
            }
            continue;
        }

        let id = request.id.clone().unwrap_or(Value::Null);
        let response = match handle_request(&server_def, request, proxy_url, timeout_secs) {
            Ok(result) => ok_response(id, result),
            Err(err) => err_response(id, JSONRPC_INTERNAL_ERROR, err.to_string()),
        };
        write_lsp_frame(&mut writer, &serde_json::to_vec(&response)?)?;
    }

    Ok(())
}

fn parse_request(payload: &[u8]) -> Result<JsonRpcRequest> {
    serde_json::from_slice(payload).context("invalid JSON-RPC payload")
}

fn ok_response(id: Value, result: Value) -> JsonRpcResponse<'static> {
    JsonRpcResponse {
        jsonrpc: JSONRPC_VERSION,
        id,
        result: Some(result),
        error: None,
    }
}

fn err_response(id: Value, code: i64, message: String) -> JsonRpcResponse<'static> {
    JsonRpcResponse {
        jsonrpc: JSONRPC_VERSION,
        id,
        result: None,
        error: Some(JsonRpcError { code, message }),
    }
}

fn read_lsp_frame(reader: &mut BufReader<impl Read>) -> Result<Option<Vec<u8>>> {
    let mut content_length = None::<usize>;
    loop {
        let mut line = String::new();
        let bytes = reader.read_line(&mut line)?;
        if bytes == 0 {
            return Ok(None);
        }
        let line_trimmed = line.trim_end_matches(['\r', '\n']);
        if line_trimmed.is_empty() {
            break;
        }
        if let Some(v) = line_trimmed.strip_prefix("Content-Length:") {
            content_length = Some(v.trim().parse::<usize>()?);
        }
    }

    let len = content_length.context("missing Content-Length header")?;
    let mut payload = vec![0u8; len];
    reader.read_exact(&mut payload)?;
    Ok(Some(payload))
}

fn write_lsp_frame(writer: &mut impl Write, payload: &[u8]) -> Result<()> {
    write!(writer, "Content-Length: {}\r\n\r\n", payload.len())?;
    writer.write_all(payload)?;
    writer.flush()?;
    Ok(())
}

fn handle_request(server_def: &ServerDef, request: JsonRpcRequest, proxy_url: &str, timeout_secs: u64) -> Result<Value> {
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
    let obj = tool_args.as_object().context("tool arguments must be an object")?;
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

fn send_command(
    application: &str,
    proxy_url: &str,
    timeout_secs: u64,
    action: &str,
    options: Value,
) -> Result<Value> {
    let command = build_command(application, action, options)?;
    let (response_tx, response_rx) = mpsc::channel::<Value>();
    let application_owned = application.to_string();

    let socket = connect_socket(proxy_url, response_tx, application)?;
    emit_command(&socket, &application_owned, command)?;
    let response = wait_for_response(application, timeout_secs, response_rx)?;
    let _ = socket.disconnect();
    map_failure_status(application, response)
}

fn build_command(application: &str, action: &str, options: Value) -> Result<Value> {
    let options_obj = options
        .as_object()
        .cloned()
        .context("tool arguments must serialize to object")?;
    Ok(json!({
        "application": application,
        "action": action,
        "options": options_obj,
    }))
}

fn connect_socket(proxy_url: &str, response_tx: mpsc::Sender<Value>, application: &str) -> Result<rust_socketio::client::Client> {
    ClientBuilder::new(proxy_url)
        .transport_type(TransportType::Websocket)
        // Proxy can return packet payloads in multiple formats depending on transport/version.
        .on(SOCKET_EVENT_PACKET_RESPONSE, move |payload, _| {
            let _ = response_tx.send(decode_packet_payload(payload));
        })
        .connect()
        .with_context(|| format!("Could not connect to {} command proxy server at {proxy_url}", application))
}

fn decode_packet_payload(payload: Payload) -> Value {
    match payload {
        Payload::Text(values) => {
            if values.len() == 1 {
                values
                    .first()
                    .cloned()
                    .unwrap_or_else(|| json!({"raw": values}))
            } else {
                json!(values)
            }
        }
        Payload::Binary(bytes) => {
            let text = String::from_utf8_lossy(&bytes).to_string();
            serde_json::from_str::<Value>(&text).unwrap_or_else(|_| json!({"raw": text}))
        }
        #[allow(deprecated)]
        Payload::String(text) => serde_json::from_str::<Value>(&text).unwrap_or_else(|_| json!({"raw": text})),
    }
}

fn emit_command(socket: &rust_socketio::client::Client, application: &str, command: Value) -> Result<()> {
    socket.emit(
        SOCKET_EVENT_COMMAND_PACKET,
        json!({
            "type": COMMAND_PACKET_TYPE,
            "application": application,
            "command": command
        }),
    )?;
    Ok(())
}

fn wait_for_response(application: &str, timeout_secs: u64, response_rx: mpsc::Receiver<Value>) -> Result<Value> {
    response_rx
        .recv_timeout(Duration::from_secs(timeout_secs))
        .with_context(|| {
            format!(
                "Could not connect to {}. Connection Timed Out. Make sure MCP Plugin is connected.",
                application
            )
        })
}

fn map_failure_status(application: &str, response: Value) -> Result<Value> {
    if response
        .get("status")
        .and_then(Value::as_str)
        .is_some_and(|status| status == PLUGIN_STATUS_FAILURE)
    {
        let message = response
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("Unknown failure from plugin")
            .to_string();
        return Err(anyhow!("Error returned from {}: {}", application, message));
    }
    Ok(response)
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn manifest_is_loadable() {
        let manifest = load_manifest().expect("manifest should parse");
        assert_eq!(manifest.servers.len(), 6);
    }

    #[test]
    fn all_tools_have_action_mapping() {
        let manifest = load_manifest().expect("manifest should parse");
        for server in manifest.servers {
            for tool in server.tools {
                assert!(
                    tool.action.is_some(),
                    "tool '{}' in '{}' missing action mapping",
                    tool.name,
                    server.mcp_name
                );
            }
        }
    }

    fn test_server_def() -> ServerDef {
        let manifest = load_manifest().expect("manifest should parse");
        pick_server(&manifest, "ps").expect("ps server should resolve")
    }

    fn request(method: &str, params: Value) -> JsonRpcRequest {
        JsonRpcRequest {
            id: Some(json!(1)),
            method: method.to_string(),
            params,
        }
    }

    #[test]
    fn initialize_returns_expected_shape() {
        let server = test_server_def();
        let response = handle_request(&server, request(METHOD_INITIALIZE, json!({})), DEFAULT_PROXY_URL, 1)
            .expect("initialize should succeed");
        assert_eq!(response["protocolVersion"], MCP_PROTOCOL_VERSION);
        assert_eq!(response["serverInfo"]["name"], server.mcp_name);
        assert_eq!(response["serverInfo"]["version"], SERVER_VERSION);
        assert_eq!(response["capabilities"]["tools"]["listChanged"], false);
    }

    #[test]
    fn tools_and_resources_lists_are_exposed() {
        let server = test_server_def();
        let tools = handle_request(&server, request(METHOD_TOOLS_LIST, json!({})), DEFAULT_PROXY_URL, 1)
            .expect("tools/list should succeed");
        let resources = handle_request(
            &server,
            request(METHOD_RESOURCES_LIST, json!({})),
            DEFAULT_PROXY_URL,
            1,
        )
        .expect("resources/list should succeed");

        assert_eq!(tools["tools"].as_array().expect("tools array").len(), server.tools.len());
        assert_eq!(
            resources["resources"].as_array().expect("resources array").len(),
            server.resources.len()
        );
    }

    #[test]
    fn read_resource_valid_and_invalid_uri_behavior() {
        let server = test_server_def();
        let ok = handle_request(
            &server,
            request(METHOD_RESOURCES_READ, json!({"uri": RESOURCE_INSTRUCTIONS_URI})),
            DEFAULT_PROXY_URL,
            1,
        )
        .expect("valid resource uri should succeed");
        assert_eq!(ok["contents"][0]["uri"], RESOURCE_INSTRUCTIONS_URI);

        let err = handle_request(
            &server,
            request(METHOD_RESOURCES_READ, json!({"uri": "config://unknown"})),
            DEFAULT_PROXY_URL,
            1,
        )
        .expect_err("invalid resource uri should fail");
        assert!(err.to_string().contains("unsupported resource URI"));
    }

    #[test]
    fn decode_packet_payload_supports_text_binary_and_legacy_string() {
        let text = decode_packet_payload(Payload::Text(vec![json!({"status":"SUCCESS"})]));
        assert_eq!(text["status"], "SUCCESS");

        let binary = decode_packet_payload(Payload::Binary(
            br#"{"status":"SUCCESS","message":"ok"}"#.to_vec().into(),
        ));
        assert_eq!(binary["message"], "ok");

        #[allow(deprecated)]
        let legacy = decode_packet_payload(Payload::String("{\"legacy\":true}".to_string()));
        assert_eq!(legacy["legacy"], true);
    }

    #[test]
    fn map_failure_status_converts_failure_to_error() {
        let ok = map_failure_status("photoshop", json!({"status":"SUCCESS"})).expect("success should pass");
        assert_eq!(ok["status"], "SUCCESS");

        let err = map_failure_status("photoshop", json!({"status":"FAILURE", "message":"boom"}))
            .expect_err("failure should convert to anyhow error");
        assert!(err.to_string().contains("Error returned from photoshop: boom"));
    }

    #[test]
    fn wait_for_response_times_out_deterministically() {
        let (_tx, rx) = mpsc::channel::<Value>();
        let err = wait_for_response("photoshop", 0, rx).expect_err("empty channel should timeout");
        assert!(err
            .to_string()
            .contains("Connection Timed Out"));
    }
}

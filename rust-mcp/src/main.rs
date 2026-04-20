mod manifest;
mod protocol;
mod stdio;
mod transport;

use anyhow::Result;
use clap::Parser;
const DEFAULT_PROXY_URL: &str = "http://localhost:3001";
const DEFAULT_TIMEOUT_SECS: u64 = 20;
const JSONRPC_INTERNAL_ERROR: i64 = -32000;
use manifest::{load_manifest, pick_server};
use protocol::{
    err_response, handle_request, ok_response, parse_request, METHOD_NOTIFICATION_INITIALIZED,
};
use serde_json::Value;
use std::io::{self, BufReader};
use stdio::{read_lsp_frame, write_lsp_frame};

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

fn main() -> Result<()> {
    let cli = Cli::parse();
    let manifest = load_manifest()?;
    let server_def = pick_server(&manifest, &cli.server)?;
    run_stdio_loop(server_def, &cli.proxy_url, cli.timeout_secs)
}

fn run_stdio_loop(server_def: manifest::ServerDef, proxy_url: &str, timeout_secs: u64) -> Result<()> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::{METHOD_INITIALIZE, METHOD_RESOURCES_LIST, METHOD_RESOURCES_READ, METHOD_TOOLS_LIST};
    use crate::transport::{decode_packet_payload, map_failure_status, wait_for_response};
    use rust_socketio::Payload;
    use serde_json::json;
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

    fn test_server_def() -> manifest::ServerDef {
        let manifest = load_manifest().expect("manifest should parse");
        pick_server(&manifest, "ps").expect("ps server should resolve")
    }

    fn request(method: &str, params: Value) -> protocol::JsonRpcRequest {
        protocol::JsonRpcRequest {
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
        assert_eq!(response["protocolVersion"], "2024-11-05");
        assert_eq!(response["serverInfo"]["name"], server.mcp_name);
        assert_eq!(response["serverInfo"]["version"], "0.1.0");
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
            request(METHOD_RESOURCES_READ, json!({"uri": "config://get_instructions"})),
            DEFAULT_PROXY_URL,
            1,
        )
        .expect("valid resource uri should succeed");
        assert_eq!(ok["contents"][0]["uri"], "config://get_instructions");

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

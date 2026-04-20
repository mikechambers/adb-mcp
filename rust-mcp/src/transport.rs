use anyhow::{anyhow, Context, Result};
use rust_socketio::{ClientBuilder, Payload, TransportType};
use serde_json::{json, Value};
use std::sync::mpsc;
use std::time::Duration;

const SOCKET_EVENT_COMMAND_PACKET: &str = "command_packet";
const SOCKET_EVENT_PACKET_RESPONSE: &str = "packet_response";
const COMMAND_PACKET_TYPE: &str = "command";
const PLUGIN_STATUS_FAILURE: &str = "FAILURE";

pub(crate) fn send_command(
    application: &str,
    proxy_url: &str,
    timeout_secs: u64,
    action: &str,
    options: Value,
) -> Result<Value> {
    let command = build_command(application, action, options)?;
    let packet = build_command_packet_event(application, command);
    let (response_tx, response_rx) = mpsc::channel::<Value>();

    let socket = connect_socket(proxy_url, response_tx, application)?;
    emit_command(&socket, packet)?;
    let response = wait_for_response(application, timeout_secs, response_rx)?;
    let _ = socket.disconnect();
    map_failure_status(application, response)
}

pub(crate) fn build_command(application: &str, action: &str, options: Value) -> Result<Value> {
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

pub(crate) fn build_command_packet_event(application: &str, command: Value) -> Value {
    json!({
        "type": COMMAND_PACKET_TYPE,
        "application": application,
        "command": command
    })
}

fn connect_socket(proxy_url: &str, response_tx: mpsc::Sender<Value>, application: &str) -> Result<rust_socketio::client::Client> {
    ClientBuilder::new(proxy_url)
        .transport_type(TransportType::Websocket)
        .on(SOCKET_EVENT_PACKET_RESPONSE, move |payload, _| {
            let _ = response_tx.send(decode_packet_payload(payload));
        })
        .connect()
        .with_context(|| format!("Could not connect to {} command proxy server at {proxy_url}", application))
}

pub(crate) fn decode_packet_payload(payload: Payload) -> Value {
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

fn emit_command(socket: &rust_socketio::client::Client, packet: Value) -> Result<()> {
    socket.emit(SOCKET_EVENT_COMMAND_PACKET, packet)?;
    Ok(())
}

pub(crate) fn wait_for_response(application: &str, timeout_secs: u64, response_rx: mpsc::Receiver<Value>) -> Result<Value> {
    response_rx
        .recv_timeout(Duration::from_secs(timeout_secs))
        .with_context(|| {
            format!(
                "Could not connect to {}. Connection Timed Out. Make sure MCP Plugin is connected.",
                application
            )
        })
}

pub(crate) fn map_failure_status(application: &str, response: Value) -> Result<Value> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn mock_proxy_contract_flow_success() {
        let command = build_command("photoshop", "getDocuments", json!({})).expect("build command");
        let packet = build_command_packet_event("photoshop", command);
        assert_eq!(packet["type"], "command");
        assert_eq!(packet["application"], "photoshop");
        assert_eq!(packet["command"]["action"], "getDocuments");

        let decoded = decode_packet_payload(Payload::Text(vec![json!({"status":"SUCCESS","data":{"ok":true}})]));
        let mapped = map_failure_status("photoshop", decoded).expect("success must pass");
        assert_eq!(mapped["data"]["ok"], true);
    }

    #[test]
    fn mock_proxy_contract_flow_failure() {
        let decoded = decode_packet_payload(Payload::Text(vec![json!({"status":"FAILURE","message":"bad tool"})]));
        let err = map_failure_status("photoshop", decoded).expect_err("failure must error");
        assert!(err.to_string().contains("bad tool"));
    }

    #[test]
    fn mock_proxy_contract_flow_malformed_payload() {
        let decoded = decode_packet_payload(Payload::Binary(vec![0, 159, 146, 150].into()));
        assert!(decoded.get("raw").is_some());
    }

    #[test]
    fn decode_packet_payload_handles_multivalue_text() {
        let decoded = decode_packet_payload(Payload::Text(vec![json!({"status":"SUCCESS"}), json!({"extra":true})]));
        assert!(decoded.is_array());
        assert_eq!(decoded.as_array().expect("array")[1]["extra"], true);
    }

    #[test]
    fn decode_packet_payload_handles_malformed_json_text() {
        #[allow(deprecated)]
        let decoded = decode_packet_payload(Payload::String("not-json".to_string()));
        assert_eq!(decoded["raw"], "not-json");
    }

    #[test]
    fn map_failure_status_missing_status_passes_through() {
        let out = map_failure_status("photoshop", json!({"message":"no-status"})).expect("no status should pass through");
        assert_eq!(out["message"], "no-status");
    }

    #[test]
    fn map_failure_status_missing_message_uses_default() {
        let err = map_failure_status("photoshop", json!({"status":"FAILURE"})).expect_err("failure should error");
        assert!(err
            .to_string()
            .contains("Unknown failure from plugin"));
    }

    #[test]
    fn wait_for_response_accepts_near_timeout_response() {
        let (tx, rx) = mpsc::channel::<Value>();
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(25));
            let _ = tx.send(json!({"status":"SUCCESS"}));
        });

        let out = wait_for_response("photoshop", 1, rx).expect("response before timeout should pass");
        assert_eq!(out["status"], "SUCCESS");
    }
}

# Case Study: Installing adb-mcp (Photoshop MCP Server) on Windows

## Overview

This documents the process of getting [mikechambers/adb-mcp](https://github.com/mikechambers/adb-mcp) working on Windows with Claude Desktop, including all the issues encountered and how they were resolved. The goal was to let Claude control Adobe Photoshop via MCP (Model Context Protocol).

**Platform:** Windows 11  
**Claude Desktop:** EXE version (AnthropicClaude)  
**Photoshop:** v26+ with Developer Mode enabled  
**Python:** 3.12.7  
**Node.js:** v24.13.0

---

## Step-by-Step Setup

### 1. Prerequisites

Install the following before starting:

- [Python 3.12+](https://www.python.org/downloads/) — check **"Add to PATH"** during installation
- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/) (from Adobe)
- Adobe Photoshop with **Developer Mode enabled** (`Edit > Preferences > Plugins > Enable Developer Mode`)

### 2. Clone the repository

```bash
git clone https://github.com/mikechambers/adb-mcp.git
cd adb-mcp
```

### 3. Install Python dependencies globally

```bash
python -m pip install fonttools python-socketio mcp requests websocket-client numpy
```

> **Why globally?** Claude Desktop spawns the MCP server as a subprocess and may not have access to virtual environments. Installing globally ensures all packages are available.

### 4. Start the proxy server

```bash
cd adb-mcp-proxy-socket
npm install
node proxy.js
```

Leave this terminal open. The proxy runs on `ws://localhost:3001`.

### 5. Load the UXP plugin in Photoshop

1. Open **UXP Developer Tool**
2. Click **Add Plugin** → navigate to `adb-mcp/uxp/ps/` → select `manifest.json`
3. Click **Load**
4. In Photoshop: **Plugins > Photoshop MCP Agent > Connect**

You should see in the proxy terminal: `Client registered for application: photoshop`

### 6. Configure Claude Desktop

Open Claude Desktop → **Settings → Developer → Edit Config**

```json
{
  "mcpServers": {
    "photoshop": {
      "command": "C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
      "args": [
        "C:\\path\\to\\adb-mcp\\mcp\\ps-mcp.py"
      ]
    }
  }
}
```

> Replace `YOUR_USERNAME` and the path to match your system.

Restart Claude Desktop. The Photoshop MCP server should now show as connected.

---

## Issues Encountered & Solutions

### ❌ Issue 1: Wrong config file location (Claude Desktop Store vs EXE)

**Problem:** Manually creating `%APPDATA%\Claude\claude_desktop_config.json` had no effect.

**Cause:** Two versions of Claude Desktop can coexist on Windows:
- **Microsoft Store (MSIX)** version reads config from:  
  `C:\Users\<user>\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`
- **EXE** version reads config from:  
  `C:\Users\<user>\AppData\Roaming\Claude\claude_desktop_config.json`

**Fix:** Always use **Settings → Developer → Edit Config** inside Claude Desktop — it opens the correct file regardless of which version you have installed.

---

### ❌ Issue 2: `ModuleNotFoundError: No module named 'fontTools'`

**Problem:** Server crashed immediately with:
```
ModuleNotFoundError: No module named 'fontTools'
```

**Cause:** When using `uv run` in the MCP config, `uv` was failing to install packages due to a file lock error (leftover cache from a previous failed install).

**Fix:** Switch from `uv` to direct `python.exe` in the config, and install all dependencies globally with `pip`:

```bash
python -m pip install fonttools python-socketio mcp requests websocket-client numpy
```

---

### ❌ Issue 3: Server disconnected after ~2 seconds (the main bug)

**Problem:** Server started, received `initialize` from Claude Desktop, but disconnected after ~2 seconds with no error message in the logs:

```
Adobe Photoshop MCP Server running on stdio
LOGGER : Socket client configured: app=photoshop, url=http://localhost:3001, timeout=20
[2 seconds later]
Server transport closed unexpectedly
```

**Cause:** `mcp.run()` was **missing** from the end of `ps-mcp.py`. Without it, the Python script executed all the setup code and then simply exited — never entering the MCP event loop to handle the `initialize` handshake.

**Fix:** Add `mcp.run()` to the end of `ps-mcp.py`:

```powershell
Add-Content -Path "C:\path\to\adb-mcp\mcp\ps-mcp.py" -Value "`nmcp.run()"
```

Or open the file in any editor and add this as the very last line:

```python
mcp.run()
```

After this fix, the server connected successfully and all tools were registered.

---

## Startup Sequence (repeat every session)

1. **Terminal 1:** `cd adb-mcp/adb-proxy-socket && node proxy.js` — keep open
2. Open **Photoshop**
3. In **UXP Developer Tool:** click Load next to Photoshop MCP Agent
4. In Photoshop: **Plugins > Photoshop MCP Agent > Connect**
5. Launch **Claude Desktop**

---

## Verification

Once connected, start a new conversation in Claude Desktop and ask:

> *"Use the photoshop MCP to get information about the currently open document"*

Claude should respond with real data from your open Photoshop document.

---

## Summary

| Issue | Root Cause | Fix |
|---|---|---|
| Config not being read | Wrong path for Store vs EXE version | Use Settings → Developer → Edit Config |
| `ModuleNotFoundError: fontTools` | `uv` cache lock / packages not installed | `pip install` globally + use `python.exe` directly |
| Server disconnects after 2s | Missing `mcp.run()` at end of `ps-mcp.py` | Add `mcp.run()` as last line of the file |

---

*Tested on Windows 11, Python 3.12.7, Node.js v24, Photoshop v26, Claude Desktop 0.14.10*

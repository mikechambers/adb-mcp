# adb-mcp

adb-mcp is a proof of concept project to enabled AI control of Adobe tools (Adobe Photoshop and Adobe Premiere) by providing an interface to LLMs via the MCP protocol.

The project is not endorsed by nor supported by Adobe.

It has been tested with Claude desktop (Mac and Windows) from Anthropic, as well as the OpenAI Agent SDK, and allows AI clients to control Adobe Photoshop and Adobe Premiere. Theoretically, it should work with any AI App / LLM that supports the MCP protocol, and is built in a way to support multiple Adobe applications.

Example use cases include:

- Giving Claude step by step instruction on what to do in Photoshop, providing a conversational based interface (particularly useful if you are new to Photoshop).
- Giving Claude a task (create an instagram post that looks like a Polariod image, create a double exposure) and letting it create it from start to finish to use as a template.
- Asking Claude to generate custom Photoshop tutorials for you, by creating an example file, then step by step instructions on how to recreate.
- As a Photoshop utility tool (have Claude rename all of your layers into a consistent format)
- Have Claude create new Premiere projects pre-populations with clips, transitions, effects and Audio

[View Video Examples](https://www.youtube.com/playlist?list=PLrZcuHfRluqt5JQiKzMWefUb0Xumb7MkI)

The Premiere agent is a bit more limited in functionality compared to the Photoshop agent, due to current limitations of the Premiere plugin API.

## How it works

The proof of concept works by providing:

- A MCP Server that provides an interface to functionality within Adobe Photoshop to the AI / LLM
- A Node based command proxy server that sits between the MCP server and Adobe app plugins
- An Adobe app (Photoshop and Premiere) plugin that listens for commands, and drives the programs

**AI** <-> **MCP Server** <-> **Command Proxy Server** <-> **Photoshop / Premiere UXP Plugin** <-> **Photoshop / Premiere**

The proxy server is required because the public facing API for UXP Based JavaScript plugin does not allow it to listen on a socket connection (as a server) for the MCP Server to connect to (it can only connect to a socket as a client).

## Requirements

In order to run this, the following is required:

- AI LLM with support for MCP Protocol (tested with Claude desktop on Mac & Windows, and OpenAI Agent SDK)
- Rust toolchain (stable), which is used to run the MCP server in this repository
- Python 3 (optional fallback runtime for dual-run migration mode)
- NodeJS, used to provide a proxy between the MCP server and Photoshop
- Adobe UXP Developer tool (available via Creative Cloud) used to install and debug the Photoshop / Premiere plugin used to connect to the proxy
- Adobe Photoshop (26.0 or greater) with the MCP Plugin installed or Adobe Premiere Beta (25.3 Build 46 or greater)

## Installation

This guide assumes you're using Claude Desktop. Other MCP-compatible AI applications should work similarly.

### Download Source Code

Clone or download the source code from the [main project page](https://github.com/mikechambers/adb-mcp).

### Install Claude Desktop

1. Download and install [Claude Desktop](https://claude.ai/download)
2. Launch Claude Desktop to verify it works

Note, you can use any client / code that supports MCP, just follow its instructions for how to configure.

### Build Rust MCP Server

Navigate to the project directory and run:

```bash
cargo build -p adb-mcp-rust
```

Note: `rust-mcp` embeds `contracts/mcp_compat_manifest.json` at compile time via `include_str!`, so regenerate contracts before building whenever `reference/mcp/*.py` changes.

### Contract Artifact Pipeline

The Rust path uses a generated contract pipeline:

1. `python scripts/generate_contract.py` parses `reference/mcp/*.py` and writes `contracts/mcp_compat_manifest.json`.
2. `python scripts/generate_command_fixtures.py` reads that manifest and writes `contracts/command_packet_fixtures.json`.
3. `cargo build`/`cargo test` consume the embedded manifest from step 1.

### Hardening Gate

Before larger runtime refactors, run:

```bash
python scripts/run_hardening_gate.py
```

This gate enforces:

- generated contracts/fixtures
- contract invariant checks
- Rust compile + tests
- MCP smoke checks

### Naming Conventions

- `server_key`: short identifier used by CLI and scripts (`ps`, `pr`, `ai`, etc.).
- `display_name` / `mcp_name`: human-readable MCP server name.
- `python_file`: legacy Python MCP filename under `reference/mcp/`.
- Docs and examples use repo-relative forward-slash paths for cross-platform clarity.

### Install MCP for Development (Rust Default)

Use `scripts/run_mcp_server.py` as the MCP command and pass the server key you want:

#### Photoshop

```bash
uv run mcp install scripts/run_mcp_server.py -- --server ps
```

#### Photoshop Batch Play

```bash
uv run mcp install scripts/run_mcp_server.py -- --server ps-batch-play
```

#### Premiere Pro

```bash
uv run mcp install scripts/run_mcp_server.py -- --server pr
```

#### InDesign

```bash
uv run mcp install scripts/run_mcp_server.py -- --server id
```

#### AfterEffects

```bash
uv run mcp install scripts/run_mcp_server.py -- --server ae
```

#### Illustrator

```bash
uv run mcp install scripts/run_mcp_server.py -- --server ai
```

### Legacy Python Fallback (Dual-Run Mode)

During migration, you can force the launcher to use the original Python server implementations by setting:

```bash
ADB_MCP_RUNTIME=python
```

Or in PowerShell:

```powershell
$env:ADB_MCP_RUNTIME = "python"
```

When unset, runtime defaults to Rust.

### Legacy Python Direct Install Commands

If you want to run legacy Python servers directly (without launcher), navigate to the `reference/mcp` directory and run:

#### Photoshop

```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with numpy ps-mcp.py
```

#### Premiere Pro

```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with pillow pr-mcp.py
```

#### InDesign

```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with pillow id-mcp.py
```

#### AfterEffects

```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with pillow ae-mcp.py
```

#### Illustrator

```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with pillow ai-mcp.py
```

Restart Claude Desktop after installation.

### Set Up Proxy Server

#### Using Prebuilt Executables (Recommended)

1. Download the appropriate executable for your platform from the latest [release](https://github.com/mikechambers/adb-mcp/releases) (files named like `adb-proxy-socket-macos-x64.zip` (Intel), `adb-proxy-socket-macos-arm64.zip` (Silicon), or `adb-proxy-socket-win-x64.exe.zip`).
2. Unzip the executable.
3. Double click or run from the console / terminal

#### Running from Source

1. Navigate to the `reference/adb-proxy-socket` directory
2. Run `node proxy.js`

You should see a message like:  
   `Photoshop MCP Command proxy server running on ws://localhost:3001`

**Keep this running** — the proxy server must stay active for Claude to communicate with Adobe plugins.

### Install Plugins

#### Photoshop, Premiere Pro, InDesign (UXP)

1. Launch **UXP Developer Tools** from Creative Cloud
2. Enable developer mode when prompted
3. Select **File > Add Plugin**
4. Navigate to the appropriate directory and select **manifest.json**:
  - **Photoshop**: `reference/uxp/ps/manifest.json`
  - **Premiere Pro**: `reference/uxp/pr/manifest.json`
  - **InDesign**: `reference/uxp/id/manifest.json`
5. Click **Load**
6. In your Adobe application, open the plugin panel and click **Connect**

##### Enable Developer Mode in Photoshop

**For Photoshop:**

1. Launch Photoshop (2025/26.0 or greater)
2. Go to **Settings > Plugins** and check **"Enable Developer Mode"**
3. Restart Photoshop

#### AfterEffects, Illustrator (CEP)

##### Mac

1. Make sure the following directory exists (if it doesn't then create the directories)
  `/Users/USERNAME/Library/Application Support/Adobe/CEP/extensions`
2. Navigate to the extensions directory and create a symlink that points to the AfterEffect / Illustrator plugin in the CEP directory.

```bash
cd /Users/USERNAME/Library/Application Support/Adobe/CEP/extensions
ln -s /Users/USERNAME/src/adb-mcp/cep/com.mikechambers.ae com.mikechambers.ae
```

or

```bash
cd /Users/USERNAME/Library/Application Support/Adobe/CEP/extensions
ln -s /Users/USERNAME/src/adb-mcp/cep/com.mikechambers.ai com.mikechambers.ai
```

##### Windows

1. Make sure the following directory exists (if it doesn't then create the directories)
  `C:\Users\USERNAME\AppData\Roaming\Adobe\CEP\extensions`
2. Open Command Prompt as Administrator (or enable Developer Mode in Windows Settings)
3. Create a junction or symbolic link that points to the AfterEffect / Illustrator plugin in the CEP directory:

```cmd
mklink /D "C:\Users\USERNAME\AppData\Roaming\Adobe\CEP\extensions\com.mikechambers.ae" "C:\Users\USERNAME\src\adb-mcp\cep\com.mikechambers.ae"
```

or

```cmd
mklink /D "C:\Users\USERNAME\AppData\Roaming\Adobe\CEP\extensions\com.mikechambers.ai" "C:\Users\USERNAME\src\adb-mcp\cep\com.mikechambers.ai"
```

Note if you don't want to symlink, you can copy com.mikechambers.ae / com.mikechambers.ao into the CEP directory.

### Using Claude with Adobe Apps

Launch the following:

1. Claude Desktop
2. adb-proxy-socket node server
3. Launch Photoshop, Premiere, InDesign, AfterEffects, Illustrator

*TIP: Create a project for Photoshop / Premiere Pro in Claude and pre-load any app specific instructions in its Project knowledge.*

#### Photoshop

1. Launch UXP Developer Tool and click the Load button for *Photoshop MCP Agent*
2. In Photoshop, if the MCP Agent panel is not open, open *Plugins > Photoshop MCP Agent > Photoshop MCP Agent*
3. Click connect in the agent panel in Photoshop

Now you can switch over the Claude desktop. Before you start a session, you should load the instructions resource which will provide guidance and info the Claude by clicking the socket icon (Attach from MCP) and then *Choose an Integration* > *Adobe Photoshop* > *config://get_instructions*.

#### Premiere

1. Launch UXP Developer Tool and click the Load button for *Premiere MCP Agent*
2. In Premiere, if the MCP Agent panel is not open, open *Window > UXP Plugins > Premiere MCP Agent > Premiere MCP Agent*
3. Click connect in the agent panel in Photoshop

#### InDesign

1. Launch UXP Developer Tool and click the Load button for InDesitn MCP Agent_
2. In InDesign, if the MCP Agent panel is not open, open *Plugins > InDesign MCP Agent > InDesign MCP Agent*
3. Click connect in the agent panel in Photoshop

#### AfterEffects

1. *Window > Extensions > Illustrator MCP Agent*

#### Illustrator

1. Open a file (the plugin won't launch unless a file is open)
2. *Window > Extensions > Illustrator MCP Agent*

Note, you must reload the plugin via the UXP Developer app every time you restart Photoshop, Premiere and InDesign.

### Setting up session

In the chat input field, click the "+" button. From there click "Add from Adobe Photoshop / Premiere" then select *config://get_instructions*. This will load the instructions into the prompt. Submit that to Claude and once it processes it, you are ready to go.



This will help reduce errors when the AI is using the app.

### Prompting

At anytime, you can ask the following:

```
Can you list what apis / functions are available for working with Photoshop / Premiere?
```

and it will list out all of the functionality available.

When prompting, you do not need to reference the APIs, just use natural language to give instructions.

For example:

```
Create a new Photoshop file with a blue background, that is 1080 width by 720 height at 300 dpi
```

```
Create a new Photoshop file for an instagram post
```

```
Create a double exposure image in Photoshop of a woman and a forest
```

```
Generate an image of a forest, and then add a clipping mask to only show the center in a circle
```

```
Make something cool with photoshop
```

```
Add cross fade transitions between all of the clips on the timeline in Premiere
```

### Tips

#### General

- When asking AI to view the content in Photoshop / Premiere Pro, you can see the image returned in the Tool Call item in the chat. It will appear once the entire response has been added to the chat.
- When prompting, ask the AI to think about and check its work.
- The more you guide it (i.e. "consider using clipping masks") the better the results
- The more advanced the model, or the more resources given to the model the better and more creative the AI is.
- As a general rule, don't make changes in the Adobe Apps while the AI is doing work. If you do make changes, make sure to tell the AI about it.
- The AI will learn from its mistakes, but will lose its memory once you start a new chat. You can guide it to do things in a different way, and then ask it to start over and it should follow the new approach.

The AI currently has access to a subset of Photoshop / Premiere / InDesign / Illustrator / AfterEffects functionality. In general, the approach has been to provide lower level tools to give the AI the basics to do more complex stuff.

Note, for AfterEffects and Illustrator, there is a low level Extend Script API that will let the LLM run any arbitrary extend script (which allows it to do just about anything).

The Photoshop plugin has more functionality that Premiere.

By default, the AI cannot access files directly, although if you install the [Claude File System MCP server](https://www.claudemcp.com/servers/filesystem) it can access, and load files into Photoshop / Premiere (open files and embed images).

#### Photoshop

- You can ask the AI to look at the content of the Photoshop file and it should be able to then see the output.
- The AI currently has issue sizing and positioning text correctly, so giving it guidelines on font sizes to use will help, as well as telling it to align the text relative to the canvas.
- The AI has access to all of the Postscript fonts on the system. If you want to specify a font, you must use its Postscript name (you may be able to ask the AI for it).
- You can ask the AI for suggestions. It comes up with really useful ideas / feedback sometimes.

#### Premiere

- Currently the plugin assumes you are just working with a single sequence.
- Pair the Premiere Pro MCP with the [media-utils-mcp](https://github.com/mikechambers/media-utils-mcp) to expand functionality.

### Troubleshooting

#### MCP won't run in Claude

If you get an error when running Claude that the MCP is not working, you may need to edit your Claude config file and put an absolute path for the UV command. More info [here](https://github.com/mikechambers/adb-mcp/issues/5#issuecomment-2829817624).

#### All fonts not available

The MCP server will return a list of available fonts, but depending on the number of fonts installed on your system, may omit some to work around the amount of data that can be send to the AI. By default it will list the first 1000 fonts sorted in alphabetical order.

You can tell the AI to use a specific font, using its postscript name.

#### Plugin won't install or connect

- Make sure the app is running before you try to load the plugin.
- In the UXP developer tool click the debug button next to load, and see if there are any errors.
- Make sure the node / proxy server is running. If you plugin connects you should see output similar to:

```
adb-mcp Command proxy server running on ws://localhost:3001
User connected: Ud6L4CjMWGAeofYAAAAB
Client Ud6L4CjMWGAeofYAAAAB registered for application: photoshop
```

- When you press the connect button, if it still says "Connect" it means there was either an error, or it can't connect to the proxy server. You can view the error in the UXP Developer App, by opening the Developer Workspace and click "Debug".

#### Errors within AI client

- If something fails on the AI side, it will usually tell you the issue. If you click the command / code box, you can see the error.
- The first thing to check if there is an issue is to make sure the plugin in Photoshop / Premiere is connected, and that the node proxy server is running.
- If response times get really slow, check if the AI servers are under load, and that you do not have too much text in the current conversation (restarting a new chat can sometimes help speed up, but you will lose the context).

If you continue to have issues post an [issue](https://github.com/mikechambers/adb-mcp/issuesrd.gg/fgxw9t37D7). Include as much information as you can (OS, App, App version, and debug info or errors).

## Development

Adding new functionality is relatively easy, and requires:

1. Adding the API and parameters in the *mcp/ps-mcp.py* / *mcp/pr-mcp.py* file (which is used by the AI)
2. Implementing the API in the *uxp/ps/commands/index.js* / *uxp/pr/commands/index.js* file.

This [thread](https://github.com/mikechambers/adb-mcp/issues/10#issuecomment-3191698528) has some info on how to add functionality.

## Questions, Feature Requests, Feedback

If you have any questions, feature requests, need help, or just want to chat, join the [discord](https://discord.gg/fgxw9t37D7).

You can also log bugs and feature requests on the [issues page](https://github.com/mikechambers/adb-mcp/issues).


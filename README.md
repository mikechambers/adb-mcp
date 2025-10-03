# adb-mcp

adb-mcp is a proof of concept project to enabled AI control of Adobe tools (Adobe Photoshop and Adobe Premiere) by providing an interface to LLMs via the MCP protocol.

The project is not endorsed by nor supported by Adobe.

It has been tested with Claude desktop (Mac and Windows) from Anthropic, as well as the OpenAI Agent SDK, and allows AI clients to control Adobe Photoshop and Adobe Premiere. Theoretically, it should work with any AI App / LLM that supports the MCP protocol, and is built in a way to support multiple Adobe applications.

Example use cases include:

-   Giving Claude step by step instruction on what to do in Photoshop, providing a conversational based interface (particularly useful if you are new to Photoshop).
-   Giving Claude a task (create an instagram post that looks like a Polariod image, create a double exposure) and letting it create it from start to finish to use as a template.
-   Asking Claude to generate custom Photoshop tutorials for you, by creating an example file, then step by step instructions on how to recreate.
-   As a Photoshop utility tool (have Claude rename all of your layers into a consistent format)
-   Have Claude create new Premiere projects pre-populations with clips, transitions, effects and Audio

[View Video Examples](https://www.youtube.com/playlist?list=PLrZcuHfRluqt5JQiKzMWefUb0Xumb7MkI)

The Premiere agent is a bit more limited in functionality compared to the Photoshop agent, due to current limitations of the Premiere plugin API.

## How it works

The proof of concept works by providing:

-   A MCP Server that provides an interface to functionality within Adobe Photoshop to the AI / LLM
-   A Node based command proxy server that sits between the MCP server and Adobe app plugins
-   An Adobe app (Photoshop and Premiere) plugin that listens for commands, and drives the programs

**AI** <-> **MCP Server** <-> **Command Proxy Server** <-> **Photoshop / Premiere UXP Plugin** <-> **Photoshop / Premiere**

The proxy server is required because the public facing API for UXP Based JavaScript plugin does not allow it to listen on a socket connection (as a server) for the MCP Server to connect to (it can only connect to a socket as a client).

## Requirements

In order to run this, the following is required:

-   AI LLM with support for MCP Protocol (tested with Claude desktop on Mac & Windows, and OpenAI Agent SDK)
-   Python 3, which is used to run the MCP server provided with this project
-   NodeJS, used to provide a proxy between the MCP server and Photoshop
-   Adobe UXP Developer tool (available via Creative Cloud) used to install and debug the Photoshop / Premiere plugin used to connect to the proxy
-   Adobe Photoshop (26.0 or greater) with the MCP Plugin installed or Adobe Premiere Beta (25.3 Build 46 or greater)


## Installation

This guide assumes you're using Claude Desktop. Other MCP-compatible AI applications should work similarly.


### Development Setup

Use this method if you want to modify the code or access the latest features.

#### 1. Download Source Code
Clone or download the source code from the [main project page](https://github.com/mikechambers/adb-mcp).

#### 2. Install Claude Desktop
1. Download and install [Claude Desktop](https://claude.ai/download)
2. Launch Claude Desktop to verify it works

#### 3. Install MCP for Development
Navigate to the project directory and run:

**For Photoshop:**
```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with numpy ps-mcp.py
```

**For Premiere Pro:**
```bash
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with pillow pr-mcp.py
```

Restart Claude Desktop after installation.

#### 4. Set Up Proxy Server

##### Running from Source

1. Navigate to the adb-proxy-socket directory
2. Run `node proxy.js`

##### Using Prebuilt Executables (Recommended)

1. Download the appropriate executable for your platform from the latest [release](https://github.com/mikechambers/adb-mcp/releases) (files named like `adb-proxy-socket-macos-x64.zip` (Intel), `adb-proxy-socket-macos-arm64.zip` (Silicon), or `adb-proxy-socket-win-x64.exe.zip`).
2. Unzip the executable.
3. From the terminal or console run the executable:

   - **macOS** (Intel or Apple Silicon):
     ```bash
     ./adb-proxy-socket-macos-x64
     ```
     or
     ```bash
     ./adb-proxy-socket-macos-arm64
     ```

   You can also double click the executable on Mac to launch.

   - **Windows**:  
     Double-click `adb-proxy-socket-win.exe` or run in Command Prompt:
     ```cmd
     adb-proxy-socket-win.exe
     ```

4. You should see a message like:  
   `Photoshop MCP Command proxy server running on ws://localhost:3001`

5. **Keep this running** — the proxy server must stay active for Claude to communicate with Adobe plugins.


#### 5. Enable Developer Mode in Adobe Applications

**For Photoshop:**
1. Launch Photoshop (2025/26.0 or greater)
2. Go to **Settings > Plugins** and check **"Enable Developer Mode"**
3. Restart Photoshop

**For Premiere Pro:**
1. Launch Premiere Pro Beta (25.3 or greater)
2. Developer mode should be available by default in the beta

#### 6. Install Plugins for Development

##### UXP (Photoshop, Premiere Pro, InDesign)

1. Launch **UXP Developer Tools** from Creative Cloud
2. Enable developer mode when prompted
3. Select **File > Add Plugin**
4. Navigate to the appropriate directory and select **manifest.json**:
   - **Photoshop**: `uxp/ps/manifest.json`
   - **Premiere Pro**: `uxp/pr/manifest.json`
5. Click **Load**
6. In your Adobe application, open the plugin panel and click **Connect**

##### CEP (AfterEffects)

###### Mac
1. Make sure the following directory exists (if it doesn't then create the directories)
   `/Users/USERNAME/Library/Application Support/Adobe/CEP/extensions`

2. Navigate to the extensions directory and create a symlink that points to the AfterEffect plugin in the CEP directory.
```bash
cd /Users/USERNAME/Library/Application Support/Adobe/CEP/extensions
com.mikechambers.ae -> /Users/USERNAME/src/adb-mcp/cep/com.mikechambers.ae
```
###### Windows
1. Make sure the following directory exists (if it doesn't then create the directories)
   `C:\Users\USERNAME\AppData\Roaming\Adobe\CEP\extensions`

2. Open Command Prompt as Administrator (or enable Developer Mode in Windows Settings)

3. Create a junction or symbolic link that points to the AfterEffect plugin in the CEP directory:
```cmd
mklink /D "C:\Users\USERNAME\AppData\Roaming\Adobe\CEP\extensions\com.mikechambers.ae" "C:\Users\USERNAME\src\adb-mcp\cep\com.mikechambers.ae"
```

Note if you don't want to symlink, you can copy com.mikechambers.ae into the CEP directory.

## Using Claude with Adobe Apps

Launch the following:

1. Claude Desktop
2. adb-proxy-socket node server
3. Launch Photoshop and / or Premiere

_TIP: Create a project for Photoshop / Premiere Pro in Claude and pre-load any app specific instructions in its Project knowledge._

### Photoshop
1. Launch UXP Developer Tool and click the Load button for _Photoshop MCP Agent_
2. In Photoshop, if the MCP Agent panel is not open, open _Plugins > Photoshop MCP Agent > Photoshop MCP Agent_
3. Click connect in the agent panel in Photoshop

Now you can switch over the Claude desktop. Before you start a session, you should load the instructions resource which will provide guidance and info the Claude by clicking the socket icon (Attach from MCP) and then _Choose an Integration_ > _Adobe Photoshop_ > _config://get_instructions_.



### Premiere
4. Launch UXP Developer Tool and click the Load button for _Premiere MCP Agent_
5. In Premiere, if the MCP Agent panel is not open, open _Window > UXP Plugins > Premiere MCP Agent > Premiere MCP Agent_
6. Click connect in the agent panel in Photoshop

Now you can switch over the Claude desktop. Before you start a session, you should load the instructions resource which will provide guidance and info the Claude by clicking the socket icon (Attach from MCP) and then _Choose an Integration_ > _Adobe Premiere > _config://get_instructions_.


Note, you must reload the plugin via the UCP Developer app every time you restart Photoshop and Premiere.

### Setting up session

In the chat input field, click the "+" button. From there click "Add from Adobe Photoshop / Premiere" then select *config://get_instructions*. This will load the instructions into the prompt. Submit that to Claude and once it processes it, you are ready to go.

<img src="images/claud-attach-mcp.png" width="300">

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
* When asking AI to view the content in Photoshop / Premiere Pro, you can see the image returned in the Tool Call item in the chat. It will appear once the entire response has been added to the chat.
* When prompting, ask the AI to think about and check its work.
* The more you guide it (i.e. "consider using clipping masks") the better the results
* The more advanced the model, or the more resources given to the model the better and more creative the AI is.
* As a general rule, don't make changes in the Adobe Apps while the AI is doing work. If you do make changes, make sure to tell the AI about it.
* The AI will learn from its mistakes, but will lose its memory once you start a new chat. You can guide it to do things in a different way, and then ask it to start over and it should follow the new approach.

The AI currently has access to a subset of Photoshop / Premiere functionality. In general, the approach has been to provide lower level tools to give the AI the basics to do more complex stuff.

The Photoshop plugin has more functionality that Premiere.

By default, the AI cannot access files directly, although if you install the [Claude File System MCP server](https://www.claudemcp.com/servers/filesystem) it can access, and load files into Photoshop / Premiere (open files and embed images).

#### Photoshop

* You can ask the AI to look at the content of the Photoshop file and it should be able to then see the output.
* The AI currently has issue sizing and positioning text correctly, so giving it guidelines on font sizes to use will help, as well as telling it to align the text relative to the canvas.
* The AI has access to all of the Postscript fonts on the system. If you want to specify a font, you must use its Postscript name (you may be able to ask the AI for it).
* You can ask the AI for suggestions. It comes up with really useful ideas / feedback sometimes.

#### Premiere

* Currently the plugin assumes you are just working with a single sequence.
* Pair the Premiere Pro MCP with the [media-utils-mcp](https://github.com/mikechambers/media-utils-mcp) to expand functionality.


### Troubleshooting

#### MCP won't run in Claude

If you get an error when running Claude that the MCP is not working, you may need to edit your Claude config file and put an absolute path for the UV command. More info [here](https://github.com/mikechambers/adb-mcp/issues/5#issuecomment-2829817624).

#### All fonts not available

The MCP server will return a list of available fonts, but depending on the number of fonts installed on your system, may omit some to work around the amount of data that can be send to the AI. By default it will list the first 1000 fonts sorted in alphabetical order.

You can tell the AI to use a specific font, using its postscript name.

#### Plugin won't install or connect

*   Make sure the app is running before you try to load the plugin.
*   In the UXP developer tool click the debug button next to load, and see if there are any errors.
*   Make sure the node / proxy server is running. If you plugin connects you should see output similar to:

```
adb-mcp Command proxy server running on ws://localhost:3001
User connected: Ud6L4CjMWGAeofYAAAAB
Client Ud6L4CjMWGAeofYAAAAB registered for application: photoshop
```

*   When you press the connect button, if it still says "Connect" it means there was either an error, or it can't connect to the proxy server. You can view the error in the UXP Developer App, by opening the Developer Workspace and click "Debug".

#### Errors within AI client

* If something fails on the AI side, it will usually tell you the issue. If you click the command / code box, you can see the error.
* The first thing to check if there is an issue is to make sure the plugin in Photoshop / Premiere is connected, and that the node proxy server is running.
* If response times get really slow, check if the AI servers are under load, and that you do not have too much text in the current conversation (restarting a new chat can sometimes help speed up, but you will lose the context).

If you continue to have issues post an [issue](https://github.com/mikechambers/adb-mcp/issuesrd.gg/fgxw9t37D7). Include as much information as you can (OS, App, App version, and debug info or errors).

## Development

Adding new functionality is relatively easy, and requires:

1. Adding the API and parameters in the *mcp/ps-mcp.py* / *mcp/pr-mcp.py* file (which is used by the AI)
2. Implementing the API in the *uxp/ps/commands/index.js* / *uxp/pr/commands/index.js* file.

This [thread](https://github.com/mikechambers/adb-mcp/issues/10#issuecomment-3191698528) has some info on how to add functionality.

## Questions, Feature Requests, Feedback

If you have any questions, feature requests, need help, or just want to chat, join the [discord](https://discord.gg/fgxw9t37D7).

You can also log bugs and feature requests on the [issues page](https://github.com/mikechambers/adb-mcp/issues).

## License

Project released under a [MIT License](LICENSE.md).

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE.md)



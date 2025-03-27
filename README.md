# adb-mcp

adb-mcp is a proof of concept project to create an Adobe Photoshop AI Agent by providing an interface to LLMs via the MCP protocol.

The project is not endorsed by nor supported by Adobe.

It has been tested with Claude desktop (Mac and Windows) from Anthropic, and allows Claude to control Adobe Photoshop. Theoretically, it should work with any AI App / LLM that supports the MCP protocol.

Example use cases include:

* Giving Claude step by step instruction on what to do in Photoshop, providing a conversational based interface (particularly useful if you new to Photoshop or lazy)
* Giving Claude a task (create an instagram post that looks like a Polariod image, create a double exposure) and letting it create it from start to finish
* Asking Claude to generate custom Photoshop tutorials for you, by creating an example file, then step by step instructions on how to recreate
* As a Photoshop utility tool (have Claude rename all of your into a consitent format)

Currently, the AI agent can get some information back from Photoshop which enables it to check its work. However, it cannot get automatically see its work (i.e. get images from Photoshop). This should be possible, but is not yet implimented. In the meantime, you can copy and past from Photoshop into Claude desktop.

## How it works

The proof of concept works by providing:
* A MCP Server that provides an itnerface to functionality within Adobe Photoshop to the AI / LLM
* A Node based command proxy server to sit between the MCP server and Photosohp plugin
* A Photoshop plugin that listens for commands, and drives Photoshop

**AI** <-> **MCP Server** <-> **Command Proxy Server** <-> **Photoshop UXP Plugin** <-> **Photoshop**

The proxy server is required because the UXP Based JavaScript plugin cannot open a socket connection (as a server) for the MCP Server to connect to (it can only connect to a socket as a client).

## Requirements

In order to run this, the following is required:

*   AI LLM with support for MCP Protocol (tested with Claude desktop on Mac & Windows)
*   Python 3, which is used to run the MCP server provided with this project
*   NodeJS, used to provide a proxy between the MCP server and Photoshop
*   Adobe UXP Developer tool (avaliable via Creative Cloud) used to install and debug the Photoshop plugin used to connect to the proxy
*   Adobe Photoshop (26.4) with the MCP Plugin installed.

This has been tested with Claude Desktop on Mac and Windows


## Installation

This project has been developed and tested with Claude Desktop, and assumes that is what is being used. It should be possible to use other AI apps that support MCP.

### Claude Desktop

Download and install [Claude Desktop](https://Claudee.ai/download). Once you have done this, launch to make sure everything works.

By default, Claude provides a number of free messages a day, which will work with this project.

### MCP Server

Make sure you have Python3 installed and configured on your system, and in your system PATH. This assumes you are using [uv](https://github.com/astral-sh/uv) and have it setup and configured on your system.

Change to the directory and start the dev server

```
$cd psmcp
$uv run mcp dev psmcp.py
```

You can now load the dev interface at http://localhost:5173, click "connect", and then under "Resources" click "config://get_instructions". This should list out a bunch of JSON info. If it does, everything is working and configured.

Now we can install and configure for Claude Desktop.

Now we can install and configure for Claude Desktop.

```
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client psmcp.py
```

If you have Claude desktop running, close it (make sure its not running in the background) and restart it. If it starts without any errors, you are good to go.

At this point, you still need to install a few more things.


### Command Proxy Node Sever

Make sure you have [NodeJS](https://nodejs.org/en) installed and configured in your system PATH.

Swith to adb-proxy-socket directory.

```
$cd adb-proxy-socket
```

Install the requirements, and then start the server

```
$npm install
$node proxy.js
```

You should see a message similar to *WebSocket server running on ws://localhost:3001*.

### Photoshop Plugin

Enabled developer mode in Photoshop
1. Launch Photoshop (26.0 or greater)
2. Settings > Plugins and check "Enable Developer Mode"
3. Restart Photoshop

From Creative Cloud Desktop, install and launch "UXP Developer Tools". When prompted, enabled developer mode.

Install the plugin:

1. Select File > Add Plugin
2. Navigate to the psuxp directory, and select the manifest.json file.
3. Once the plugin is listed, then click the "Load" button.

This should load the plugin in Photoshop. If you dont see it, you can open it via the plugins menu in Photoshop.



## Using the plugin







### AI Client

The project requires an AI client that support the MCP protocol.

#### Claude



## Running

```
uv run mcp
mcp dev .\psmcp.py
```

Windows need to run server as admin

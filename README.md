# adb-mcp

adb-mcp is a proof of concept project to create an Adobe Photoshop AI Agent by providing an interface to LLMs via the MCP protocol.

The project is not endorsed by nor supported by Adobe.

It has been tested with Claud desktop (Mac and Windows) from Anthropic, and allows Claud to control Adobe Photoshop. Theoretically, it should work with any AI App / LLM that supports the MCP protocol.

Example use cases include:

* Giving Claud step by step instruction on what to do in Photoshop, providing a conversational based interface (particularly useful if you new to Photoshop or lazy)
* Giving Claud a task (create an instagram post that looks like a Polariod image, create a double exposure) and letting it create it from start to finish
* Asking Claud to generate custom Photoshop tutorials for you, by creating an example file, then step by step instructions on how to recreate
* As a Photoshop utility tool (have claud rename all of your into a consitent format)

Currently, the AI agent can get some information back from Photoshop which enables it to check its work. However, it cannot get automatically see its work (i.e. get images from Photoshop). This should be possible, but is not yet implimented. In the meantime, you can copy and past from Photoshop into Claud desktop.

## How it works

AI <-> MCP Server (Python) <-> Command Proxy Server (Node) <-> Photoshop UXP Plugin <-> Photoshop

## Requirements

In order to run this, the following is required:

*   AI LLM with support for MCP Protocol (tested with Claud desktop on Mac & Windows)
*   Python 3, which is used to run the MCP server provided with this project
*   NodeJS, used to provide a proxy between the MCP server and Photoshop
*   Adobe UXP Developer tool (avaliable via Creative Cloud) used to install and debug the Photoshop plugin used to connect to the proxy
*   Adobe Photoshop (26.4) with the MCP Plugin installed.

This has been tested with Claud Desktop on Mac and Windows


## Installation

### MCP Server

Make sure you have Python3 installed and configured on your system, and in your system PATH.


Install [FastMCP](https://github.com/modelcontextprotocol/python-sdk)

This assumes you are using [uv](https://pypi.org/project/uv/)

```
$cd psmcp
$uv venv
$source .venv/bin/activate
$uv add "mcp[cli]"
$uv pip install -r requirements.txt
```

You can now run the dev server to make sure everything is working:

```
$mcp dev psmcp.py
```

You can now load the dev interface at http://localhost:5173, click "connect", and then under "Resources" click "config://get_instructions". This should list out a bunch of JSON info. If it does, everything is working and configured.

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





### AI Client

The project requires an AI client that support the MCP protocol.

#### Claud



## Running

```
uv run mcp
mcp dev .\psmcp.py
```

Windows need to run server as admin

# adb-mcp

adb-mcp is a proof of concept project to create AI Agent for Adobe tools (Adobe Photoshop and Adobe Premiere) by providing an interface to LLMs via the MCP protocol.

The project is not endorsed by nor supported by Adobe.

It has been tested with Claude desktop (Mac and Windows) from Anthropic, and allows Claude to control Adobe Photoshop and Adobe Premiere. Theoretically, it should work with any AI App / LLM that supports the MCP protocol, and is built in a way to support multiple Adobe applications.

Example use cases include:

-   Giving Claude step by step instruction on what to do in Photoshop, providing a conversational based interface (particularly useful if you are new to Photoshop).
-   Giving Claude a task (create an instagram post that looks like a Polariod image, create a double exposure) and letting it create it from start to finish to use as a template.
-   Asking Claude to generate custom Photoshop tutorials for you, by creating an example file, then step by step instructions on how to recreate.
-   As a Photoshop utility tool (have Claude rename all of your layers into a consistent format)
-   Have Claude create new Premiere projects pre-populations with clips, transitions, effects and Audio

[View Video Examples](https://www.youtube.com/playlist?list=PLrZcuHfRluqt5JQiKzMWefUb0Xumb7MkI)

Currently for Photoshop the AI agent can get some information back from Photoshop which enables it to check its work. However, it cannot automatically see its work (i.e. get images from Photoshop). This should be possible, but is not yet implemented. In the meantime, you can copy and paste from Photoshop into Claude desktop.

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

-   AI LLM with support for MCP Protocol (tested with Claude desktop on Mac & Windows)
-   Python 3, which is used to run the MCP server provided with this project
-   NodeJS, used to provide a proxy between the MCP server and Photoshop
-   Adobe UXP Developer tool (available via Creative Cloud) used to install and debug the Photoshop / Premiere plugin used to connect to the proxy
-   Adobe Photoshop (26.0 or greater) with the MCP Plugin installed or Adobe Premiere Beta (25.3 Build 46 or greater)


## Installation

This project has been developed and tested with Claude Desktop, and assumes that is what is being used. It should be possible to use other AI apps that support MCP.

### Download adp-mcp

Download the adp-mcp project, and unzip into the location you want to save it.

### Claude Desktop

Download and install [Claude Desktop](https://claude.ai/download). Once you have done this, launch to make sure everything works.

### MCP Server

Make sure you have Python3 installed and configured on your system (in your system PATH). This assumes you are using [uv](https://github.com/astral-sh/uv) for package management and have it setup and configured on your system.

Change to the mcp directory and start the dev server:

#### Photoshop

```
$cd mcp
$uv run mcp dev ps-mcp.py
```

#### Premiere

```
$cd mcp
$uv run mcp dev pr-mcp.py
```

You can now load the dev interface at http://localhost:5173, click _"connect"_, and then under _"Resources"_ click _"config://get_instructions"_. This should list out a bunch of JSON info. If it does, everything is working and configured.

Now we can install into Claude Desktop.


#### Photoshop

```
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client --with numpy ps-mcp.py
```

#### Premiere
```
uv run mcp install --with fonttools --with python-socketio --with mcp --with requests --with websocket-client pr-mcp.py
```

If you have Claude desktop running, close it (make sure its not running in the background) and restart it. If it starts without any errors, you are good to go.

At this point, you still need to install a few more things.

### Command Proxy Node Sever

Make sure you have [NodeJS](https://nodejs.org/en) installed and configured in your system PATH.

Switch to _adb-proxy-socket directory_. Install the requirements, and then start the server:

```
$cd adb-proxy-socket
$npm install
$node proxy.js
```

You should see a message similar to _Photoshop MCP Command proxy server running on ws://localhost:3001_.

This proxy must be running in order for Claude to communicate with the plugin.

### Adobe App Plugins

#### Photoshop
Enable developer mode in Photoshop

1. Launch Photoshop (26.0 or greater)
2. _Settings > Plugins_ and check _"Enable Developer Mode"_
3. Restart Photoshop

From Creative Cloud Desktop, install and launch "UXP Developer Tools". When prompted, enable developer mode.

Install the plugin:

1. Select File > Add Plugin
2. Navigate to the _uxp/ps_ directory, and select the _manifest.json file_.
3. Once the plugin is listed, then click the "Load" button.

This should load the plugin in Photoshop. If you dont see it, you can open it via the plugins menu in Photoshop.

#### Premiere

1. Launch Premiere Pro Beta (25.3)

From Creative Cloud Desktop, install and launch "UXP Developer Tools". When prompted, enable developer mode.

Install the plugin:

1. Select File > Add Plugin
2. Navigate to the _uxp/pr_ directory, and select the _manifest.json file_.
3. Once the plugin is listed, then click the "Load" button.

This should load the plugin in Premiere. If you dont see it, you can open it via the plugins menu in Premiere.

## Using Claude with Adobe Apps

Launch the following:

1. Claude Desktop
2. adb-proxy-socket node server
3. Launch Photoshop and / or Premiere

### Photoshop
4. Launch UXP Developer Tool and click the Load button for _Photoshop MCP Agent_
5. In Photoshop, if the MCP Agent panel is not open, open _Plugins > Photoshop MCP Agent > Photoshop MCP Agent_
6. Click connect in the agent panel in Photoshop

Now you can switch over the Claude desktop. Before you start a session, you should load the instructions resource which will provide guidance and info the Claude by clicking the socket icon (Attach from MCP) and then _Choose an Integration_ > _Adobe Photoshop_ > _config://get_instructions_.

### Premiere
4. Launch UXP Developer Tool and click the Load button for _Premiere MCP Agent_
5. In Premiere, if the MCP Agent panel is not open, open _Window > UXP Plugins > Premiere MCP Agent > Premiere MCP Agent_
6. Click connect in the agent panel in Photoshop

Now you can switch over the Claude desktop. Before you start a session, you should load the instructions resource which will provide guidance and info the Claude by clicking the socket icon (Attach from MCP) and then _Choose an Integration_ > _Adobe Premiere > _config://get_instructions_.


Note, you must reload the plugin via the UCP Developer app every time you restart Photoshop and Premiere.

### Setting up session

In the chat input field, click the "Attach from MCP" button (looks like two sockets). From there click "Choose and integration" and then under "Adobe Photoshop" or "Adobe Premiere"  select *config://get_instructions*. This will load the instructions into the prompt. Submit that to Claude and once it processes it, you are ready to go.

<img src="images/claud-attach-mcp.png" width="600">


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
* When prompting, ask the AI to think about and check its work.
* The more you guide it (i.e. "consider using clipping masks") the better the results
* The more advanced the model, or the more resources given to the model the better and more creative the AI is.
* As a general rule, don't make changes in the Adobe Apps while the AI is doing work. If you do make changes, make sure to tell the AI about it.
* The AI will learn from its mistakes, but will lose its memory once you start a new chat. You can guide it to do things in a different way, and then ask it to start over and it should follow the new approach.

The AI currently has access to a subset of Photoshop / Premiere functionality. In general, the approach has been to provide lower level tools to give the AI the basics to do more complex stuff.

The Photoshop plugin has more functionality that Premiere.

By default, the AI cannot access files directly, although if you install the [Claude File System MCP server](https://www.claudemcp.com/servers/filesystem) it can access, and load files into Photoshop / Premiere (open files and embed images).

#### Photoshop

* You can copy and paste images from Photoshop into the AI to give it more information on what is going on.
* The AI currently has issue sizing and positioning text correctly, so giving it guidelines on font sizes to use will help, as well as telling it to align the text relative to the canvas.
* The AI has access to all of the Postscript fonts on the system. If you want to specify a font, you must use its Postscript name (you may be able to ask the AI for it).
* You can ask the AI for suggestions. It comes up with really useful ideas / feedback sometimes.

#### Premiere

* Currently the plugin assumes you are just working with a single sequence.



### Troubleshooting

#### MCP won't run in Claude

If you get an error when running Claude that the MCP is not working, you may need to edit your Claud config file and put an abslute path for the UV command. More info [here](https://github.com/mikechambers/adb-mcp/issues/5#issuecomment-2829817624).

#### Plugin won't install or connect

*   Make sure the app is running before you try to load the plugin.
*   In the UXP developer tool click the debug button next to load, and see if there are any errors.
*   Make sure the node / proxy server is running. If you plugin connects you should see output similar to:

```
adb-mcp Command proxy server running on ws://localhost:3001
User connected: Ud6L4CjMWGAeofYAAAAB
Client Ud6L4CjMWGAeofYAAAAB registered for application: photoshop
```

*   When you press the connect button, if it still say connect it means there was either an error, or it can't connect to the proxy server.

#### Errors within AI client

* If something fails on the AI side, it will usually tell you the issue. If you click the command / code box, you can see the error.
* The first thing to check if there is an issue is to make sure the plugin in Photoshop / Premiere is connected, and that the node proxy server is running.
* If response times get really slow, check if the AI servers are under load, and that you do not have too much text in the current conversation (restarting a new chat can sometimes help speed up, but you will lose the context).

If you continue to have issues post an [Issue]() on on [Discord](https://discord.gg/fgxw9t37D7). Include as much information as you can (OS, App, App version, and debug info or errors).

## Development

Adding new functionality is relatively easy, and requires:

1. Adding the API and parameters in the *mcp/ps-mcp.py* / *mcp/pr-mcp.py* file (which is used by the AI)
2. Implementing the API in the *uxp/ps/commands/index.js* / *uxp/pr/commands/index.js* file.

TO BE COMPLETED

## Questions, Feature Requests, Feedback

If you have any questions, feature requests, need help, or just want to chat, join the [discord](https://discord.gg/fgxw9t37D7).

You can also log bugs and feature requests on the [issues page](https://github.com/mikechambers/adb-mcp/issues).

## License

Project released under a [MIT License](LICENSE.md).

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE.md)



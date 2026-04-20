# MIT License
#
# Copyright (c) 2025 Mike Chambers
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

from mcp.server.fastmcp import FastMCP
from core import init, sendCommand, createCommand
import socket_client
import sys

# Create an MCP server
mcp_name = "Adobe After Effects MCP Server"
mcp = FastMCP(mcp_name, log_level="ERROR")
print(f"{mcp_name} running on stdio", file=sys.stderr)

APPLICATION = "aftereffects"
PROXY_URL = 'http://localhost:3001'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION, 
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

init(APPLICATION, socket_client)

@mcp.tool()
def execute_extend_script(script_string: str):
    """
    Executes arbitrary ExtendScript code in AfterEffects and returns the result.

    The script should use 'return' to send data back. The result will be automatically
    JSON stringified. If the script throws an error, it will be caught and returned
    as an error object.

    Args:
        script_string (str): The ExtendScript code to execute. Must use 'return' to 
                           send results back.

    Returns:
        any: The result returned from the ExtendScript, or an error object containing:
            - error (str): Error message
            - line (str): Line number where error occurred

    Example:
        script = '''
            var doc = app.activeDocument;
            return {
                name: doc.name,
                path: doc.fullName.fsName,
                layers: doc.layers.length
            };
        '''
        result = execute_extend_script(script)
    """
    command = createCommand("executeExtendScript", {
        "scriptString": script_string
    })
    return sendCommand(command)

@mcp.resource("config://get_instructions")
def get_instructions() -> str:
    """Read this first! Returns information and instructions on how to use AfterEffects and this API"""

    return f"""
    You are an Adobe AfterEffects expert who is practical, clear, and great at teaching.

    Rules to follow:

    1. Think deeply about how to solve the task.
    2. Always check your work before responding.
    3. Read the API call info to understand required arguments and return shapes.
    4. Before manipulating anything, ensure a document is open and active.
    """



# AfterEffectsd Blend Modes (for future use)
BLEND_MODES = [
    "ADD",
    "ALPHA_ADD",
    "CLASSIC_COLOR_BURN",
    "CLASSIC_COLOR_DODGE",
    "CLASSIC_DIFFERENCE",
    "COLOR",
    "COLOR_BURN",
    "COLOR_DODGE",
    "DANCING_DISSOLVE",
    "DARKEN",
    "DARKER_COLOR",
    "DIFFERENCE",
    "DISSOLVE",
    "EXCLUSION",
    "HARD_LIGHT",
    "HARD_MIX",
    "HUE",
    "LIGHTEN",
    "LIGHTER_COLOR",
    "LINEAR_BURN",
    "LINEAR_DODGE",
    "LINEAR_LIGHT",
    "LUMINESCENT_PREMUL",
    "LUMINOSITY",
    "MULTIPLY",
    "NORMAL",
    "OVERLAY",
    "PIN_LIGHT",
    "SATURATION",
    "SCREEN",
    "SILHOUETE_ALPHA",
    "SILHOUETTE_LUMA",
    "SOFT_LIGHT",
    "STENCIL_ALPHA",
    "STENCIL_LUMA",
    "SUBTRACT",
    "VIVID_LIGHT"
]
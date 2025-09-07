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

# Standard library imports
import sys

# Third-party imports
from mcp.server.fastmcp import FastMCP

# Local imports
import socket_client
from core import init, sendCommand, createCommand


#logger.log(f"Python path: {sys.executable}")
#logger.log(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")
#logger.log(f"Current working directory: {os.getcwd()}")
#logger.log(f"Sys.path: {sys.path}")


# Create an MCP server
mcp_name = "Adobe InDesign MCP Server"
mcp = FastMCP(mcp_name, log_level="ERROR")
print(f"{mcp_name} running on stdio", file=sys.stderr)

APPLICATION = "indesign"
PROXY_URL = 'http://localhost:3001'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION, 
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

init(APPLICATION, socket_client)

@mcp.tool()
def create_document(
   width: int, 
   height: int, 
   pages: int = 0,
   pages_facing: bool = False,
   columns: dict = {"count": 1, "gutter": 12},
   margins: dict = {"top": 36, "bottom": 36, "left": 36, "right": 36}
):
   """
   Creates a new InDesign document with specified dimensions and layout settings.
   
   Args:
       width (int): Document width in points (1 point = 1/72 inch)
       height (int): Document height in points
       pages (int, optional): Number of pages in the document. Defaults to 0.
       pages_facing (bool, optional): Whether to create facing pages (spread layout). 
           Defaults to False.
       columns (dict, optional): Column layout configuration with keys:
           - count (int): Number of columns per page
           - gutter (int): Space between columns in points
           Defaults to {"count": 1, "gutter": 12}.
       margins (dict, optional): Page margin settings in points with keys:
           - top (int): Top margin
           - bottom (int): Bottom margin  
           - left (int): Left margin
           - right (int): Right margin
           Defaults to {"top": 36, "bottom": 36, "left": 36, "right": 36}.
   
   Returns:
       dict: Result of the command execution from the InDesign UXP plugin
   """
   command = createCommand("createDocument", {
       "intent": "WEB_INTENT",
       "pageWidth": width,
       "pageHeight": height,
       "margins": margins,
       "columns": columns,
       "pagesPerDocument": pages,
       "pagesFacing": pages_facing
   })
   
   return sendCommand(command)

@mcp.resource("config://get_instructions")
def get_instructions() -> str:
    """Read this first! Returns information and instructions on how to use Photoshop and this API"""

    return f"""
    You are an InDesign and design expert who is creative and loves to help other people learn to use InDesign and create.

    Rules to follow:

    1. Think deeply about how to solve the task
    2. Always check your work
    3. Read the info for the API calls to make sure you understand the requirements and arguments
    """


"""
BLEND_MODES = [
    "COLOR",
    "COLORBURN",
    "COLORDODGE",
    "DARKEN",
    "DARKERCOLOR",
    "DIFFERENCE",
    "DISSOLVE",
    "EXCLUSION",
    "HARDLIGHT",
    "HARDMIX",
    "HUE",
    "LIGHTEN",
    "LIGHTERCOLOR",
    "LINEARBURN",
    "LINEARDODGE",
    "LINEARLIGHT",
    "LUMINOSITY",
    "MULTIPLY",
    "NORMAL",
    "OVERLAY",
    "PINLIGHT",
    "SATURATION",
    "SCREEN",
    "SOFTLIGHT",
    "VIVIDLIGHT",
    "SUBTRACT",
    "DIVIDE"
]
"""
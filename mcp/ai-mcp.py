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
mcp_name = "Adobe Illustrator MCP Server"
mcp = FastMCP(mcp_name, log_level="ERROR")
print(f"{mcp_name} running on stdio", file=sys.stderr)

APPLICATION = "illustrator"
PROXY_URL = 'http://localhost:3001'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION, 
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

init(APPLICATION, socket_client)

@mcp.tool()
def get_documents():
    """
    Returns information about all currently open documents in Illustrator.

    """
    command = createCommand("getDocuments", {})
    return sendCommand(command)

@mcp.tool()
def get_active_document_info():
    """
    Returns information about the current active document.

    """
    command = createCommand("getActiveDocumentInfo", {})
    return sendCommand(command)

@mcp.tool()
def open_file(
    path: str
):
    """
    Opens an Illustrator (.ai) file in Adobe Illustrator.
    
    Args:
        path (str): The absolute file path to the Illustrator file to open.
            Example: "/Users/username/Documents/my_artwork.ai"
    
    Returns:
        dict: Result containing:
            - success (bool): Whether the file was opened successfully
            - error (str): Error message if opening failed
    
    """
    
    command_params = {
        "path": path
    }
    
    command = createCommand("openFile", command_params)
    return sendCommand(command)

@mcp.tool()
def export_png(
    path: str,
    transparency: bool = True,
    anti_aliasing: bool = True,
    artboard_clipping: bool = True,
    horizontal_scale: int = 100,
    vertical_scale: int = 100,
    export_type: str = "PNG24",
    matte: bool = None,
    matte_color: dict = {"red": 255, "green": 255, "blue": 255}
):
    """
    Exports the active Illustrator document as a PNG file.
    
    Args:
        path (str): The absolute file path where the PNG will be saved.
            Example: "/Users/username/Documents/my_export.png"
        transparency (bool, optional): Enable/disable transparency. Defaults to True.
        anti_aliasing (bool, optional): Enable/disable anti-aliasing for smooth edges. Defaults to True.
        artboard_clipping (bool, optional): Clip export to artboard bounds. Defaults to True.
        horizontal_scale (int, optional): Horizontal scale percentage (1-1000). Defaults to 100.
        vertical_scale (int, optional): Vertical scale percentage (1-1000). Defaults to 100.
        export_type (str, optional): PNG format type. "PNG24" (24-bit) or "PNG8" (8-bit). Defaults to "PNG24".
        matte (bool, optional): Enable matte background color for transparency preview. 
            If None, uses Illustrator's default behavior.
        matte_color (dict, optional): RGB color for matte background. Defaults to {"red": 255, "green": 255, "blue": 255}.
            Dict with keys "red", "green", "blue" with values 0-255.
    
    Returns:
        dict: Export result containing:
            - success (bool): Whether the export succeeded
            - filePath (str): The actual file path where the PNG was saved
            - fileExists (bool): Whether the exported file exists
            - options (dict): The export options that were used
            - documentName (str): Name of the exported document
            - error (str): Error message if export failed
    
    Example:
        # Basic PNG export
        result = export_png("/Users/username/Desktop/my_artwork.png")
        
        # High-resolution export with transparency
        result = export_png(
            path="/Users/username/Desktop/high_res.png",
            horizontal_scale=300,
            vertical_scale=300,
            transparency=True
        )
        
        # PNG8 export with red matte background
        result = export_png(
            path="/Users/username/Desktop/small_file.png",
            export_type="PNG8",
            matte=True,
            matte_color={"red": 255, "green": 0, "blue": 0}
        )
        
        # Blue matte background
        result = export_png(
            path="/Users/username/Desktop/blue_bg.png",
            matte=True,
            matte_color={"red": 0, "green": 100, "blue": 255}
        )
    """


    # Only include matte and matteColor if needed
    command_params = {
        "path": path,
        "transparency": transparency,
        "antiAliasing": anti_aliasing,
        "artBoardClipping": artboard_clipping,
        "horizontalScale": horizontal_scale,
        "verticalScale": vertical_scale,
        "exportType": export_type
    }

    # Only include matte if explicitly set
    if matte is not None:
        command_params["matte"] = matte
        
    # Include matte color if matte is enabled or custom colors provided
    if matte or matte_color != {"red": 255, "green": 255, "blue": 255}:
        command_params["matteColor"] = matte_color

    command = createCommand("exportPNG", command_params)
    return sendCommand(command)



@mcp.tool()
def execute_extend_script(script_string: str):
    """
    Executes arbitrary ExtendScript code in Illustrator and returns the result.
    
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
            var comp = app.project.activeItem;
            return {
                name: comp.name,
                layers: comp.numLayers
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
    """Read this first! Returns information and instructions on how to use Illustrator and this API"""

    return f"""
    You are an Illustrator export who is creative and loves to help other people learn to use Illustrator.

    Rules to follow:

    1. Think deeply about how to solve the task
    2. Always check your work before responding
    3. Read the info for the API calls to make sure you understand the requirements and arguments

    """


# Illustrator Blend Modes (for future use)
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
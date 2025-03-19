# server.py
from mcp.server.fastmcp import FastMCP
import requests
import json
from Cocoa import NSFontManager, NSFont

# Create an MCP server
mcp = FastMCP("Adobe Photoshop", log_level="ERROR")

APPLICATION = "photoshop"



# Add an addition tool
#@mcp.tool()
#def add(a: int, b: int) -> int:
#    """Add two numbers"""
#    return a + b


#todo: how can we let AI know what options are? say for mode?
@mcp.tool()
def create_document(name: str, width: int, height:int, resolution:int, fill_color:dict = {"red":0, "green":0, "blue":0}, colorMode:str = "RGB"):
    """Creates a new Photoshop Document"""
    
    command = createCommand("createDocument", {
        "name":name,
        "width":width,
        "height":height,
        "resolution":resolution,
        "fillColor":fill_color,
        "colorMode":colorMode
    })

    sendCommand(command)

@mcp.tool()
def create_pixel_layer(
    layer_name:str,
    fillNeutral:bool,
    opacity:int = 100,
    blend_mode:str = "NORMAL",
):
    """Creates a new pixel layer within the current open Photoshop Document"""
    

    command = createCommand("createPixelLayer", {
        "name":layer_name,
        "opacity":opacity,
        "fillNeutral":fillNeutral,
        "blendMode":blend_mode
    })

    sendCommand(command)

@mcp.tool()
def create_text_layer(
    layer_name:str, 
    text:str, 
    font_size:int, 
    postscript_font_name:str, 
    opacity:int = 100,
    blend_mode:str = "NORMAL",
    text_color:dict = {"red":255, "green":255, "blue":255}, 
    position:dict = {"x": 100, "y":100}
    ):
    """Creates a new text layer within the current open Photoshop Document"""
    

    command = createCommand("createTextLayer", {
        "name":layer_name,
        "contents":text,
        "fontSize": font_size,
        "opacity":opacity,
        "position":position,
        "fontName":postscript_font_name,
        "textColor":text_color,
        "blendMode":blend_mode
    })

    sendCommand(command)

@mcp.tool()
def apply_gausian_blur(layer_name: str, radius: float = 2.5):
    """Applies a Gausian Blur to the specified layer"""
    #0.1 to 255

    command = createCommand("applyGaussianBlur", {
        "layerName":layer_name,
        "radius":radius,
    })

    sendCommand(command)



# Add a dynamic greeting resource
# Does not work in claud / or in test
#@mcp.resource("greeting://{name}")
#def get_greeting(name: str) -> str:
#    """Get a personalized greeting"""
#    return f"Hello, {name}!"

@mcp.resource("config://get_blend_modes")
def get_blend_modes() -> list[str]:
    """Returns font names available to use"""
    return blend_modes

@mcp.resource("config://get_fonts")
def get_fonts() -> list[str]:
    """Returns font names available to use"""
    return fonts

def sendCommand(command:dict):
    url = "http://127.0.0.1:3030/commands/add/"

    data = json.dumps(command)

    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.post(url, data=data, headers=headers)

    print(f"Status Code: {response.status_code}")
    print("Response Content:")
    print(response.json())

def createCommand(action:str, options:dict) -> str:
    command = {
        "application":APPLICATION,
        "action":action,
        "options":options
    }

    return command


def list_all_fonts_postscript():
    manager = NSFontManager.sharedFontManager()
    # This returns a list of all known face names (e.g., 'Arial-BoldMT', 'Helvetica', etc.)
    face_names = manager.availableFonts()

    ps_names = set()
    for face_name in face_names:
        # Create an NSFont for each face name
        font = NSFont.fontWithName_size_(face_name, 12)
        if font:
            # Get its NSFontDescriptor
            descriptor = font.fontDescriptor()
            # The PostScript name is stored under the "NSFontNameAttribute" key
            ps_name = descriptor.objectForKey_("NSFontNameAttribute")
            if ps_name:
                ps_names.add(ps_name)

    return sorted(ps_names)


fonts = list_all_fonts_postscript()

blend_modes = [
    "COLOR",
    "COLORBURN",
    "COLORDODGE",
    "DARKEN",
    "DARKERCOLOR",
    "DIFFERENCE",
    "DISSOLVE",
    "DIVIDE",
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
    "PASSTHROUGH",
    "PINLIGHT",
    "SATURATION",
    "SCREEN",
    "SOFTLIGHT",
    "SUBTRACT",
    "VIVIDLIGHT"
]

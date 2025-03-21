# server.py
from mcp.server.fastmcp import FastMCP
import requests
import json
import time
from Cocoa import NSFontManager, NSFont

# Create an MCP server
mcp = FastMCP("Adobe Photoshop", log_level="ERROR")

APPLICATION = "photoshop"


#ripple, sphere, twirl, wave, zigzag
#rotate, scale, skew
#select, fill
#more options for text (paragraph, alignment)
#add path
#select subject

@mcp.prompt()
def start_project(project_type: str, background_color:str) -> str:
    return f"Create a new Photoshop file for a {project_type} with a {background_color} background"

#todo: how can we let AI know what options are? say for mode?
@mcp.tool()
def create_document(name: str, width: int, height:int, resolution:int, fill_color:dict = {"red":0, "green":0, "blue":0}, colorMode:str = "RGB"):
    """Creates a new Photoshop Document

        Layer are created from bottom up based on the order they are created in, so create background elements first and then build on top.

        New document will contain a layer named "Background" that is filled with the specified fill color
    """
    
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
def generate_image(
    layer_name:str,
    prompt:str,
    opacity:int = 100,
    blend_mode:str = "NORMAL",
):
    """Uses Adobe Firefly Generative AI to generate an image on a new layer with the specified layer name
    """
    
    command = createCommand("generateImage", {
        "layerName":layer_name,
        "prompt":prompt,
        "opacity":opacity,
        "blendMode":blend_mode
    })

    sendCommand(command)

    #We cant know for sure when the image has been created in Photoshop
    #So we pause here so the images dont back up which can sometimes cause
    #errors
    time.sleep(5)

    return

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

    """
    Create a new text layer within the current Photoshop document.
    
    Parameters:
        layer_name (str): The name of the layer to be created. Will be used to select in other api calls.
        text (str): The text to include on the layer.
        font_size: Font size.
        postscript_font_name: Postscript Font Name to display the text in. List of available fonts can be retrieved from the get_fonts resource.
        opacity: Opacity for the layer specified in percent.
        blend_mode: Blend Mode for the layer. List of available modes can be retried from the get_blend_modes resource
        text_color: Color of the text expressed in Red, Green, Blue values between 0 and 255
        position: Position where the text will be placed in the layer. Based on bottom left point of the text.


    """

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
def fill_selection(
    layer_name: str,
    color:dict = {"red":255, "green":0, "blue":0},
    blend_mode:str = "NORMAL",
    opacity:int = 100,
    ):

    """Fills the selection on the specified pixel layer"""
    
    command = createCommand("fillSelection", {
        "layerName":layer_name,
        "color":color,
        "blendMode":blend_mode,
        "opacity":opacity
    })

    sendCommand(command)

@mcp.tool()
def delete_selection(
    layer_name: str
    ):

    """Removes the pixels within the selection on the specified pixel layer"""
    
    command = createCommand("deleteSelection", {
        "layerName":layer_name
    })

    sendCommand(command)


@mcp.tool()
def invert_selection():
    
    """Inverts the current selection in the Photoshop document"""

    command = createCommand("invertSelection", {})
    sendCommand(command)

@mcp.tool()
def select_rectangle(
    feather:int = 0,
    anti_alias:bool = True,
    bounds:dict = {"top": 0, "left": 0, "bottom": 100, "right": 100}
    ):
    
    """Creates a rectangular selection in the Photoshop document """

    command = createCommand("selectRectangle", {
        "feather":feather,
        "antiAlias":anti_alias,
        "bounds":bounds
    })

    sendCommand(command)

@mcp.tool()
def select_polygon(
    feather:int = 0,
    anti_alias:bool = True,
    points:list[dict[str, int]] = [{"x": 50, "y": 10}, {"x": 100, "y": 90}, {"x": 10, "y": 40}]
    ):
    
    """Creates an n-sided polygon selection in the Photoshop document """

    command = createCommand("selectPolygon", {
        "feather":feather,
        "antiAlias":anti_alias,
        "points":points
    })

    sendCommand(command)

@mcp.tool()
def select_ellipse(
    feather:int = 0,
    anti_alias:bool = True,
    bounds:dict = {"top": 0, "left": 0, "bottom": 100, "right": 100}
    ):
    
    """Creates an elliptical selection in the Photoshop document """

    command = createCommand("selectEllipse", {
        "feather":feather,
        "antiAlias":anti_alias,
        "bounds":bounds
    })

    sendCommand(command)

@mcp.tool()
def align_content(
    layer_name: str,
    alignment_mode:str
    ):
    
    """
    Aligns content on specified layer to current selection.
    """

    command = createCommand("alignContent", {
        "layerName":layer_name,
        "alignmentMode":alignment_mode
    })

    sendCommand(command)

@mcp.tool()
def add_drop_shadow_layer_effect(
    layer_name: str,
    blend_mode:str = "MULTIPLY",
    color:dict = {"red":0, "green":0, "blue":0},
    opacity:int = 35,
    angle:int = 160,
    distance:int = 3,
    spread:int = 0,
    size:int = 7
    ):
    """Adds a drop shadow layer effect to specified layer

    Valid values for opacity are 0 to 100
    Valid values for angle are -179 to -180
    Valid values for distance are 0 to 30000
    Valid values for spread are 0 to 100
    Valid values for size are 0 to 250
    """

    command = createCommand("addDropShadowLayerEffect", {
        "layerName":layer_name,
        "blendMode":blend_mode,
        "color":color,
        "opacity":opacity,
        "angle":angle,
        "distance":distance,
        "spread":spread,
        "size":size
    })

    sendCommand(command)


@mcp.tool()
def flatten_all_layers(layer_name:str):
    """
    Flatter all layers in the document into a single layer with specified name
    """

    command = createCommand("flattenAllLayers", {
        "layerName":layer_name,
    })

    sendCommand(command)

@mcp.tool()
def add_brightness_contrast_adjustment_layer(
    layer_name: str,
    brightness:int = 0,
    contrast:int = 0):
    """Adds an adjustment layer to specified layer to adjust brightness and contrast

    Valid values for brightness are from -150 to 150
    Valid values for contrast are -50 to 100
    """
    #0.1 to 255

    command = createCommand("addBrightnessContrastAdjustmentLayer", {
        "layerName":layer_name,
        "brightness":brightness,
        "contrast":contrast
    })

    sendCommand(command)

@mcp.tool()
def add_vibrance_adjustment_layer(
    layer_name: str,
    vibrance:int = 0,
    saturation:int = 0):
    """Adds an adjustment layer to specified layer to adjust vibrance and saturation

    Valid values are from -100 to 100
    """
    #0.1 to 255

    command = createCommand("addAdjustmentLayerVibrance", {
        "layerName":layer_name,
        "saturation":saturation,
        "vibrance":vibrance
    })

    sendCommand(command)

@mcp.tool()
def add_black_and_white_adjustment_layer(
    layer_name: str,
    colors:dict = {"blue":20, "cyan":60, "green":40, "magenta":80, "red":40, "yellow":60}):
    """Adds an adjustment layer to specified layer to change it to black and white

    Valid color values are from -200 to 300
    """
    #0.1 to 255

    command = createCommand("addAdjustmentLayerBlackAndWhite", {
        "layerName":layer_name,
        "colors":colors,
    })

    sendCommand(command)

@mcp.tool()
def apply_gaussian_blur(layer_name: str, radius: float = 2.5):
    """Applies a Gaussian Blur to the specified layer"""
    #0.1 to 255

    command = createCommand("applyGaussianBlur", {
        "layerName":layer_name,
        "radius":radius,
    })

    sendCommand(command)

@mcp.tool()
def apply_motion_blur(layer_name: str, angle: int = 0, distance: float = 30):
    """Applies a Motion Blur to the specified layer"""


    command = createCommand("applyMotionBlur", {
        "layerName":layer_name,
        "angle":angle,
        "distance":distance
    })

    sendCommand(command)


# Add a dynamic greeting resource
# Does not work in claud / or in test
#@mcp.resource("greeting://{name}")
#def get_greeting(name: str) -> str:
#    """Get a personalized greeting"""
#    return f"Hello, {name}!"

@mcp.resource("config://get_instructions")
def get_instructions() -> str:
    """Read this first! Returns information and instructions on how to use Photoshop and this API"""
    return """
    This API provides tools for creating and working with Photoshop files.

    In general, layers are created from bottom up, so keep that in mind as you figure out the order or operations. If you want you have lower layers show through higher ones you must either change the opacity of the higher layers and / or blend modes.

    When using fonts there are a couple of things to keep in mind. First, the font origin is the bottom left of the font, not the top right. You can better align the fonts using the align_content api. Second, don't use too large of a font size. Ultimately the size will depend in part of the document size, but for reference the word "cosmic" in Myriad Pro at 72 PT takes up about 1000 pixels width wise.

    You can get a list of valid alignment modes via get_alignment_modes, and a valid list of blend_modes via get_blend_modes, and a valid list of font names that can be used via get_fonts.

    Some calls such as fill_selection and align_content require that you first make a selection.
    """

@mcp.resource("config://get_blend_modes")
def get_blend_modes() -> list[str]:
    """Returns font names available to use"""
    return blend_modes

@mcp.resource("config://get_fonts")
def get_fonts() -> list[str]:
    """Returns font names available to use"""
    return fonts

@mcp.resource("config://get_alignment_modes")
def get_alignment_modes() -> list[str]:
    """Returns alignment modes available to use"""
    return alignment_modes


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

alignment_modes = [
    "LEFT",
    "CENTER_HORIZONTAL",
    "RIGHT",
    "TOP",
    "CENTER_VERTICAL",
    "BOTTOM"
]

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

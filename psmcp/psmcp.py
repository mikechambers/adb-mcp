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
import requests
import json
import time
import socket_client
import logger
import sys
import os


logger.log(f"Python path: {sys.executable}")
logger.log(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")
logger.log(f"Current working directory: {os.getcwd()}")
logger.log(f"Sys.path: {sys.path}")


# Create an MCP server
mcp = FastMCP("Adobe Photoshop", log_level="ERROR")

APPLICATION = "photoshop"
PROXY_URL = 'http://localhost:3001'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION, 
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

@mcp.tool()
def create__gradient_adjustment_layer(
    layer_name: str,
    angle: int,
    type:str,
    color_stops: list,
    opacity_stops: list):
    """
    Creates a gradient on the specified layer.

    The gradient is applied either within the active selection or across the entire layer if no selection exists.

    Color stops define specific points along the gradient where colors transition, with the first stop at location 0, the last at 100, and any additional stops in between determining how the gradient blends between colors.

    Opacity stops work the same way, specifying points along the gradient where transparency levels change, controlling how smoothly or sharply the opacity transitions from one stop to another.

    Args:
        layer_name (str): Name of the layer to apply the gradient to.
        angle (int): The angle (-180 to 180) at which the gradient is applied.
        type (str): The type of gradient. LINEAR or RADIAL.
        color_stops (list): A list of dictionaries defining color stops.
            Each dictionary contains:
                - location (int): Position of the color stop (0 to 100) along the gradient.
                - color (dict): RGB values defining the color at this stop.
                    - red (int): 0-255
                    - green (int): 0-255
                    - blue (int): 0-255
                - midpoint (int): Defines the bias of the transition between adjacent color stops (0-100, default is 50).
        opacity_stops (list): A list of dictionaries defining opacity stops.
            Each dictionary contains:
                - location (int): Position of the opacity stop (0 to 100) along the gradient.
                - opacity (int): Opacity level (0 = fully transparent, 100 = fully opaque).
                - midpoint (int): Defines the transition bias between opacity stops (0-100, default is 50).

    Example:
        color_stops = [
            {"location": 0, "color": {"red": 0, "green": 0, "blue": 0}, "midpoint": 50},
            {"location": 100, "color": {"red": 255, "green": 255, "blue": 255}, "midpoint": 50}
        ]

        opacity_stops = [
            {"location": 0, "opacity": 0, "midpoint": 50},
            {"location": 100, "opacity": 100, "midpoint": 50}
        ]
 
    Returns:
        dict: Response from the Photoshop operation
        
    Raises:
        RuntimeError: If the operation fails or times out
    """

    command = createCommand("createGradientAdjustmentLayer", {
        "layerName":layer_name,
        "angle":angle,
        "colorStops":color_stops,
        "type":type,
        "opacityStops":opacity_stops
    })

    return sendCommand(command)


@mcp.tool()
def create_document(document_name: str, width: int, height:int, resolution:int, fill_color:dict = {"red":0, "green":0, "blue":0}, color_mode:str = "RGB"):
    """Creates a new Photoshop Document

        Layer are created from bottom up based on the order they are created in, so create background elements first and then build on top.

        New document will contain a layer named "Background" that is filled with the specified fill color

        Args:
            document_name (str): Name for the new document being created
            width (int): Width in pixels of the new document
            height (int): Height in pixels of the new document
            resolution (int): Resolution (Pixels per Inch) of the new document
            fill_color (dict): dict defining the background color fill of the new document
            color_mode (str): Color mode for the new document
    """
    
    command = createCommand("createDocument", {
        "name":document_name,
        "width":width,
        "height":height,
        "resolution":resolution,
        "fillColor":fill_color,
        "colorMode":color_mode
    })

    return sendCommand(command)


@mcp.tool()
def get_layers() -> list:
    """Returns a nested list of dicts that contain layer info and the order they are arranged in.

    Args:
        None
        
    Returns:
        list: A nested list of dictionaries containing layer information and hierarchy.
            Each dict has at minimum a 'name' key with the layer name.
            If a layer has sublayers, they will be contained in a 'layers' key which contains another list of layer dicts.
            Example: [{'name': 'Group 1', 'layers': [{'name': 'Layer 1'}, {'name': 'Layer 2'}]}, {'name': 'Background'}]
            
    Raises:
        RuntimeError: If the operation fails or times out
    """

    command = createCommand("getLayers", {})

    return sendCommand(command)

"""
@mcp.tool()
def create_mask_from_selection(
    layer_name: str
):
    Creates a mask from the current selection on the layer with the specified name.

    Args:
        layer_name (str): Name of the layer on which the mask will be created and applied.
        
    Returns:
        dict: Response from the Photoshop operation
        
    Raises:
        RuntimeError: If the operation fails or times out

    
    command = createCommand("createMaskFromSelection", {
        "layerName":layer_name
    })

    return sendCommand(command)

"""

@mcp.tool()
def place_image(
    layer_name: str,
    image_path: str
):
    """Places the image at the specified path on the existing pixel layer with the specified name.

    The image will be placed on the center of the layer, and will fill the layer without changing its aspect ration (thus there may be bars at the top or bottom) 

    Args:
        layer_name (str): The name of the layer where the image will be placed.
        image_path (str): The file path to the image that will be placed on the layer.

    Raises:
        RuntimeError: If the operation fails or times out
    """
    
    command = createCommand("placeImage", {
        "layerName":layer_name,
        "imagePath":image_path
    })

    return sendCommand(command)

@mcp.tool()
def rename_layer(
    layer_name:str,
    new_layer_name:str

):
    """Renames the specified layer.

    Args:
        layer_name (str): Name of the layer to be renamed.
        new_layer_name (str): New name for the layer.

    Raises:
        RuntimeError: If the operation fails or times out
    """
    
    command = createCommand("renameLayer", {
        "layerName":layer_name,
        "newLayerName":new_layer_name

    })

    return sendCommand(command)


@mcp.tool()
def scale_layer(
    layer_name:str,
    width:int,
    height:int,
    anchor_position:str,
    interpolation_method:str = "AUTOMATIC"
):
    """Scales the layer with the specified name.

    Args:
        layer_name (str): Name of layer to be scaled.
        width (int): Percentage to scale horizontally.
        height (int): Percentage to scale vertically.
        anchor_position (str): The anchor position to rotate around,
        interpolation_method (str): Interpolation method to use when resampling the image
    """
    
    command = createCommand("scaleLayer", {
        "layerName":layer_name,
        "width":width,
        "height":height,
        "anchorPosition":anchor_position,
        "interpolationMethod":interpolation_method
    })

    return sendCommand(command)


@mcp.tool()
def rotate_layer(
    layer_name:str,
    angle:int,
    anchor_position:str,
    interpolation_method:str = "AUTOMATIC"
):
    """Rotates the layer with the specified name.

    Args:
        layer_name (str): Name of layer to be scaled.
        angle (int): Angle (-359 to 359) to rotate the layer by in degrees
        anchor_position (str): The anchor position to rotate around,
        interpolation_method (str): Interpolation method to use when resampling the image
    """
    
    command = createCommand("rotateLayer", {
        "layerName":layer_name,
        "angle":angle,
        "anchorPosition":anchor_position,
        "interpolationMethod":interpolation_method
    })

    return sendCommand(command)


@mcp.tool()
def flip_layer(
    layer_name:str,
    axis:str
):
    """Flips the layer with the specified name on the specified axis.

    Args:
        layer_name (str): Name of layer to be scaled.
        axis (str): The axis on which to flip the layer. Valid values are "horizontal", "vertical" or "both"
    """
    
    command = createCommand("flipLayer", {
        "layerName":layer_name,
        "axis":axis
    })

    return sendCommand(command)


@mcp.tool()
def delete_layer(
    layer_name:str
):
    """Deletes the layer with the specified name

    Args:
        layer_name (str): Name of the layer to be deleted
    """
    
    command = createCommand("deleteLayer", {
        "layerName":layer_name
    })

    return sendCommand(command)



@mcp.tool()
def set_layer_visibility(
    layer_name:str,
    visible:bool
):
    """Sets the visibility of the layer with the specified name

    Args:
        layer_name (str): Name of the layer to set visibility
        visible (bool): Whether the layer is visible
    """
    
    command = createCommand("setLayerVisibility", {
        "layerName":layer_name,
        "visible":visible
    })

    return sendCommand(command)


@mcp.tool()
def generate_image(
    layer_name:str,
    prompt:str
):
    """Uses Adobe Firefly Generative AI to generate an image on a new layer with the specified layer name

    Args:
        layer_name (str): Name for the layer that will contain the generated image
        prompt (str): Prompt describing the image to be generated
        opacity
    """
    
    command = createCommand("generateImage", {
        "layerName":layer_name,
        "prompt":prompt
    })

    return sendCommand(command)


@mcp.tool()
def move_layer(
    layer_name:str,
    position:str
):
    """Moves the layer within the layer stack based on the specified position

    Args:
        layer_name (str): Name for the layer that will be moved
        position (str): How the layer position within the layer stack will be updated. Value values are: TOP (Place above all layers), BOTTOM (Place below all layers), UP (Move up one layer), DOWN (Move down one layer)
    """

    command = createCommand("moveLayer", {
        "layerName":layer_name,
        "position":position
    })

    return sendCommand(command)

@mcp.tool()
def get_document_info():
    """Retrieves information about the currently active document.

    Returns:
        response : An object containing the following document properties:
            - height (int): The height of the document in pixels.
            - width (int): The width of the document in pixels.
            - colorMode (str): The document's color mode as a string.
            - pixelAspectRatio (float): The pixel aspect ratio of the document.
            - resolution (float): The document's resolution (DPI).
            - path (str): The file path of the document, if saved.
            - saved (bool): Whether the document has been saved (True if it has a valid file path).
            - hasUnsavedChanges (bool): Whether the document contains unsaved changes.

    Raises:
        RuntimeError: If the operation fails or times out or if there is not currently and active document
    """

    command = createCommand("getDocumentInfo", {})

    return sendCommand(command)

@mcp.tool()
def crop_document():
    """Crops the document to the active selection.

    This function removes all content outside the selection area and resizes the document 
    so that the selection becomes the new canvas size.

    An active selection is required.
    """

    command = createCommand("cropDocument", {})

    return sendCommand(command)

@mcp.tool()
def paste_from_clipboard(layer_name: str, paste_in_place: bool = True):
    """Pastes the current clipboard contents onto the specified layer.

    If `paste_in_place` is True, the content will be positioned exactly where it was cut or copied from.
    If False and an active selection exists, the content will be centered within the selection.
    If no selection is active, the content will be placed at the center of the layer.

    Args:
        layer_name (str): The name of the layer where the clipboard contents will be pasted.
        paste_in_place (bool): Whether to paste at the original location (True) or adjust based on selection/layer center (False).
    """


    command = createCommand("pasteFromClipboard", {
        "layerName":layer_name,
        "pasteInPlace":paste_in_place
    })

    return sendCommand(command)

@mcp.tool()
def rasterize_layer(layer_name: str):
    """Converts the specified layer into a rasterized (flat) image.

    This process removes any vector, text, or smart object properties, turning the layer 
    into pixel-based content.

    Args:
        layer_name (str): The name of the layer to rasterize.
    """

    command = createCommand("rasterizeLayer", {
        "layerName":layer_name
    })

    return sendCommand(command)

@mcp.tool()
def open_photoshop_file(file_path: str):
    """Opens the specified Photoshop-compatible file within Photoshop.

    This function attempts to open a file in Adobe Photoshop. The file must be in a 
    format compatible with Photoshop, such as PSD, TIFF, JPEG, PNG, etc.

    Args:
        file_path (str): Complete absolute path to the file to be opened, including filename and extension.

    Returns:
        dict: Response from the Photoshop operation indicating success status.
        
    Raises:
        RuntimeError: If the file doesn't exist, is not accessible, or is in an unsupported format.
    """

    command = createCommand("openFile", {
        "filePath":file_path
    })

    return sendCommand(command)

@mcp.tool()
def cut_selection_to_clipboard(layer_name: str):
    """Copies and removes (cuts) the selected pixels from the specified layer to the system clipboard.

    This function requires an active selection.

    Args:
        layer_name (str): The name of the layer that contains the pixels to copy and remove.
    """

    command = createCommand("cutSelectionToClipboard", {
        "layerName":layer_name
    })

    return sendCommand(command)


@mcp.tool()
def copy_merged_selection_to_clipboard():
    """Copies the selected pixels from all visible layers to the system clipboard.

    This function requires an active selection. If no selection is active, the operation will fail.
    The copied content will include pixel data from all visible layers within the selection area,
    effectively capturing what you see on screen.

    Returns:
        dict: Response from the Photoshop operation indicating success status.
        
    Raises:
        RuntimeError: If no active selection exists.
    """

    command = createCommand("copyMergedSelectionToClipboard", {})

    return sendCommand(command)

@mcp.tool()
def copy_selection_to_clipboard(layer_name: str):
    """Copies the selected pixels from the specified layer to the system clipboard.

    This function requires an active selection. If no selection is active, the operation will fail.

    Args:
        layer_name (str): The name of the layer that contains the pixels to copy.
        
    Returns:
        dict: Response from the Photoshop operation indicating success status.
        
    Raises:
        RuntimeError: If no active selection exists or if the specified layer doesn't exist.
    """

    command = createCommand("copySelectionToClipboard", {
        "layerName":layer_name
    })

    return sendCommand(command)

@mcp.tool()
def select_subject(layer_name: str):
    """Automatically selects the subject in the specified layer.

    This function identifies and selects the subject in the given image layer. 
    It returns an object containing a property named `hasActiveSelection`, 
    which indicates whether any pixels were selected (e.g., if no subject was detected).

    Args:
        layer_name (str): The name of that contains the image to select the subject from.
    """

    
    command = createCommand("selectSubject", {
        "layerName":layer_name
    })

    return sendCommand(command)

@mcp.tool()
def select_sky(layer_name: str):
    """Automatically selects the sky in the specified layer.

    This function identifies and selects the sky in the given image layer. 
    It returns an object containing a property named `hasActiveSelection`, 
    which indicates whether any pixels were selected (e.g., if no sky was detected).

    Args:
        layer_name (str): The name of that contains the image to select the sky from.
    """

    
    command = createCommand("selectSky", {
        "layerName":layer_name
    })

    return sendCommand(command)


@mcp.tool()
def get_layer_bounds(
    layer_name: str
):
    """Returns the pixel bounds for the layer with the specified name
    
    Args:
        layer_name (str): Name of the layer to get the bounds information from

    Returns:
        dict: A dictionary containing the layer bounds with the following properties:
            - left (int): The x-coordinate of the left edge of the layer
            - top (int): The y-coordinate of the top edge of the layer
            - right (int): The x-coordinate of the right edge of the layer
            - bottom (int): The y-coordinate of the bottom edge of the layer
            
    Raises:
        RuntimeError: If the layer doesn't exist or if the operation fails
    """
    
    command = createCommand("getLayerBounds", {
        "layerName":layer_name
    })

    return sendCommand(command)

@mcp.tool()
def remove_background(
    layer_name:str
):
    """Automatically removes the background of the image in the layer with the specified name and keeps the main subject
    
    Args:
        layer_name (str): Name of the layer to remove the background from
    """
    
    command = createCommand("removeBackground", {
        "layerName":layer_name
    })

    return sendCommand(command)

@mcp.tool()
def create_pixel_layer(
    layer_name:str,
    fill_neutral:bool,
    opacity:int = 100,
    blend_mode:str = "NORMAL",
):
    """Creates a new pixel layer with the specified name
    
    Args:
        layer_name (str): Name of the new layer being created
        fill_neutral (bool): Whether to fill the layer with a neutral color when applying Blend Mode.
        opacity (int): Opacity of the newly created layer
        blend_mode (str): Blend mode of the newly created layer
    """
    
    command = createCommand("createPixelLayer", {
        "layerName":layer_name,
        "opacity":opacity,
        "fillNeutral":fill_neutral,
        "blendMode":blend_mode
    })

    return sendCommand(command)

@mcp.tool()
def create_multi_line_text_layer(
    layer_name:str, 
    text:str, 
    font_size:int, 
    postscript_font_name:str, 
    opacity:int = 100,
    blend_mode:str = "NORMAL",
    text_color:dict = {"red":255, "green":255, "blue":255}, 
    position:dict = {"x": 100, "y":100},
    bounds:dict = {"top": 0, "left": 0, "bottom": 250, "right": 300},
    justification:str = "LEFT"
    ):

    """
    Creates a new multi-line text layer with the specified name within the current Photoshop document.
    
    Args:
        layer_name (str): The name of the layer to be created. Can be used to select in other api calls.
        text (str): The text to include on the layer.
        font_size (int): Font size.
        postscript_font_name (string): Postscript Font Name to display the text in. Valid list available via get_option_info.
        opacity (int): Opacity for the layer specified in percent.
        blend_mode (str): Blend Mode for the layer. Valid list available via get_option_info
        text_color (dict): Color of the text expressed in Red, Green, Blue values between 0 and 255
        position (dict): Position (dict with x, y values) where the text will be placed in the layer. Based on bottom left point of the text.
        bounds (dict): text bounding box
        justification (str): text justification. Valid list available via get_option_info.
    """

    command = createCommand("createMultiLineTextLayer", {
        "layerName":layer_name,
        "contents":text,
        "fontSize": font_size,
        "opacity":opacity,
        "position":position,
        "fontName":postscript_font_name,
        "textColor":text_color,
        "blendMode":blend_mode,
        "bounds":bounds,
        "justification":justification
    })

    return sendCommand(command)




@mcp.tool()
def create_single_line_text_layer(
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
    Create a new single line text layer with the specified name within the current Photoshop document.
    
     Args:
        layer_name (str): The name of the layer to be created. Can be used to select in other api calls.
        text (str): The text to include on the layer.
        font_size (int): Font size.
        postscript_font_name (string): Postscript Font Name to display the text in. Valid list available via get_option_info.
        opacity (int): Opacity for the layer specified in percent.
        blend_mode (str): Blend Mode for the layer. Valid list available via get_option_info
        text_color (dict): Color of the text expressed in Red, Green, Blue values between 0 and 255
        position (dict): Position (dict with x, y values) where the text will be placed in the layer. Based on bottom left point of the text.
    """

    command = createCommand("createSingleLineTextLayer", {
        "layerName":layer_name,
        "contents":text,
        "fontSize": font_size,
        "opacity":opacity,
        "position":position,
        "fontName":postscript_font_name,
        "textColor":text_color,
        "blendMode":blend_mode
    })

    return sendCommand(command)


@mcp.tool()
def translate_layer(
    layer_name: str,
    x_offset:int = 0,
    y_offset:int = 0
    ):

    """
        Moves the layer with the specified name on the X and Y axis by the specified number of pixels.

    Args:
        layer_name (str): The name of the layer that should be moved.
        x_offset (int): Amount to move on the horizontal axis. Negative values move the layer left, positive values right
        y_offset (int): Amount to move on the vertical axis. Negative values move the layer down, positive values up
    """
    
    command = createCommand("translateLayer", {
        "layerName":layer_name,
        "xOffset":x_offset,
        "yOffset":y_offset
    })

    return sendCommand(command)

@mcp.tool()
def set_layer_properties(
    layer_name: str,
    blend_mode:str = "NORMAL",
    opacity:int = 100,
    is_clipping_mask:bool = False
    ):

    """Sets the blend mode and opacity on the layer with the specified name

    Args:
        layer_name (str): The name of the layer whose properties should be updated
        blend_mode (str): The blend mode for the layer
        opacity (int): The opacity for the layer (0 - 100)
        is_clipping_mask (bool) : A boolean indicating whether this layer will be clipped to (masked by) the layer below it
    """
    
    command = createCommand("setLayerProperties", {
        "layerName":layer_name,
        "blendMode":blend_mode,
        "opacity":opacity,
        "isClippingMask":is_clipping_mask
    })

    return sendCommand(command)

@mcp.tool()
def fill_selection(
    layer_name: str,
    color:dict = {"red":255, "green":0, "blue":0},
    blend_mode:str = "NORMAL",
    opacity:int = 100,
    ):

    """Fills the selection on the pixel layer with the specified name
    
    Args:
        layer_name (str): The existing pixel layer to add the fill
        color (dict): The color of the fill
        blend_mode (dict): The blend mode for the fill
        opacity (int) : The opacity of the color for the fill
    """
    
    command = createCommand("fillSelection", {
        "layerName":layer_name,
        "color":color,
        "blendMode":blend_mode,
        "opacity":opacity
    })

    return sendCommand(command)



@mcp.tool()
def delete_selection(
    layer_name: str
    ):

    """Removes the pixels within the selection on the pixel layer with the specified name
    
    Args:
        layer_name (str): The layer from which the content of the selection should be deleted
    """
    
    command = createCommand("deleteSelection", {
        "layerName":layer_name
    })

    return sendCommand(command)


@mcp.tool()
def invert_selection():
    
    """Inverts the current selection in the Photoshop document"""

    command = createCommand("invertSelection", {})
    return sendCommand(command)


@mcp.tool()
def clear_selection():
    
    """Clears / deselects the current selection"""

    command = createCommand("selectRectangle", {
        "feather":0,
        "antiAlias":True,
        "bounds":{"top": 0, "left": 0, "bottom": 0, "right": 0}
    })

    return sendCommand(command)

@mcp.tool()
def select_rectangle(
    feather:int = 0,
    anti_alias:bool = True,
    bounds:dict = {"top": 0, "left": 0, "bottom": 100, "right": 100}
    ):
    
    """Creates a rectangular selection in the Photoshop document
    
    Args:
        feather (int): The amount of feathering in pixels to apply to the selection (0 - 1000)
        anti_alias (bool): Whether anti-aliases is applied to the selection
        bounds (dict): The bounds for the rectangle selection
    """

    command = createCommand("selectRectangle", {
        "feather":feather,
        "antiAlias":anti_alias,
        "bounds":bounds
    })

    return sendCommand(command)

@mcp.tool()
def select_polygon(
    feather:int = 0,
    anti_alias:bool = True,
    points:list[dict[str, int]] = [{"x": 50, "y": 10}, {"x": 100, "y": 90}, {"x": 10, "y": 40}]
    ):
    
    """Creates an n-sided polygon selection in the Photoshop document
    
    Args:
        feather (int): The amount of feathering in pixels to apply to the selection (0 - 1000)
        anti_alias (bool): Whether anti-aliases is applied to the selection
        points (list): The points that define the sides of the selection, defined via a list of dicts with x, y values.
    """

    command = createCommand("selectPolygon", {
        "feather":feather,
        "antiAlias":anti_alias,
        "points":points
    })

    return sendCommand(command)

@mcp.tool()
def select_ellipse(
    feather:int = 0,
    anti_alias:bool = True,
    bounds:dict = {"top": 0, "left": 0, "bottom": 100, "right": 100}
    ):
    
    """Creates an elliptical selection
    
    Args:
        feather (int): The amount of feathering in pixels to apply to the selection (0 - 1000)
        anti_alias (bool): Whether anti-aliases is applied to the selection
        bounds (dict): The bounds that will define the elliptical selection.
    """

    command = createCommand("selectEllipse", {
        "feather":feather,
        "antiAlias":anti_alias,
        "bounds":bounds
    })

    return sendCommand(command)

@mcp.tool()
def align_content(
    layer_name: str,
    alignment_mode:str
    ):
    
    """
    Aligns content on layer with the specified name to the current selection.

    Args:
        layer_name (str): The name of the layer in which to align the content
        alignment_mode (str): How the content should be aligned. Available options via alignment_modes
    """

    command = createCommand("alignContent", {
        "layerName":layer_name,
        "alignmentMode":alignment_mode
    })

    return sendCommand(command)

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
    """Adds a drop shadow layer effect to the layer with the specified name

    Args:
        layer_name (str): The layer with the content to add the drop shadow to
        blend_mode (str): The blend mode for the drop shadow
        color (dict): The color for the drop shadow
        opacity (int): The opacity of the drop shadow
        angle (int): The angle (-180 to 180) of the drop shadow relative to the content
        distance (int): The distance in pixels of the drop shadow (0 to 30000)
        spread (int): Defines how gradually the shadow fades out at its edges, with higher values creating a harsher, more defined edge, and lower values a softer, more feathered edge (0 to 100)
        size (int): Control the blur and spread of the shadow effect (0 to 250)
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

    return sendCommand(command)

@mcp.tool()
def duplicate_layer(layer_to_duplicate_name:str, duplicate_layer_name:str):
    """
    Duplicates the layer specified by layer_to_duplicate_name, creating a new layer above it with the name specified by duplicate_layer_name

    Args:
        layer_to_duplicate_name (str): The name of the layer to be duplicated
        duplicate_layer_name (str): Name of the newly created layer
    """

    command = createCommand("duplicateLayer", {
        "sourceLayerName":layer_to_duplicate_name,
        "duplicateLayerName":duplicate_layer_name,
    })

    return sendCommand(command)

@mcp.tool()
def flatten_all_layers(layer_name:str):
    """
    Flatten all layers in the document into a single layer with specified name

    Args:
        layer_name (str): The name of the merged layer
    """

    command = createCommand("flattenAllLayers", {
        "layerName":layer_name,
    })

    return sendCommand(command)

@mcp.tool()
def add_color_balance_adjustment_layer(
    layer_name: str,
    highlights:list = [0,0,0],
    midtones:list = [0,0,0],
    shadows:list = [0,0,0]):
    """Adds an adjustment layer to the layer with the specified name to adjust color balance

    Each property highlights, midtones and shadows contains an array of 3 values between
    -100 and 100 that represent the relative position between two colors.

    First value is between cyan and red
    The second value is between magenta and green
    The third value is between yellow and blue    

    Args:
        layer_name (str): The name of the layer to apply the color balance adjustment layer
        highlights (list): Relative color values for highlights
        midtones (list): Relative color values for midtones
        shadows (list): Relative color values for shadows
    """

    command = createCommand("addColorBalanceAdjustmentLayer", {
        "layerName":layer_name,
        "highlights":highlights,
        "midtones":midtones,
        "shadows":shadows
    })

    return sendCommand(command)

@mcp.tool()
def add_brightness_contrast_adjustment_layer(
    layer_name: str,
    brightness:int = 0,
    contrast:int = 0):
    """Adds an adjustment layer to the layer with the specified name to adjust brightness and contrast

    Args:
        layer_name (str): The name of the layer to apply the brightness and contrast adjustment layer
        brightness (int): The brightness value (-150 to 150)
        contrasts (int): The contrast value (-50 to 100)
    """

    command = createCommand("addBrightnessContrastAdjustmentLayer", {
        "layerName":layer_name,
        "brightness":brightness,
        "contrast":contrast
    })

    return sendCommand(command)

@mcp.tool()
def add_vibrance_adjustment_layer(
    layer_name: str,
    vibrance:int = 0,
    saturation:int = 0):
    """Adds an adjustment layer to layer with the specified name to adjust vibrance and saturation
    
    Args:
        layer_name (str): The name of the layer to apply the vibrance and saturation adjustment layer
        vibrance (int): Controls the intensity of less-saturated colors while preventing oversaturation of already-saturated colors. Range -100 to 100.
        saturation (int): Controls the intensity of all colors equally. Range -100 to 100.
    """
    #0.1 to 255

    command = createCommand("addAdjustmentLayerVibrance", {
        "layerName":layer_name,
        "saturation":saturation,
        "vibrance":vibrance
    })

    return sendCommand(command)

@mcp.tool()
def add_black_and_white_adjustment_layer(
    layer_name: str,
    colors: dict = {"blue": 20, "cyan": 60, "green": 40, "magenta": 80, "red": 40, "yellow": 60}):
    """Adds an adjustment layer to the layer with the specified name to change it to black and white
    
    Args:
        layer_name (str): The name of the layer to apply the black and white adjustment layer
        colors (dict): Dictionary controlling how each color converts to grayscale. Valid color values are from -200 to 300. Higher values make that color appear lighter in the black and white conversion. Keys must include: red, yellow, green, cyan, blue, magenta.
    
    Returns:
        dict: Response from the Photoshop operation
        
    Raises:
        RuntimeError: If the operation fails or times out
    """

    command = createCommand("addAdjustmentLayerBlackAndWhite", {
        "layerName":layer_name,
        "colors":colors,
    })

    return sendCommand(command)

@mcp.tool()
def apply_gaussian_blur(layer_name: str, radius: float = 2.5):
    """Applies a Gaussian Blur to the layer with the specified name
    
    Args:
        layer_name (str): Name of layer to be blurred
        radius (float): The blur radius in pixels determining the intensity of the blur effect. Default is 2.5.
        Valid values range from 0.1 (subtle blur) to 10000 (extreme blur).

    Returns:
        dict: Response from the Photoshop operation
        
    Raises:
        RuntimeError: If the operation fails or times out
    """



    command = createCommand("applyGaussianBlur", {
        "layerName":layer_name,
        "radius":radius,
    })

    return sendCommand(command)




@mcp.tool()
def apply_motion_blur(layer_name: str, angle: int = 0, distance: float = 30):
    """Applies a Motion Blur to the layer with the specified name

    Args:
    layer_name (str): Name of layer to be blurred
    angle (int): The angle in degrees (0 to 360) that determines the direction of the motion blur effect. Default is 0.
    distance (float): The distance in pixels that controls the length/strength of the motion blur. Default is 30.
        Higher values create a more pronounced motion effect.

    Returns:
        dict: Response from the Photoshop operation
        
    Raises:
        RuntimeError: If the operation fails or times out
    """


    command = createCommand("applyMotionBlur", {
        "layerName":layer_name,
        "angle":angle,
        "distance":distance
    })

    return sendCommand(command)


@mcp.resource("config://get_instructions")
def get_instructions() -> str:
    """Read this first! Returns information and instructions on how to use Photoshop and this API"""

    return f"""
    You are a photoshop expert who is creative and loves to help other people learn to use Photoshop and create. You are well versed in composition, design and color theory, and try to follow that theory when making decisions.

    Rules to follow:

    1. Think deeply about how to solve the task
    2. Always check your work
    3. You can ask the user to copy the content to clipboard and ask them to share with you
    4. Pay attention to font size (dont make it too big)
    5. Always use alignment (align_content()) to position your text.
    6. Read the info for the API calls to make sure you understand the requirements and arguments
    7. When you make a selection, clear it once you no longer need it

    Here are some general tips for when working with Photoshop.

    In general, layers are created from bottom up, so keep that in mind as you figure out the order or operations. If you want you have lower layers show through higher ones you must either change the opacity of the higher layers and / or blend modes.

    When using fonts there are a couple of things to keep in mind. First, the font origin is the bottom left of the font, not the top right.


    Suggestions for sizes:
    Paragraph text : 8 to 12 pts
    Headings : 14 - 20 pts
    Single Word Large : 20 to 25pt

    Pay attention to what layer names are needed for. Sometimes the specify the name of a newly created layer and sometimes they specify the name of the layer that the action should be performed on.

    As a general rule, you should not flatten files unless asked to do so, or its necessary to apply an effect or look.

    When generating an image, you do not need to first create a pixel layer. A layer will automatically be created when you generate the image.

    Colors are defined via a dict with red, green and blue properties with values between 0 and 255
    {{"red":255, "green":0, "blue":0}}

    Bounds is defined as a dict with top, left, bottom and right properties
    {{"top": 0, "left": 0, "bottom": 250, "right": 300}}

    Valid options for API calls:

    alignment_modes: {", ".join(alignment_modes)}

    justification_modes: {", ".join(justification_modes)}

    blend_modes: {", ".join(blend_modes)}

    anchor_positions: {", ".join(anchor_positions)}

    interpolation_methods: {", ".join(interpolation_methods)}

    fonts: {", ".join(font_names)}
    """

"""
@mcp.resource("config://get_option_info")
def get_option_info() -> dict:
    Returns valid options for API calls
    return {
        "alignment_modes":alignment_modes,
        "justification_modes":justification_modes,
        "blend_modes":blend_modes,
        "fonts": fonts,
        "anchor_positions":anchor_positions,
        "interpolation_methods":interpolation_methods
    }
"""



def sendCommand(command:dict):
    #url = "http://127.0.0.1:3030/commands/add/"

    #data = json.dumps(command)

    """
    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.post(url, data=data, headers=headers)

    print(f"Status Code: {response.status_code}")
    print("Response Content:")
    print(response.json())"
    """

    response = socket_client.send_message_blocking(command)
    
    logger.log(f"Final response: {response['status']}")
    return response

def createCommand(action:str, options:dict) -> str:
    command = {
        "application":APPLICATION,
        "action":action,
        "options":options
    }

    return command

from fonts import list_all_fonts_postscript
font_names = list_all_fonts_postscript()

interpolation_methods = [
   "AUTOMATIC",
   "BICUBIC",
   "BICUBICSHARPER",
   "BICUBICSMOOTHER",
   "BILINEAR",
   "NEARESTNEIGHBOR"
]

anchor_positions = [
   "BOTTOMCENTER",
   "BOTTOMLEFT", 
   "BOTTOMRIGHT", 
   "MIDDLECENTER", 
   "MIDDLELEFT", 
   "MIDDLERIGHT", 
   "TOPCENTER", 
   "TOPLEFT", 
   "TOPRIGHT"
]

justification_modes = [
    "CENTER",
    "CENTERJUSTIFIED",
    "FULLYJUSTIFIED",
    "LEFT",
    "LEFTJUSTIFIED",
    "RIGHT",
    "RIGHTJUSTIFIED"
]

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

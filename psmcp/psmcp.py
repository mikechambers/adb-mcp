# server.py
from mcp.server.fastmcp import FastMCP
import requests
import json

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
def create_text_layer(
    layer_name:str, 
    text:str, 
    font_size:int, 
    postscript_font_name:str, 
    opacity:int = 100, 
    text_color:dict = {"red":255, "green":255, "blue":255}, 
    position:dict = {"x": 100, "y":100}
    ):
    """Creates a new text layer within the current open Photoshop Document"""
    print("create_text_layer")

    command = createCommand("createTextLayer", {
        "name":layer_name,
        "contents":text,
        "fontSize": font_size,
        "opacity":opacity,
        "position":position,
        "fontName":postscript_font_name,
        "textColor":text_color
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

"""
@mcp.tool()
def test() -> None:
    
    url = "http://127.0.0.1:3030/commands/add/"

    data = json.dumps({
        "foo":"bar"
    })

    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.post(url, data=data, headers=headers)

    print(f"Status Code: {response.status_code}")
    print("Response Content:")
    print(response.json())

    return None
"""

# Add a dynamic greeting resource
# Does not work in claud / or in test
#@mcp.resource("greeting://{name}")
#def get_greeting(name: str) -> str:
#    """Get a personalized greeting"""
#    return f"Hello, {name}!"

#@mcp.resource("config://say_hi")
#def say_hi() -> str:
#    """Echo a message as a resource"""
#    return "Hi"

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
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
mcp = FastMCP("Adobe Premeire", log_level="ERROR")

APPLICATION = "premiere"
PROXY_URL = 'http://localhost:3001'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION, 
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

@mcp.tool()
def get_active_project_info():

    command = createCommand("getActiveProjectInfo", {

    })

    return sendCommand(command)


def createCommand(action:str, options:dict) -> str:
    command = {
        "application":APPLICATION,
        "action":action,
        "options":options
    }

    return command

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

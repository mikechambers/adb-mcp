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
def create_project(directory_path: str, project_name: str):
    """
    Create a new Premiere project.

    Creates a new Adobe Premiere project file, saves it to the specified location and then opens it in Premiere.

    The function initializes an empty project with default settings.

    Args:
        directory_path (str): The full path to the directory where the project file will be saved.
                                This directory must exist before calling the function.
        project_name (str): The name to be given to the project file. The '.prproj' extension
                            will be added.

    Returns:
        None
    """

    command = createCommand("createProject", {
        "path":directory_path,
        "name":project_name
    })

    return sendCommand(command)

@mcp.tool()
def import_files(file_paths:list):
    """
    Imports a list of media files into the active Premiere project.

    Args:
        file_paths (list): A list of file paths (strings) to import into the project.
            Each path should be a complete, valid path to a media file supported by Premiere Pro.
    """

    command = createCommand("importFiles", {
        "filePaths":file_paths
    })

    return sendCommand(command)


@mcp.tool()
def get_sequences():
    """
    Retrieves a list of sequences in the active Premeire project.

    Args:
        None

    Returns:
        list: A list containing dicts with the following information:
            - name (str): The name of the sequences.
            - id (str): The globally unique identifier (GUID) of the project as a string.

    """

    command = createCommand("getSequences", {

    })

    return sendCommand(command)

@mcp.tool()
def get_active_project_info():
    """
    Retrieves basic information about the currently active Premiere project.

    This function queries the currently open Premiere Pro project and returns 
    information about the ative project.

    Args:
        None

    Returns:
        dict: A dictionary containing the following project information:
            - name (str): The name of the project file.
            - path (str): The full file path to the project.
            - id (str): The globally unique identifier (GUID) of the project as a string.

    """

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

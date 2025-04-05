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
mcp = FastMCP("Adobe Premiere", log_level="ERROR")

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
def set_audio_clip_disabled(audio_track_index: int, track_item_index: int, disabled: bool):
    """
    Enables or disables a audio clip in the timeline.
    
    Args:
        audio_track_index (int): The index of the audio track containing the target clip.
        track_item_index (int): The index of the clip within the track to enable/disable.
        disabled (bool): Whether to disable the clip.
            - True: Disables the clip (clip will not be visible during playback or export)
            - False: Enables the clip (normal visibility)
    
    Returns:
        None
    """

    command = createCommand("setAudioClipDisabled", {
        "audioTrackIndex":audio_track_index,
        "trackItemIndex":track_item_index,
        "disabled":disabled
    })

    return sendCommand(command)

@mcp.tool()
def set_video_clip_disabled(video_track_index: int, track_item_index: int, disabled: bool):
    """
    Enables or disables a video clip in the timeline.
    
    Args:
        video_track_index (int): The index of the video track containing the target clip.
        track_item_index (int): The index of the clip within the track to enable/disable.
        disabled (bool): Whether to disable the clip.
            - True: Disables the clip (clip will not be visible during playback or export)
            - False: Enables the clip (normal visibility)
    
    Returns:
        None
    """

    command = createCommand("setVideoClipDisabled", {
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "disabled":disabled
    })

    return sendCommand(command)

"""
@mcp.tool()
def set_audio_clip_out_point(audio_track_index: int, track_item_index: int, seconds:float):
  
    Adds a specified media item to the active sequence's timeline.

    Args:
        item_name (str): The name or identifier of the media item to add.
        video_track_index (float, optional): The index of the video track where the item should be inserted. Defaults to 0.0.
        audio_track_index (float, optional): The index of the audio track where the item should be inserted. Defaults to 0.0.
        insertion_time_seconds (float, optional): The time (in seconds) at which the item should be inserted. Defaults to 0.0.
        overwrite (bool, optional): Whether to overwrite existing content at the insertion point. Defaults to True. If False, any existing clips that overlap will be split and item inserted.

    Returns:
        None



    command = createCommand("setAudioClipOutPoint", {
        "audioTrackIndex":audio_track_index,
        "trackItemIndex":track_item_index,
        "seconds":seconds
    })

    return sendCommand(command)
"""


"""
@mcp.tool()
def append_audio_filter(audio_track_index: float, track_item_index: float, effect_name: str):
    
    Adds the specified video effect to a clip at the specified track and position.
    
    Args:
        video_track_index (float): The index of the video track containing the target clip.
        track_item_index (float): The index of the clip within the track to apply the effect to.
        effect_name (str): The name of the effect to apply. Must be a valid effect name (see below).
        
    Returns:
        None
        
    

    command = createCommand("appendAudioFilter", {
        "audioTrackIndex":audio_track_index,
        "trackItemIndex":track_item_index,
        "effectName":effect_name
    })

    return sendCommand(command)
"""

@mcp.tool()
def append_video_filter(video_track_index: int, track_item_index: int, effect_name: str):
    """
    Adds the specified video effect to a clip at the specified track and position.
    
    Args:
        video_track_index (int): The index of the video track containing the target clip.
        track_item_index (int): The index of the clip within the track to apply the effect to.
        effect_name (str): The name of the effect to apply. Must be a valid effect name (see below).
        
    Returns:
        None
        
    Valid Effect Names:
            "AE.ADBE Black & White"
            "AE.ADBE Lens Flare"
    """

    command = createCommand("appendVideoFilter", {
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "effectName":effect_name
    })

    return sendCommand(command)

@mcp.tool()
def append_video_transition(video_track_index: int, track_item_index: int, transition_name: str, duration: int = 1.0, clip_alignment: float = 0.5):
    """
    Creates a transition between the specified clip and the adjacent clip on the timeline.
    
    Args:
        video_track_index (int): The index of the video track containing the target clips.
        track_item_index (int): The index of the clip within the track to apply the transition to.
        transition_name (str): The name of the transition to apply. Must be a valid transition name (see below).
        duration (int): The duration of the transition in frames.
        clip_alignment (float): Controls how the transition is distributed between the two clips.
                                Range: 0.0 to 1.0, where:
                                - 0.0 places transition entirely on the right (later) clip
                                - 0.5 centers the transition equally between both clips (default)
                                - 1.0 places transition entirely on the left (earlier) clip
        
    Returns:
        None
        
    Valid Transition Names:
        Basic Transitions (ADBE):
            - "ADBE Additive Dissolve"
            - "ADBE Cross Zoom"
            - "ADBE Cube Spin"
            - "ADBE Film Dissolve"
            - "ADBE Flip Over"
            - "ADBE Gradient Wipe"
            - "ADBE Iris Cross"
            - "ADBE Iris Diamond"
            - "ADBE Iris Round"
            - "ADBE Iris Square"
            - "ADBE Page Peel"
            - "ADBE Push"
            - "ADBE Slide"
            - "ADBE Wipe"
            
        After Effects Transitions (AE.ADBE):
            - "AE.ADBE Center Split"
            - "AE.ADBE Inset"
            - "AE.ADBE Cross Dissolve New"
            - "AE.ADBE Dip To White"
            - "AE.ADBE Split"
            - "AE.ADBE Whip"
            - "AE.ADBE Non-Additive Dissolve"
            - "AE.ADBE Dip To Black"
            - "AE.ADBE Barn Doors"
            - "AE.ADBE MorphCut"
            
        Mettle SkyBox Transitions (AE.Mettle):
            - "AE.Mettle SkyBox Rays"
            - "AE.Mettle SkyBox Radial Blur"
            - "AE.Mettle SkyBox Chroma Leaks"
            - "AE.Mettle SkyBox Iris Wipe"
            - "AE.Mettle SkyBox Mobius Zoom"
            - "AE.Mettle SkyBox Light Leaks"
            - "AE.Mettle SkyBox Gradient Wipe"
            - "AE.Mettle SkyBox Random Blocks"
    """

    command = createCommand("appendVideoTransition", {
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "transitionName":transition_name,
        "clipAlignment":clip_alignment,
        "duration":duration
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

"""
@mcp.tool()
def get_sequences():
 
    Retrieves a list of sequences in the active Premeire project.

    Args:
        None

    Returns:
        list: A list containing dicts with the following information:
            - name (str): The name of the sequences.
            - id (str): The globally unique identifier (GUID) of the project as a string.


    command = createCommand("getSequences", {

    })

    return sendCommand(command)

   


@mcp.tool()
def get_active_project_info():

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


    command = createCommand("getActiveProjectInfo", {

    })

    return sendCommand(command)
"""

def createCommand(action:str, options:dict) -> str:
    command = {
        "application":APPLICATION,
        "action":action,
        "options":options
    }

    return command

def sendCommand(command:dict):

    response = socket_client.send_message_blocking(command)
    
    logger.log(f"Final response: {response['status']}")
    return response

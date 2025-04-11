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
def set_audio_track_mute(audio_track_index: int, mute: bool):
    """
    Sets the mute property on the specified audio track. If mute is true, all clips on the track will be muted and not played.

    Args:
        audio_track_index (int): The index of the audio track to mute or unmute. Indices start at 0 for the first audio track.
        mute (bool): Whether the track should be muted.
            - True: Mutes the track (audio will not be played)
            - False: Unmutes the track (audio will be played normally)

    Returns:
        None

    Example:
        # Mute the first audio track (index 0)
        set_audio_track_mute(audio_track_index=0, mute=True)

        # Unmute the second audio track (index 1)
        set_audio_track_mute(audio_track_index=1, mute=False)

    Notes:
        - This function affects the entire track, including all audio clips placed on it
        - Muting a track is different from disabling individual clips - it's a global setting for the track
        - This is useful for quickly toggling entire audio tracks without having to disable individual clips
    """

    command = createCommand("setAudioTrackMute", {
        "audioTrackIndex":audio_track_index,
        "mute":mute
    })

    return sendCommand(command)


@mcp.tool()
def create_sequence_from_media(item_names: list[str], sequence_name: str = "default"):
    """
    Creates a new sequence from the specified project items, placing clips on the timeline in the order they are provided.
    
    The sequence will be set as the active sequence when created.
    
    Args:
        item_names (list[str]): A list of project item names to include in the sequence in the desired order.
        sequence_name (str, optional): The name to give the new sequence. Defaults to "default".
    
    Returns:
        None
    """


    command = createCommand("createSequenceFromMedia", {
        "itemNames":item_names,
        "sequenceName":sequence_name
    })

    return sendCommand(command)

@mcp.tool()
def add_media_to_active_sequence(item_name: str, video_track_index: int, audio_track_index: int, insertion_time_ticks: int = 0, overwrite: bool = True):
    """
    Adds a specified media item to the active sequence's timeline.

    Args:
        item_name (str): The name or identifier of the media item to add.
        video_track_index (int, optional): The index of the video track where the item should be inserted. Defaults to 0.0.
        audio_track_index (int, optional): The index of the audio track where the item should be inserted. Defaults to 0.0.
        insertion_time_ticks (int, optional): The position on the timeline in ticks, with 0 being the beginning. The API will return positions of existing clips in ticks
        overwrite (bool, optional): Whether to overwrite existing content at the insertion point. Defaults to True. If False, any existing clips that overlap will be split and item inserted.

    Returns:
        None
    """


    command = createCommand("addMediaToSequence", {
        "itemName":item_name,
        "videoTrackIndex":video_track_index,
        "audioTrackIndex":audio_track_index,
        "insertionTimeTicks":insertion_time_ticks,
        "overwrite":overwrite
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
def add_black_and_white_effect(video_track_index: int, track_item_index: int):
    """
    Adds a black and white effect to a clip at the specified track and position.
    
    Args:
        video_track_index (int): The index of the video track containing the target clip.
            Track indices start at 0 for the first video track and increment upward.
            
        track_item_index (int): The index of the clip within the track to apply the effect to.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
    
    Returns:
        None
    """

    command = createCommand("appendVideoFilter", {
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "effectName":"AE.ADBE Black & White",
        "properties":[
        ]
    })

    return sendCommand(command)

@mcp.tool()
def add_motion_blur_effect(video_track_index: int, track_item_index: int, direction: int, length: int):
    """
    Adds the directional blur effect to a clip at the specified track and position.
    
    This function applies a motion blur effect that simulates movement in a specific direction.
    
    Args:
        video_track_index (int): The index of the video track containing the target clip.
            Track indices start at 0 for the first video track and increment upward.
            
        track_item_index (int): The index of the clip within the track to apply the effect to.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
            
        direction (int): The angle of the directional blur in degrees, ranging from 0 to 360.
            - 0/360: Vertical blur upward
            - 90: Horizontal blur to the right 
            - 180: Vertical blur downward
            - 270: Horizontal blur to the left
            
        length (int): The intensity or distance of the blur effect, ranging from 0 to 1000.
    
    Returns:
        None
    """

    command = createCommand("appendVideoFilter", {
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "effectName":"AE.ADBE Motion Blur",
        "properties":[
            {"name":"Direction", "value":direction},
            {"name":"Blur Length", "value":length}
        ]
    })

    return sendCommand(command)

@mcp.tool()
def append_video_transition(video_track_index: int, track_item_index: int, transition_name: str, duration: int = 1.0, clip_alignment: float = 0.5):
    """
    Creates a transition between the specified clip and the adjacent clip on the timeline.
    
    In general, you should keep transitions short (no more than 2 seconds is a good rule).

    Args:
        video_track_index (int): The index of the video track containing the target clips.
        track_item_index (int): The index of the clip within the track to apply the transition to.
        transition_name (str): The name of the transition to apply. Must be a valid transition name (see below).
        duration (int): The duration of the transition in seconds.
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
def set_video_clip_properties(video_track_index: int, track_item_index: int, opacity: int = 100, blend_mode: str = "NORMAL"):
    """
    Sets opacity and blend mode properties for a video clip in the timeline.

    This function modifies the visual properties of a specific clip located on a specific video track
    in the active Premiere Pro sequence. The clip is identified by its track index and item index
    within that track.

    Args:
        video_track_index (int): The index of the video track containing the target clip.
            Track indices start at 0 for the first video track.
        track_item_index (int): The index of the clip within the track to modify.
            Clip indices start at 0 for the first clip on the track.
        opacity (int, optional): The opacity value to set for the clip, as a percentage.
            Valid values range from 0 (completely transparent) to 100 (completely opaque).
            Defaults to 100.
        blend_mode (str, optional): The blend mode to apply to the clip.
            Must be one of the valid blend modes supported by Premiere Pro.
            Defaults to "NORMAL".

    Returns:
        None
    """

    command = createCommand("setVideoClipProperties", {
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "opacity":opacity,
        "blendMode":blend_mode
    })

    return sendCommand(command)

@mcp.tool()
def import_media(file_paths:list):
    """
    Imports a list of media files into the active Premiere project.

    Args:
        file_paths (list): A list of file paths (strings) to import into the project.
            Each path should be a complete, valid path to a media file supported by Premiere Pro.
    """

    command = createCommand("importMedia", {
        "filePaths":file_paths
    })

    return sendCommand(command)

"""
@mcp.tool()
def get_sequences():
 
    Retrieves a list of sequences in the active Premiere project.

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

@mcp.resource("config://get_instructions")
def get_instructions() -> str:
    """Read this first! Returns information and instructions on how to use Photoshop and this API"""

    return f"""
    You are a Premiere Pro and video expert who is creative and loves to help other people learn to use Premiere and create.

    Rules to follow:

    1. Think deeply about how to solve the task
    2. Always check your work
    3. Read the info for the API calls to make sure you understand the requirements and arguments
    4. In general, add clips first, then effects, then transitions
    5. As a general rule keep transitions short (no more that 2 seconds is a good rule), and there should not be a gap between clips (or else the transition may not work)

    IMPORTANT: To create a new project and add clips:
    1. Create new project (create_project)
    2. Add media to the project (import_media)
    3. Create a new sequence with media (should always add video / image clips before audio.(create_sequence_from_media). This will create a sequence with the clips, and set the sequence to the the active sequence.
    4. The first clip you add will determine the dimensions / resolution of the sequence

    There must be an active sequence for most API calls

    Here are some general tips for when working with Premiere.

    Audio and Video clips are added on separate Audio / Video tracks, which you can access via their index.

    When adding a video clip that contains audio, the audio will be placed on a separate audio track.

    Once added you currently cannot remove a clip (audio or video) but you can disable it.

    If you want to do a transition between two clips, the clips must be on the same track and there should not be a gap between them. Place the transition of the first clip.

    Video clips with a higher track index will overlap and hide those with lower index if they overlap.

    When adding images to a sequence, they will have a duration of 5 seconds.

    blend_modes: {", ".join(BLEND_MODES)}
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
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

from mcp.server.fastmcp import FastMCP, Image
from PIL import Image as PILImage

from core import init, sendCommand, createCommand
import socket_client
import sys
import tempfile
import os
import io


#logger.log(f"Python path: {sys.executable}")
#logger.log(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")
#logger.log(f"Current working directory: {os.getcwd()}")
#logger.log(f"Sys.path: {sys.path}")


mcp_name = "Adobe Premiere MCP Server"
mcp = FastMCP(mcp_name, log_level="ERROR")
print(f"{mcp_name} running on stdio", file=sys.stderr)

APPLICATION = "premiere"
PROXY_URL = 'http://localhost:3001'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION, 
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

init(APPLICATION, socket_client)

@mcp.tool()
def get_project_info():
    """
    Returns info on the currently active project in Premiere Pro.
    """

    command = createCommand("getProjectInfo", {
    })

    return sendCommand(command)

@mcp.tool()
def save_project():
    """
    Saves the active project in Premiere Pro.
    """

    command = createCommand("saveProject", {
    })

    return sendCommand(command)

@mcp.tool()
def save_project_as(file_path: str):
    """Saves the current Premiere project to the specified location.
    
    Args:
        file_path (str): The absolute path (including filename) where the file will be saved.
            Example: "/Users/username/Documents/project.prproj"

    """
    
    command = createCommand("saveProjectAs", {
        "filePath":file_path
    })

    return sendCommand(command)

@mcp.tool()
def open_project(file_path: str):
    """Opens the Premiere project at the specified path.
    
    Args:
        file_path (str): The absolute path (including filename) of the Premiere Pro project to open.
            Example: "/Users/username/Documents/project.prproj"

    """
    
    command = createCommand("openProject", {
        "filePath":file_path
    })

    return sendCommand(command)


@mcp.tool()
def create_project(directory_path: str, project_name: str):
    """
    Create a new Premiere project.

    Creates a new Adobe Premiere project file, saves it to the specified location and then opens it in Premiere.

    The function initializes an empty project with default settings.

    Args:
        directory_path (str): The full path to the directory where the project file will be saved. This directory must exist before calling the function.
        project_name (str): The name to be given to the project file. The '.prproj' extension will be added.
    """

    command = createCommand("createProject", {
        "path":directory_path,
        "name":project_name
    })

    return sendCommand(command)



@mcp.tool()
def set_audio_track_mute(sequence_id:str, audio_track_index: int, mute: bool):
    """
    Sets the mute property on the specified audio track. If mute is true, all clips on the track will be muted and not played.

    Args:
        sequence_id (str) : The id of the sequence on which to set the audio track mute.
        audio_track_index (int): The index of the audio track to mute or unmute. Indices start at 0 for the first audio track.
        mute (bool): Whether the track should be muted.
            - True: Mutes the track (audio will not be played)
            - False: Unmutes the track (audio will be played normally)

    """

    command = createCommand("setAudioTrackMute", {
        "sequenceId": sequence_id,
        "audioTrackIndex":audio_track_index,
        "mute":mute
    })

    return sendCommand(command)


@mcp.tool()
def set_active_sequence(sequence_id: str):
    """
    Sets the sequence with the specified id as the active sequence within Premiere Pro (currently selected and visible in timeline)
    
    Args:
        sequence_id (str): ID for the sequence to be set as active
    """

    command = createCommand("setActiveSequence", {
        "sequenceId":sequence_id
    })

    return sendCommand(command)


@mcp.tool()
def create_sequence_from_media(item_names: list[str], sequence_name: str = "default"):
    """
    Creates a new sequence from the specified project items, placing clips on the timeline in the order they are provided.
    
    If there is not an active sequence the newly created sequence will be set as the active sequence when created.
    
    Args:
        item_names (list[str]): A list of project item names to include in the sequence in the desired order.
        sequence_name (str, optional): The name to give the new sequence. Defaults to "default".
    """


    command = createCommand("createSequenceFromMedia", {
        "itemNames":item_names,
        "sequenceName":sequence_name
    })

    return sendCommand(command)

@mcp.tool()
def close_gaps_on_sequence(sequence_id: str, track_index: int, track_type: str):
    """
    Closes gaps on the specified track(s) in a sequence's timeline.

    This function removes empty spaces (gaps) between clips on the timeline by moving
    clips leftward to fill any empty areas. This is useful for cleaning up the timeline
    after removing clips or when clips have been moved leaving gaps.

    Args:
        sequence_id (str): The ID of the sequence to close gaps on.
        track_index (int): The index of the track to close gaps on.
            Track indices start at 0 for the first track and increment upward.
            For video tracks, this refers to video track indices.
            For audio tracks, this refers to audio track indices.
        track_type (str): Specifies which type of tracks to close gaps on.
            Valid values:
            - "VIDEO": Close gaps only on the specified video track
            - "AUDIO": Close gaps only on the specified audio track  

    """
    
    command = createCommand("closeGapsOnSequence", {
        "sequenceId": sequence_id,
        "trackIndex": track_index,
        "trackType": track_type,
    })

    return sendCommand(command)


@mcp.tool()
def remove_item_from_sequence(sequence_id: str, track_index:int, track_item_index: int, track_type:str, ripple_delete:bool=True):
    """
    Removes a specified media item from the sequence's timeline.

    Args:
        sequence_id (str): The id for the sequence to remove the media from
        track_index (int): The index of the track containing the target clip.
            Track indices start at 0 for the first track and increment upward.
        track_item_index (int): The index of the clip within the track to remove.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
        track_type (str): Specifies which type of tracks being removed.
            Valid values:
            - "VIDEO": Close gaps only on the specified video track
            - "AUDIO": Close gaps only on the specified audio track
        ripple_delete (bool, optional): Whether to perform a ripple delete operation. Defaults to True.
            - True: Removes the clip and shifts all subsequent clips leftward to close the gap
            - False: Removes the clip but leaves a gap in the timeline where the clip was located
    """
    
    command = createCommand("removeItemFromSequence", {
        "sequenceId": sequence_id,
        "trackItemIndex":track_item_index,
        "trackIndex":track_index,
        "trackType":track_type,
        "rippleDelete":ripple_delete
    })

    return sendCommand(command)

@mcp.tool()
def add_marker_to_sequence(sequence_id: str, 
                           marker_name: str, 
                           start_time_ticks: int, 
                           duration_ticks: int, 
                           comments: str,
                           marker_type: str = "Comment"):
    """
    Adds a marker to the specified sequence.

    Args:
        sequence_id (str): 
            The ID of the sequence to which the marker will be added.

        marker_name (str): 
            The name/title of the marker.

        start_time_ticks (int): 
            The timeline position where the marker starts, in ticks.
            (1 tick = 1/254016000000 of a day)

        duration_ticks (int): 
            The length of the marker in ticks.

        comments (str): 
            Optional text comment to store in the marker.

        marker_type (str, optional): 
            The type of marker to add. Defaults to "Comment".
            
            Supported marker types include:
                - "Comment"      → General-purpose note marker.

    """

    command = createCommand("addMarkerToSequence", {
        "sequenceId": sequence_id,
        "markerName": marker_name,
        "startTimeTicks": start_time_ticks,
        "durationTicks": duration_ticks,
        "comments": comments,
        "markerType": marker_type
    })

    return sendCommand(command)



@mcp.tool()
def add_media_to_sequence(sequence_id:str, item_name: str, video_track_index: int, audio_track_index: int, insertion_time_ticks: int = 0, overwrite: bool = True):
    """
    Adds a specified media item to the active sequence's timeline.

    Args:
        sequence_id (str) : The id for the sequence to add the media to
        item_name (str): The name or identifier of the media item to add.
        video_track_index (int): The index of the video track where the item should be inserted.
        audio_track_index (int): The index of the audio track where the item should be inserted.
        insertion_time_ticks (int): The position on the timeline in ticks, with 0 being the beginning. The API will return positions of existing clips in ticks
        overwrite (bool, optional): Whether to overwrite existing content at the insertion point. Defaults to True. If False, any existing clips that overlap will be split and item inserted.
    """


    command = createCommand("addMediaToSequence", {
        "sequenceId": sequence_id,
        "itemName":item_name,
        "videoTrackIndex":video_track_index,
        "audioTrackIndex":audio_track_index,
        "insertionTimeTicks":insertion_time_ticks,
        "overwrite":overwrite
    })

    return sendCommand(command)


@mcp.tool()
def set_clip_disabled(sequence_id:str, track_index: int, track_item_index: int, track_type:str, disabled: bool):
    """
    Enables or disables a clip in the timeline.
    
    Args:
        sequence_id (str): The id for the sequence to set the clip disabled property.
        track_index (int): The index of the track containing the target clip.
            Track indices start at 0 for the first track and increment upward.
            For video tracks, this refers to video track indices.
            For audio tracks, this refers to audio track indices.
        track_item_index (int): The index of the clip within the track to enable/disable.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
        track_type (str): Specifies which type of track to modify.
            Valid values:
            - "VIDEO": Modify clips on the specified video track
            - "AUDIO": Modify clips on the specified audio track
        disabled (bool): Whether to disable the clip.
            - True: Disables the clip (clip will not be visible during playback or export)
            - False: Enables the clip (normal visibility)
    """

    command = createCommand("setClipDisabled", {
        "sequenceId": sequence_id,
        "trackIndex":track_index,
        "trackItemIndex":track_item_index,
        "trackType":track_type,
        "disabled":disabled
    })

    return sendCommand(command)


@mcp.tool()
def set_clip_start_end_times(
    sequence_id: str, track_index: int, track_item_index: int, start_time_ticks: int, 
        end_time_ticks: int, track_type: str):
    """
    Sets the start and end time boundaries for a specified clip in the timeline.
    
    This function allows you to modify the duration and timing of video clips, audio clips, 
    and images that are already placed in the timeline by adjusting their in and out points. 
    The clip can be trimmed to a shorter duration or extended to a longer duration.
    
    Args:
        sequence_id (str): The id for the sequence containing the clip to modify.
        track_index (int): The index of the track containing the target clip.
            Track indices start at 0 for the first track and increment upward.
            For video tracks, this refers to video track indices.
            For audio tracks, this refers to audio track indices.
        track_item_index (int): The index of the clip within the track to modify.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
        start_time_ticks (int): The new start time for the clip in ticks.
        end_time_ticks (int): The new end time for the clip in ticks.
        track_type (str): Specifies which type of tracks to modify clips on.
            Valid values:
            - "VIDEO": Modify clips only on the specified video track
            - "AUDIO": Modify clips only on the specified audio track  
        
    Note:
        - To trim a clip: Set start/end times within the original clip's duration
        - To extend a clip: Set end time beyond the original clip's duration  
        - Works with video clips, audio clips, and image files (like PSD files)
        - Times are specified in ticks (Premiere Pro's internal time unit)
    """

    command = createCommand("setClipStartEndTimes", {
        "sequenceId": sequence_id,
        "trackIndex": track_index,
        "trackItemIndex": track_item_index,
        "startTimeTicks": start_time_ticks,
        "endTimeTicks": end_time_ticks,
        "trackType": track_type
    })

    return sendCommand(command)

@mcp.tool()
def add_black_and_white_effect(sequence_id:str, video_track_index: int, track_item_index: int):
    """
    Adds a black and white effect to a clip at the specified track and position.
    
    Args:
        sequence_id (str) : The id for the sequence to add the effect to
        video_track_index (int): The index of the video track containing the target clip.
            Track indices start at 0 for the first video track and increment upward.
        track_item_index (int): The index of the clip within the track to apply the effect to.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
    """

    command = createCommand("appendVideoFilter", {
        "sequenceId": sequence_id,
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "effectName":"AE.ADBE Black & White",
        "properties":[
        ]
    })

    return sendCommand(command)

@mcp.tool()
def get_sequence_frame_image(sequence_id: str, seconds: int):
    """Returns a jpeg of the specified timestamp in the specified sequence in Premiere pro as an MCP Image object that can be displayed."""
    
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, f"frame_{sequence_id}_{seconds}.png")
    
    command = createCommand("exportFrame", {
        "sequenceId": sequence_id,
        "filePath": file_path,
        "seconds": seconds
    })
    
    result = sendCommand(command)
    
    if not result.get("status") == "SUCCESS":
        return result
    
    file_path = result["response"]["filePath"]
    
    with open(file_path, 'rb') as f:
        png_image = PILImage.open(f)
        
        # Convert to RGB if necessary (removes alpha channel)
        if png_image.mode in ("RGBA", "LA", "P"):
            rgb_image = PILImage.new("RGB", png_image.size, (255, 255, 255))
            rgb_image.paste(png_image, mask=png_image.split()[-1] if png_image.mode == "RGBA" else None)
            png_image = rgb_image
        
        # Save as JPEG to bytes buffer
        jpeg_buffer = io.BytesIO()
        png_image.save(jpeg_buffer, format="JPEG", quality=85, optimize=True)
        jpeg_bytes = jpeg_buffer.getvalue()
    
    image = Image(data=jpeg_bytes, format="jpeg")
    
    del result["response"]
    
    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
    
    return [result, image]

@mcp.tool()
def export_frame(sequence_id:str, file_path: str, seconds: int):
    """Captures a specific frame from the sequence at the given timestamp
    and exports it as a PNG or JPG (depending on file extension) image file to the specified path.
    
    Args:
        sequence_id (str) : The id for the sequence to export the frame from
        file_path (str): The destination path where the exported PNG / JPG image will be saved.
            Must include the full directory path and filename with .png or .jpg extension.
        seconds (int): The timestamp in seconds from the beginning of the sequence
            where the frame should be captured. The frame closest to this time position
            will be extracted.
    """
    
    command = createCommand("exportFrame", {
        "sequenceId": sequence_id,
        "filePath": file_path,
        "seconds":seconds
        }
    )

    return sendCommand(command)


@mcp.tool()
def add_gaussian_blur_effect(sequence_id: str, video_track_index: int, track_item_index: int, blurriness: float, blur_dimensions: str = "HORIZONTAL_VERTICAL"):
    """
    Adds a gaussian blur effect to a clip at the specified track and position.

    Args:
        sequence_id (str) : The id for the sequence to add the effect to
        video_track_index (int): The index of the video track containing the target clip.
            Track indices start at 0 for the first video track and increment upward.
            
        track_item_index (int): The index of the clip within the track to apply the effect to.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
            
        blurriness (float): The intensity of the blur effect. Higher values create stronger blur.
            Recommended range is between 0.0 and 100.0 (Max 3000).
            
        blur_dimensions (str, optional): The direction of the blur effect. Defaults to "HORIZONTAL_VERTICAL".
            Valid options are:
            - "HORIZONTAL_VERTICAL": Blur in all directions
            - "HORIZONTAL": Blur only horizontally
            - "VERTICAL": Blur only vertically
    """
    dimensions = {"HORIZONTAL_VERTICAL": 0, "HORIZONTAL": 1, "VERTICAL": 2}
    
    # Validate blur_dimensions parameter
    if blur_dimensions not in dimensions:
        raise ValueError(f"Invalid blur_dimensions. ")

    command = createCommand("appendVideoFilter", {
        "sequenceId": sequence_id,
        "videoTrackIndex": video_track_index,
        "trackItemIndex": track_item_index,
        "effectName": "AE.ADBE Gaussian Blur 2",
        "properties": [
            {"name": "Blur Dimensions", "value": dimensions[blur_dimensions]},
            {"name": "Blurriness", "value": blurriness}
        ]
    })

    return sendCommand(command)

def rgb_to_premiere_color3(rgb_color, alpha=1.0):
    """Converts RGB (0–255) dict to Premiere Pro color format [r, g, b, a] with floats (0.0–1.0)."""
    return [
        rgb_color["red"] / 255.0,
        rgb_color["green"] / 255.0,
        rgb_color["blue"] / 255.0,
        alpha
    ]

def rgb_to_premiere_color(rgb_color, alpha=255):
    """
    Converts an RGB(A) dict (0–255) to a 64-bit Premiere Pro color parameter (as int).
    Matches Adobe's internal ARGB 16-bit fixed-point format.
    """
    def to16bit(value):
        return int(round(value * 256))

    r16 = to16bit(rgb_color["red"] / 255.0)
    g16 = to16bit(rgb_color["green"] / 255.0)
    b16 = to16bit(rgb_color["blue"] / 255.0)
    a16 = to16bit(alpha / 255.0)

    high = (a16 << 16) | r16       # top 32 bits: A | R
    low = (g16 << 16) | b16        # bottom 32 bits: G | B

    packed_color = (high << 32) | low
    return packed_color



@mcp.tool()
def add_tint_effect(sequence_id: str, video_track_index: int, track_item_index: int, black_map:dict = {"red":0, "green":0, "blue":0}, white_map:dict = {"red":255, "green":255, "blue":255}, amount:int = 100):
    """
    Adds the tint effect to a clip at the specified track and position.
    
    This function applies a tint effect that maps the dark and light areas of the clip to specified colors.
    
    Args:
        sequence_id (str) : The id for the sequence to add the effect to
        video_track_index (int): The index of the video track containing the target clip.
            Track indices start at 0 for the first video track and increment upward.
            
        track_item_index (int): The index of the clip within the track to apply the effect to.
            Clip indices start at 0 for the first clip in the track and increment from left to right.
            
        black_map (dict): The RGB color values to map black/dark areas to, with keys "red", "green", and "blue".
            Default is {"red":0, "green":0, "blue":0} (pure black).
            
        white_map (dict): The RGB color values to map white/light areas to, with keys "red", "green", and "blue".
            Default is {"red":255, "green":255, "blue":255} (pure white).
            
        amount (int): The intensity of the tint effect as a percentage, ranging from 0 to 100.
            Default is 100 (full tint effect).
    """

    command = createCommand("appendVideoFilter", {
        "sequenceId": sequence_id,
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "effectName":"AE.ADBE Tint",
        "properties":[
            #{"name":"Map White To", "value":rgb_to_premiere_color(white_map)},
            #{"name":"Map Black To", "value":rgb_to_premiere_color(black_map)}
            {"name":"Map Black To", "value":rgb_to_premiere_color(black_map)}
            #{"name":"Amount to Tint", "value":amount / 100}
        ]
    })

    return sendCommand(command)



@mcp.tool()
def add_motion_blur_effect(sequence_id: str, video_track_index: int, track_item_index: int, direction: int, length: int):
    """
    Adds the directional blur effect to a clip at the specified track and position.
    
    This function applies a motion blur effect that simulates movement in a specific direction.
    
    Args:
        sequence_id (str) : The id for the sequence to add the effect to
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
    """

    command = createCommand("appendVideoFilter", {
        "sequenceId": sequence_id,
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
def append_video_transition(sequence_id: str, video_track_index: int, track_item_index: int, transition_name: str, duration: float = 1.0, clip_alignment: float = 0.5):
    """
    Creates a transition between the specified clip and the adjacent clip on the timeline.
    
    In general, you should keep transitions short (no more than 2 seconds is a good rule).

    Args:
        sequence_id (str) : The id for the sequence to add the transition to
        video_track_index (int): The index of the video track containing the target clips.
        track_item_index (int): The index of the clip within the track to apply the transition to.
        transition_name (str): The name of the transition to apply. Must be a valid transition name (see below).
        duration (float): The duration of the transition in seconds.
        clip_alignment (float): Controls how the transition is distributed between the two clips.
                                Range: 0.0 to 1.0, where:
                                - 0.0 places transition entirely on the right (later) clip
                                - 0.5 centers the transition equally between both clips (default)
                                - 1.0 places transition entirely on the left (earlier) clip
 
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
        "sequenceId": sequence_id,
        "videoTrackIndex":video_track_index,
        "trackItemIndex":track_item_index,
        "transitionName":transition_name,
        "clipAlignment":clip_alignment,
        "duration":duration
    })

    return sendCommand(command)


@mcp.tool()
def set_video_clip_properties(sequence_id: str, video_track_index: int, track_item_index: int, opacity: int = 100, blend_mode: str = "NORMAL"):
    """
    Sets opacity and blend mode properties for a video clip in the timeline.

    This function modifies the visual properties of a specific clip located on a specific video track
    in the active Premiere Pro sequence. The clip is identified by its track index and item index
    within that track.

    Args:
        sequence_id (str) : The id for the sequence to set the video clip properties
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
    """

    command = createCommand("setVideoClipProperties", {
        "sequenceId": sequence_id,
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
    3. Create a new sequence with media (should always add video / image clips before audio.(create_sequence_from_media). This will create a sequence with the clips.
    4. The first clip you add will determine the dimensions / resolution of the sequence

    Here are some general tips for when working with Premiere.

    Audio and Video clips are added on separate Audio / Video tracks, which you can access via their index.

    When adding a video clip that contains audio, the audio will be placed on a separate audio track.

    Once added you currently cannot remove a clip (audio or video) but you can disable it.

    If you want to do a transition between two clips, the clips must be on the same track and there should not be a gap between them. Place the transition of the first clip.

    Video clips with a higher track index will overlap and hide those with lower index if they overlap.

    When adding images to a sequence, they will have a duration of 5 seconds.

    blend_modes: {", ".join(BLEND_MODES)}
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
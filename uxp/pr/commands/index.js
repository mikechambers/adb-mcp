/* MIT License
 *
 * Copyright (c) 2025 Mike Chambers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const fs = require("uxp").storage.localFileSystem;
const app = require("premierepro");


const createProject = async (command) => {

    console.log("createProject")

    let options = command.options
    let path = options.path
    let name = options.name

    if (!path.endsWith('/')) {
        path = path + '/';
    }

    let project = await app.Project.createProject(`${path}${name}.prproj`) 

    //create a default sequence and set it as active
    let sequence = await project.createSequence("default")
    await project.setActiveSequence(sequence)
}

const appendVideoTransition = async (command) => {
    console.log("appendVideoTransition")

    let options = command.options

    let project = await app.Project.getActiveProject()
    let sequence = await project.getActiveSequence()

    if(!sequence) {
        throw new Error(`appendVideoFilter : Requires an active sequence.`)
    }

    let trackItem = await getVideoTrack(sequence, options.videoTrackIndex, options.trackItemIndex)

    let transition = await app.TransitionFactory.createVideoTransition(options.transitionName);

    let transitionOptions = new app.AddTransitionOptions()
    transitionOptions.setApplyToStart(false)

    const time = await app.TickTime.createWithSeconds(options.duration)
    transitionOptions.setDuration(time)
    transitionOptions.setTransitionAlignment(options.clipAlignment)

    let action = await trackItem.createAddVideoTransitionAction(transition, transitionOptions)

    executeAction(project, action)
}

/*
const appendAudioFilter = async (command) => {
    console.log("addAudioFilter")

    let options = command.options

    let project = await app.Project.getActiveProject()
    let sequence = await project.getActiveSequence()

    if(!sequence) {
        throw new Error(`appendAudioFilter : Requires an active sequence.`)
    }

    //todo: pass this in
    let audioTrack = await sequence.getAudioTrack(options.audioTrackIndex)
 
    if(!audioTrack) {
        throw new Error(`appendAudioFilter : audioTrackIndex [${options.audioTrackIndex}] does not exist`)
    }

    let trackItems = await audioTrack.getTrackItems(1, false)

    let trackItem;
    for(const t of trackItems) {
        let index = await t.getTrackIndex()
        if(index === options.trackItemIndex) {
            trackItem = t
            break
        }
    }
    
    if(!trackItem) {
        throw new Error(`appendAudioFilter : trackItemIndex [${options.trackItemIndex}] does not exist`)
    }

    const mosaic = await app.VideoFilterFactory.createComponent(
        options.effectName);

    let componentChain = await trackItem.getComponentChain()

    let action = await componentChain.createAppendComponentAction(
        mosaic, 0)

    executeAction(project, action)
}
    */

const getVideoTrack = async (sequence, trackIndex, clipIndex) => {

    //todo: pass this in
    let videoTrack = await sequence.getVideoTrack(trackIndex)
 
    if(!videoTrack) {
        throw new Error(`appendVideoFilter : videoTrackIndex [${trackIndex}] does not exist`)
    }


    let trackItems = await videoTrack.getTrackItems(1, false)

    let trackItem;
    for(const t of trackItems) {
        let index = await t.getTrackIndex()
        if(index === clipIndex) {
            trackItem = t
            break
        }
    }
    if(!trackItem) {
        throw new Error(`appendVideoFilter : trackItemIndex [${clipIndex}] does not exist`)
    }

    return trackItem
}

const appendVideoFilter = async (command) => {
    console.log("addVideoFilter")

    let options = command.options

    let project = await app.Project.getActiveProject()
    let sequence = await project.getActiveSequence()

    if(!sequence) {
        throw new Error(`appendVideoFilter : Requires an active sequence.`)
    }

    let trackItem = await getVideoTrack(sequence, options.videoTrackIndex, options.trackItemIndex)

    const mosaic = await app.VideoFilterFactory.createComponent(
        options.effectName);

    let componentChain = await trackItem.getComponentChain()

    let action = await componentChain.createAppendComponentAction(
        mosaic, 0)

    executeAction(project, action)
}

//note: right now, we just always add to the active sequence. Need to add support
//for specifying sequence
const addItemToSequence = async (command) => {
    console.log("addItemToSequence")

    let options = command.options
    let itemName = options.itemName

    //find project item by name
    let project = await app.Project.getActiveProject()

    let sequence = await project.getActiveSequence()

    if(!sequence) {
        throw new Error(`addItemToSequence : Requires an active sequence.`)
    }

    let root = await project.getRootItem()
    let rootItems = await root.getItems()

    let insertItem;
    for(const item of rootItems) {
        if (item.name == itemName) {
            insertItem = item;
            break;
        }
    }

    if(!insertItem) {
        throw new Error(
            `addItemToSequence : Could not find item named ${itemName}`
        );
    }

    let editor = await app.SequenceEditor.getEditor(sequence)

    //where to insert it
    const insertionTime = await app.TickTime.createWithSeconds(options.insertionTimeSeconds);
    const videoTrackIndex = options.videoTrackIndex
    const audioTrackIndex = options.audioTrackIndex

    //not sure what this does
    const limitShift = false

    let f = ((options.overwrite) ? editor.createOverwriteItemAction : editor.createInsertProjectItemAction).bind(editor)

    let action = f(insertItem, insertionTime, videoTrackIndex, audioTrackIndex, limitShift)

    executeAction(project, action)

      /*
      //this returns references to the actual clips on the timeline
      let videoTrack = await sequence.getVideoTrack(1) //index / layer
      let trackItems = await videoTrack.getTrackItems(1, true) //1 CLIP  Empty (0), Clip (1), Transition (2), Preview (3) or Feedback (4)
      */
     
}

const executeAction = (project, action) => {
    try {
        project.lockedAccess( () => {
            project.executeTransaction((compoundAction) => {
                compoundAction.addAction(action);
            });
          });
    } catch (e) {
        throw new Error(`Error executing locked transaction : ${e}`);
    }
};

const importFiles = async (command) => {
    console.log("importFiles")

    let options = command.options
    let paths = command.options.filePaths

    let project = await app.Project.getActiveProject()

    let root = await project.getRootItem()
    let originalItems = await root.getItems()

    //import everything into root
    let rootFolderItems = await project.getRootItem()
    let success = await project.importFiles(paths, true, rootFolderItems)
    //TODO: what is not success?

    let updatedItems = await root.getItems()
    
    const addedItems = updatedItems.filter(
        updatedItem => !originalItems.some(originalItem => originalItem.name === updatedItem.name)
      );
      
    let addedProjectItems = [];
    for (const p of addedItems) { 
        addedProjectItems.push({ name: p.name });
    }
    
    return { addedProjectItems };
}

/*
const getActiveProjectInfo = async (command) => {

    console.log("getActiveProjectInfo")

    let project = await app.Project.getActiveProject()

    let out = {
        name:project.name,
        path:project.path,
        id:project.guid.toString()
    }

    return out   
}
    */

/*
const getSequences = async (command) => {

    console.log("getSequences")

    let project = await app.Project.getActiveProject()

    let sequences = await project.getSequences()

    //what else should i add here

    let out = []
    for (const s of sequences) {
        out.push({
            name:s.name,
            id:s.guid.toString()
        })
    }

    return out   
}
    */

const getAudioTracks = async () => {
    let project = await app.Project.getActiveProject()
    let sequence = await project.getActiveSequence()

    let audioCount = await sequence.getAudioTrackCount()

    let audioTracks = []
    for(let i = 0; i < audioCount; i++) {
        let audioTrack = await sequence.getAudioTrack(i)

        let track = {
            index:i,
            tracks:[]
        }

        let clips = await audioTrack.getTrackItems(1, false)


        if(clips.length === 0) {
            continue
        }


        for (const c of clips) {
            let startTime = (await c.getStartTime()).seconds
            let endTime = (await c.getEndTime()).seconds
            let duration = (await c.getDuration()).seconds
            let name = (await c.getProjectItem()).name
            let type = await c.getType()
            let index = await c.getTrackIndex()

            track.tracks.push({
                startTime,
                endTime,
                duration,
                name,
                type,
                index
            })
        }

        audioTracks.push(track)
    }
    return audioTracks
}

const getVideoTracks = async () => {
    let project = await app.Project.getActiveProject()
    let sequence = await project.getActiveSequence()

    let videoCount = await sequence.getVideoTrackCount()

    let videoTracks = []
    for(let i = 0; i < videoCount; i++) {
        let videoTrack = await sequence.getVideoTrack(i)

        let track = {
            index:i,
            tracks:[]
        }

        let clips = await videoTrack.getTrackItems(1, false)


        if(clips.length === 0) {
            continue
        }


        for (const c of clips) {
            let startTime = (await c.getStartTime()).seconds
            let endTime = (await c.getEndTime()).seconds
            let duration = (await c.getDuration()).seconds
            let name = (await c.getProjectItem()).name
            let type = await c.getType()
            let index = await c.getTrackIndex()

            track.tracks.push({
                startTime,
                endTime,
                duration,
                name,
                type,
                index
            })
        }

        videoTracks.push(track)
    }
    return videoTracks
}

const parseAndRouteCommand = async (command) => {
    let action = command.action;

    let f = commandHandlers[action];

    if (typeof f !== "function") {
        throw new Error(`Unknown Command: ${action}`);
    }

    return f(command);
};

const commandHandlers = {
    appendVideoTransition,
    //appendAudioFilter,
    appendVideoFilter,
    addItemToSequence,
    importFiles,
    createProject,
};

const checkRequiresActiveProject = async (command) => {
    if (!requiresActiveProject(command)) {
        return;
    }

    let project = await app.Project.getActiveProject()
    if (!project) {
        throw new Error(
            `${command.action} : Requires an open Premiere Project`
        );
    }
};

const requiresActiveProject = (command) => {
    return !["createProject"].includes(command.action);
};

module.exports = {
    getAudioTracks,
    getVideoTracks,
    checkRequiresActiveProject,
    parseAndRouteCommand
};

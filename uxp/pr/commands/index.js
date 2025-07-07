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
//const openfs = require('fs')
const app = require("premierepro");
const {consts, BLEND_MODES} = require("./consts.js")

const createSequenceFromMedia = async (command) => {

    let options = command.options

    let itemNames = options.itemNames
    let sequenceName = options.sequenceName

    let project = await app.Project.getActiveProject()

    let found = false
    try {
        await findProjectItem(sequenceName, project)
        found  = true
    } catch {
        //do nothing
    }

    if(found) {
        throw Error(`createSequenceFromMedia : sequence name [${sequenceName}] is already in use`)
    }

    let items = []
    for (const name of itemNames) {

        //this is a little inefficient
        let insertItem = await findProjectItem(name, project)
        items.push(insertItem)
    }


    let root = await project.getRootItem()
    
    let sequence = await project.createSequenceFromMedia(sequenceName, items, root)

    await _setActiveSequence(sequence)
}

const findSequenceByName = async (sequenceName) => {
    let project = await app.Project.getActiveProject()
    let sequences = await project.getSequences()

    for(const s of sequences) {
        if(s.name == sequenceName) {
            return s
        }
    }

    return
}

const getProjectInfo = async (command) => {
    return {}
}

const _getSequenceFromId = async (id) => {
    let project = await app.Project.getActiveProject()

    let guid = app.Guid.fromString(id)
    let sequence = await project.getSequence(guid)

    if(!sequence) {
        throw new Error(`_getSequenceFromId : Could not find sequence with id : ${id}`)
    }

    return sequence
}


const _setActiveSequence = async (sequence) => {
    let project = await app.Project.getActiveProject()
    await project.setActiveSequence(sequence)

    let item = await findProjectItem(sequence.name, project)
    await app.SourceMonitor.openProjectItem(item)
}

const setActiveSequence = async (command) => {
    let options = command.options
    let id = options.sequenceId

    let sequence = await _getSequenceFromId(id)

    await _setActiveSequence(sequence)
}

const createProject = async (command) => {

    let options = command.options
    let path = options.path
    let name = options.name

    if (!path.endsWith('/')) {
        path = path + '/';
    }

    //todo: this will open a dialog if directory doesnt exist
    let project = await app.Project.createProject(`${path}${name}.prproj`) 


    if(!project) {
        throw new Error("createProject : Could not create project. Check that the directory path exists and try again.")
    }

    //create a default sequence and set it as active
    //let sequence = await project.createSequence("default")
    //await project.setActiveSequence(sequence)
}

const exportFrame = async (command) => {
    const options = command.options
    let id = options.sequenceId

    let sequence = await _getSequenceFromId(id)

    let size = await sequence.getFrameSize()

    let p = window.path.parse(options.filePath)

    let t = app.TickTime.createWithSeconds(options.seconds)

    let out = await app.Exporter.exportSequenceFrame(sequence, t, p.base, p.dir, size.width, size.height)

    let ps = `${p.dir}${window.path.sep}${p.base}`
    let outPath = `${ps}.png`

    if(!out) {
        throw new Error(`exportFrame : Could not save frame to [${outPath}]`);
    }
    //console.log(ps)
    //console.log(`${ps}.png`)

    //let tmp = await openfs.rename(`file:${ps}.png`, `file:${ps}`);

    return {"filePath": outPath}
}

const setAudioClipDisabled = async (command) => {

    let options = command.options
    let id = options.sequenceId

    let project = await app.Project.getActiveProject()
    let sequence = await _getSequenceFromId(id)

    if(!sequence) {
        throw new Error(`setAudioClipDisabled : Requires an active sequence.`)
    }

    let trackItem = await getAudioTrack(sequence, options.audioTrackIndex, options.trackItemIndex)

    execute(() => {
        let action = trackItem.createSetDisabledAction(options.disabled)
        return [action]
    }, project)

}

const setVideoClipDisabled = async (command) => {

    let options = command.options
    let id = options.sequenceId

    let project = await app.Project.getActiveProject()
    let sequence = await _getSequenceFromId(id)

    if(!sequence) {
        throw new Error(`setVideoClipDisabled : Requires an active sequence.`)
    }

    let trackItem = await getVideoTrack(sequence, options.videoTrackIndex, options.trackItemIndex)

    execute(() => {
        let action = trackItem.createSetDisabledAction(options.disabled)
        return [action]
    }, project)
}

const appendVideoTransition = async (command) => {

    let options = command.options
    let id = options.sequenceId

    let project = await app.Project.getActiveProject()
    let sequence = await _getSequenceFromId(id)

    if(!sequence) {
        throw new Error(`appendVideoTransition : Requires an active sequence.`)
    }

    let trackItem = await getVideoTrack(sequence, options.videoTrackIndex, options.trackItemIndex)

    let transition = await app.TransitionFactory.createVideoTransition(options.transitionName);

    let transitionOptions = new app.AddTransitionOptions()
    transitionOptions.setApplyToStart(false)

    const time = await app.TickTime.createWithSeconds(options.duration)
    transitionOptions.setDuration(time)
    transitionOptions.setTransitionAlignment(options.clipAlignment)

    execute(() => {
        let action = trackItem.createAddVideoTransitionAction(transition, transitionOptions)
        return [action]
    }, project)
}


const setParam = async(trackItem, componentName, paramName, value) => {

    const project = await app.Project.getActiveProject()

    let param = await getParam(trackItem, componentName, paramName)

    let keyframe = await param.createKeyframe(value)

    execute(() => {
        let action = param.createSetValueAction(keyframe);
        return [action]
    }, project)
}

const getParam = async (trackItem, componentName, paramName) => {

    let components = await trackItem.getComponentChain()

    const count = components.getComponentCount()
    for(let i = 0; i < count; i++) {
        const component =  components.getComponentAtIndex(i)

        //search for match name
        //component name AE.ADBE Opacity
        const matchName = await component.getMatchName()
        
        
        if(matchName == componentName) {
            console.log(matchName)
            let pCount = component.getParamCount()

            for (let j = 0; j < pCount; j++) {
                
                const param = component.getParam(j);

                console.log(param.type)
                console.log(param)
                if(param.displayName == paramName) {
                    return param
                }

            }
        }
    }
}


const setVideoClipProperties = async (command) => {

    const options = command.options
    let id = options.sequenceId

    let project = await app.Project.getActiveProject()
    let sequence = await _getSequenceFromId(id)

    if(!sequence) {
        throw new Error(`setVideoClipProperties : Requires an active sequence.`)
    }

    let trackItem = await getVideoTrack(sequence, options.videoTrackIndex, options.trackItemIndex)

    let opacityParam = await getParam(trackItem, "AE.ADBE Opacity", "Opacity")
    let opacityKeyframe = await opacityParam.createKeyframe(options.opacity)

    let blendModeParam = await getParam(trackItem, "AE.ADBE Opacity", "Blend Mode")

    let mode = BLEND_MODES[options.blendMode.toUpperCase()]
    let blendModeKeyframe = await blendModeParam.createKeyframe(mode)

    execute(() => {
        let opacityAction = opacityParam.createSetValueAction(opacityKeyframe);
        let blendModeAction = blendModeParam.createSetValueAction(blendModeKeyframe);
        return [opacityAction, blendModeAction]
    }, project)

    // /AE.ADBE Opacity
    //Opacity
    //Blend Mode

}

const appendVideoFilter = async (command) => {

    let options = command.options
    let id = options.sequenceId

    let sequence = await _getSequenceFromId(id)

    if(!sequence) {
        throw new Error(`appendVideoFilter : Requires an active sequence.`)
    }

    let trackItem = await getVideoTrack(sequence, options.videoTrackIndex, options.trackItemIndex)

    let effectName = options.effectName
    let properties = options.properties

    let d = await addEffect(trackItem, effectName)

    for(const p of properties) {
        console.log(p.value)
        await setParam(trackItem, effectName, p.name, p.value)
    }
}

const addEffect = async (trackItem, effectName) => {
    let project = await app.Project.getActiveProject()
    const effect = await app.VideoFilterFactory.createComponent(effectName);

    let componentChain = await trackItem.getComponentChain()
    
    execute(() => {
        let action = componentChain.createAppendComponentAction(
            effect, 0)//todo, second isnt needed
        return [action]
    }, project)
}


const setAudioTrackMute = async (command) => {

    let options = command.options
    let id = options.sequenceId

    let sequence = await _getSequenceFromId(id)

    let track = await sequence.getAudioTrack(options.audioTrackIndex)
    track.setMute(options.mute)
}


const findProjectItem = async (itemName, project) => {
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

    return insertItem
}

//note: right now, we just always add to the active sequence. Need to add support
//for specifying sequence
const addMediaToSequence = async (command) => {

    let options = command.options
    let itemName = options.itemName
    let id = options.sequenceId

    let project = await app.Project.getActiveProject()
    let sequence = await _getSequenceFromId(id)

    let insertItem = await findProjectItem(itemName, project)

    let editor = await app.SequenceEditor.getEditor(sequence)
  
    const insertionTime = await app.TickTime.createWithTicks(options.insertionTimeTicks.toString());
    const videoTrackIndex = options.videoTrackIndex
    const audioTrackIndex = options.audioTrackIndex
  
    //not sure what this does
    const limitShift = false

    //let f = ((options.overwrite) ? editor.createOverwriteItemAction : editor.createInsertProjectItemAction).bind(editor)
    //let action = f(insertItem, insertionTime, videoTrackIndex, audioTrackIndex, limitShift)
    execute(() => {
        let action = editor.createOverwriteItemAction(insertItem, insertionTime, videoTrackIndex, audioTrackIndex)
        return [action]
    }, project)  
}

const execute = (getActions, project) => {
    try {
        project.lockedAccess( () => {
            project.executeTransaction((compoundAction) => {
                let actions = getActions()

                for(const a of actions) {
                    compoundAction.addAction(a);
                }
            });
          });
    } catch (e) {
        throw new Error(`Error executing locked transaction : ${e}`);
    }
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

const importMedia = async (command) => {

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


const getAudioTracks = async (sequence) => {
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

        let k = 0
        for (const c of clips) {
            let startTimeTicks = (await c.getStartTime()).ticks
            let endTimeTicks = (await c.getEndTime()).ticks
            let durationTicks = (await c.getDuration()).ticks
            let durationSeconds = (await c.getDuration()).seconds
            let name = (await c.getProjectItem()).name
            let type = await c.getType()
            let index = k++

            track.tracks.push({
                startTimeTicks,
                endTimeTicks,
                durationTicks,
                durationSeconds,
                name,
                type,
                index
            })
        }

        audioTracks.push(track)
    }
    return audioTracks
}

const getSequences = async () => {
    let project = await app.Project.getActiveProject()
    let active = await project.getActiveSequence()

    let sequences = await project.getSequences()

    let out = []
    for(const sequence of sequences) {
        let size = await sequence.getFrameSize()
        //let settings = await sequence.getSettings()
    
        //let projectItem = await sequence.getProjectItem()
        //let name = projectItem.name
        let name = sequence.name
        let id = sequence.guid.toString()
    
        let videoTracks = await getVideoTracks(sequence)
        let audioTracks = await getAudioTracks(sequence)
    
        let isActive = active == sequence

        out.push( {
            isActive,
            name,
            id,
            frameSize:{width:size.width, height:size.height},
            videoTracks,
            audioTracks
        })
    }

    return out
}

const getVideoTracks = async (sequence) => {
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


        let k = 0;
        for (const c of clips) {
            let startTimeTicks = (await c.getStartTime()).ticks
            let endTimeTicks = (await c.getEndTime()).ticks
            let durationTicks = (await c.getDuration()).ticks
            let durationSeconds = (await c.getDuration()).seconds
            let name = (await c.getProjectItem()).name
            let type = await c.getType()
            let index = k++

            track.tracks.push({
                startTimeTicks,
                endTimeTicks,
                durationTicks,
                durationSeconds,
                name,
                type,
                index
            })
        }
        
        videoTracks.push(track)
    }
    return videoTracks
}

const getAudioTrack = async (sequence, trackIndex, clipIndex) => {

    //todo: pass this in
    let audioTrack = await sequence.getAudioTrack(trackIndex)
 
    if(!audioTrack) {
        throw new Error(`getAudioTrack : audioTrackIndex [${trackIndex}] does not exist`)
    }


    let trackItems = await audioTrack.getTrackItems(1, false)

    let trackItem;
    let i = 0
    for(const t of trackItems) {
        let index = i++
        if(index === clipIndex) {
            trackItem = t
            break
        }
    }
    if(!trackItem) {
        throw new Error(`getAudioTrack : trackItemIndex [${clipIndex}] does not exist`)
    }

    return trackItem
}


const getVideoTrack = async (sequence, trackIndex, clipIndex) => {

    //todo: pass this in
    let videoTrack = await sequence.getVideoTrack(trackIndex)
 
    if(!videoTrack) {
        throw new Error(`getVideoTrack : videoTrackIndex [${trackIndex}] does not exist`)
    }

    let trackItems = await videoTrack.getTrackItems(1, false)

    let trackItem;
    let i = 0
    for(const t of trackItems) {
        let index = i++
        if(index === clipIndex) {
            trackItem = t
            break
        }
    }
    if(!trackItem) {
        throw new Error(`getVideoTrack : clipIndex [${clipIndex}] does not exist`)
    }

    return trackItem
}

const getProjectContentInfo = async () => {
    let project = await app.Project.getActiveProject()

    let root = await project.getRootItem()
    let items = await root.getItems()

    let out = []
    for(const item of items) {
        //todo: it would be good to get more data / info here
        out.push({name:item.name})
    }

    return out
}

const saveProject = async (command) => {
    let project = await app.Project.getActiveProject()

    project.save()
}

const saveProjectAs = async (command) => {
    let project = await app.Project.getActiveProject()

    const options = command.options;
    const filePath = options.filePath;

    project.saveAs(filePath)
}

const openProject = async (command) => {

    const options = command.options;
    const filePath = options.filePath;

    await app.Project.open(filePath);    
}

const parseAndRouteCommand = async (command) => {
    let action = command.action;

    let f = commandHandlers[action];

    if (typeof f !== "function") {
        throw new Error(`Unknown Command: ${action}`);
    }

    console.log(f.name)
    return f(command);
};

const commandHandlers = {
    openProject,
    saveProjectAs,
    saveProject,
    getProjectInfo,
    setActiveSequence,
    exportFrame,
    setVideoClipProperties,
    createSequenceFromMedia,
    setAudioTrackMute,
    setAudioClipDisabled,
    setVideoClipDisabled,
    appendVideoTransition,
    appendVideoFilter,
    addMediaToSequence,
    importMedia,
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
    return !["createProject", "openProject"].includes(command.action);
};

module.exports = {
    getSequences,
    getProjectContentInfo,
    getAudioTracks,
    getVideoTracks,
    checkRequiresActiveProject,
    parseAndRouteCommand
};

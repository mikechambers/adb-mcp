
const fs = require("uxp").storage.localFileSystem;
const app = require("premierepro");
const constants = require("premierepro").Constants;

const {BLEND_MODES} = require("./consts.js")

const {
    _getSequenceFromId,
    _setActiveSequence,
    setParam,
    getParam,
    addEffect,
    findProjectItem,
    execute,
    getAudioTrack,
    getVideoTrack,
    getAudioTrackItems,
    getVideoTrackItems
} = require("./utils.js")

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


const setAudioTrackMute = async (command) => {

    let options = command.options
    let id = options.sequenceId

    let sequence = await _getSequenceFromId(id)

    let track = await sequence.getAudioTrack(options.audioTrackIndex)
    track.setMute(options.mute)
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


const _exportFrame = async (sequence, filePath, seconds) => {

    const fileType = filePath.split('.').pop()

    let size = await sequence.getFrameSize()

    let p = window.path.parse(filePath)
    let t = app.TickTime.createWithSeconds(seconds)

    let out = await app.Exporter.exportSequenceFrame(sequence, t, p.base, p.dir, size.width, size.height)

    let ps = `${p.dir}${window.path.sep}${p.base}`
    let outPath = `${ps}.${fileType}`

    if(!out) {
        throw new Error(`exportFrame : Could not save frame to [${outPath}]`);
    }

    return outPath
}

const exportFrame = async (command) => {
    const options = command.options;
    let id = options.sequenceId;
    let filePath = options.filePath;
    let seconds = options.seconds;

    let sequence = await _getSequenceFromId(id);

    const outPath = await _exportFrame(sequence, filePath, seconds);

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


const getProjectInfo = async (command) => {
    return {}
}



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


const setVideoClipStartEndTimes = async (command) => {
    const options = command.options;

    const sequenceId = options.sequenceId;
    const videoTrackIndex = options.videoTrackIndex;
    const trackItemIndex = options.trackItemIndex;
    const startTimeTicks = options.startTimeTicks;
    const endTimeTicks = options.endTimeTicks;


    const sequence = await _getSequenceFromId(sequenceId)
  
    const trackItem = await getVideoTrack(sequence, videoTrackIndex, trackItemIndex)

    const startTick = await app.TickTime.createWithTicks(startTimeTicks.toString());
    const endTick = await app.TickTime.createWithTicks(endTimeTicks.toString());;

    let project = await app.Project.getActiveProject();

    execute(() => {
        const startAction = trackItem.createSetStartAction(startTick);
        const endAction = trackItem.createSetEndAction(endTick);
        return [startAction, endAction]
    }, project)
}

const closeGapsOnSequence = async(command) => {
    const options = command.options
    const sequenceId = options.sequenceId;
    const trackIndex = options.trackIndex;
    const scope = options.scope;

    let sequence = await _getSequenceFromId(sequenceId)

    let out = await _closeGapsOnSequence(sequence, trackIndex, scope)
    
    return out
}

const _closeGapsOnSequence = async (sequence, trackIndex, scope) => {
  
    let project = await app.Project.getActiveProject()

    let videoItems;
    let audioItems

    if (scope === "VIDEO" || scope === "AUDIO_VIDEO") {
        videoItems = await getVideoTrackItems(sequence, trackIndex)
    }
    
    if (scope === "AUDIO" || scope === "AUDIO_VIDEO") {
        audioItems = await getAudioTrackItems(sequence, trackIndex)
    }

    if((!audioItems || audioItems.length === 0) && (!videoItems || videoItems.length === 0)) {
        return;
    }

    if(scope === "AUDIO_VIDEO" && audioItems.length !== videoItems.length ) {
        throw new Error("_closeGapsOnSequence : audio and video track lengths must be equal when scope = AUDIO_VIDEO")
    }
    
    const f = async (item, targetPosition) => {
        let currentStart = await item.getStartTime()

        let a = await currentStart.ticksNumber
        let b = await targetPosition.ticksNumber
        let shiftAmount = (a - b)// How much to shift 
        
        shiftAmount *= -1;

        let shiftTick = app.TickTime.createWithTicks(shiftAmount.toString())

        return shiftTick
    }

    let videoTargetPosition = app.TickTime.createWithTicks("0")
    let audioTargetPosition = app.TickTime.createWithTicks("0") 


    let counterItems = (scope === "VIDEO" || scope === "AUDIO_VIDEO")?videoItems:audioItems;

    for(let i = 0; i < counterItems.length; i++) {
        let videoShiftTick;
        let videoItem;

        let audioShiftTick;
        let audioItem;

        if (scope === "VIDEO" || scope === "AUDIO_VIDEO") {
            videoItem = videoItems[i]
            videoShiftTick = await f(videoItem, videoTargetPosition)
        }

        if (scope === "AUDIO" || scope === "AUDIO_VIDEO") {
            audioItem = audioItems[i]
            audioShiftTick = await f(audioItem, audioTargetPosition)
        }

        execute(() => {
            let out = []

            if(videoShiftTick) {
                out.push(videoItem.createMoveAction(videoShiftTick))
            }

            if(audioShiftTick) {
                out.push(audioItem.createMoveAction(audioShiftTick))
            }

            return out
        }, project)
        
        if(videoShiftTick) {
            videoTargetPosition = await videoItem.getEndTime()
        }
        
        if(audioShiftTick) {
            audioTargetPosition = await audioItem.getEndTime()
        }
    }
}

//TODO: change API to take scope?
const removeItemFromSequence = async (command) => {
    const options = command.options;

    const sequenceId = options.sequenceId;
    const videoTrackIndex = options.videoTrackIndex;
    const audioTrackIndex = options.audioTrackIndex;
    const trackItemIndex = options.trackItemIndex;
    const rippleDelete = options.rippleDelete;

    let project = await app.Project.getActiveProject()
    let sequence = await _getSequenceFromId(sequenceId)

    let item;
    if (videoTrackIndex != undefined) {
        item = await getVideoTrack(sequence, videoTrackIndex, trackItemIndex)
    } else if (audioTrackIndex != undefined) {
        item = await getAudioTrack(sequence, audioTrackIndex, trackItemIndex)
    } else {
        throw new Error(`removeItemFromSequence : audioTrackIndex or videoTrackIndex must be specified.`)
    }

    let editor = await app.SequenceEditor.getEditor(sequence)

    let trackItemSelection = await sequence.getSelection();
    let items = await trackItemSelection.getTrackItems()

    for (let t of items) {
        await trackItemSelection.removeItem(t)
    }

    trackItemSelection.addItem(item, true)

    execute(() => {

        const shiftOverlapping = false
        let action = editor.createRemoveItemsAction(trackItemSelection, rippleDelete, constants.MediaType.ANY, shiftOverlapping )
        return [action]
    }, project)
}


const commandHandlers = {
    closeGapsOnSequence,
    removeItemFromSequence,
    setVideoClipStartEndTimes,
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

module.exports = {
    commandHandlers
}
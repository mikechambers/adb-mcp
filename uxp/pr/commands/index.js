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

    execute(() => {

        //TODO: overwrite seems to be ignored
        let f = ((options.overwrite) ? editor.createOverwriteItemAction : editor.createInsertProjectItemAction).bind(editor)

        let action = f(insertItem, insertionTime, videoTrackIndex, audioTrackIndex, limitShift)

        return action
    }, project);

      /*
      //this returns references to the actual clips on the timeline
      let videoTrack = await sequence.getVideoTrack(1) //index / layer
      let trackItems = await videoTrack.getTrackItems(1, true) //1 CLIP  Empty (0), Clip (1), Transition (2), Preview (3) or Feedback (4)
      */
     
}

const execute = (callback, project) => {
    try {
        project.lockedAccess( () => {
            project.executeTransaction((compoundAction) => {
                let action = callback()
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

const parseAndRouteCommand = async (command) => {
    let action = command.action;

    let f = commandHandlers[action];

    if (typeof f !== "function") {
        throw new Error(`Unknown Command: ${action}`);
    }

    return f(command);
};

const commandHandlers = {
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
    checkRequiresActiveProject,
    parseAndRouteCommand
};

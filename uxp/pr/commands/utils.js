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

const app = require("premierepro");
const { TRACK_TYPE, TICKS_PER_SECOND } = require("./consts.js");

const _getSequenceFromId = async (id) => {
    let project = await app.Project.getActiveProject();

    let guid = app.Guid.fromString(id);
    let sequence = await project.getSequence(guid);

    if (!sequence) {
        throw new Error(
            `_getSequenceFromId : Could not find sequence with id : ${id}`
        );
    }

    return sequence;
};

const _setActiveSequence = async (sequence) => {
    let project = await app.Project.getActiveProject();
    await project.setActiveSequence(sequence);

    let item = await findProjectItem(sequence.name, project);
    await app.SourceMonitor.openProjectItem(item);
};

const setParam = async (trackItem, componentName, paramName, value) => {
    const project = await app.Project.getActiveProject();

    let param = await getParam(trackItem, componentName, paramName);

    let keyframe = await param.createKeyframe(value);

    execute(() => {
        let action = param.createSetValueAction(keyframe);
        return [action];
    }, project);
};

const getParam = async (trackItem, componentName, paramName) => {
    let components = await trackItem.getComponentChain();

    const count = components.getComponentCount();
    for (let i = 0; i < count; i++) {
        const component = components.getComponentAtIndex(i);

        //search for match name
        //component name AE.ADBE Opacity
        const matchName = await component.getMatchName();

        if (matchName == componentName) {
            console.log(matchName);
            let pCount = component.getParamCount();

            for (let j = 0; j < pCount; j++) {
                const param = component.getParam(j);

                console.log(param.type);
                console.log(param);
                if (param.displayName == paramName) {
                    return param;
                }
            }
        }
    }
};

const addEffect = async (trackItem, effectName) => {
    let project = await app.Project.getActiveProject();
    const effect = await app.VideoFilterFactory.createComponent(effectName);

    let componentChain = await trackItem.getComponentChain();

    execute(() => {
        let action = componentChain.createAppendComponentAction(effect, 0); //todo, second isnt needed
        return [action];
    }, project);
};

/*
const findProjectItem2 = async (itemName, project) => {
    let root = await project.getRootItem();
    let rootItems = await root.getItems();

    let insertItem;
    for (const item of rootItems) {
        if (item.name == itemName) {
            insertItem = item;
            break;
        }
    }

    if (!insertItem) {
        throw new Error(
            `addItemToSequence : Could not find item named ${itemName}`
        );
    }

    return insertItem;
};
*/

const findProjectItem = async (itemName, project) => {
    let root = await project.getRootItem();
    
    const searchItems = async (parentItem) => {
        let items = await parentItem.getItems();
        
        // First, check items at this level
        for (const item of items) {
            if (item.name === itemName) {
                return item;
            }
        }
        
        // If not found, search recursively in bins/folders
        for (const item of items) {
            const folderItem = app.FolderItem.cast(item);
            if (folderItem) {
                // This is a bin/folder, search inside it
                const foundItem = await searchItems(folderItem);
                if (foundItem) {
                    return foundItem;
                }
            }
        }
        
        return null; // Not found at this level or in any sub-folders
    };
    
    const insertItem = await searchItems(root);
    
    if (!insertItem) {
        throw new Error(
            `addItemToSequence : Could not find item named ${itemName}`
        );
    }

    return insertItem;
};


const execute = (getActions, project) => {
    try {
        project.lockedAccess(() => {
            project.executeTransaction((compoundAction) => {
                let actions = getActions();

                for (const a of actions) {
                    compoundAction.addAction(a);
                }
            });
        });
    } catch (e) {
        throw new Error(`Error executing locked transaction : ${e}`);
    }
};

const getTracks = async (sequence, trackType) => {
    let count;

    if (trackType === TRACK_TYPE.VIDEO) {
        count = await sequence.getVideoTrackCount();
    } else if (trackType === TRACK_TYPE.AUDIO) {
        count = await sequence.getAudioTrackCount();
    }

    let tracks = [];
    for (let i = 0; i < count; i++) {
        let track;

        if (trackType === TRACK_TYPE.VIDEO) {
            track = await sequence.getVideoTrack(i);
        } else if (trackType === TRACK_TYPE.AUDIO) {
            track = await sequence.getAudioTrack(i);
        }

        let out = {
            index: i,
            tracks: [],
        };

        let clips = await track.getTrackItems(1, false);

        if (clips.length === 0) {
            continue;
        }

        let k = 0;
        for (const c of clips) {
            let startTimeTicks = (await c.getStartTime()).ticks;
            let endTimeTicks = (await c.getEndTime()).ticks;
            let durationTicks = (await c.getDuration()).ticks;
            let durationSeconds = (await c.getDuration()).seconds;
            let name = (await c.getProjectItem()).name;
            let type = await c.getType();
            let index = k++;

            out.tracks.push({
                startTimeTicks,
                endTimeTicks,
                durationTicks,
                durationSeconds,
                name,
                type,
                index,
            });
        }

        tracks.push(out);
    }
    return tracks;
};

const getSequences = async () => {
    let project = await app.Project.getActiveProject();
    let active = await project.getActiveSequence();

    let sequences = await project.getSequences();

    let out = [];
    for (const sequence of sequences) {
        let size = await sequence.getFrameSize();
        //let settings = await sequence.getSettings()

        //let projectItem = await sequence.getProjectItem()
        //let name = projectItem.name
        let name = sequence.name;
        let id = sequence.guid.toString();

        let videoTracks = await getTracks(sequence,TRACK_TYPE.VIDEO);
        let audioTracks = await getTracks(sequence, TRACK_TYPE.AUDIO);

        let isActive = active == sequence;


        let timebase = await sequence.getTimebase()
        let fps = TICKS_PER_SECOND / timebase

        let endTime = await sequence.getEndTime()
        let durationSeconds = await endTime.seconds
        let durationTicks = await endTime.ticksNumber
        let ticksPerSecond = TICKS_PER_SECOND

        out.push({
            isActive,
            name,
            id,
            frameSize: { width: size.width, height: size.height },
            videoTracks,
            audioTracks,
            timebase,
            fps,
            durationSeconds,
            durationTicks,
            ticksPerSecond
        });
    }

    return out;
};

const getTrack = async (sequence, trackIndex, clipIndex, trackType) => {
    let trackItems = await getTrackItems(sequence, trackIndex, trackType);

    let trackItem;
    let i = 0;
    for (const t of trackItems) {
        let index = i++;
        if (index === clipIndex) {
            trackItem = t;
            break;
        }
    }
    if (!trackItem) {
        throw new Error(
            `getTrack : trackItemIndex [${clipIndex}] does not exist for track type [${trackType}]`
        );
    }

    return trackItem;
};

/*
const getAudioTrack = async (sequence, trackIndex, clipIndex) => {

    let trackItems = await getAudioTrackItems(sequence, trackIndex)

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
    */

const getTrackItems = async (sequence, trackIndex, trackType) => {
    let track;

    if (trackType === TRACK_TYPE.AUDIO) {
        track = await sequence.getAudioTrack(trackIndex);
    } else if (trackType === TRACK_TYPE.VIDEO) {
        track = await sequence.getVideoTrack(trackIndex);
    }

    if (!track) {
        throw new Error(
            `getTrackItems : getTrackItems [${trackIndex}] does not exist. Type : [${trackType}]`
        );
    }

    let trackItems = await track.getTrackItems(1, false);

    return trackItems;
};

/*
const getAudioTrackItems = async (sequence, trackIndex) => {
    let audioTrack = await sequence.getAudioTrack(trackIndex)
 
    if(!audioTrack) {
        throw new Error(`getAudioTrackItems : getAudioTrackItems [${trackIndex}] does not exist`)
    }

    let trackItems = await audioTrack.getTrackItems(1, false)

    return trackItems
}

const getVideoTrackItems = async (sequence, trackIndex) => {
    let videoTrack = await sequence.getVideoTrack(trackIndex)
 
    if(!videoTrack) {
        throw new Error(`getVideoTrackItems : videoTrackIndex [${trackIndex}] does not exist`)
    }

    let trackItems = await videoTrack.getTrackItems(1, false)

    return trackItems
}
*/
/*
const getVideoTrack = async (sequence, trackIndex, clipIndex) => {

    let trackItems = await getVideoTrackItems(sequence, trackIndex)

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
    */

module.exports = {
    getTrackItems,
    _getSequenceFromId,
    _setActiveSequence,
    setParam,
    getParam,
    addEffect,
    findProjectItem,
    execute,
    getTracks,
    getSequences,
    getTrack,
};

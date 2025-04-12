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

const { app, constants, action } = require("photoshop");
const fs = require("uxp").storage.localFileSystem;
const openfs = require('fs')

const {
    parseColor,
    getAlignmentMode,
    getNewDocumentMode,
    selectLayer,
    findLayer,
    execute,
    tokenify
} = require("./utils")

const { rasterizeLayer } = require("./layers").commandHandlers;
const {hasActiveSelection} = require("./utils")

const openFile = async (command) => {

    console.log("openFile")

    let options = command.options    

    await execute(async () => {

        let entry = null
        try {
            console.log("a")
            entry = await fs.getEntryWithUrl("file:" + options.filePath)
            console.log("b")
        } catch (e) {
            console.log("c")
            throw new Error("openFile: Could not create file entry. File probably does not exist.");
        }
     
        await app.open(entry)
    });
}

const placeImage = async (command) => {
    console.log("placeImage");
    let options = command.options;
    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`placeImage : Could not find layerName : ${layerName}`);
    }

    await execute(async () => {
        selectLayer(layer, true);
        let layerId = layer.id;

        let imagePath = await tokenify(options.imagePath);

        //console.log("pathimagePathToken", imagePath)

        let commands = [
            // Place
            {
                ID: layerId,
                _obj: "placeEvent",
                freeTransformCenterState: {
                    _enum: "quadCenterState",
                    _value: "QCSAverage",
                },
                null: {
                    _kind: "local",
                    _path: imagePath,
                },
                offset: {
                    _obj: "offset",
                    horizontal: {
                        _unit: "pixelsUnit",
                        _value: 0.0,
                    },
                    vertical: {
                        _unit: "pixelsUnit",
                        _value: 0.0,
                    },
                },
                replaceLayer: {
                    _obj: "placeEvent",
                    to: {
                        _id: layerId,
                        _ref: "layer",
                    },
                },
            },
            {
                _obj: "set",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "layer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _obj: "layer",
                    name: layerName,
                },
            },
        ];

        await action.batchPlay(commands, {});
        await rasterizeLayer(command);
    });
};



const getDocumentInfo = async (command) => {
    console.log("getDocumentInfo");

    let doc = app.activeDocument;
    let path = doc.path;

    let out = {
        height: doc.height,
        width: doc.width,
        colorMode: doc.mode.toString(),
        pixelAspectRatio: doc.pixelAspectRatio,
        resolution: doc.resolution,
        path: path,
        saved: path.length > 0,
        hasUnsavedChanges: !doc.saved,
    };

    return out;
};

const cropDocument = async (command) => {
    console.log("cropDocument");

    let options = command.options;

    if (!hasActiveSelection()) {
        throw new Error("cropDocument : Requires an active selection");
    }

    return await execute(async () => {
        let commands = [
            // Crop
            {
                _obj: "crop",
                delete: true,
            },
        ];

        await action.batchPlay(commands, {});
    });
};



const removeBackground = async (command) => {
    console.log("removeBackground");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `removeBackground : Could not find layerName : ${layerName}`
        );
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Remove Background
            {
                _obj: "removeBackground",
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const alignContent = async (command) => {
    console.log("alignContent");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `alignContent : Could not find layerName : ${layerName}`
        );
    }

    //console.log(app.activeDocument.selection)
    if (!app.activeDocument.selection.bounds) {
        throw new Error(`alignContent : Requires an active selection`);
    }

    await execute(async () => {
        let m = getAlignmentMode(options.alignmentMode);

        selectLayer(layer, true);

        let commands = [
            {
                _obj: "align",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "layer",
                        _value: "targetEnum",
                    },
                ],
                alignToCanvas: false,
                using: {
                    _enum: "alignDistributeSelector",
                    _value: m,
                },
            },
        ];
        await action.batchPlay(commands, {});
    });
};

const generateImage = async (command) => {
    console.log("generateImage");

    let options = command.options;

    await execute(async () => {
        //layer.selected = true
        let doc = app.activeDocument;
        await doc.selection.selectAll();
        let commands = [
            // Generate Image current document
            {
                _obj: "syntheticTextToImage",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "document",
                        _value: "targetEnum",
                    },
                ],
                documentID: doc.id,
                layerID: 0,
                prompt: options.prompt,
                serviceID: "clio",
                serviceOptionsList: {
                    clio: {
                        _obj: "clio",
                        clio_advanced_options: {
                            text_to_image_styles_options: {
                                text_to_image_content_type: "none",
                                text_to_image_effects_count: 0,
                                text_to_image_effects_list: [
                                    "none",
                                    "none",
                                    "none",
                                ],
                            },
                        },
                        dualCrop: true,
                        gentech_workflow_name: "text_to_image",
                        gi_ADVANCED: '{"enable_mts":true}',
                        gi_CONTENT_PRESERVE: 0,
                        gi_CROP: false,
                        gi_DILATE: false,
                        gi_ENABLE_PROMPT_FILTER: true,
                        gi_GUIDANCE: 6,
                        gi_MODE: "ginp",
                        gi_NUM_STEPS: -1,
                        gi_PROMPT: options.prompt,
                        gi_SEED: -1,
                        gi_SIMILARITY: 0,
                    },
                },
                workflow: "text_to_image",
                workflowType: {
                    _enum: "genWorkflow",
                    _value: "text_to_image",
                },
            },
            // Rasterize current layer
            {
                _obj: "rasterizeLayer",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "layer",
                        _value: "targetEnum",
                    },
                ],
            },
        ];
        await action.batchPlay(commands, {});

        let l = findLayer(options.prompt);
        l.name = options.layerName;
    });
};

const saveDocument = async (command) => {
    console.log("saveDocument");

    await execute(async () => {
        await app.activeDocument.save()
    });
};

const saveDocumentAs = async (command) => {
    console.log("saveDocumentAs");
    let options = command.options

    let filePath = options.filePath
    //var folder = await fs.getFolder();

    //make sure the file 
    let url = `file:${filePath}`
    const fd = await openfs.open(url, "a+");
    await openfs.close(fd)

    let saveFile = await fs.getEntryWithUrl(url);

    return await execute(async () => {

        let fileType = options.fileType.toUpperCase()
        if (fileType == "JPG") {
            await app.activeDocument.saveAs.jpg(saveFile, {
                quality:9
            }, true)
        } else if (fileType == "PNG") {
            await app.activeDocument.saveAs.png(saveFile, {
            }, true)
        } else {
            await app.activeDocument.saveAs.psd(saveFile, {
                alphaChannels:true,
                annotations:true,
                embedColorProfile:true,
                layers:true,
                maximizeCompatibility:true,
                spotColor:true,
            }, true)
        }

        return {savedFilePath:saveFile.nativePath}
    });
};

const createDocument = async (command) => {
    console.log("createDocument", command);

    let options = command.options;
    let colorMode = getNewDocumentMode(command.options.colorMode);
    let fillColor = parseColor(options.fillColor);

    await execute(async () => {
        await app.createDocument({
            typename: "DocumentCreateOptions",
            width: options.width,
            height: options.height,
            resolution: options.resolution,
            mode: colorMode,
            fill: constants.DocumentFill.COLOR,
            fillColor: fillColor,
            profile: "sRGB IEC61966-2.1",
        });

        let background = findLayer("Background");
        background.allLocked = false;
        background.name = "Background";
    });
};

const commandHandlers = {
    openFile,
    placeImage,
    getDocumentInfo,
    cropDocument,
    removeBackground,
    alignContent,
    generateImage,
    saveDocument,
    saveDocumentAs,
    createDocument
};

module.exports = {
    commandHandlers
};
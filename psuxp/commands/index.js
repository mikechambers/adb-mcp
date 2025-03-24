const { app, constants, core, action } = require("photoshop");

const parseAndRouteCommands = async (commands) => {
    if (!commands.length) {
        return;
    }

    for (let c of commands) {
        await parseAndRouteCommand(c);
    }
};

const parseAndRouteCommand = async (command) => {
    let action = command.action;

    let f = commandHandlers[action];

    if (typeof f !== "function") {
        throw new Error(`Unknown Command: ${action}`);
    }

    return f(command);
};

const scaleLayer = async (command) => {
    console.log("scaleLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`scaleLayer : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        let anchor = getAnchorPosition(options.anchorPosition);
        let interpolation = getInterpolationMethod(options.interpolationMethod);

        await layer.scale(options.width, options.height, anchor, {
            interpolation: interpolation,
        });
    });
};

const rotateLayer = async (command) => {
    console.log("rotateLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`rotateLayer : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        selectLayer(layer, true)

        let anchor = getAnchorPosition(options.anchorPosition);
        let interpolation = getInterpolationMethod(options.interpolationMethod);

        await layer.rotate(options.angle, anchor, {
            interpolation: interpolation,
        });
    });
};

const flipLayer = async (command) => {
    console.log("flipLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`flipLayer : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        await layer.flip(options.axis);
    });
};

const deleteLayer = async (command) => {
    console.log("deleteLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`setLayerVisibility : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        layer.delete();
    });
};

const renameLayer = async (command) => {
    console.log("renameLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`renameLayer : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        layer.name = options.newLayerName;
    });
};

const getLayers = async (command) => {
    console.log("getLayers");

    let out = await execute(async () => {
        let result = [];

        // Function to recursively process layers
        const processLayers = (layersList) => {
            let layersArray = [];

            for (let i = 0; i < layersList.length; i++) {
                let layer = layersList[i];
                let layerInfo = {
                    name: layer.name,
                    isClippingMask: layer.isClippingMask,
                };

                // Check if this layer has sublayers (is a group)
                if (layer.layers && layer.layers.length > 0) {
                    layerInfo.layers = processLayers(layer.layers);
                }

                layersArray.push(layerInfo);
            }

            return layersArray;
        };

        // Start with the top-level layers
        result = processLayers(app.activeDocument.layers);

        return result;
    });

    return out;
};

const setLayerVisibility = async (command) => {
    console.log("setLayerVisibility");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`setLayerVisibility : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        layer.visible = options.visible;
    });
};

const addColorBalanceAdjustmentLayer = async (command) => {
    console.log("addColorBalanceAdjustmentLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`addColorBalanceAdjustmentLayer : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        let commands = [
            // Make adjustment layer
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "adjustmentLayer",
                    },
                ],
                using: {
                    _obj: "adjustmentLayer",
                    type: {
                        _obj: "colorBalance",
                        highlightLevels: [0, 0, 0],
                        midtoneLevels: [0, 0, 0],
                        preserveLuminosity: true,
                        shadowLevels: [0, 0, 0],
                    },
                },
            },
            // Set current adjustment layer
            {
                _obj: "set",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "adjustmentLayer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _obj: "colorBalance",
                    highlightLevels: options.highlights,
                    midtoneLevels: options.midtones,
                    shadowLevels: options.shadows,
                },
            },
        ];
        await action.batchPlay(commands, {});
    });
};

const translateLayer = async (command) => {
    console.log("translateLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`translateLayer : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        await layer.translate(options.xOffset, options.yOffset);
    });
};

const setLayerProperties = async (command) => {
    console.log("setLayerProperties");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`setLayerProperties : Could not find layer named : [${layerName}]`);
    }

    await execute(async () => {
        layer.blendMode = getBlendMode(options.blendMode);
        layer.opacity = options.opacity;

        if (layer.isClippingMask != options.isClippingMask) {
            selectLayer(layer, true);
            let command = options.isClippingMask
                ? {
                      _obj: "groupEvent",
                      _target: [
                          {
                              _enum: "ordinal",
                              _ref: "layer",
                              _value: "targetEnum",
                          },
                      ],
                  }
                : {
                      _obj: "ungroup",
                      _target: [
                          {
                              _enum: "ordinal",
                              _ref: "layer",
                              _value: "targetEnum",
                          },
                      ],
                  };

            await action.batchPlay([command], {});
        }
    });
};

const duplicateLayer = async (command) => {
    console.log("duplicateLayer");
    let options = command.options;

    await execute(async () => {
        let layer = findLayer(options.sourceLayerName);

        if (!layer) {
            throw new Error(`duplicateLayer : Could not find sourceLayerName : ${options.sourceLayerName}`);
        }

        let d = await layer.duplicate();
        d.name = options.duplicateLayerName;
    });
};

const copyToClipboard = async (command) => {
    let options = command.options;
    let layerName = options.layerName

    await execute(async () => {
        let layer = null;
        if (!options.copyMerged) {
            layer = findLayer(layerName);

            if (!layer) {
                throw new Error(`copyToClipboard : Could not find layerName : ${layerName}`);
            }
        } else {
            layer = app.activeDocument.layers[0];
        }

        if (options.copyMerged) {
            //hack since copy merged wont work without an active selection
            app.activeDocument.selection.selectAll();
            await layer.copy(true);
            await clearSelection();
        } else {
            await layer.copy(false);
        }
    });
};

const clearSelection = async () => {
    await app.activeDocument.selection.selectRectangle(
        { top: 0, left: 0, bottom: 0, right: 0 },
        constants.SelectionType.REPLACE,
        0,
        true
    );
};

const flattenAllLayers = async (command) => {
    console.log("flattenAllLayers");
    let options = command.options;

    await execute(async () => {
        await app.activeDocument.flatten();

        let layers = app.activeDocument.layers;

        if (layers.length != 1) {
            throw new Error(`flattenAllLayers : Unknown error`);
        }

        let l = layers[0];
        l.allLocked = false;
        l.name = options.layerName;
    });
};

/*
let exportPng = async (command) => {
    let options = command.options;

    let filename = "foo";

    await execute(async () => {
        ///Users/mesh/Library/Application Support/Adobe/UXP/PluginsStorage/PHSP/26/Developer/Photoshop MCP Agent/PluginData/foo.png

        let fileName = "foo";
        var saveFolder =
            await require("uxp").storage.localFileSystem.getDataFolder();
        var saveFile = await saveFolder.createFile(fileName + ".png");
        console.log(saveFile.nativePath);
        const saveFileToken =
            await require("uxp").storage.localFileSystem.createSessionToken(
                saveFile
            );
        let commands = [
            {
                _obj: "save",
                as: {
                    _obj: "PNGFormat",
                    method: {
                        _enum: "PNGMethod",
                        _value: "quick",
                    },
                    PNGInterlaceType: {
                        _enum: "PNGInterlaceType",
                        _value: "PNGInterlaceNone",
                    },
                    PNGFilter: {
                        _enum: "PNGFilter",
                        _value: "PNGFilterAdaptive",
                    },
                    compression: 6,
                },
                in: {
                    _path: saveFileToken,
                    _kind: "local",
                },
                saveStage: {
                    _enum: "saveStageType",
                    _value: "saveBegin",
                },
                _isCommand: false,
                _options: {
                    dialogOptions: "dontDisplay",
                },
            },
        ];
        await action.batchPlay(commands, {});
    });
};

async function saveFileToFolder(userFolder, fileName = "test") {
    const file = await userFolder.createFile(`${fileName}.jpg`);
    const activeDocument = require("photoshop").app.activeDocument;
    return activeDocument.save(file);
}
    */

const createMaskFromSelection = async (command) => {
    console.log("createMaskFromSelection");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`createMaskFromSelection : Could not find layerName : ${layerName}`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            {
                _obj: "make",
                at: {
                    _enum: "channel",
                    _ref: "channel",
                    _value: "mask",
                },
                new: {
                    _class: "channel",
                },
                using: {
                    _enum: "userMaskEnabled",
                    _value: "revealSelection",
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const addDropShadowLayerEffect = async (command) => {
    console.log("addDropShadowLayerEffect");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`addDropShadowLayerEffect : Could not find layerName : ${layerName}`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Set Layer Styles of current layer
            {
                _obj: "set",
                _target: [
                    {
                        _property: "layerEffects",
                        _ref: "property",
                    },
                    {
                        _enum: "ordinal",
                        _ref: "layer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _obj: "layerEffects",
                    dropShadow: {
                        _obj: "dropShadow",
                        antiAlias: false,
                        blur: {
                            _unit: "pixelsUnit",
                            _value: options.size,
                        },
                        chokeMatte: {
                            _unit: "pixelsUnit",
                            _value: options.spread,
                        },
                        color: {
                            _obj: "RGBColor",
                            blue: options.color.blue,
                            grain: options.color.green,
                            red: options.color.red,
                        },
                        distance: {
                            _unit: "pixelsUnit",
                            _value: options.distance,
                        },
                        enabled: true,
                        layerConceals: true,
                        localLightingAngle: {
                            _unit: "angleUnit",
                            _value: options.angle,
                        },
                        mode: {
                            _enum: "blendMode",
                            _value: options.blendMode.toLowerCase(),
                        },
                        noise: {
                            _unit: "percentUnit",
                            _value: 0.0,
                        },
                        opacity: {
                            _unit: "percentUnit",
                            _value: options.opacity,
                        },
                        present: true,
                        showInDialog: true,
                        transferSpec: {
                            _obj: "shapeCurveType",
                            name: "Linear",
                        },
                        useGlobalAngle: true,
                    },
                    globalLightingAngle: {
                        _unit: "angleUnit",
                        _value: options.angle,
                    },
                    scale: {
                        _unit: "percentUnit",
                        _value: 100.0,
                    },
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const cropDocument = async (command) => {
    console.log("cropDocument")

    let options = command.options

    if(!hasActiveSelection()) {
        throw new Error("cropDocument : Requires an active selection")
    }

    return await execute(async () => {

        let commands = [
            // Crop
            {
                "_obj": "crop",
                "delete": true
            }
        ];

        await action.batchPlay(commands, {});
    });
}

const selectSubject = async (command) => {
    console.log("selectSubject")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        throw new Error(`selectSubject : Could not find layerName : ${layerName}`)
    }

    return await execute(async () => {

        selectLayer(layer, true)

        let commands = [
            // Select Subject
            {
                "_obj": "autoCutout",
                "sampleAllLayers": false
            }
        ];

        await action.batchPlay(commands, {});

        return {hasActiveSelection:hasActiveSelection()}
    });
}

const selectSky = async (command) => {
    console.log("selectSky")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        throw new Error(`selectSky : Could not find layerName : ${layerName}`)
    }

    return await execute(async () => {

        selectLayer(layer, true)

        let commands = [
            // Select Sky
            {
                "_obj": "selectSky",
                "sampleAllLayers": false
            }
        ];

        await action.batchPlay(commands, {});

        return {hasActiveSelection:hasActiveSelection()}
    });
}

const cutSelectionToClipboard = async (command) => {
    console.log("cutSelectionToClipboard")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        throw new Error(`cutSelectionToClipboard : Could not find layerName : ${layerName}`)
    }

    if(!hasActiveSelection()) {
        throw new Error("cutSelectionToClipboard : Requires an active selection")
    }

    return await execute(async () => {

        selectLayer(layer, true)
        
        let commands = [
            {
                "_obj": "cut"
            },
        ];

        await action.batchPlay(commands, {});
    });
}

const copySelectionToClipboard = async (command) => {
    console.log("copySelectionToClipboard")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        throw new Error(`copySelectionToClipboard : Could not find layerName : ${layerName}`)
    }

    if(!hasActiveSelection()) {
        throw new Error("copySelectionToClipboard : Requires an active selection")
    }

    return await execute(async () => {

        selectLayer(layer, true)
        
        let commands = [
            {
                "_obj": "copyEvent",
                "copyHint": "pixels"
            }
        ];

        await action.batchPlay(commands, {});
    });
}

const pasteFromClipboard = async (command) => {
    console.log("pasteFromClipboard")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        throw new Error(`pasteFromClipboard : Could not find layerName : ${layerName}`)
    }

    return await execute(async () => {

        selectLayer(layer, true)

        let pasteInPlace = options.pasteInPlace
        
        let commands = [
            {
                "_obj": "paste",
                "antiAlias": {
                    "_enum": "antiAliasType",
                    "_value": "antiAliasNone"
                },
                "as": {
                    "_class": "pixel"
                },
                "inPlace": pasteInPlace
            }
        ];

        await action.batchPlay(commands, {});
    });
}

const removeBackground = async (command) => {
    console.log("removeBackground");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`removeBackground : Could not find layerName : ${layerName}`);
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

const addBrightnessContrastAdjustmentLayer = async (command) => {
    console.log("addBrightnessContrastAdjustmentLayer");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`addBrightnessContrastAdjustmentLayer : Could not find layerName : ${layerName}`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Make adjustment layer
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "adjustmentLayer",
                    },
                ],
                using: {
                    _obj: "adjustmentLayer",
                    type: {
                        _obj: "brightnessEvent",
                        useLegacy: false,
                    },
                },
            },
            // Set current adjustment layer
            {
                _obj: "set",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "adjustmentLayer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _obj: "brightnessEvent",
                    brightness: options.brightness,
                    center: options.contrast,
                    useLegacy: false,
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const addAdjustmentLayerVibrance = async (command) => {
    console.log("addAdjustmentLayerVibrance");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`addAdjustmentLayerVibrance : Could not find layerName : ${layerName}`);
    }

    let colors = options.colors;

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Make adjustment layer
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "adjustmentLayer",
                    },
                ],
                using: {
                    _obj: "adjustmentLayer",
                    type: {
                        _class: "vibrance",
                    },
                },
            },
            // Set current adjustment layer
            {
                _obj: "set",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "adjustmentLayer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _obj: "vibrance",
                    saturation: options.saturation,
                    vibrance: options.vibrance,
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const addAdjustmentLayerBlackAndWhite = async (command) => {
    console.log("addAdjustmentLayerBlackAndWhite");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`addAdjustmentLayerBlackAndWhite : Could not find layerName : ${layerName}`);
    }

    let colors = options.colors;

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Make adjustment layer
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "adjustmentLayer",
                    },
                ],
                using: {
                    _obj: "adjustmentLayer",
                    type: {
                        _obj: "blackAndWhite",
                        blue: colors.blue,
                        cyan: colors.cyan,
                        grain: colors.green,
                        magenta: colors.magenta,
                        presetKind: {
                            _enum: "presetKindType",
                            _value: "presetKindDefault",
                        },
                        red: colors.red,
                        tintColor: {
                            _obj: "RGBColor",
                            blue: 179.00115966796875,
                            grain: 211.00067138671875,
                            red: 225.00045776367188,
                        },
                        useTint: false,
                        yellow: colors.yellow,
                    },
                },
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
        throw new Error(`alignContent : Could not find layerName : ${layerName}`);
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

const deleteSelection = async (command) => {
    console.log("deleteSelection");

    let options = command.options;
    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`deleteSelection : Could not find layerName : ${layerName}`);
    }

    if (!app.activeDocument.selection.bounds) {
        throw new Error(`invertSelection : Requires an active selection`);
    }

    await execute(async () => {
        selectLayer(layer, true);
        let commands = [
            {
                _obj: "delete",
            },
        ];
        await action.batchPlay(commands, {});
    });
};

const fillSelection = async (command) => {
    console.log("fillSelection");

    let options = command.options;
    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`fillSelection : Could not find layerName : ${layerName}`);
    }

    if (!app.activeDocument.selection.bounds) {
        throw new Error(`invertSelection : Requires an active selection`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let c = parseColor(options.color).rgb;
        let commands = [
            // Fill
            {
                _obj: "fill",
                color: {
                    _obj: "RGBColor",
                    blue: c.blue,
                    grain: c.green,
                    red: c.red,
                },
                mode: {
                    _enum: "blendMode",
                    _value: options.blendMode.toLowerCase(),
                },
                opacity: {
                    _unit: "percentUnit",
                    _value: options.opacity,
                },
                using: {
                    _enum: "fillContents",
                    _value: "color",
                },
            },
        ];
        await action.batchPlay(commands, {});
    });
};

const selectPolygon = async (command) => {
    console.log("selectPolygon");

    let options = command.options;

    await execute(async () => {
        await app.activeDocument.selection.selectPolygon(
            options.points,
            constants.SelectionType.REPLACE,
            options.feather,
            options.antiAlias
        );
    });
};

let selectEllipse = async (command) => {
    console.log("selectEllipse");

    let options = command.options;

    await execute(async () => {
        await app.activeDocument.selection.selectEllipse(
            options.bounds,
            constants.SelectionType.REPLACE,
            options.feather,
            options.antiAlias
        );
    });
};

const moveLayer = async (command) => {
    console.log("moveLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`moveLayer : Could not find layerName : ${layerName}`);
    }

    let position;
    switch (options.position) {
        case "TOP":
            position = "front";
            break;
        case "BOTTOM":
            position = "back";
            break;
        case "UP":
            position = "next";
            break;
        case "DOWN":
            position = "previous";
            break;
        default:
            throw new Error(`moveLayer: Unknown placement : ${options.position}`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            {
                _obj: "move",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "layer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _enum: "ordinal",
                    _ref: "layer",
                    _value: position,
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const getElementPlacement = (placement) => {
    return constants.ElementPlacement[placement.toUpperCase()];
};

const selectRectangle = async (command) => {
    console.log("selectRectangle");

    let options = command.options;

    await execute(async () => {
        await app.activeDocument.selection.selectRectangle(
            options.bounds,
            constants.SelectionType.REPLACE,
            options.feather,
            options.antiAlias
        );
    });
};

const invertSelection = async (command) => {
    console.log("invertSelection");

    if (!app.activeDocument.selection.bounds) {
        throw new Error(`invertSelection : Requires an active selection`);
    }

    await execute(async () => {
        let commands = [
            {
                _obj: "inverse",
            },
        ];
        await action.batchPlay(commands, {});
    });
};

const applyMotionBlur = async (command) => {
    console.log("applyMotionBlur");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`applyMotionBlur : Could not find layerName : ${layerName}`);
    }

    await execute(async () => {
        await layer.applyMotionBlur(options.angle, options.distance);
    });
};

const applyGaussianBlur = async (command) => {
    console.log("applyGaussianBlur");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(`applyGaussianBlur : Could not find layerName : ${layerName}`);
    }

    await execute(async () => {
        await layer.applyGaussianBlur(options.radius);
    });
};

const execute = async (callback, commandName = "Executing command...") => {
    try {
        return await core.executeAsModal(callback, {
            commandName: commandName,
        });
    } catch (e) {
        throw new Error(`Error executing command [modal] : ${e.message}`);
    }
}

const createMultiLineTextLayer = async (command) => {
    let options = command.options;

    console.log("createMultiLineTextLayer", options);

    await execute(async () => {
        let c = parseColor(options.textColor);

        //need to adjust font size is DPI is anything other than 72.
        //should document as part of createTextLayer call
        let fontSize = (app.activeDocument.resolution / 72) * options.fontSize;

        let contents = options.contents.replace(/\\n/g, '\n')

        let a = await app.activeDocument.createTextLayer({
            //blendMode: constants.BlendMode.DISSOLVE,//ignored
            textColor: c,
            //color:constants.LabelColors.BLUE,//ignored
            //opacity:50, //ignored
            //name: "layer name",//ignored
            contents: contents,
            fontSize: fontSize,
            fontName: options.fontName, //"ArialMT",
            position: options.position, //y is the baseline of the text. Not top left
        });

        //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/layer/

        a.blendMode = getBlendMode(options.blendMode);
        a.name = options.layerName;
        a.opacity = options.opacity;

        await a.textItem.convertToParagraphText();
        a.textItem.paragraphStyle.justification = getJustificationMode(
            options.justification
        );

        selectLayer(a, true);
        let commands = [
            // Set current text layer
            {
                _obj: "set",
                _target: [
                    {
                        _enum: "ordinal",
                        _ref: "textLayer",
                        _value: "targetEnum",
                    },
                ],
                to: {
                    _obj: "textLayer",

                    textShape: [
                        {
                            _obj: "textShape",
                            bounds: {
                                _obj: "rectangle",
                                bottom: options.bounds.bottom,
                                left: options.bounds.left,
                                right: options.bounds.right,
                                top: options.bounds.top,
                            },
                            char: {
                                _enum: "char",
                                _value: "box",
                            },
                            columnCount: 1,
                            columnGutter: {
                                _unit: "pointsUnit",
                                _value: 0.0,
                            },
                            firstBaselineMinimum: {
                                _unit: "pointsUnit",
                                _value: 0.0,
                            },
                            frameBaselineAlignment: {
                                _enum: "frameBaselineAlignment",
                                _value: "alignByAscent",
                            },
                            orientation: {
                                _enum: "orientation",
                                _value: "horizontal",
                            },
                            rowCount: 1,
                            rowGutter: {
                                _unit: "pointsUnit",
                                _value: 0.0,
                            },
                            rowMajorOrder: true,
                            spacing: {
                                _unit: "pointsUnit",
                                _value: 0.0,
                            },
                            transform: {
                                _obj: "transform",
                                tx: 0.0,
                                ty: 0.0,
                                xx: 1.0,
                                xy: 0.0,
                                yx: 0.0,
                                yy: 1.0,
                            },
                        },
                    ],
                },
            },
        ];

        a.textItem.contents = contents
        await action.batchPlay(commands, {});
    });
};

const createSingleLineTextLayer = async (command) => {
    console.log("createSingleLineTextLayer");

    let options = command.options;

    await execute(async () => {
        let c = parseColor(options.textColor);

        //need to adjust font size is DPI is anything other than 72.
        //should document as part of createTextLayer call
        let fontSize = (app.activeDocument.resolution / 72) * options.fontSize;

        let a = await app.activeDocument.createTextLayer({
            //blendMode: constants.BlendMode.DISSOLVE,//ignored
            textColor: c,
            //color:constants.LabelColors.BLUE,//ignored
            //opacity:50, //ignored
            //name: "layer name",//ignored
            contents: options.contents,
            fontSize: fontSize,
            fontName: options.fontName, //"ArialMT",
            position: options.position, //y is the baseline of the text. Not top left
        });

        //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/layer/

        a.blendMode = getBlendMode(options.blendMode);
        a.name = options.layerName;
        a.opacity = options.opacity;
    });
};

const createPixelLayer = async (command) => {
    console.log("createPixelLayer")
    let options = command.options;

    await execute(async () => {
        //let c = parseColor(options.textColor)

        let b = getBlendMode(options.blendMode);

        let a = await app.activeDocument.createPixelLayer({
            name: options.layerName,
            opacity: options.opacity,
            fillNeutral: options.fillNeutral,
            blendMode: b,
        });

        //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/layer/

        //a.blendMode = getBlendMode(options.blendMode)
        //a.name = options.name
        //a.opacity = options.opacity
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

const parseColor = (color) => {
    try {
        const c = new app.SolidColor();
        c.rgb.red = color.red;
        c.rgb.green = color.green;
        c.rgb.blue = color.blue;

        return c;
    } catch (e) {
        throw new Error(`Invalid color values: ${JSON.stringify(color)}`);
    }
}

const getAlignmentMode = (mode) => {
    switch (mode) {
        case "LEFT":
            return "ADSLefts";
        case "CENTER_HORIZONTAL":
            return "ADSCentersH";
        case "RIGHT":
            return "ADSRights";
        case "TOP":
            return "ADSTops";
        case "CENTER_VERTICAL":
            return "ADSCentersV";
        case "BOTTOM":
            return "ADSBottoms";
        default:
            throw new Error(`getAlignmentMode : Unknown alignment mode : ${mode}`);
    }
}


const checkRequiresActiveDocument = (command) => {
    if(command.action == "createDocument") {
        return
    }

    if(!app.activeDocument) {
        throw new Error(`${command.action} : Requires as open Photoshop document`);
    }
}

const getJustificationMode = (value) => {
    return getConstantValue(constants.Justification, value, "Justification");
}

const getBlendMode = (value) => {
    return getConstantValue(constants.BlendMode, value, "BlendMode");
}

const getInterpolationMethod = (value) => {
    return getConstantValue(
        constants.InterpolationMethod,
        value,
        "InterpolationMethod"
    );
}

const getAnchorPosition = (value) => {
    return getConstantValue(constants.AnchorPosition, value, "AnchorPosition");
}

const getNewDocumentMode = (value) => {
    return getConstantValue(
        constants.NewDocumentMode,
        value,
        "NewDocumentMode"
    );
}

const getConstantValue = (c, v, n) => {
    let out = c[v.toUpperCase()];

    if (!out) {
        throw new Error(`getConstantValue : Unknown constant value :${c} ${v}`);
    }

    return out;
}

const selectLayer = (layer, exclusive = false) => {
    console.log("selectLayer");
    if (exclusive) {
        clearLayerSelections();
    }

    console.log(layer);
    layer.selected = true;
}

const clearLayerSelections = (layers) => {
    if (!layers) {
        layers = app.activeDocument.layers;
    }

    for (const layer of layers) {
        layer.selected = false;

        if (layer.layers && layer.layers.length > 0) {
            clearLayerSelections(layer.layers);
        }
    }
}

const findLayer = (name, layers) => {
    if (!layers) {
        layers = app.activeDocument.layers;
    }

    //todo there is a later.getByName we can use
    for (const layer of layers) {
        if (layer.name === name) {
            return layer;
        }

        if (layer.layers && layer.layers.length > 0) {
            const found = findLayer(name, layer.layers);
            if (found) {
                return found; // Stop as soon as we’ve found the target layer
            }
        }
    }

    return null;
}

const hasActiveSelection = () => {
    return app.activeDocument.selection.bounds != null
}

const commandHandlers = {
    cropDocument,
    cutSelectionToClipboard,
    copySelectionToClipboard,
    pasteFromClipboard,
    selectSubject,
    selectSky,
    createMaskFromSelection,
    renameLayer,
    getLayers,
    rotateLayer,
    scaleLayer,
    flipLayer,
    copyToClipboard,
    deleteLayer,
    setLayerVisibility,
    //exportPng,
    moveLayer,
    removeBackground,
    createDocument,
    createSingleLineTextLayer,
    createMultiLineTextLayer,
    createPixelLayer,
    applyGaussianBlur,
    applyMotionBlur,
    selectRectangle,
    selectEllipse,
    fillSelection,
    generateImage,
    alignContent,
    invertSelection,
    selectPolygon,
    deleteSelection,
    addAdjustmentLayerBlackAndWhite,
    addAdjustmentLayerVibrance,
    addBrightnessContrastAdjustmentLayer,
    addDropShadowLayerEffect,
    flattenAllLayers,
    duplicateLayer,
    setLayerProperties,
    translateLayer,
    addColorBalanceAdjustmentLayer,
};

module.exports = {
    hasActiveSelection,
    getLayers,
    checkRequiresActiveDocument,
    parseAndRouteCommands,
    parseAndRouteCommand,
};

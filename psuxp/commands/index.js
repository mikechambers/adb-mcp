const { app, constants, core, action } = require("photoshop");

let parseAndRouteCommands = async (commands) => {
    if (!commands.length) {
        return;
    }

    for (let c of commands) {
        await parseAndRouteCommand(c);
    }
};

let parseAndRouteCommand = async (command) => {
    let action = command.action;

    console.log("parseAndRouteCommand");
    console.log(command);

    let f = commandHandlers[command.action];

    if (typeof f !== "function") {
        console.log("Unknown Command", command.action);
        return;
    }

    f(command);
};

let addColorBalanceAdjustmentLayer = async (command) => {
    console.log("addColorBalanceAdjustmentLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `addColorBalanceAdjustmentLayer : Could not find layer named : [${layerName}]`
        );
        return;
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

let translateLayer = async (command) => {
    console.log("translateLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `setLayerProperties : Could not find layer named : [${layerName}]`
        );
        return;
    }

    await execute(async () => {
        await layer.translate(options.xOffset, options.yOffset);
    });
};

let setLayerProperties = async (command) => {
    console.log("setLayerProperties");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `setLayerProperties : Could not find layer named : [${layerName}]`
        );
        return;
    }

    await execute(async () => {
        layer.blendMode = getBlendMode(options.blendMode);
        layer.opacity = options.opacity;
    });
};

let duplicateLayer = async (command) => {
    console.log("duplicateLayer");
    let options = command.options;

    await execute(async () => {
        let layer = findLayer(options.sourceLayerName);

        if (!layer) {
            console.log(
                `duplicateLayer: Could not find sourceLayerName : ${options.sourceLayerName}`
            );
            return;
        }

        let d = await layer.duplicate();
        d.name = options.duplicateLayerName;
    });
};

let flattenAllLayers = async (command) => {
    console.log("flattenAllLayers");
    let options = command.options;

    await execute(async () => {
        await app.activeDocument.flatten();

        let layers = app.activeDocument.layers;

        if (!layers.length != 1) {
            //something went wrong here
            return;
        }

        let l = layers[0];
        l.allLocked = false;
        l.name = options.layerName;
    });
};

let exportPng = async (command) => {
    let options = command.options;

    let filename = "foo";

    await execute(async () => {

        ///Users/mesh/Library/Application Support/Adobe/UXP/PluginsStorage/PHSP/26/Developer/Photoshop MCP Agent/PluginData/foo.png

        let fileName = "foo"
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

let addDropShadowLayerEffect = async (command) => {
    console.log("addDropShadowLayerEffect");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `addDropShadowLayerEffect : Could not find layer named : [${layerName}]`
        );
        return;
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

let removeBackground = async (command) => {
    console.log("removeBackground");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `removeBackground : Could not find layer named : [${layerName}]`
        );
        return;
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

let addBrightnessContrastAdjustmentLayer = async (command) => {
    console.log("addBrightnessContrastAdjustmentLayer");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `addBrightnessContrastAdjustmentLayer : Could not find layer named : [${layerName}]`
        );
        return;
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

let addAdjustmentLayerVibrance = async (command) => {
    console.log("addAdjustmentLayerVibrance");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `alignContent : Could not find layer named : [${layerName}]`
        );
        return;
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

let addAdjustmentLayerBlackAndWhite = async (command) => {
    console.log("addAdjustmentLayerBlackAndWhite");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `alignContent : Could not find layer named : [${layerName}]`
        );
        return;
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

let alignContent = async (command) => {
    console.log("alignContent");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `alignContent : Could not find layer named : [${layerName}]`
        );
        return;
    }

    //console.log(app.activeDocument.selection)
    if (!app.activeDocument.selection.bounds) {
        console.log(`alignContent : Requires an active selection`);
        return;
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

let generateImage = async (command) => {
    console.log("generateImage");

    let options = command.options;

    //todo: check this. not used
    let layerName = options.layerName;

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

        l.blendMode = getBlendMode(options.blendMode);
        l.opacity = options.opacity;

        //selectLayer(l, true)
    });
};

let deleteSelection = async (command) => {
    console.log("deleteSelection");

    let options = command.options;
    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `fillSelection : Could not find layer named : [${layerName}]`
        );
        return;
    }

    if (!app.activeDocument.selection.bounds) {
        console.log(`invertSelection : Requires an active selection`);
        return;
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

let fillSelection = async (command) => {
    console.log("fillSelection");

    let options = command.options;
    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `fillSelection : Could not find layer named : [${layerName}]`
        );
        return;
    }

    if (!app.activeDocument.selection.bounds) {
        console.log(`invertSelection : Requires an active selection`);
        return;
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

let selectPolygon = async (command) => {
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

let moveLayer = async (command) => {
    console.log("moveLayer");

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        console.log(`moveLayer : Could not find layer named : [${layerName}]`);
        return;
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
            console.log(`moveLayer: Unknown placement : ${options.position}`);
            return;
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

let getElementPlacement = (placement) => {
    return constants.ElementPlacement[placement.toUpperCase()];
};

let selectRectangle = async (command) => {
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

let invertSelection = async (command) => {
    console.log("invertSelection");

    if (!app.activeDocument.selection.bounds) {
        console.log(`invertSelection : Requires an active selection`);
        return;
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

let applyMotionBlur = async (command) => {
    console.log("applyMotionBlur");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `applyGaussianBlur : Could not find layer named : [${layerName}]`
        );
        return;
    }

    await execute(async () => {
        await layer.applyMotionBlur(options.angle, options.distance);
    });
};

let applyGaussianBlur = async (command) => {
    console.log("applyGaussianBlur");

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        console.log(
            `applyGaussianBlur : Could not find layer named : [${layerName}]`
        );
        return;
    }

    await execute(async () => {
        await layer.applyGaussianBlur(options.radius);
    });
};

async function execute(callback, commandName = "Executing command...") {
    console.log("execute");

    try {
        return await core.executeAsModal(callback, {
            commandName: commandName,
        });
    } catch (e) {
        console.error("Error executing as modal:", e);
        throw e;
    }
}

let createMultiLineTextLayer = async (command) => {
    let options = command.options;

    console.log("createMultiLineTextLayer", options);

    // Check if there's an active document
    if (!app.activeDocument) {
        throw new Error(
            "No active document. Please create or open a document first."
        );
    }

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

        await action.batchPlay(commands, {});
    });
};

let createSingleLineTextLayer = async (command) => {
    let options = command.options;

    console.log("createSingleLineTextLayer", options);

    // Check if there's an active document
    if (!app.activeDocument) {
        throw new Error(
            "No active document. Please create or open a document first."
        );
    }

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

let createPixelLayer = async (command) => {
    let options = command.options;

    console.log("createPixelLayer", options);

    // Check if there's an active document
    if (!app.activeDocument) {
        throw new Error(
            "No active document. Please create or open a document first."
        );
    }

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

let createDocument = async (command) => {
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

function parseColor(color) {
    try {
        const c = new app.SolidColor();
        c.rgb.red = color.red;
        c.rgb.green = color.green;
        c.rgb.blue = color.blue;

        return c;
    } catch (e) {
        console.error("Error parsing color:", e);
        throw new Error(`Invalid color values: ${JSON.stringify(color)}`);
    }
}

function getAlignmentMode(mode) {
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
            console.log("getAlignmentMode : Unknown alignment mode", mode);
            break;
    }
}

function getJustificationMode(mode) {
    return constants.Justification[mode.toUpperCase()];
}

function getBlendMode(name) {
    return constants.BlendMode[name.toUpperCase()];
}

function getNewDocumentMode(mode) {
    let out = null;

    console.log("getNewDocumentMode", mode);

    switch (mode) {
        case "BITMAP":
            out = constants.NewDocumentMode.BITMAP;
            break;
        case "CMYK":
            out = constants.NewDocumentMode.CMYK;
            break;
        case "GRAYSCALE":
            out = constants.NewDocumentMode.GRAYSCALE;
            break;
        case "LAB":
            out = constants.NewDocumentMode.LAB;
            break;
        case "RGB":
            out = constants.NewDocumentMode.RGB;
            break;
        default:
            // Optionally handle an unrecognized mode
            console.warn(`Unknown mode: ${mode}`);
            break;
    }

    return out;
}

function selectLayer(layer, exclusive = false) {
    console.log("selectLayer");
    if (exclusive) {
        clearLayerSelections();
    }

    console.log(layer);
    layer.selected = true;
}

function clearLayerSelections(layers) {
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

function findLayer(name, layers) {
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

module.exports = {
    parseAndRouteCommands,
};

const commandHandlers = {
    exportPng,
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

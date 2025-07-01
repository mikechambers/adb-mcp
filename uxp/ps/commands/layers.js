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

const {
    setVisibleAllLayers,
    findLayer,
    execute,
    parseColor,
    getAnchorPosition,
    getInterpolationMethod,
    getBlendMode,
    getJustificationMode,
    selectLayer,
    hasActiveSelection,
    _saveDocumentAs,
    convertFontSize,
    convertFromPhotoshopFontSize
} = require("./utils");


// Function to capture visibility state
const _captureVisibilityState = (layers) => {
    const state = new Map();
    
    const capture = (layerSet) => {
        for (const layer of layerSet) {
            state.set(layer.id, layer.visible);
            if (layer.layers && layer.layers.length > 0) {
                capture(layer.layers);
            }
        }
    };
    
    capture(layers);
    return state;
};

// Function to restore visibility state
const _restoreVisibilityState = async (state) => {
    const restore = (layerSet) => {
        for (const layer of layerSet) {
            if (state.has(layer.id)) {
                layer.visible = state.get(layer.id);
            }
            
            if (layer.layers && layer.layers.length > 0) {
                restore(layer.layers);
            }
        }
    };
    
    await execute(async () => {
        restore(app.activeDocument.layers);
    });
};

const exportLayersAsPng = async (command) => {
    let options = command.options;
    let layersInfo = options.layersInfo;

    const results = [];

    
    let originalState;
    await execute(async () => {
        originalState = _captureVisibilityState(app.activeDocument.layers);
        setVisibleAllLayers(false);
    });
    
    for(const info of layersInfo) {
        let result = {};
 
        let layer = findLayer(info.layerId);

        try {
            if (!layer) {
                throw new Error(
                    `exportLayersAsPng: Could not find layer with ID: [${info.layerId}]` // Fixed error message
                );
            }
            await execute(async () => {
                layer.visible = true;
            });

            let tmp = await _saveDocumentAs(info.filePath, "PNG");

            result = {
                ...tmp,
                layerId: info.layerId,
                success: true
            };

        } catch (e) {
            result = {
                ...info,
                success: false,
                message: e.message
            };
        } finally {
            if (layer) {
                await execute(async () => {
                    layer.visible = false;
                });
            }
        }

        results.push(result);
    }

    await execute(async () => {
        await _restoreVisibilityState(originalState);
    })

    return results;
};

const scaleLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `scaleLayer : Could not find layer with ID : [${layerId}]`
        );
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
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `rotateLayer : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        selectLayer(layer, true);

        let anchor = getAnchorPosition(options.anchorPosition);
        let interpolation = getInterpolationMethod(options.interpolationMethod);

        await layer.rotate(options.angle, anchor, {
            interpolation: interpolation,
        });
    });
};

const flipLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `flipLayer : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        await layer.flip(options.axis);
    });
};

const deleteLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `setLayerVisibility : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        layer.delete();
    });
};

const renameLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `renameLayer : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        layer.name = options.newLayerName;
    });
};

const groupLayers = async (command) => {
    let options = command.options;

    let layers = [];

    for (const layerId of options.layerIds) {
        let layer = findLayer(layerId);

        if (!layer) {
            throw new Error(
                `groupLayers : Could not find layerId : ${layerId}`
            );
        }

        layers.push(layer);
    }

    await execute(async () => {
        await app.activeDocument.createLayerGroup({
            name: options.groupName,
            fromLayers: layers,
        });
    });
};

const setLayerVisibility = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `setLayerVisibility : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        layer.visible = options.visible;
    });
};

const translateLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `translateLayer : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        await layer.translate(options.xOffset, options.yOffset);
    });
};

const setLayerProperties = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `setLayerProperties : Could not find layer with ID : [${layerId}]`
        );
    }

    await execute(async () => {
        layer.blendMode = getBlendMode(options.blendMode);
        layer.opacity = options.layerOpacity;
        layer.fillOpacity = options.fillOpacity;

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
    let options = command.options;

    await execute(async () => {
        let layer = findLayer(options.sourceLayerId);

        if (!layer) {
            throw new Error(
                `duplicateLayer : Could not find sourceLayerId : ${options.sourceLayerId}`
            );
        }

        let d = await layer.duplicate();
        d.name = options.duplicateLayerName;
    });
};

const flattenAllLayers = async (command) => {
    const options = command.options;
    const layerName = options.layerName

    await execute(async () => {
        await app.activeDocument.flatten();

        let layers = app.activeDocument.layers;

        if (layers.length != 1) {
            throw new Error(`flattenAllLayers : Unknown error`);
        }

        let l = layers[0];
        l.allLocked = false;
        l.name = layerName;
    });
};

const getLayerBounds = async (command) => {
    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `getLayerBounds : Could not find layerId : ${layerId}`
        );
    }

    let b = layer.bounds;
    return { left: b.left, top: b.top, bottom: b.bottom, right: b.right };
};

const rasterizeLayer = async (command) => {
    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `rasterizeLayer : Could not find layerId : ${layerId}`
        );
    }

    await execute(async () => {
        layer.rasterize(constants.RasterizeType.ENTIRELAYER);
    });
};

const editTextLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(`editTextLayer : Could not find layerId : ${layerId}`);
    }

    if (layer.kind.toUpperCase() != constants.LayerKind.TEXT.toUpperCase()) {
        throw new Error(`editTextLayer : Layer type must be TEXT : ${layer.kind}`);
    }

    await execute(async () => {
        const contents = options.contents;
        const fontSize = options.fontSize;
        const textColor = options.textColor;
        const fontName = options.fontName;


        console.log("contents", options.contents)
        console.log("fontSize", options.fontSize)
        console.log("textColor", options.textColor)
        console.log("fontName", options.fontName)

        if (contents != undefined) {
            layer.textItem.contents = contents;
        }

        if (fontSize != undefined) {
            let s = convertFontSize(fontSize);
            layer.textItem.characterStyle.size = s;
        }

        if (textColor != undefined) {
            let c = parseColor(textColor);
            layer.textItem.characterStyle.color = c;
        }

        if (fontName != undefined) {
            layer.textItem.characterStyle.font = fontName;
        }
    });
}

const moveLayer = async (command) => {
    let options = command.options;

    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(`moveLayer : Could not find layerId : ${layerId}`);
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
            throw new Error(
                `moveLayer: Unknown placement : ${options.position}`
            );
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

const createMultiLineTextLayer = async (command) => {
    let options = command.options;

    await execute(async () => {
        let c = parseColor(options.textColor);

        let fontSize = convertFontSize(options.fontSize);

        let contents = options.contents.replace(/\\n/g, "\n");

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

        a.textItem.contents = contents;
        await action.batchPlay(commands, {});
    });
};

const createSingleLineTextLayer = async (command) => {
    let options = command.options;

    await execute(async () => {
        let c = parseColor(options.textColor);

        let fontSize = convertFontSize(options.fontSize);

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
    });
};


const getLayers = async (command) => {
    let out = await execute(async () => {
        let result = [];

        // Function to recursively process layers
        const processLayers = (layersList) => {
            let layersArray = [];

            for (let i = 0; i < layersList.length; i++) {
                let layer = layersList[i];

                let kind = layer.kind.toUpperCase()

                let layerInfo = {
                    name: layer.name,
                    type: kind,
                    id:layer.id,
                    isClippingMask: layer.isClippingMask,
                    opacity: Math.round(layer.opacity),
                    blendMode: layer.blendMode.toUpperCase(),
                };

                if(kind == constants.LayerKind.TEXT.toUpperCase()) {

                    let _c = layer.textItem.characterStyle.color;
                    let color = {
                        red: Math.round(_c.rgb.red),
                        green: Math.round(_c.rgb.green),
                        blue: Math.round(_c.rgb.blue)
                    }

                    layerInfo.textInfo = {
                        fontSize: convertFromPhotoshopFontSize(layer.textItem.characterStyle.size),
                        fontName: layer.textItem.characterStyle.font,
                        fontColor: color,
                        text: layer.textItem.contents,
                        isMultiLineText: layer.textItem.isParagraphText
                    }
                }


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

const removeLayerMask = async (command) => {
    const options = command.options;

    const layerId = options.layerId;
    const layer = findLayer(layerId);

    if (!layer) {
        throw new Error(`removeLayerMask : Could not find layerId : ${layerId}`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Delete mask channel
            {
                _obj: "delete",
                _target: [
                    {
                        _enum: "channel",
                        _ref: "channel",
                        _value: "mask",
                    },
                ],
            },
        ];
        await action.batchPlay(commands, {});
    });
};

const addLayerMask = async (command) => {
    if (!hasActiveSelection()) {
        throw new Error("addLayerMask : Requires an active selection.");
    }

    const options = command.options;

    const layerId = options.layerId;
    const layer = findLayer(layerId);

    if (!layer) {
        throw new Error(`addLayerMask : Could not find layerId : ${layerId}`);
    }

    await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Make
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

const commandHandlers = {
    editTextLayer,
    exportLayersAsPng,
    removeLayerMask,
    addLayerMask,
    getLayers,
    scaleLayer,
    rotateLayer,
    flipLayer,
    deleteLayer,
    renameLayer,
    groupLayers,
    setLayerVisibility,
    translateLayer,
    setLayerProperties,
    duplicateLayer,
    flattenAllLayers,
    getLayerBounds,
    rasterizeLayer,
    moveLayer,
    createMultiLineTextLayer,
    createSingleLineTextLayer,
    createPixelLayer,
};

module.exports = {
    commandHandlers,
};

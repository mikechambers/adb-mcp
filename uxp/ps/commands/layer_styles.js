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

const { action } = require("photoshop");

const {
    selectLayer,
    findLayer,
    execute
} = require("./utils")

const addDropShadowLayerStyle = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `addDropShadowLayerStyle : Could not find layerId : ${layerId}`
        );
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

const addStrokeLayerStyle = async (command) => {
    const options = command.options

    const layerId = options.layerId

    let layer = findLayer(layerId)

    if (!layer) {
        throw new Error(
            `addStrokeLayerStyle : Could not find layerId : ${layerId}`
        );
    }

    let position = "centeredFrame"

    if (options.position == "INSIDE") {
        position = "insetFrame"
    } else if (options.position == "OUTSIDE") {
        position = "outsetFrame"
    }


    await execute(async () => {
        selectLayer(layer, true);

        let strokeColor = options.color
        let commands = [
            // Set Layer Styles of current layer
            {
                "_obj": "set",
                "_target": [
                    {
                        "_property": "layerEffects",
                        "_ref": "property"
                    },
                    {
                        "_enum": "ordinal",
                        "_ref": "layer",
                        "_value": "targetEnum"
                    }
                ],
                "to": {
                    "_obj": "layerEffects",
                    "frameFX": {
                        "_obj": "frameFX",
                        "color": {
                            "_obj": "RGBColor",
                            "blue": strokeColor.blue,
                            "grain": strokeColor.green,
                            "red": strokeColor.red
                        },
                        "enabled": true,
                        "mode": {
                            "_enum": "blendMode",
                            "_value": options.blendMode.toLowerCase()
                        },
                        "opacity": {
                            "_unit": "percentUnit",
                            "_value": options.opacity
                        },
                        "overprint": false,
                        "paintType": {
                            "_enum": "frameFill",
                            "_value": "solidColor"
                        },
                        "present": true,
                        "showInDialog": true,
                        "size": {
                            "_unit": "pixelsUnit",
                            "_value": options.size
                        },
                        "style": {
                            "_enum": "frameStyle",
                            "_value": position
                        }
                    },
                    "scale": {
                        "_unit": "percentUnit",
                        "_value": 100.0
                    }
                }
            }
        ];

        await action.batchPlay(commands, {});
    });
}

const createGradientLayerStyle = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `createGradientAdjustmentLayer : Could not find layerId : ${layerId}`
        );
    }

    await execute(async () => {
        selectLayer(layer, true);

        let angle = options.angle;
        let colorStops = options.colorStops;
        let opacityStops = options.opacityStops;

        let colors = [];
        for (let c of colorStops) {
            colors.push({
                _obj: "colorStop",
                color: {
                    _obj: "RGBColor",
                    blue: c.color.blue,
                    grain: c.color.green,
                    red: c.color.red,
                },
                location: Math.round((c.location / 100) * 4096),
                midpoint: c.midpoint,
                type: {
                    _enum: "colorStopType",
                    _value: "userStop",
                },
            });
        }

        let opacities = [];
        for (let o of opacityStops) {
            opacities.push({
                _obj: "transferSpec",
                location: Math.round((o.location / 100) * 4096),
                midpoint: o.midpoint,
                opacity: {
                    _unit: "percentUnit",
                    _value: o.opacity,
                },
            });
        }

        let commands = [
            // Make fill layer
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "contentLayer",
                    },
                ],
                using: {
                    _obj: "contentLayer",
                    type: {
                        _obj: "gradientLayer",
                        angle: {
                            _unit: "angleUnit",
                            _value: angle,
                        },
                        gradient: {
                            _obj: "gradientClassEvent",
                            colors: colors,
                            gradientForm: {
                                _enum: "gradientForm",
                                _value: "customStops",
                            },
                            interfaceIconFrameDimmed: 4096.0,
                            name: "Custom",
                            transparency: opacities,
                        },
                        gradientsInterpolationMethod: {
                            _enum: "gradientInterpolationMethodType",
                            _value: "smooth",
                        },
                        type: {
                            _enum: "gradientType",
                            _value: options.type.toLowerCase(),
                        },
                    },
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};



const commandHandlers = {
    createGradientLayerStyle,
    addStrokeLayerStyle,
    addDropShadowLayerStyle
};

module.exports = {
    commandHandlers
};
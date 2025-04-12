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

const createGradientAdjustmentLayer = async (command) => {

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `createGradientAdjustmentLayer : Could not find layerName : ${layerName}`
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

const addAdjustmentLayerBlackAndWhite = async (command) => {

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `addAdjustmentLayerBlackAndWhite : Could not find layerName : ${layerName}`
        );
    }

    let colors = options.colors;
    let tintColor = options.tintColor

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
                            blue: tintColor.blue,
                            grain: tintColor.green,
                            red: tintColor.red,
                        },
                        useTint: options.tint,
                        yellow: colors.yellow,
                    },
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const addBrightnessContrastAdjustmentLayer = async (command) => {

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `addBrightnessContrastAdjustmentLayer : Could not find layerName : ${layerName}`
        );
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

    let options = command.options;
    let layerName = options.layerName;

    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `addAdjustmentLayerVibrance : Could not find layerName : ${layerName}`
        );
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

const addColorBalanceAdjustmentLayer = async (command) => {

    let options = command.options;

    let layerName = options.layerName;
    let layer = findLayer(layerName);

    if (!layer) {
        throw new Error(
            `addColorBalanceAdjustmentLayer : Could not find layer named : [${layerName}]`
        );
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

const commandHandlers = {
    createGradientAdjustmentLayer,
    addAdjustmentLayerBlackAndWhite,
    addBrightnessContrastAdjustmentLayer,
    addAdjustmentLayerVibrance,
    addColorBalanceAdjustmentLayer
}

module.exports = {
    commandHandlers
};
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

const { app, constants, core } = require("photoshop");
const fs = require("uxp").storage.localFileSystem;

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
};

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
            throw new Error(
                `getAlignmentMode : Unknown alignment mode : ${mode}`
            );
    }
};

const getJustificationMode = (value) => {
    return getConstantValue(constants.Justification, value, "Justification");
};

const getBlendMode = (value) => {
    return getConstantValue(constants.BlendMode, value, "BlendMode");
};

const getInterpolationMethod = (value) => {
    return getConstantValue(
        constants.InterpolationMethod,
        value,
        "InterpolationMethod"
    );
};

const getAnchorPosition = (value) => {
    return getConstantValue(constants.AnchorPosition, value, "AnchorPosition");
};

const getNewDocumentMode = (value) => {
    return getConstantValue(
        constants.NewDocumentMode,
        value,
        "NewDocumentMode"
    );
};

const getConstantValue = (c, v, n) => {
    let out = c[v.toUpperCase()];

    if (!out) {
        throw new Error(`getConstantValue : Unknown constant value :${c} ${v}`);
    }

    return out;
};

const selectLayer = (layer, exclusive = false) => {
    if (exclusive) {
        clearLayerSelections();
    }

    layer.selected = true;
};

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
};

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
};


const execute = async (callback, commandName = "Executing command...") => {
    try {
        return await core.executeAsModal(callback, {
            commandName: commandName,
        });
    } catch (e) {
        throw new Error(`Error executing command [modal] : ${e}`);
    }
};

const tokenify = async (url) => {
    let out = await fs.createSessionToken(
        await fs.getEntryWithUrl("file:" + url)
    );
    return out;
};

const getElementPlacement = (placement) => {
    return constants.ElementPlacement[placement.toUpperCase()];
};

const hasActiveSelection = () => {
    return app.activeDocument.selection.bounds != null;
};

module.exports = {
    parseColor,
    getAlignmentMode,
    getJustificationMode,
    getBlendMode,
    getInterpolationMethod,
    getAnchorPosition,
    getNewDocumentMode,
    getConstantValue,
    selectLayer,
    clearLayerSelections,
    findLayer,
    execute,
    tokenify,
    getElementPlacement,
    hasActiveSelection
}
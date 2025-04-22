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

const { app } = require("photoshop");
const fs = require("uxp").storage.localFileSystem;

const adjustmentLayers = require("./adjustment_layers");
const core = require("./core");
const layerStyles = require("./layer_styles")
const filters = require("./filters")
const selection = require("./selection")
const layers = require("./layers")

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

    console.log(f.name)
    return f(command);
};

const checkRequiresActiveDocument = (command) => {
    if (!requiresActiveDocument(command)) {
        return;
    }

    if (!app.activeDocument) {
        throw new Error(
            `${command.action} : Requires an open Photoshop document`
        );
    }
};

const requiresActiveDocument = (command) => {
    return !["createDocument", "openFile"].includes(command.action);
};

const commandHandlers = {
    ...selection.commandHandlers,
    ...filters.commandHandlers,
    ...core.commandHandlers,
    ...adjustmentLayers.commandHandlers,
    ...layerStyles.commandHandlers,
    ...layers.commandHandlers
};

module.exports = {
    requiresActiveDocument,
    checkRequiresActiveDocument,
    parseAndRouteCommands,
    parseAndRouteCommand,
};

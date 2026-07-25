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
    execute,
    parseColor
} = require("./utils")

const createFillLayer = async (command) => {
    let options = command.options;
    let layerName = options.layerName;
    let opacity = options.opacity || 100;
    let color = options.color || {"red": 255, "green": 255, "blue": 255};

    await execute(async () => {
        let commands = [
            // Create fill layer
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "contentLayer",
                    },
                ],
                using: {
                    _obj: "contentLayer",
                    name: layerName,
                    opacity: {
                        _unit: "percentUnit",
                        _value: opacity,
                    },
                    type: {
                        _obj: "solidColorLayer",
                        color: {
                            _obj: "RGBColor",
                            red: color.red,
                            grain: color.green,
                            blue: color.blue,
                        },
                    },
                },
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const commandHandlers = {
    createFillLayer
}

module.exports = {
    commandHandlers
};

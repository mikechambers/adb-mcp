const { app, constants, action } = require("photoshop");
const { 
    findLayer, 
    execute, 
    parseColor, 
    selectLayer 
} = require("./utils");

const {hasActiveSelection} = require("./utils")

const clearSelection = async () => {
    await app.activeDocument.selection.selectRectangle(
        { top: 0, left: 0, bottom: 0, right: 0 },
        constants.SelectionType.REPLACE,
        0,
        true
    );
};

const createMaskFromSelection = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `createMaskFromSelection : Could not find layerId : ${layerId}`
        );
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

const selectSubject = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `selectSubject : Could not find layerId : ${layerId}`
        );
    }

    return await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Select Subject
            {
                _obj: "autoCutout",
                sampleAllLayers: false,
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const selectSky = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(`selectSky : Could not find layerId : ${layerId}`);
    }

    return await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            // Select Sky
            {
                _obj: "selectSky",
                sampleAllLayers: false,
            },
        ];

        await action.batchPlay(commands, {});

    });
};

const cutSelectionToClipboard = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `cutSelectionToClipboard : Could not find layerId : ${layerId}`
        );
    }

    if (!hasActiveSelection()) {
        throw new Error(
            "cutSelectionToClipboard : Requires an active selection"
        );
    }

    return await execute(async () => {
        selectLayer(layer, true);

        let commands = [
            {
                _obj: "cut",
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const copyMergedSelectionToClipboard = async (command) => {

    let options = command.options;

    if (!hasActiveSelection()) {
        throw new Error(
            "copySelectionToClipboard : Requires an active selection"
        );
    }

    return await execute(async () => {
        let commands = [{
            _obj: "copyMerged",
        }];

        await action.batchPlay(commands, {});
    });
};

const copySelectionToClipboard = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `copySelectionToClipboard : Could not find layerId : ${layerId}`
        );
    }

    if (!hasActiveSelection()) {
        throw new Error(
            "copySelectionToClipboard : Requires an active selection"
        );
    }

    return await execute(async () => {
        selectLayer(layer, true);

        let commands = [{
            _obj: "copyEvent",
            copyHint: "pixels",
        }];

        await action.batchPlay(commands, {});
    });
};

const pasteFromClipboard = async (command) => {

    let options = command.options;
    let layerId = options.layerId;

    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `pasteFromClipboard : Could not find layerId : ${layerId}`
        );
    }

    return await execute(async () => {
        selectLayer(layer, true);

        let pasteInPlace = options.pasteInPlace;

        let commands = [
            {
                _obj: "paste",
                antiAlias: {
                    _enum: "antiAliasType",
                    _value: "antiAliasNone",
                },
                as: {
                    _class: "pixel",
                },
                inPlace: pasteInPlace,
            },
        ];

        await action.batchPlay(commands, {});
    });
};

const deleteSelection = async (command) => {

    let options = command.options;
    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `deleteSelection : Could not find layerId : ${layerId}`
        );
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

    let options = command.options;
    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `fillSelection : Could not find layerId : ${layerId}`
        );
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

    let options = command.options;
    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `selectPolygon : Could not find layerId : ${layerId}`
        );
    }

    await execute(async () => {

        selectLayer(layer, true);

        await app.activeDocument.selection.selectPolygon(
            options.points,
            constants.SelectionType.REPLACE,
            options.feather,
            options.antiAlias
        );
    });
};

let selectEllipse = async (command) => {

    let options = command.options;
    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `selectEllipse : Could not find layerId : ${layerId}`
        );
    }

    await execute(async () => {

        selectLayer(layer, true);

        await app.activeDocument.selection.selectEllipse(
            options.bounds,
            constants.SelectionType.REPLACE,
            options.feather,
            options.antiAlias
        );
    });
};

const selectRectangle = async (command) => {
    let options = command.options;
    let layerId = options.layerId;
    let layer = findLayer(layerId);

    if (!layer) {
        throw new Error(
            `selectRectangle : Could not find layerId : ${layerId}`
        );
    }

    await execute(async () => {
        selectLayer(layer, true);

        await app.activeDocument.selection.selectRectangle(
            options.bounds,
            constants.SelectionType.REPLACE,
            options.feather,
            options.antiAlias
        );
    });
};

const invertSelection = async (command) => {

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

const commandHandlers = {
    clearSelection,
    createMaskFromSelection,
    selectSubject,
    selectSky,
    cutSelectionToClipboard,
    copyMergedSelectionToClipboard,
    copySelectionToClipboard,
    pasteFromClipboard,
    deleteSelection,
    fillSelection,
    selectPolygon,
    selectEllipse,
    selectRectangle,
    invertSelection
};

module.exports = {
    commandHandlers
};
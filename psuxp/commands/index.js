const { app, constants, core, action } = require("photoshop");

let parseAndRouteCommands = async (commands) => {

    if (!commands.length) {
        return
    }

    for (let c of commands) {
        await parseAndRouteCommand(c)
    }
}

let parseAndRouteCommand = async (command) => {

    let action = command.action

    console.log("parseAndRouteCommand")
    console.log(command)

    switch (action) {
        case "createDocument":
            await createDocument(command)
            break;
        case "createTextLayer":
            await createTextLayer(command)
            break
        case "createPixelLayer":
            await createPixelLayer(command)
            break
        case "applyGaussianBlur":
            await applyGaussianBlur(command)
            break
        case "applyMotionBlur":
            await applyMotionBlur(command)
            break
        case "selectRectangle":
            await selectRectangle(command)
            break
        case "fillSelection":
            await fillSelection(command)
            break   
        default:
            console.log("Unknown Command", action)
            break;
      }

}

function findLayer(name, layers) {

    if(!layers) {
        layers = app.activeDocument.layers
    }

    //todo there is a later.getByName we can use
    for (const layer of layers) {
        if (layer.name === name) {
            return layer;
        }

        if (layer.layers && layer.layers.length > 0) {
            const found = findLayerByName(name, layer.layers);
            if (found) {
                return found; // Stop as soon as we’ve found the target layer
            }
        }
    }

    return null;
}


let fillSelection = async (command) => {

    console.log("fillSelection")

    let options = command.options
    let layerName = options.layerName
    let layer = findLayer(layerName)
   
    if(!layer) {
        console.log(`fillSelection : Could not find layer named : [$[layerName]]`)
        return
    }

    await execute(
        async () => {
            layer.selected = true;
            let c = parseColor(options.color).rgb
            let commands = [
                // Fill
                {
                    "_obj": "fill",
                    "color": {
                        "_obj": "RGBColor",
                        "blue": c.blue,
                        "grain": c.green,
                        "red": c.red
                    },
                    "mode": {
                        "_enum": "blendMode",
                        "_value": options.blendMode.toLowerCase()
                    },
                    "opacity": {
                        "_unit": "percentUnit",
                        "_value": options.opacity
                    },
                    "using": {
                        "_enum": "fillContents",
                        "_value": "color"
                    }
                }
            ];
            await action.batchPlay(commands, {});
        }
    );
}

let selectRectangle = async (command) => {

    console.log("selectRectangle")

    let options = command.options
    //let layerName = options.layerName
    //let layer = findLayer(layerName)
   

    await execute(
        async () => {
            //layer.selected = true
            console.log("selecting")
            await app.activeDocument.selection.selectRectangle(
                options.bounds,
                constants.SelectionType.REPLACE,
                options.feather,
                options.antiAlias
            );
        }
    );
}

let applyMotionBlur = async (command) => {

    console.log("applyMotionBlur")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        console.log(`applyGaussianBlur : Could not find layer named : [$[layerName]]`)
        return
    }

    await execute(
        async () => {
            await layer.applyMotionBlur(options.angle, options.distance)
        }
    );
}

let applyGaussianBlur = async (command) => {

    console.log("applyGaussianBlur")

    let options = command.options
    let layerName = options.layerName

    let layer = findLayer(layerName)

    if(!layer) {
        console.log(`applyGaussianBlur : Could not find layer named : [$[layerName]]`)
        return
    }

    await execute(
        async () => {
            await layer.applyGaussianBlur(options.radius)
        }
    );
}

async function execute(callback, commandName = "Executing command...") {
    console.log("execute")

    try {
        return await core.executeAsModal(callback, { commandName:commandName });
    } catch (e) {
        console.error("Error executing as modal:", e);
        throw e;
    }
}

let createTextLayer = async (command) => {
    
    let options = command.options

    console.log("createTextLayer", options)

    // Check if there's an active document
    if (!app.activeDocument) {
        throw new Error("No active document. Please create or open a document first.");
    }

    await execute(
        async () => {
        
            let c = parseColor(options.textColor)

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
                position: options.position//y is the baseline of the text. Not top left
            })

            //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/layer/

            a.blendMode = getBlendMode(options.blendMode)
            a.name = options.name
            a.opacity = options.opacity
        }
    );
}

let createPixelLayer = async (command) => {
    
    let options = command.options

    console.log("createPixelLayer", options)

    // Check if there's an active document
    if (!app.activeDocument) {
        throw new Error("No active document. Please create or open a document first.");
    }

    await execute(
        async () => {
        
            //let c = parseColor(options.textColor)

            let b = getBlendMode(options.blendMode)

            let a = await app.activeDocument.createPixelLayer({
                name:options.name,
                opacity:options.opacity,
                fillNeutral:options.fillNeutral,
                blendMode:b
            })

            //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/layer/

            //a.blendMode = getBlendMode(options.blendMode)
            //a.name = options.name
            //a.opacity = options.opacity
        }
    );


}

let createDocument = async (command) => {

    console.log("createDocument", command)

    let options = command.options
    let colorMode = getNewDocumentMode(command.options.colorMode)
    let fillColor = parseColor(options.fillColor)


    try {
        await core.executeAsModal(
          async () =>
            await app.createDocument({
              typename: "DocumentCreateOptions",
              width: options.width,
              height: options.height,
              resolution: options.resolution,
              mode: colorMode,
              fill:constants.DocumentFill.COLOR,
              fillColor:fillColor,
              profile: "sRGB IEC61966-2.1",
            }),
          {
            commandName: "Creating new document...",
          }
        );
      } catch (e) {
        console.log(e);
      }
}

function parseColor(color) {

    try {
        const c = new app.SolidColor();
        c.rgb.red = color.red;
        c.rgb.green = color.green;
        c.rgb.blue = color.blue;

        return c
    } catch (e) {
        console.error("Error parsing color:", e);
        throw new Error(`Invalid color values: ${JSON.stringify(color)}`);
    }
}

function getBlendMode(name) {
    return constants.BlendMode[name]
}

function getNewDocumentMode(mode) {
    let out = null;
  
    console.log("getNewDocumentMode", mode)

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
  


module.exports = {
    parseAndRouteCommands
};


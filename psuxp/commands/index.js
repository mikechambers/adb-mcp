const { app, constants, core } = require("photoshop");

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
        default:
            console.log("Unknown Command", action)
            break;
      }

}


let createTextLayer = async (command) => {
    
    let options = command.options

    console.log("createTextLayer", options)

    // Check if there's an active document
    if (!app.activeDocument) {
        throw new Error("No active document. Please create or open a document first.");
    }

    let c = parseColor({red:255, green:0, blue:0})

    console.log(app.activeDocument.createTextLayer)

    try {
        await core.executeAsModal(
            async () => {
            

                //need to adjust font size is DPI is anything other than 72.
                //should document as part of createTextLayer call
                let fontSize = (app.activeDocument.resolution / 72) * options.fontSize;

                let a = await app.activeDocument.createTextLayer({
                blendMode: constants.BlendMode.DISSOLVE,//ignored
                textColor: c,
                color:constants.LabelColors.BLUE,//ignored
                opacity:50, //ignored 
                name: "layer name",//ignored
                contents: options.contents,
                fontSize: fontSize,
                fontName: "ArialMT",
                position: {x:700, y:600}//y is ignored
                
            })

            //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/layer/

            //can use bounds to change registration point?

            console.log(a)

            a.name = options.name
            a.opacity = 25
            a.blendMode = constants.BlendMode.DISSOLVE

            //works
            //a.applyGaussianBlur(200)

            //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/characterstyle/
            //https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/textitem/
            //a.textItem.characterStyle.size = s //this work, but sets to 48pt
        
        },
            {
                commandName: "Creating text layer...",
            }
        );
    } catch (e) {
        console.error("Error creating text layer:", e);
        throw e;
    }

    //await doc.createPixelLayer({ name: "myLayer", opacity: 80, fillNeutral: true })

    return 
    await app.activeDocument.createTextLayer({
        name:"foo",
        contents:"hello world",
        fontSize:24,
        position:{x: 200, y: 300}
    });
    return


    await require('photoshop').app.activeDocument.createLayer({
        name:options.name,
        contents:options.contents,
        fontSize:options.fontSize,
        position:options.position
    });
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
              fill:constants.DocumentFill.BACKGROUNDCOLOR,
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
    console.log("parseColor", color)

    try {
        const c = new app.SolidColor();
        c.rgb.red = color.red;
        c.rgb.green = color.green;
        c.rgb.blue = color.blue;

        console.log(c)
        
        return c
    } catch (e) {
        console.error("Error parsing color:", e);
        throw new Error(`Invalid color values: ${JSON.stringify(color)}`);
    }
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


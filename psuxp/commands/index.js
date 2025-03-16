const { app, constants, core } = require("photoshop");

let parseAndRouteCommands = async (commands) => {

    console.log("parseAndRouteCommands")

    if (!commands.length) {
        return
    }

    for (let c of commands) {
        await parseAndRouteCommand(c)
    }
}

let parseAndRouteCommand = async (command) => {

    let action = command.action

    console.log("parseAndRouteCommand", command )

    switch (action) {
        case "createDocument":
            await createDocument(command)
            break;
        default:
            console.log("Unknown Command", action)
            break;
      }

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

    const c = new app.SolidColor();
    c.rgb.red = color.red;
    c.rgb.green = color.green;
    c.rgb.blue = color.blue;

    console.log(c)
    
    return c
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


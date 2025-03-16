

let parseAndRouteCommand = async (command) => {
    let action = command.action

    switch (action) {
        case "createDocument":
            await createDocument(command)
        default:
            console.log("Unknown Command", action)
      }

}

let createDocument = async (command) => {

    let options = command.options

    await require('photoshop').core.executeAsModal(app.createDocument, {
        name: options.name,
        width: options.width,
        height: options.height,
        resolution: options.resolution,
        mode: options.mode
    });

    //"RGBColorMode"
}



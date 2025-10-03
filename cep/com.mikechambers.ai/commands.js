/* commands.js
 * Illustrator command handlers
 */


const getDocuments = async (command) => {
    const script = `
        (function() {
            try {
                var result = (function() {
                    if (app.documents.length > 0) {
                        var activeDoc = app.activeDocument;
                        var docs = [];
                        
                        for (var i = 0; i < app.documents.length; i++) {
                            var doc = app.documents[i];
                            docs.push($.global.createDocumentInfo(doc, activeDoc));
                        }
                        
                        return docs;
                    } else {
                        return [];
                    }
                })();
                
                if (result === undefined) {
                    return 'null';
                }
                
                return JSON.stringify(result);
            } catch(e) {
                return JSON.stringify({
                    error: e.toString(),
                    line: e.line || 'unknown'
                });
            }
        })();
    `;
    
    let result = await executeCommand(script);
    return createPacket(result);
}

const exportPNG = async (command) => {
    const options = command.options || {};
    
    // Extract all options into variables
    const path = options.path;
    const transparency = options.transparency !== undefined ? options.transparency : true;
    const antiAliasing = options.antiAliasing !== undefined ? options.antiAliasing : true;
    const artBoardClipping = options.artBoardClipping !== undefined ? options.artBoardClipping : true;
    const horizontalScale = options.horizontalScale || 100;
    const verticalScale = options.verticalScale || 100;
    const exportType = options.exportType || 'PNG24';
    const matte = options.matte;
    const matteColor = options.matteColor;
    
    // Validate required path parameter
    if (!path) {
        return createPacket(JSON.stringify({
            error: "Path is required for PNG export"
        }));
    }
    
    const script = `
        (function() {
            try {
                var result = (function() {
                    if (app.documents.length === 0) {
                        return { error: "No document is currently open" };
                    }
                    
                    var doc = app.activeDocument;
                    var exportPath = "${path}";
                    
                    // Export options from variables
                    var exportOptions = {
                        transparency: ${transparency},
                        antiAliasing: ${antiAliasing},
                        artBoardClipping: ${artBoardClipping},
                        horizontalScale: ${horizontalScale},
                        verticalScale: ${verticalScale},
                        exportType: "${exportType}"
                    };
                    
                    ${matte !== undefined ? `exportOptions.matte = ${matte};` : ''}
                    ${matteColor ? `exportOptions.matteColor = ${JSON.stringify(matteColor)};` : ''}
                    
                    // Use the global helper function if available, otherwise inline export
                    if (typeof $.global.exportToPNG === 'function') {
                        return $.global.exportToPNG(doc, exportPath, exportOptions);
                    } else {
                        // Inline export logic
                        try {
                            // Create PNG export options
                            var pngOptions = exportOptions.exportType === 'PNG8' ? 
                                new ExportOptionsPNG8() : new ExportOptionsPNG24();
                                
                            pngOptions.transparency = exportOptions.transparency;
                            pngOptions.antiAliasing = exportOptions.antiAliasing;
                            pngOptions.artBoardClipping = exportOptions.artBoardClipping;
                            pngOptions.horizontalScale = exportOptions.horizontalScale;
                            pngOptions.verticalScale = exportOptions.verticalScale;
                            
                            ${matte !== undefined ? `pngOptions.matte = ${matte};` : ''}
                            
                            ${matteColor ? `
                            // Set matte color
                            pngOptions.matteColor.red = ${matteColor.red};
                            pngOptions.matteColor.green = ${matteColor.green};
                            pngOptions.matteColor.blue = ${matteColor.blue};
                            ` : ''}
                            
                            // Create file object
                            var exportFile = new File(exportPath);
                            
                            // Determine export type
                            var exportType = exportOptions.exportType === 'PNG8' ? 
                                ExportType.PNG8 : ExportType.PNG24;
                            
                            // Export the file
                            doc.exportFile(exportFile, exportType, pngOptions);
                            
                            return {
                                success: true,
                                filePath: exportFile.fsName,
                                fileExists: exportFile.exists,
                                options: exportOptions,
                                documentName: doc.name
                            };
                            
                        } catch(exportError) {
                            return {
                                success: false,
                                error: exportError.toString(),
                                filePath: exportPath,
                                options: exportOptions,
                                documentName: doc.name
                            };
                        }
                    }
                })();
                
                if (result === undefined) {
                    return 'null';
                }
                
                return JSON.stringify(result);
            } catch(e) {
                return JSON.stringify({
                    error: e.toString(),
                    line: e.line || 'unknown'
                });
            }
        })();
    `;
    
    let result = await executeCommand(script);
    return createPacket(result);
}

const openFile = async (command) => {
    const options = command.options || {};
    
    // Extract path parameter
    const path = options.path;
    
    // Validate required path parameter
    if (!path) {
        return createPacket(JSON.stringify({
            error: "Path is required to open an Illustrator file"
        }));
    }
    
    const script = `
        (function() {
            try {
                var result = (function() {
                    var filePath = "${path}";
                    
                    try {
                        // Create file object
                        var fileToOpen = new File(filePath);
                        
                        // Check if file exists
                        if (!fileToOpen.exists) {
                            return {
                                success: false,
                                error: "File does not exist at the specified path",
                                filePath: filePath
                            };
                        }
                        
                        // Open the document
                        var doc = app.open(fileToOpen);
                        
                        return {
                            success: true,
                        };
                        
                    } catch(openError) {
                        return {
                            success: false,
                            error: openError.toString(),
                            filePath: filePath
                        };
                    }
                })();
                
                if (result === undefined) {
                    return 'null';
                }
                
                return JSON.stringify(result);
            } catch(e) {
                return JSON.stringify({
                    error: e.toString(),
                    line: e.line || 'unknown'
                });
            }
        })();
    `;
    
    let result = await executeCommand(script);
    return createPacket(result);
};

const getActiveDocumentInfo = async (command) => {
    const script = `
        (function() {
            try {
                var result = (function() {
                    if (app.documents.length > 0) {
                        var doc = app.activeDocument;
                        return $.global.createDocumentInfo(doc, doc);
                    } else {
                        return { error: "No document is currently open" };
                    }
                })();
                
                if (result === undefined) {
                    return 'null';
                }
                
                return JSON.stringify(result);
            } catch(e) {
                return JSON.stringify({
                    error: e.toString(),
                    line: e.line || 'unknown'
                });
            }
        })();
    `;
    
    let result = await executeCommand(script);
    return createPacket(result);
}

// Execute Illustrator command via ExtendScript
function executeCommand(script) {
    return new Promise((resolve, reject) => {
        const csInterface = new CSInterface();
        csInterface.evalScript(script, (result) => {
            if (result === 'EvalScript error.') {
                reject(new Error('ExtendScript execution failed'));
            } else {
                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    resolve(result);
                }
            }
        });
    });
}


async function executeExtendScript(command) {
    console.log(command)
    const options = command.options
    const scriptString = options.scriptString;

    const script = `
        (function() {
            try {
                var result = (function() {
                    ${scriptString}
                })();
                
                // If result is undefined, return null
                if (result === undefined) {
                    return 'null';
                }
                
                // Return stringified result
                return JSON.stringify(result);
            } catch(e) {
                return JSON.stringify({
                    error: e.toString(),
                    line: e.line || 'unknown'
                });
            }
        })();
    `;
    
    const result = await executeCommand(script);
    
    return createPacket(result);
}

const createPacket = (result) => {
    return {
        content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
        }]
    };
}

const parseAndRouteCommand = async (command) => {
    let action = command.action;

    let f = commandHandlers[action];

    if (typeof f !== "function") {
        throw new Error(`Unknown Command: ${action}`);
    }

    console.log(f.name)
    return await f(command);
};


// Execute commands
/*
async function executeCommand(command) {
    switch(command.action) {

        case "getLayers":
            return await getLayers();
        
        case "executeExtendScript":
            return await executeExtendScript(command);
        
        default:
            throw new Error(`Unknown command: ${command.action}`);
    }
}*/

const commandHandlers = {
    executeExtendScript,
    getDocuments,
    getActiveDocumentInfo,
    exportPNG,
    openFile
};
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
    getActiveDocumentInfo
};
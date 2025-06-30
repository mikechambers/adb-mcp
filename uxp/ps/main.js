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

const { entrypoints, UI } = require("uxp");
const {
    checkRequiresActiveDocument,
    parseAndRouteCommand,
} = require("./commands/index.js");

const { hasActiveSelection, generateDocumentInfo } = require("./commands/utils.js");

const { getLayers } = require("./commands/layers.js").commandHandlers;

const { io } = require("./socket.io.js");
//const { act } = require("react");
const app = require("photoshop").app;

const APPLICATION = "photoshop";
const PROXY_URL = "http://localhost:3001";

let socket = null;

const onCommandPacket = async (packet) => {
    let command = packet.command;

    let out = {
        senderId: packet.senderId,
    };

    try {
        //this will throw if an active document is required and not open
        checkRequiresActiveDocument(command);

        let response = await parseAndRouteCommand(command);

        out.response = response;
        out.status = "SUCCESS";

        let activeDocument = app.activeDocument
        let doc = generateDocumentInfo(activeDocument, activeDocument)
        out.document = doc;

        out.layers = await getLayers();

        out.hasActiveSelection = hasActiveSelection();
    } catch (e) {
        out.status = "FAILURE";
        out.message = `Error calling ${command.action} : ${e}`;
    }

    return out;
};

function connectToServer() {
    // Create new Socket.IO connection
    socket = io(PROXY_URL, {
        transports: ["websocket"],
    });

    socket.on("connect", () => {
        updateButton();
        console.log("Connected to server with ID:", socket.id);
        socket.emit("register", { application: APPLICATION });
    });

    socket.on("command_packet", async (packet) => {
        console.log("Received command packet:", packet);

        let response = await onCommandPacket(packet);
        sendResponsePacket(response);
    });

    socket.on("registration_response", (data) => {
        console.log("Received response:", data);
        //TODO: connect button here
    });

    socket.on("connect_error", (error) => {
        updateButton();
        console.error("Connection error:", error);
    });

    socket.on("disconnect", (reason) => {
        updateButton();
        console.log("Disconnected from server. Reason:", reason);

        //TODO:connect button here
    });

    return socket;
}

function disconnectFromServer() {
    if (socket && socket.connected) {
        socket.disconnect();
        console.log("Disconnected from server");
    }
}

function sendResponsePacket(packet) {
    if (socket && socket.connected) {
        socket.emit("command_packet_response", {
            packet: packet,
        });
        return true;
    }
    return false;
}

function sendCommand(command) {
    if (socket && socket.connected) {
        socket.emit("app_command", {
            application: APPLICATION,
            command: command,
        });
        return true;
    }
    return false;
}

let onInterval = async () => {
    let commands = await fetchCommands();

    await parseAndRouteCommands(commands);
};

let fetchCommands = async () => {
    try {
        let url = `http://127.0.0.1:3030/commands/get/${APPLICATION}/`;

        const fetchOptions = {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        };

        // Make the fetch request
        const response = await fetch(url, fetchOptions);

        // Check if the request was successful
        if (!response.ok) {
            console.log("a");
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let r = await response.json();

        if (r.status != "SUCCESS") {
            throw new Error(`API Request error! Status: ${response.message}`);
        }

        return r.commands;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error; // Re-throw to allow caller to handle the error
    }
};

entrypoints.setup({
    panels: {
        vanilla: {
            show(node) {},
        },
    },
});

let updateButton = () => {
    let b = document.getElementById("btnStart");

    b.textContent = socket && socket.connected ? "Disconnect" : "Connect";
};

//Toggle button to make it start stop
document.getElementById("btnStart").addEventListener("click", () => {
    if (socket && socket.connected) {
        disconnectFromServer();
    } else {
        connectToServer();
    }
});

const CONNECT_ON_LAUNCH = "connectOnLaunch";
// Save checkbox state in localStorage
document
    .getElementById("chkConnectOnLaunch")
    .addEventListener("change", function (event) {
        window.localStorage.setItem(
            CONNECT_ON_LAUNCH,
            JSON.stringify(event.target.checked)
        );
    });

// Retrieve checkbox state
const getConnectOnLaunch = () => {
    return JSON.parse(window.localStorage.getItem(CONNECT_ON_LAUNCH)) || false;
};

// Set checkbox state on page load
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("chkConnectOnLaunch").checked =
        getConnectOnLaunch();
});

window.addEventListener("load", (event) => {
    if (getConnectOnLaunch()) {
        connectToServer();
    }
});

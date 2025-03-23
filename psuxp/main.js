const { entrypoints, UI } = require("uxp");
const {
    parseAndRouteCommands,
    parseAndRouteCommand,
} = require("./commands/index.js");

const { io } = require("./socket.io.js");
const app = require("photoshop").app;

const UPDATE_INTERVAL = 1000 * 2;
const APPLICATION = "photoshop";
const PROXY_URL = "http://localhost:3001";

let intervalId = null;

// Core Socket.IO functions for Photoshop UXP
let socket = null;

function connectToServer(onCommandPacketCallback = null) {
    // Create new Socket.IO connection
    socket = io(PROXY_URL, {
        transports: ["websocket"],
    });

    socket.on("connect", () => {
        console.log("Connected to server with ID:", socket.id);
        socket.emit("register", { application: APPLICATION });
    });

    socket.on("command_packet", async (packet) => {
        console.log("Received command packet:", packet);
        if (
            onCommandPacketCallback &&
            typeof onCommandPacketCallback === "function"
        ) {
            let response = await onCommandPacketCallback(packet);
            sendResponsePacket(response);
        }
    });

    socket.on("registration_response", (data) => {
        console.log("Received response:", data);
        //TODO: connect button here
    });

    socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
    });

    socket.on("disconnect", (reason) => {
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

let startInterval = () => {
    intervalId = setInterval(onInterval, UPDATE_INTERVAL);
};

let stopInterval = () => {
    clearInterval(intervalId);
    intervalId = null;
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

//Toggle button to make it start stop
document.getElementById("btnStart").addEventListener("click", () => {
    let b = document.getElementById("btnStart");

    if (intervalId) {
        disconnectFromServer();
        //stopInterval()
        b.textContent = "Connect";
    } else {
        //startInterval();

        const onCommandPacket = async (packet) => {
            let command = packet.command;

            let response = await parseAndRouteCommand(command);

            return {
                senderId: packet.senderId,
                status: "SUCCESS",
                response: response,
            };
        };

        connectToServer(onCommandPacket);

        b.textContent = "Disconnect";
    }
});

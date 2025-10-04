/* Socket.IO Plugin for After Effects (CEP)
 * Main JavaScript file
 */

const csInterface = new CSInterface();
const APPLICATION = "illustrator";
const PROXY_URL = "http://localhost:3001";


let socket = null;

// Log function
function log(message) {
    const logArea = document.getElementById('messageLog');
    const timestamp = new Date().toLocaleTimeString();
    logArea.value += `[${timestamp}] ${message}\n`;
    logArea.scrollTop = logArea.scrollHeight;
}

// Update UI status
function updateStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const btnConnect = document.getElementById('btnConnect');

    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        btnConnect.textContent = 'Disconnect';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        btnConnect.textContent = 'Connect';
    }
}

// Handle incoming command packets
async function onCommandPacket(packet) {
    log(`Received command: ${packet.command.action}`);

    let out = {
        senderId: packet.senderId,
    };

    try {
        // Execute the command in After Effects (from commands.js)
        //const response = await executeCommand(packet.command);
        const response = await parseAndRouteCommand(packet.command);
        
        out.response = response;
        out.status = "SUCCESS";
        
        // Get project info
        //out.projectInfo = await getProjectInfo();
        out.document = await getActiveDocumentInfo();
        
    } catch (e) {
        out.status = "FAILURE";
        out.message = `Error calling ${packet.command.action}: ${e.message}`;
        log(`Error: ${e.message}`);
    }

    return out;
}

// Connect to Socket.IO server
function connectToServer() {
    
    log(`Connecting to ${PROXY_URL}...`);
    
    socket = io(PROXY_URL, {
        transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
        updateStatus(true);
        log(`Connected with ID: ${socket.id}`);
        socket.emit("register", { application: APPLICATION });
    });

    socket.on("command_packet", async (packet) => {
        log(`Received command packet`);
        const response = await onCommandPacket(packet);
        sendResponsePacket(response);
    });

    socket.on("registration_response", (data) => {
        log(`Registration confirmed: ${data.message || 'OK'}`);
    });

    socket.on("connect_error", (error) => {
        updateStatus(false);
        log(`Connection error: ${error.message}`);
    });

    socket.on("disconnect", (reason) => {
        updateStatus(false);
        log(`Disconnected: ${reason}`);
    });
}

// Disconnect from server
function disconnectFromServer() {
    if (socket && socket.connected) {
        socket.disconnect();
        log('Disconnected from server');
    }
}

// Send response packet
function sendResponsePacket(packet) {
    if (socket && socket.connected) {
        socket.emit("command_packet_response", { packet });
        log('Response sent');
        log(packet)
        return true;
    }
    return false;
}

// LocalStorage helpers
const CONNECT_ON_LAUNCH = "connectOnLaunch";

function saveSettings() {
    localStorage.setItem(CONNECT_ON_LAUNCH, 
        document.getElementById('chkConnectOnLaunch').checked);
}

function loadSettings() {
    const connectOnLaunch = localStorage.getItem(CONNECT_ON_LAUNCH) === 'true';
    
    document.getElementById('chkConnectOnLaunch').checked = connectOnLaunch;
    
    return connectOnLaunch;
}

// Event Listeners
document.getElementById('btnConnect').addEventListener('click', () => {
    if (socket && socket.connected) {
        disconnectFromServer();
    } else {
        connectToServer();
    }
    saveSettings();
});

document.getElementById('chkConnectOnLaunch').addEventListener('change', saveSettings);


function initializeExtension() {
    const csInterface = new CSInterface();
    const extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
    const polyfillPath = extensionPath + '/jsx/json-polyfill.jsx';
    const utilsPath = extensionPath + '/jsx/utils.jsx';
    
    csInterface.evalScript(`$.evalFile("${polyfillPath}")`, function(result) {
        console.log('JSON polyfill loaded');
    });

    csInterface.evalScript(`$.evalFile("${utilsPath}")`, function(result) {
        console.log('utilsPath loaded');
    });
}

// Initialize on load
window.addEventListener('load', () => {
    initializeExtension()
    const connectOnLaunch = loadSettings();
    log('Plugin loaded');
    
    if (connectOnLaunch) {
        connectToServer();
    }
});

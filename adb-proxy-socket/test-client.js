const io = require('socket.io-client');

// Connect to the Socket.IO server with WebSocket transport only
const socket = io('http://localhost:3000', {
  transports: ['websocket'], // Use WebSocket ONLY to match server configuration
  reconnectionAttempts: 5,
  timeout: 10000, // Increase timeout
  debug: true    // Enable debugging
});

// Log detailed connection process
socket.io.on("reconnect_attempt", () => {
  console.log('Attempting to reconnect...');
});

socket.io.on("reconnect_error", (error) => {
  console.log('Reconnection error:', error);
});

socket.io.on("reconnect_failed", () => {
  console.log('Failed to reconnect after multiple attempts');
});

// When connected, send a message immediately
socket.on('connect', () => {
  console.log('Connected to server!');
  
  // Send a private message to the server on connect
  socket.emit('private_message', { 
    targetId: 'server', // Replace with actual target client ID if needed
    message: 'Hello from client!'
  });
  
  console.log('Message sent to server');
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Listen for JSON responses from the server
socket.on('json_response', (data) => {
  console.log('Received response:', data);
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected from server. Reason:', reason);
});

// Keep the process alive
console.log('Connecting to Socket.IO server at ws://localhost:3000...');
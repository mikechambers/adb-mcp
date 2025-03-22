const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ["websocket"] }); // Enforce WebSockets

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    targetId = socket.id
    socket.on('command_packet', ({ application, command }) => {
        console.log(`Private message from ${socket.id} to ${application}:`, command);

        // Send message only to the specified client
        io.to(targetId).emit('json_response', { from: socket.id, command });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(3001, () => {
    console.log('WebSocket server running on ws://localhost:3001');
});

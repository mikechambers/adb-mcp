const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ["websocket"] }); // Enforce WebSockets

// Track clients by application
const applicationClients = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('register', ({ application }) => {
    console.log(`Client ${socket.id} registered for application: ${application}`);
    
    // Store the application preference with this socket
    socket.data.application = application;
    
    // Register this client for this application
    if (!applicationClients[application]) {
      applicationClients[application] = new Set();
    }
    applicationClients[application].add(socket.id);
    
    // Optionally confirm registration
    socket.emit('registration_response', { 
      type: 'registration', 
      status: 'success', 
      message: `Registered for ${application}` 
    });
  });

  socket.on('command_packet', ({ application, command }) => {
    console.log(`Command from ${socket.id} for application ${application}:`, command);
    
    // Register this client for this application if not already registered
    //if (!applicationClients[application]) {
    //  applicationClients[application] = new Set();
    //}
    //applicationClients[application].add(socket.id);
    
    // Process the command

    sendToApplication(application, command)
    
    // Send response back to this client
    //socket.emit('json_response', { from: 'server', command });
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove this client from all application registrations
    for (const app in applicationClients) {
      applicationClients[app].delete(socket.id);
      // Clean up empty sets
      if (applicationClients[app].size === 0) {
        delete applicationClients[app];
      }
    }
  });
});

// Add a function to send messages to clients by application
function sendToApplication(application, command) {

    console.log("sendToApplication")
    console.log(typeof command)

  if (applicationClients[application]) {
    console.log(`Sending to ${applicationClients[application].size} clients for ${application}`);
    
    // Loop through all client IDs for this application
    applicationClients[application].forEach(clientId => {
      io.to(clientId).emit('command_packet', command);
    });
    return true;
  }
  console.log(`No clients registered for application: ${application}`);
  return false;
}

// Example: Use this function elsewhere in your code
// sendToApplication('photoshop', { message: 'Update available' });

server.listen(3001, () => {
  console.log('WebSocket server running on ws://localhost:3001');
});
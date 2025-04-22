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

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ["websocket"] }); // Enforce WebSockets

const PORT = 3001
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

  socket.on('command_packet_response', ({ packet }) => {
    const senderId = packet.senderId;
  
    if (senderId) {
      
      io.to(senderId).emit('packet_response', packet);
      console.log(`Sent confirmation to client ${senderId}`);
    } else {
      console.log(`No sender ID provided in packet`);
    }
  });

  socket.on('command_packet', ({ application, command }) => {
    console.log(`Command from ${socket.id} for application ${application}:`, command);
    
    // Register this client for this application if not already registered
    //if (!applicationClients[application]) {
    //  applicationClients[application] = new Set();
    //}
    //applicationClients[application].add(socket.id);
    
    // Process the command

    let packet = {
        senderId:socket.id,
        application:application,
        command:command
    }

    sendToApplication(packet)
    
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
function sendToApplication(packet) {

    let application = packet.application
    if (applicationClients[application]) {
        console.log(`Sending to ${applicationClients[application].size} clients for ${application}`);
    
        let senderId = packet.senderId
        // Loop through all client IDs for this application
        applicationClients[application].forEach(clientId => {
            io.to(clientId).emit('command_packet', packet);
    });
    return true;
  }
  console.log(`No clients registered for application: ${application}`);
  return false;
}

// Example: Use this function elsewhere in your code
// sendToApplication('photoshop', { message: 'Update available' });

server.listen(PORT, () => {
  console.log(`adb-mcp Command proxy server running on ws://localhost:${PORT}`);
});
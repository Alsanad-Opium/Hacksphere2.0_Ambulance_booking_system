const { Server } = require('socket.io');

/**
 * Initialize socket.io with HTTP server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Socket connection handler
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle ambulance location updates
    socket.on('update-ambulance-location', (data) => {
      // Broadcast to all clients except sender
      socket.broadcast.emit('ambulance-location-updated', data);
    });

    // Handle emergency requests
    socket.on('emergency-request', (data) => {
      io.emit('new-emergency', data);
    });

    // Handle chat messages
    socket.on('send-message', (data) => {
      io.to(data.roomId).emit('new-message', data);
    });

    // Handle user joining a chat room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Handle user leaving a chat room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room: ${roomId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

module.exports = { initializeSocket }; 
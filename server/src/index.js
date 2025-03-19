require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const ambulanceRoutes = require('./routes/ambulance');
const emergencyRoutes = require('./routes/emergency');
const hospitalRoutes = require('./routes/hospital');
const paymentRoutes = require('./routes/payment');

// Import middleware
const { errorHandler, notFound } = require('./middlewares/errorHandler');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Ambulance Booking System API', 
    status: 'online',
    environment: process.env.NODE_ENV || 'development' 
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/payments', paymentRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room (e.g., for tracking a specific emergency)
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // Leave a room
  socket.on('leave', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });

  // Listen for location updates from drivers
  socket.on('updateLocation', (data) => {
    // Emit to all clients in the specific emergency room
    if (data.emergencyId) {
      io.to(data.emergencyId).emit('locationUpdated', data);
    }
  });

  // Listen for emergency status updates
  socket.on('updateEmergencyStatus', (data) => {
    // Emit to all clients in the specific emergency room
    if (data.emergencyId) {
      io.to(data.emergencyId).emit('emergencyStatusUpdated', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server in development mode
  if (process.env.NODE_ENV === 'production') {
    server.close(() => process.exit(1));
  }
}); 
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // In development, if no MongoDB URI is provided, log a message and mock mode warning
    if (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) {
      console.log('MongoDB URI not provided. Running in development with mock DB mode.');
      console.warn('Warning: Some features will not work correctly without a MongoDB connection.');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ambulance-booking', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    
    // In development mode, don't exit the process
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    } else {
      console.warn('Warning: Running without database connection. Some features will not work correctly.');
    }
  }
};

module.exports = connectDB; 
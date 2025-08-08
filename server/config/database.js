import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.warn('MONGODB_URI not set - using in-memory storage');
      return false;
    }
    
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI, {
      // Mongoose 6+ handles these options automatically, but can be explicit
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    
    // In development, continue without DB (fallback to in-memory)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Continuing without MongoDB - using in-memory storage');
      return false;
    }
    
    process.exit(1);
  }
  
  return true;
};

export default connectDB;

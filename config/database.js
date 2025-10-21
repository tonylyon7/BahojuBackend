import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Primary MongoDB URI (Atlas)
    const atlasURI = process.env.MONGODB_URI;
    // Fallback to local MongoDB
    const localURI = process.env.MONGODB_TEST || 'mongodb://localhost:27017/bahoju-tech';
    
    let mongoURI = atlasURI;
    let connectionType = 'MongoDB Atlas';

    console.log('🔄 Connecting to MongoDB...');
    
    try {
      // Try Atlas connection first
      if (atlasURI) {
        console.log('🌐 Attempting MongoDB Atlas connection...');
        const conn = await mongoose.connect(atlasURI, {
          serverSelectionTimeoutMS: 5000, // 5 second timeout
        });
        console.log(`🍃 MongoDB Atlas Connected: ${conn.connection.host}`);
        return conn;
      }
    } catch (atlasError) {
      console.log('⚠️  MongoDB Atlas connection failed, trying local MongoDB...');
      console.log('Atlas Error:', atlasError.message);
      
      // Fall back to local MongoDB
      mongoURI = localURI;
      connectionType = 'Local MongoDB';
    }

    // Connect to local MongoDB
    console.log(`🔄 Connecting to ${connectionType}...`);
    const conn = await mongoose.connect(mongoURI);

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔒 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;

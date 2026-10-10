import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frnd_app';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', (error as Error).message);
    process.exit(1);
  }
};

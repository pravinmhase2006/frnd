import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { beforeAll, afterAll } from 'vitest';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/frnd_app';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

import mongoose from 'mongoose';
import { env } from './env';
import logger from '../utils/logger';

export const connectDB = async () => {
  try {
    const uri = env.MONGO_URI;
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    logger.info(`Attempting to connect to MongoDB at: ${maskedUri}`);
    
    await mongoose.connect(uri);
    logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

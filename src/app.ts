import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';

import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import contactRoutes from './routes/contactRoutes';
import friendRoutes from './routes/friendRoutes';
import messageRoutes from './routes/messageRoutes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_URL, // Frontend URL
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', env: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);


// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;

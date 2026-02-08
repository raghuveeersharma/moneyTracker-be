import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import logger from './utils/logger';

// Connect to Database
connectDB();

const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible globally via request context
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join_room', (userId) => {
    socket.join(userId);
    logger.info(`User ${socket.id} joined room ${userId}`);
  });

  socket.on('send_message', (data) => {
    // data: { to: userId, message: text, from: userId }
    io.to(data.to).emit('receive_message', data);
  });

  socket.on('typing', (data) => {
    // data: { recipientId: string, senderId: string }
    io.to(data.recipientId).emit('typing', { senderId: data.senderId });
  });

  socket.on('stop_typing', (data) => {
    // data: { recipientId: string, senderId: string }
    io.to(data.recipientId).emit('stop_typing', { senderId: data.senderId });
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io accessible globally if needed, or pass it via request context
// app.set('io', io);

// Start Server
const PORT = env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

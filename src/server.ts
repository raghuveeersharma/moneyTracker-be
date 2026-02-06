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
    origin: 'http://localhost:3000',
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

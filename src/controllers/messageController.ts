import { Response } from 'express';
import mongoose from 'mongoose';
import { Message } from '../models';
import { AuthRequest } from '../middlewares/authMiddleware';

// Get messages between current user and another user
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const friendId = req.params.friendId as string;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const friendObjId = new mongoose.Types.ObjectId(friendId);

    console.log(`Fetching messages between ${userId} and ${friendId}`);

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: friendObjId },
        { senderId: friendObjId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 });

    console.log(`Found ${messages.length} messages`);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Save a new message
// Save a new message
export const saveMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'receiverId and content required' });
    }

    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      content,
    });

    // Get IO instance
    const io = req.app.get('io');
    if (io) {
      // Emit to receiver's room
      io.to(receiverId).emit('receive_message', message);
      // Optional: Emit to sender's room too if they have multiple open tabs
      io.to(req.user.id).emit('receive_message', message); 
      console.log(`Emitted message to ${receiverId} and ${req.user.id}`);
    } else {
      console.error('Socket.io instance not found in request');
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;

    await Message.updateMany(
      { senderId: friendId, receiverId: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

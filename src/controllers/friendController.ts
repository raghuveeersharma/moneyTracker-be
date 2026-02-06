import { Response } from 'express';
import { Friendship, User } from '../models';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';

// Send friend request
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user.id;
    const { recipientId } = req.body;

    if (requesterId === recipientId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if friendship already exists
    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request already exists or you are already friends' });
    }

    const friendship = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const friendship = await Friendship.findById(id);
    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Only recipient can accept
    if (friendship.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const friendship = await Friendship.findById(id);
    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Only recipient can reject
    if (friendship.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    friendship.status = 'rejected';
    await friendship.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get all accepted friends
export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted'
    }).populate('requester recipient', 'username email');

    // Extract friend details
    const friends = friendships.map(f => {
      const friend = f.requester._id.toString() === req.user.id ? f.recipient : f.requester;
      return {
        friendshipId: f._id,
        ...((friend as any).toObject()),
      };
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get pending friend requests (incoming)
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const pending = await Friendship.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'username email');

    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get sent pending requests
export const getSentRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const sent = await Friendship.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'username email');

    res.json(sent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Remove friend
export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const friendship = await Friendship.findById(id);
    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    // Either party can remove
    if (friendship.requester.toString() !== userId && friendship.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Friendship.findByIdAndDelete(id);

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

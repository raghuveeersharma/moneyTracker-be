import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models';
import { env } from '../config/env';
import { AuthRequest } from '../middlewares/authMiddleware';

const generateToken = (id: string) => {
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: '30d' });
};

// Zod Schemas
const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('username email');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Search query required' });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      username: { $regex: q, $options: 'i' }
    }).select('username email').limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is being changed and is unique
    if (data.username && data.username !== user.username) {
      const existingUser = await User.findOne({ username: data.username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = data.username;
    }

    // Check if email is being changed and is unique
    if (data.email && data.email !== user.email) {
      const existingEmail = await User.findOne({ email: data.email });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = data.email;
    }

    // Handle password change
    if (data.newPassword) {
      if (!data.currentPassword) {
        return res.status(400).json({ message: 'Current password required' });
      }
      
      const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(data.newPassword, salt);
    }

    await user.save();

    res.json({
      _id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

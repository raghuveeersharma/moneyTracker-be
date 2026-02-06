import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Transaction, Friendship, User } from '../models';
import { AuthRequest } from '../middlewares/authMiddleware';

const transactionSchema = z.object({
  type: z.enum(['lend', 'borrow']),
  amount: z.number().positive(),
  counterpartyId: z.string().min(1, 'Friend is required'),
  counterpartyName: z.string().min(1),
  paymentStatus: z.enum(['pending', 'paid']).default('pending'),
  date: z.string().transform((str) => new Date(str)).optional(),
  notes: z.string().optional(),
});

// Get all transactions (where user is creator OR counterparty)
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    const transactions = await Transaction.find({
      $or: [{ creatorId: userId }, { counterpartyId: userId }]
    })
    .populate('creatorId', 'username email')
    .populate('counterpartyId', 'username email')
    .sort({ date: -1 });

    // Add a field to indicate if current user is the creator
    const result = transactions.map(t => ({
      ...t.toObject(),
      isCreator: t.creatorId._id.toString() === req.user.id,
      // From counterparty's perspective, type is reversed
      displayType: t.creatorId._id.toString() === req.user.id 
        ? t.type 
        : (t.type === 'lend' ? 'borrow' : 'lend'),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new transaction
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const data = transactionSchema.parse(req.body);
    
    // Verify they are friends
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const counterpartyId = new mongoose.Types.ObjectId(data.counterpartyId);

    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: counterpartyId, status: 'accepted' },
        { requester: counterpartyId, recipient: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(400).json({ message: 'You can only create transactions with friends' });
    }

    const transaction = await Transaction.create({
      creatorId: req.user.id,
      counterpartyId: data.counterpartyId,
      counterpartyName: data.counterpartyName,
      type: data.type,
      amount: data.amount,
      paymentStatus: data.paymentStatus || 'pending',
      approvalStatus: 'pending',
      date: data.date || new Date(),
      notes: data.notes,
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

// Update transaction (only creator can update)
export const updateTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.creatorId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Only the creator can edit this transaction' });
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Accept/Reject transaction (only counterparty can do this)
export const respondToTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.counterpartyId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Only the counterparty can respond to this transaction' });
    }

    transaction.approvalStatus = action === 'accept' ? 'accepted' : 'rejected';
    await transaction.save();

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete transaction (only creator can delete)
export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.creatorId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Only the creator can delete this transaction' });
    }

    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Get stats for transactions where user is involved (accepted only)
    const stats = await Transaction.aggregate([
      { 
        $match: { 
          $or: [{ creatorId: userId }, { counterpartyId: userId }],
          approvalStatus: 'accepted'
        } 
      },
      {
        $addFields: {
          effectiveType: {
            $cond: {
              if: { $eq: ['$creatorId', userId] },
              then: '$type',
              else: { $cond: { if: { $eq: ['$type', 'lend'] }, then: 'borrow', else: 'lend' } }
            }
          }
        }
      },
      {
        $group: {
          _id: '$effectiveType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent transactions
    const recent = await Transaction.find({
      $or: [{ creatorId: userId }, { counterpartyId: userId }]
    })
    .populate('creatorId', 'username')
    .populate('counterpartyId', 'username')
    .sort({ date: -1 })
    .limit(5);

    // Get pending approvals count
    const pendingCount = await Transaction.countDocuments({
      counterpartyId: userId,
      approvalStatus: 'pending'
    });

    res.json({ stats, recent, pendingCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

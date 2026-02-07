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

// Get transactions with a specific friend with pagination and stats
export const getFriendTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const friendId = new mongoose.Types.ObjectId(req.params.friendId as string);
        
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20; // Default limit
        const skip = (page - 1) * limit;

        // Base query for transactions between these two users
        const query = {
            $or: [
                { creatorId: userId, counterpartyId: friendId },
                { creatorId: friendId, counterpartyId: userId }
            ]
        };

        // 1. Get Paginated Transactions
        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .populate('creatorId', 'username')
            .populate('counterpartyId', 'username');

        const totalTransactions = await Transaction.countDocuments(query);

        // 2. Calculate Net Balance (Aggregate over ALL transactions, not just paginated ones)
        const allTransactions = await Transaction.find(query); // Optimization: Use aggregate for performance if many docs
        
        let totalGiven = 0; // I gave (Lend by me OR Borrow by them)
        let totalReceived = 0; // I received (Borrow by me OR Lend by them)

        allTransactions.forEach(t => {
            if (t.approvalStatus !== 'accepted' && t.approvalStatus !== 'pending') return; // Should we include pending? usually yes for "what is owed" until rejected? Or only accepted?
            // "ultimately they are still in debt OR they will get that money" -> implies accepted debt.
            // Let's count ACCEPTED transactions for the balance to be accurate.
            if (t.approvalStatus !== 'accepted') return;

            // Normalize to "User's perspective"
            const isMyTransaction = t.creatorId.toString() === req.user.id;
            
            if (isMyTransaction) {
                if (t.type === 'lend') totalGiven += t.amount;
                else totalReceived += t.amount;
            } else {
                // Friend created it
                if (t.type === 'lend') totalReceived += t.amount; // They lent to me -> I received
                else totalGiven += t.amount; // They borrowed from me -> I gave
            }
        });
        
        // Subtract paid amounts?
        // The Schema has `paymentStatus: 'paid' | 'pending'`.
        // If it's PAID, it shouldn't count towards the ACTIVE debt balance?
        // OR "History" means total ever?
        // "how much we give and borrow and it will tell the user that the ultimately they are still in debt"
        // This implies CURRENT net debt.
        // So we should exclude 'paid' transactions from the balance calculation, OR subtract them.
        // Or simplified: Net Balance = (Outstanding Given) - (Outstanding Received).
        
        // Refined Logic for Balance:
        let netBalance = 0;
        
        allTransactions.forEach(t => {
            if (t.approvalStatus !== 'accepted') return;
            if (t.paymentStatus === 'paid') return; // Ignore paid off debts for the "Current Debt" number

            const isMeCreator = t.creatorId.toString() === req.user.id;
            
            // Effect on Me
            // Lend (Me->Friend): + (Friend owes me)
            // Borrow (Me->Friend): - (I owe friend)
            
            let amount = t.amount;
            
            if (isMeCreator) {
                if (t.type === 'lend') netBalance += amount;
                else netBalance -= amount;
            } else {
                // Friend created
                 if (t.type === 'lend') netBalance -= amount; // Friend lent to me (I owe)
                 else netBalance += amount; // Friend borrowed from me (They owe)
            }
        });
        
        // Determine text status
        // netBalance > 0: Friend owes me
        // netBalance < 0: I owe Friend
        
        res.json({
            transactions,
            stats: {
                netBalance,
                totalGiven, // Maybe keeping these as raw totals is useful too? User asked "total of how much we give and borrow"
                totalReceived // This might mean "Total Volume" or "Current Outstanding". I'll provide Net Balance as the primary metric.
            },
            pagination: {
                page,
                limit,
                total: totalTransactions,
                pages: Math.ceil(totalTransactions / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching friend transactions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

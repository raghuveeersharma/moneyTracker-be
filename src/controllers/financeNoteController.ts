import { Response } from 'express';
import { z } from 'zod';
import { FinanceNote, FinanceBalance } from '../models';
import { AuthRequest } from '../middlewares/authMiddleware';

const financeNoteSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be a positive number'),
});

const balanceSchema = z.object({
  balance: z.number().min(0, 'Balance must be zero or positive'),
});

// Get the user's current balance
export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await FinanceBalance.findOne({ userId: req.user.id });
    res.json({ balance: doc?.balance ?? 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Set (create or update) the user's balance
export const setBalance = async (req: AuthRequest, res: Response) => {
  try {
    const data = balanceSchema.parse(req.body);

    const doc = await FinanceBalance.findOneAndUpdate(
      { userId: req.user.id },
      { balance: data.balance },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ balance: doc.balance });
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

// Get all finance notes for the authenticated user
export const getFinanceNotes = async (req: AuthRequest, res: Response) => {
  try {
    const notes = await FinanceNote.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new finance note
export const createFinanceNote = async (req: AuthRequest, res: Response) => {
  try {
    const data = financeNoteSchema.parse(req.body);

    const note = await FinanceNote.create({
      userId: req.user.id,
      description: data.description,
      amount: data.amount,
    });

    res.status(201).json(note);
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

// Update a finance note (only owner)
export const updateFinanceNote = async (req: AuthRequest, res: Response) => {
  try {
    const note = await FinanceNote.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Finance note not found' });
    }

    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    const data = financeNoteSchema.parse(req.body);

    note.description = data.description;
    note.amount = data.amount;
    await note.save();

    res.json(note);
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

// Delete a finance note (only owner)
export const deleteFinanceNote = async (req: AuthRequest, res: Response) => {
  try {
    const note = await FinanceNote.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Finance note not found' });
    }

    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    await note.deleteOne();
    res.json({ message: 'Finance note removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

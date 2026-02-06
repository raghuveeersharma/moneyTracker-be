import { Response } from 'express';
import { z } from 'zod';
import { Contact } from '../models';
import { AuthRequest } from '../middlewares/authMiddleware';

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const contacts = await Contact.find({ userId: req.user.id });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createContact = async (req: AuthRequest, res: Response) => {
  try {
    const data = contactSchema.parse(req.body);
    const contact = await Contact.create({
      ...data,
      userId: req.user.id
    });
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(400).json({ message: error.errors || error.message });
  }
};

export const deleteContact = async (req: AuthRequest, res: Response) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    if (contact.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    await contact.deleteOne();
    res.json({ message: 'Contact removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

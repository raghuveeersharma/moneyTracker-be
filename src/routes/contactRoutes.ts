import express from 'express';
import { getContacts, createContact, deleteContact } from '../controllers/contactController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();
router.use(protect);

router.get('/', getContacts);
router.post('/', createContact);
router.delete('/:id', deleteContact);

export default router;

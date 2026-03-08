import express from 'express';
import {
  getFinanceNotes,
  createFinanceNote,
  updateFinanceNote,
  deleteFinanceNote,
  getBalance,
  setBalance,
} from '../controllers/financeNoteController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect); // All routes protected

// Balance
router.get('/balance', getBalance);
router.put('/balance', setBalance);

// Notes
router.get('/', getFinanceNotes);
router.post('/', createFinanceNote);
router.put('/:id', updateFinanceNote);
router.delete('/:id', deleteFinanceNote);

export default router;

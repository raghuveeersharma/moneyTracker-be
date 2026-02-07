import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardStats,
  respondToTransaction,
  getFriendTransactions
} from '../controllers/transactionController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect); // All routes protected

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/dashboard', getDashboardStats);
router.get('/friend/:friendId', getFriendTransactions);
router.put('/:id', updateTransaction);
router.post('/:id/respond', respondToTransaction);
router.delete('/:id', deleteTransaction);

export default router;

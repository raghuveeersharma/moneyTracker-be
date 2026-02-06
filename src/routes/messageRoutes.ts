import express from 'express';
import { getMessages, saveMessage } from '../controllers/messageController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:friendId', getMessages);
router.post('/', saveMessage);

export default router;

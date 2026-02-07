import express from 'express';
import { getMessages, saveMessage, markMessagesAsRead } from '../controllers/messageController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:friendId', getMessages);
router.post('/', saveMessage);
router.put('/read/:friendId', markMessagesAsRead);

export default router;

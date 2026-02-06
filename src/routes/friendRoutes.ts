import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  removeFriend
} from '../controllers/friendController';

const router = Router();

router.use(protect);

router.get('/', getFriends);
router.get('/pending', getPendingRequests);
router.get('/sent', getSentRequests);
router.post('/request', sendFriendRequest);
router.post('/accept/:id', acceptFriendRequest);
router.post('/reject/:id', rejectFriendRequest);
router.delete('/:id', removeFriend);

export default router;

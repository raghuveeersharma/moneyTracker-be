import express from 'express';
import { registerUser, loginUser, getMe, getAllUsers, searchUsers, updateProfile } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getAllUsers);
router.get('/users/search', protect, searchUsers);

export default router;



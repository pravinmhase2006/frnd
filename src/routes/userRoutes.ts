import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  getInstantMatch,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  updatePrivacySettings,
  deleteAccount,
  healthCheck,
} from '../controllers/userController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/health', healthCheck);
router.post('/users', optionalAuth, createUser);
router.get('/users', optionalAuth, getUsers);
router.get('/users/match', optionalAuth, getInstantMatch);
router.get('/users/blocked', optionalAuth, getBlockedUsers);
router.post('/users/block', optionalAuth, blockUser);
router.post('/users/unblock', optionalAuth, unblockUser);
router.post('/users/report', optionalAuth, reportUser);
router.put('/users/privacy', optionalAuth, updatePrivacySettings);
router.delete('/users/me', optionalAuth, deleteAccount);
router.delete('/users/:id', optionalAuth, deleteAccount);
router.get('/users/:id', optionalAuth, getUserById);

export default router;

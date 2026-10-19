import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  getInstantMatch,
  healthCheck,
} from '../controllers/userController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/health', healthCheck);
router.post('/users', optionalAuth, createUser);
router.get('/users', optionalAuth, getUsers);
router.get('/users/match', optionalAuth, getInstantMatch);
router.get('/users/:id', optionalAuth, getUserById);

export default router;

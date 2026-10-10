import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  getInstantMatch,
  healthCheck,
} from '../controllers/userController.js';

const router = Router();

router.get('/health', healthCheck);
router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/match', getInstantMatch);
router.get('/users/:id', getUserById);

export default router;

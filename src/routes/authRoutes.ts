import { Router } from 'express';
import {
  sendEmailVerification,
  verifyEmail,
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
} from '../controllers/authController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/send-email-code', sendEmailVerification);
router.post('/verify-email', verifyEmail);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', optionalAuth, getMe);
router.put('/profile/:id', optionalAuth, updateProfile);

export default router;

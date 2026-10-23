import { Router } from 'express';
import {
  sendEmailVerification,
  verifyEmail,
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
  logout,
} from '../controllers/authController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  sendEmailSchema,
  verifyEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
} from '../validation/schemas.js';

const router = Router();

router.post('/send-email-code', validate(sendEmailSchema), sendEmailVerification);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/send-otp', validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.get('/me', optionalAuth, getMe);
router.put('/profile/:id', optionalAuth, validate(updateProfileSchema), updateProfile);
router.post('/logout', optionalAuth, logout);

export default router;

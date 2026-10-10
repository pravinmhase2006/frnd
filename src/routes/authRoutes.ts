import { Router } from 'express';
import { sendOtp, verifyOtp, getMe, updateProfile } from '../controllers/authController.js';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', getMe);
router.put('/profile/:id', updateProfile);

export default router;

import { Router } from 'express';
import { OtpController } from './otp.controller.js';

const router = Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to mobile number via SMS
 * @access  Public
 */
router.post('/send', OtpController.sendOtp);

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP for mobile number
 * @access  Public
 */
router.post('/verify', OtpController.verifyOtp);

export default router;

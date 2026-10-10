const express = require('express');
const { sendOtp, verifyOtp, registerProfile, getMe } = require('../controllers/authController');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerProfile);
router.get('/me', getMe);

module.exports = router;

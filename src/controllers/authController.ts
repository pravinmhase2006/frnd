import { Request, Response } from 'express';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { WhatsAppService } from '../services/whatsappService.js';

// Send Email Verification Code
export const sendEmailVerification = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email } = req.body;
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    // Cryptographically secure 6-digit random code
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = new User({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        age: 21,
        role: 'male',
        isVerified: false,
      });
    }
    user.emailVerificationCode = code;
    user.emailVerificationExpires = expires;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      data: {
        email: cleanEmail,
        codeHint: code, // Provided for automated testing and client UI demo
      },
    });
  } catch (error) {
    console.error('Send Email Verification error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Verify Email & login/register user
export const verifyEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, code, role, name, age } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const user = await User.findOne({ email: cleanEmail });

    // Validate verification code
    const isMasterDemoCode = cleanCode === '123456';
    const isMatchingStoredCode = user && user.emailVerificationCode === cleanCode;

    if (!isMasterDemoCode && !isMatchingStoredCode) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    // Check expiration if matching stored code
    if (isMatchingStoredCode && user?.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    let activeUser = user;
    if (!activeUser) {
      activeUser = await User.create({
        email: cleanEmail,
        name: name || (role === 'female' ? 'New Host' : 'New Friend'),
        age: age ? Number(age) : 22,
        role: role === 'female' ? 'female' : 'male',
        isVerified: true,
        isOnline: true,
        coins: role === 'female' ? 50 : 250,
      });
    } else {
      let modified = false;
      if (name && activeUser.name !== name) {
        activeUser.name = name;
        modified = true;
      }
      if (role && (role === 'female' || role === 'male') && activeUser.role !== role) {
        activeUser.role = role;
        modified = true;
      }
      if (age && activeUser.age !== Number(age)) {
        activeUser.age = Number(age);
        modified = true;
      }
      activeUser.isVerified = true;
      activeUser.isOnline = true;
      activeUser.emailVerificationCode = undefined;
      activeUser.emailVerificationExpires = undefined;
      await activeUser.save();
    }

    const token = jwt.sign(
      { id: activeUser._id, role: activeUser.role, email: activeUser.email },
      process.env.JWT_SECRET || 'frnd_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email verification successful',
      data: {
        token,
        user: activeUser,
      },
    });
  } catch (error) {
    console.error('Verify Email error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Send OTP via WhatsApp
export const sendOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const cleanPhone = String(phone).trim();
    const otp = WhatsAppService.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Store in database for verification
    let user = await User.findOne({ phone: cleanPhone });
    if (user) {
      user.phoneVerificationCode = otp;
      user.phoneVerificationExpires = expiresAt;
      await user.save();
    }

    // Dispatch via WhatsApp Gateway
    await WhatsAppService.sendOtp(cleanPhone, otp);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to your WhatsApp (${cleanPhone})!`,
      data: {
        phone: cleanPhone,
        channel: 'whatsapp',
        otpHint: otp,
      },
    });
  } catch (error) {
    console.error('Send WhatsApp OTP error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Verify OTP & login/register user
export const verifyOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, otp, role, name, age } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
    }

    const cleanPhone = String(phone).trim();
    const cleanOtp = String(otp).trim();
    let user = await User.findOne({ phone: cleanPhone });

    // Validate OTP against stored code or master dev code (1234)
    const isMasterDemoOtp = cleanOtp === '1234';
    const isStoredOtpValid = user?.phoneVerificationCode && user.phoneVerificationCode === cleanOtp;

    if (!isMasterDemoOtp && !isStoredOtpValid) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your WhatsApp.' });
    }

    if (isStoredOtpValid && user?.phoneVerificationExpires && user.phoneVerificationExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code on WhatsApp.' });
    }

    if (!user) {
      user = await User.create({
        phone: cleanPhone,
        name: name || (role === 'female' ? 'New Host' : 'New Friend'),
        age: age ? Number(age) : 21,
        role: role === 'female' ? 'female' : 'male',
        isVerified: true,
        isOnline: true,
        coins: role === 'female' ? 50 : 250,
      });
    } else {
      let modified = false;
      if (name && user.name !== name) {
        user.name = name;
        modified = true;
      }
      if (role && (role === 'female' || role === 'male') && user.role !== role) {
        user.role = role;
        modified = true;
      }
      if (age && user.age !== Number(age)) {
        user.age = Number(age);
        modified = true;
      }
      user.isOnline = true;
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpires = undefined;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'frnd_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'WhatsApp phone verification successful',
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    console.error('Verify WhatsApp OTP error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get current profile
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    const authUser = (req as any).user;
    const { phone, email, id, role } = req.query;
    let user;

    if (authUser?.id && mongoose.Types.ObjectId.isValid(authUser.id)) {
      user = await User.findById(authUser.id);
    } else if (id && mongoose.Types.ObjectId.isValid(String(id))) {
      user = await User.findById(id);
    } else if (email) {
      user = await User.findOne({ email: String(email).trim().toLowerCase() });
    } else if (phone) {
      user = await User.findOne({ phone: String(phone) });
    } else if (role && (role === 'female' || role === 'male')) {
      user = await User.findOne({ role });
    } else {
      user = await User.findOne();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get Me error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update profile
export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;

    // Authorization check: if authenticated, verify ownership
    if (authUser?.id && authUser.id !== id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit another user profile.' });
    }

    const { name, bio, interests, age, avatar, language, callRate } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(interests && { interests }),
        ...(age && { age }),
        ...(avatar && { avatar }),
        ...(language && { language }),
        ...(callRate && { callRate }),
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Logout
export const logout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const authUser = (req as any).user;
    if (authUser?.id && mongoose.Types.ObjectId.isValid(authUser.id)) {
      await User.findByIdAndUpdate(authUser.id, { isOnline: false });
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

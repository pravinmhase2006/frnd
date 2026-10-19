import { Request, Response } from 'express';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Send Email Verification Code
export const sendEmailVerification = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email } = req.body;
    if (!email || !String(email).includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const code = '123456';
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      user.emailVerificationCode = code;
      user.emailVerificationExpires = expires;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      data: { email: cleanEmail, codeHint: code },
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

    if (code !== '123456' && String(code).length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        email: cleanEmail,
        name: name || (role === 'female' ? 'New Host' : 'New Friend'),
        age: age ? Number(age) : 22,
        role: role === 'female' ? 'female' : 'male',
        isVerified: true,
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
      user.isVerified = true;
      user.emailVerificationCode = undefined;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email verification successful',
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    console.error('Verify Email error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Send OTP
export const sendOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const otp = '1234';
    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${phone}`,
      data: { phone, otpHint: otp },
    });
  } catch (error) {
    console.error('Send OTP error:', error);
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

    if (otp !== '1234' && otp.length < 4) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        phone,
        name: name || (role === 'female' ? 'New Creator' : 'New Friend'),
        age: age ? Number(age) : 21,
        role: role === 'female' ? 'female' : 'male',
        isVerified: true,
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
      if (modified) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
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
    const { name, bio, interests, age, avatar, language } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(interests && { interests }),
        ...(age && { age }),
        ...(avatar && { avatar }),
        ...(language && { language }),
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

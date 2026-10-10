import { Request, Response } from 'express';
import { User } from '../models/User.js';

import jwt from 'jsonwebtoken';

// Send OTP
export const sendOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    // In production, integrate SMS provider (e.g. Twilio/Fast2SMS). For dev/test, default OTP is 1234.
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
        coins: role === 'female' ? 50 : 150,
      });
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
    const { phone, id } = req.query;
    let user;
    if (id) {
      user = await User.findById(id);
    } else if (phone) {
      user = await User.findOne({ phone: String(phone) });
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

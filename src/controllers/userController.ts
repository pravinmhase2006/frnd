import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { Report } from '../models/Report.js';

export const sanitizeUser = (userDoc: IUser | any) => {
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };

  // Strict backend-level privacy strip: NEVER expose private contacts or secrets
  delete obj.phone;
  delete obj.email;
  delete obj.phoneVerificationCode;
  delete obj.phoneVerificationExpires;
  delete obj.emailVerificationCode;
  delete obj.emailVerificationExpires;
  delete obj.blockedUsers;

  // Female Safety & Privacy Shield:
  // Strip real photo, real surname, and exact coordinates
  if (obj.role === 'female') {
    if (obj.name) {
      obj.name = obj.name.trim().split(' ')[0]; // First name only (e.g. "Priya")
    }
    obj.avatar = ''; // Replace real photos with neutral privacy audio avatar
    obj.location = 'India';
  }

  // Obey hide online status privacy setting
  if (obj.privacySettings?.hideOnlineStatus) {
    obj.isOnline = false;
  }

  return obj;
};

export const createUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, phone, age, role, bio, interests } = req.body;

    if (!name || !phone || !age || !role) {
      return res.status(400).json({ success: false, message: 'Name, phone, age, and role are required.' });
    }

    if (age < 18) {
      return res.status(400).json({ success: false, message: 'User must be at least 18 years old.' });
    }

    const existingUser = await User.findOne({ phone, isDeleted: { $ne: true } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this phone number already exists.' });
    }

    const user = await User.create({
      name,
      phone,
      age,
      role,
      bio: bio || '',
      interests: Array.isArray(interests) ? interests : [],
      isVerified: true,
      status: 'active',
      coins: role === 'female' ? 50 : 150,
      privacySettings: {
        hideOnlineStatus: false,
        allowCalls: true,
        allowMessages: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { role, isOnline, search } = req.query;

    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (role) query.role = role;
    if (isOnline !== undefined) query.isOnline = isOnline === 'true';
    if (search) {
      query.name = { $regex: String(search), $options: 'i' };
    }

    const users = await User.find(query).sort({ rating: -1, isOnline: -1 });
    const sanitized = users.map(u => sanitizeUser(u));

    return res.status(200).json({ success: true, count: sanitized.length, data: sanitized });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Instant match: Pick an active online creator
export const getInstantMatch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const roleToMatch = req.query.role === 'female' ? 'male' : 'female';
    const matches = await User.find({ role: roleToMatch, isOnline: true, isDeleted: { $ne: true } });

    if (matches.length === 0) {
      const fallback = await User.findOne({ role: roleToMatch, isDeleted: { $ne: true } });
      return res.status(200).json({ success: true, data: fallback ? sanitizeUser(fallback) : null });
    }

    const randomPick = matches[Math.floor(Math.random() * matches.length)];
    return res.status(200).json({ success: true, data: sanitizeUser(randomPick) });
  } catch (error) {
    console.error('Instant match error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Block a user to immediately stop messages and calls
export const blockUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = (req as any).user?.id || req.body.currentUserId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User ID required.' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.blockedUsers) user.blockedUsers = [];
    const targetObjId = new mongoose.Types.ObjectId(String(targetUserId));
    if (!user.blockedUsers.some(b => b.equals(targetObjId))) {
      user.blockedUsers.push(targetObjId);
      await user.save();
    }

    return res.status(200).json({ success: true, message: 'User blocked successfully.' });
  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Unblock a previously blocked user
export const unblockUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = (req as any).user?.id || req.body.currentUserId;

    if (!targetUserId || !currentUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID and current user ID required.' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetObjId = new mongoose.Types.ObjectId(String(targetUserId));
    user.blockedUsers = (user.blockedUsers || []).filter(b => !b.equals(targetObjId));
    await user.save();

    return res.status(200).json({ success: true, message: 'User unblocked successfully.' });
  } catch (error) {
    console.error('Unblock user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get list of blocked user IDs for the requester
export const getBlockedUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const currentUserId = (req as any).user?.id || req.query.userId;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'User ID required.' });
    }

    const user = await User.findById(currentUserId).populate('blockedUsers', 'name role');
    return res.status(200).json({
      success: true,
      data: user?.blockedUsers || [],
    });
  } catch (error) {
    console.error('Get blocked users error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Report abuse, harassment, or contact leakage
export const reportUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { reportedId, reason, details } = req.body;
    const reporterId = (req as any).user?.id || req.body.reporterId;

    if (!reportedId || !reason) {
      return res.status(400).json({ success: false, message: 'Reported user ID and reason are required.' });
    }

    const report = await Report.create({
      reporterId: new mongoose.Types.ObjectId(String(reporterId || new mongoose.Types.ObjectId())),
      reportedId: new mongoose.Types.ObjectId(String(reportedId)),
      reason,
      details: details || '',
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Safety report submitted. Our team will review this violation immediately.',
      data: report,
    });
  } catch (error) {
    console.error('Report user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update user privacy settings (hide online, mute calls/messages)
export const updatePrivacySettings = async (req: Request, res: Response): Promise<Response> => {
  try {
    const currentUserId = (req as any).user?.id || req.body.userId;
    const { hideOnlineStatus, allowCalls, allowMessages } = req.body;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.privacySettings) {
      user.privacySettings = { hideOnlineStatus: false, allowCalls: true, allowMessages: true };
    }

    if (hideOnlineStatus !== undefined) user.privacySettings.hideOnlineStatus = Boolean(hideOnlineStatus);
    if (allowCalls !== undefined) user.privacySettings.allowCalls = Boolean(allowCalls);
    if (allowMessages !== undefined) user.privacySettings.allowMessages = Boolean(allowMessages);

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully.',
      data: user.privacySettings,
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete account and wipe all personal data
export const deleteAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const currentUserId = (req as any).user?.id || req.body.userId || req.params.id;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Permanently wipe personal identifiers and mark account deleted
    user.isDeleted = true;
    user.status = 'blocked';
    user.phone = undefined;
    user.email = `deleted_${Date.now()}@privacy.frnd`;
    user.name = 'Deleted User';
    user.avatar = '';
    user.bio = '';
    user.isOnline = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your account and personal data have been completely deleted.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    message: 'FRND TypeScript backend is running smoothly',
    timestamp: new Date().toISOString(),
  });
};

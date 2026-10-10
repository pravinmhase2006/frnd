import { Request, Response } from 'express';
import { User } from '../models/User.js';

export const createUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, phone, age, role, bio, interests } = req.body;

    if (!name || !phone || !age || !role) {
      return res.status(400).json({ success: false, message: 'Name, phone, age, and role are required.' });
    }

    if (age < 18) {
      return res.status(400).json({ success: false, message: 'User must be at least 18 years old.' });
    }

    const existingUser = await User.findOne({ phone });
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
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { role, isOnline, search } = req.query;

    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (isOnline !== undefined) query.isOnline = isOnline === 'true';
    if (search) {
      query.name = { $regex: String(search), $options: 'i' };
    }

    const users = await User.find(query).sort({ rating: -1, isOnline: -1 });
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Instant match: Pick an active online creator
export const getInstantMatch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const roleToMatch = req.query.role === 'female' ? 'male' : 'female';
    const matches = await User.find({ role: roleToMatch, isOnline: true });

    if (matches.length === 0) {
      const fallback = await User.findOne({ role: roleToMatch });
      return res.status(200).json({ success: true, data: fallback });
    }

    const randomPick = matches[Math.floor(Math.random() * matches.length)];
    return res.status(200).json({ success: true, data: randomPick });
  } catch (error) {
    console.error('Instant match error:', error);
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

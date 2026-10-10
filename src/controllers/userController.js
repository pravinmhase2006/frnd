const User = require('../models/User');

const createUser = async (req, res) => {
  try {
    const { name, phone, age, role, bio, interests } = req.body;

    if (!name || !phone || !age || !role) {
      return res.status(400).json({ message: 'Name, phone, age, and role are required.' });
    }

    if (age < 18) {
      return res.status(400).json({ message: 'User must be at least 18 years old.' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this phone number already exists.' });
    }

    const user = await User.create({
      name,
      phone,
      age,
      role,
      bio: bio || '',
      interests: Array.isArray(interests) ? interests : [],
      isVerified: false,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'FRND backend is running',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  healthCheck,
};

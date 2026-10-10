const express = require('express');
const { createUser, getUsers, getUserById, healthCheck } = require('../controllers/userController');

const router = express.Router();

router.get('/health', healthCheck);
router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);

module.exports = router;

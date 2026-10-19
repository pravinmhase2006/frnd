import { Router } from 'express';
import { getChats, getMessagesByChatId, sendMessage, getChatBetween } from '../controllers/chatController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/chats', optionalAuth, getChats);
router.get('/chats/between/:user1/:user2', optionalAuth, getChatBetween);
router.get('/chats/:id/messages', optionalAuth, getMessagesByChatId);
router.post('/chats/messages', optionalAuth, sendMessage);

export default router;

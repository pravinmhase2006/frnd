import { Router } from 'express';
import { getChats, getMessagesByChatId, sendMessage, getChatBetween } from '../controllers/chatController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendMessageSchema } from '../validation/schemas.js';

const router = Router();

router.get('/chats', optionalAuth, getChats);
router.get('/chats/between/:user1/:user2', optionalAuth, getChatBetween);
router.get('/chats/:id/messages', optionalAuth, getMessagesByChatId);
router.post('/chats/messages', optionalAuth, validate(sendMessageSchema), sendMessage);

export default router;

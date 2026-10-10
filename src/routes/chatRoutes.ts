import { Router } from 'express';
import { getChats, getMessagesByChatId, sendMessage } from '../controllers/chatController.js';

const router = Router();

router.get('/chats', getChats);
router.get('/chats/:id/messages', getMessagesByChatId);
router.post('/chats/messages', sendMessage);

export default router;

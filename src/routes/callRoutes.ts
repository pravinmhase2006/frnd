import { Router } from 'express';
import {
  requestCall,
  endCall,
  acceptCall,
  declineCall,
  getCallHistory,
  rateCall,
} from '../controllers/callController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/calls/request', optionalAuth, requestCall);
router.post('/calls/:id/end', optionalAuth, endCall);
router.post('/calls/:id/accept', optionalAuth, acceptCall);
router.post('/calls/:id/decline', optionalAuth, declineCall);
router.post('/calls/:id/rate', optionalAuth, rateCall);
router.get('/calls/history', optionalAuth, getCallHistory);

export default router;

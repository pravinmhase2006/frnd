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
import { validate } from '../middleware/validate.js';
import {
  requestCallSchema,
  endCallSchema,
  rateCallSchema,
} from '../validation/schemas.js';

const router = Router();

router.post('/calls/request', optionalAuth, validate(requestCallSchema), requestCall);
router.post('/calls/:id/end', optionalAuth, validate(endCallSchema), endCall);
router.post('/calls/:id/accept', optionalAuth, acceptCall);
router.post('/calls/:id/decline', optionalAuth, declineCall);
router.post('/calls/:id/rate', optionalAuth, validate(rateCallSchema), rateCall);
router.get('/calls/history', optionalAuth, getCallHistory);

export default router;

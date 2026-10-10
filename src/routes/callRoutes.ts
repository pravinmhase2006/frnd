import { Router } from 'express';
import { requestCall, endCall, getCallHistory } from '../controllers/callController.js';

const router = Router();

router.post('/calls/request', requestCall);
router.post('/calls/:id/end', endCall);
router.get('/calls/history', getCallHistory);

export default router;

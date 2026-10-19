import { Router } from 'express';
import {
  getWalletSummary,
  rechargeCoins,
  requestWithdrawal,
} from '../controllers/walletController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/wallet/:userId', optionalAuth, getWalletSummary);
router.post('/wallet/recharge', optionalAuth, rechargeCoins);
router.post('/wallet/withdraw', optionalAuth, requestWithdrawal);

export default router;

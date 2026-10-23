import { Router } from 'express';
import {
  getWalletSummary,
  rechargeCoins,
  requestWithdrawal,
} from '../controllers/walletController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rechargeCoinsSchema, withdrawalSchema } from '../validation/schemas.js';

const router = Router();

router.get('/wallet/:userId', optionalAuth, getWalletSummary);
router.post('/wallet/recharge', optionalAuth, validate(rechargeCoinsSchema), rechargeCoins);
router.post('/wallet/withdraw', optionalAuth, validate(withdrawalSchema), requestWithdrawal);

export default router;

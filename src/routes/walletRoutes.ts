import { Router } from 'express';
import {
  getWalletSummary,
  rechargeCoins,
  requestWithdrawal,
} from '../controllers/walletController.js';

const router = Router();

router.get('/wallet/:userId', getWalletSummary);
router.post('/wallet/recharge', rechargeCoins);
router.post('/wallet/withdraw', requestWithdrawal);

export default router;

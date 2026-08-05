import { Router } from 'express';
import { getPushPublicKey, removePushSubscription, savePushSubscription } from '../controllers/notificationController.js';

const router = Router();

router.get('/push/public-key', getPushPublicKey);
router.post('/push/subscriptions', savePushSubscription);
router.delete('/push/subscriptions', removePushSubscription);

export default router;

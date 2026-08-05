import { Router } from 'express';
import accountRoutes from './accountRoutes.js';
import adminRoutes from './adminRoutes.js';
import aiRoutes from './aiRoutes.js';
import authRoutes from './authRoutes.js';
import catalogRoutes from './catalogRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import { createGuestOrder } from '../controllers/commerceController.js';
import { createContactMessage } from '../controllers/contactController.js';

const router = Router();

router.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/catalog', catalogRoutes);
router.use(notificationRoutes);
router.post('/contact', createContactMessage);
router.post('/orders/guest', createGuestOrder);
router.use(reviewRoutes);

export default router;

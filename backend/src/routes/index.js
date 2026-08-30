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

router.options('/cors-test', (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.set('X-Artwork-Instance', request.app.locals.instanceMarker ?? 'unknown');
  response.status(204).send();
});

router.get('/cors-test', (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.set('X-Artwork-Instance', request.app.locals.instanceMarker ?? 'unknown');
  response.json({
    ok: true,
    marker: request.app.locals.instanceMarker ?? 'unknown',
    build: request.app.locals.backendBuild ?? 'unknown',
    appModule: request.app.locals.appModule ?? 'unknown',
    startedAt: request.app.locals.startedAt ?? null,
    pid: process.pid,
    cwd: process.cwd(),
    origin: request.get('origin') ?? null,
    host: request.get('host') ?? null,
    forwardedHost: request.get('x-forwarded-host') ?? null,
    method: request.method,
  });
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

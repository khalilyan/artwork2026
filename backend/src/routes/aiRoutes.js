import { Router } from 'express';
import { createRoomPreview, getPublicAiSettings } from '../controllers/aiController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/settings', getPublicAiSettings);
router.post('/room-preview', optionalAuth, createRoomPreview);

export default router;

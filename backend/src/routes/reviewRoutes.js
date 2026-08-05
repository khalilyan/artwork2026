import { Router } from 'express';
import { createReview } from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/products/:productSlug/reviews', requireAuth, createReview);

export default router;

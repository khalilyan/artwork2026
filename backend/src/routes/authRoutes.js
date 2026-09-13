import { Router } from 'express';
import {
	handleFacebookAuthCallback,
	handleGoogleAuthCallback,
	login,
	me,
	signup,
	startFacebookAuth,
	startGoogleAuth,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/google', startGoogleAuth);
router.get('/google/callback', handleGoogleAuthCallback);
router.get('/facebook', startFacebookAuth);
router.get('/facebook/callback', handleFacebookAuthCallback);

export default router;

import { Router } from 'express';
import { googleLoginHandler, getMeHandler } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/google
router.post('/google', googleLoginHandler);

// GET /api/auth/me (Protected)
router.get('/me', authenticateToken as any, getMeHandler as any);

export default router;

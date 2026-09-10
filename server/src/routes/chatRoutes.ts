import { Router } from 'express';
import { chatHandler } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/chat - Gửi câu hỏi và nhận câu trả lời RAG (Bảo vệ phân quyền theo User Token)
router.post('/', authenticateToken as any, chatHandler as any);

export default router;

import { Router } from 'express';
import { chatHandler } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat - Gửi câu hỏi và nhận câu trả lời RAG kèm trích dẫn
router.post('/', chatHandler);

export default router;

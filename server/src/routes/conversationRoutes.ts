import { Router } from 'express';
import {
  createConversationHandler,
  getAllConversationsHandler,
  getConversationMessagesHandler,
  sendMessageHandler,
  deleteConversationHandler,
} from '../controllers/conversationController.js';

const router = Router();

// POST /api/conversations - Tạo conversation mới
router.post('/', createConversationHandler);

// GET /api/conversations - Lấy danh sách conversation
router.get('/', getAllConversationsHandler);

// GET /api/conversations/:id/messages - Lấy danh sách messages của 1 conversation
router.get('/:id/messages', getConversationMessagesHandler);

// POST /api/conversations/:id/messages - Gửi tin nhắn mới & stream câu trả lời
router.post('/:id/messages', sendMessageHandler);

// DELETE /api/conversations/:id - Xóa conversation và messages liên quan
router.delete('/:id', deleteConversationHandler);

export default router;

import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { chatWithRAG } from '../services/chatService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  getSessionById,
  createSession,
  appendMessagesToSession,
} from '../repositories/sessionRepository.js';
import { SessionMessage } from '../models/session.js';

/**
 * POST /api/chat
 * Nhận câu hỏi từ người dùng, lưu vào phiên chat riêng biệt của người dùng,
 * thực hiện RAG tìm kiếm ngữ cảnh và lưu câu trả lời kèm trích dẫn.
 */
export async function chatHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Bạn cần đăng nhập để sử dụng tính năng trò chuyện RAG' });
      return;
    }

    const rawMessage = req.body.message || req.body.query;
    const documentId = req.body.documentId;
    let sessionId = req.body.sessionId;

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      res.status(400).json({ error: 'Nội dung câu hỏi (message) không được để trống' });
      return;
    }

    if (documentId && !ObjectId.isValid(documentId)) {
      res.status(400).json({ error: 'documentId không hợp lệ (phải là 24 ký tự hex)' });
      return;
    }

    const trimmedMessage = rawMessage.trim();

    // 1. Phân quyền và xác thực phiên chat (Session)
    let sessionTitleToUpdate: string | undefined = undefined;

    if (sessionId) {
      // Nếu có truyền sessionId, xác minh phiên này có thuộc sở hữu của userId hay không
      const existingSession = await getSessionById(sessionId, userId);
      if (!existingSession) {
        res.status(404).json({
          error: 'Không tìm thấy phiên trò chuyện hoặc bạn không có quyền truy cập vào phiên này',
        });
        return;
      }
    } else {
      // Nếu chưa có sessionId, tạo phiên mới cho riêng userId này
      const autoTitle = trimmedMessage.length > 50
        ? trimmedMessage.slice(0, 50) + '...'
        : trimmedMessage;
      const newSession = await createSession(userId, autoTitle);
      sessionId = newSession._id?.toString();
    }

    // 2. Chuẩn bị tin nhắn của user
    const userMessage: SessionMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: trimmedMessage,
      createdAt: new Date(),
    };

    // 3. Thực hiện RAG Chat
    const ragResult = await chatWithRAG(trimmedMessage, documentId);

    // 4. Chuẩn bị tin nhắn phản hồi của assistant
    const assistantMessage: SessionMessage = {
      id: `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'assistant',
      content: ragResult.answer,
      citations: ragResult.citations,
      createdAt: new Date(),
    };

    // 5. Lưu cả tin nhắn hỏi và đáp vào phiên chat riêng của người dùng
    if (sessionId) {
      await appendMessagesToSession(
        sessionId,
        userId,
        [userMessage, assistantMessage],
        sessionTitleToUpdate
      );
    }

    // 6. Trả về kết quả kèm sessionId
    res.status(200).json({
      ...ragResult,
      sessionId,
    });
  } catch (error: any) {
    console.error('[ChatController] Lỗi xử lý RAG chat:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || 'Lỗi hệ thống khi AI xử lý câu hỏi',
    });
  }
}

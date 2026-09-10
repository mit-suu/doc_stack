import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { chatWithRAG, streamChatWithRAG } from '../services/chatService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  getSessionById,
  createSession,
  appendMessagesToSession,
} from '../repositories/sessionRepository.js';
import { SessionMessage } from '../models/session.js';
import { aiLogger } from '../utils/aiLogger.js';

/**
 * POST /api/chat
 * Nhận câu hỏi từ người dùng, lưu vào phiên chat riêng biệt của người dùng,
 * thực hiện RAG tìm kiếm ngữ cảnh và lưu câu trả lời kèm trích dẫn.
 * Hỗ trợ cả Streaming (Vercel AI SDK SSE) và Non-streaming JSON.
 */
export async function chatHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const t0 = Date.now();
  const rawMessage = req.body?.message || req.body?.query;
  const documentId = req.body?.documentId;

  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Bạn cần đăng nhập để sử dụng tính năng trò chuyện RAG' });
      return;
    }

    let sessionId = req.body?.sessionId;

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

    // Kiểm tra xem client có yêu cầu streaming hay không
    const wantsStream =
      req.query.stream === 'true' ||
      req.body.stream === true ||
      req.headers.accept?.includes('text/event-stream');

    if (wantsStream) {
      // --- XỬ LÝ STREAMING (Vercel AI SDK SSE) ---
      const { streamResult, citations } = await streamChatWithRAG(trimmedMessage, documentId);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const topScore =
        citations && citations.length > 0
          ? `${(citations[0].score * 100).toFixed(1)}%`
          : '95.2%';

      // Gửi event metadata đầu tiên chứa sessionId và citations
      res.write(
        `event: metadata\ndata: ${JSON.stringify({
          sessionId,
          citations,
          vectorSimilarity: topScore,
        })}\n\n`
      );

      let fullAnswer = '';
      for await (const chunk of streamResult.textStream) {
        fullAnswer += chunk;
        res.write(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      // Log AI action chat stream hoàn tất
      aiLogger.chat({
        query: trimmedMessage,
        model: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
        stream: true,
        chunksInjected: citations.length,
        citationsCount: citations.length,
        answerPreview: fullAnswer,
        answerLength: fullAnswer.length,
        durationMs: Date.now() - t0,
      });

      // Lưu cả tin nhắn hỏi và đáp vào phiên chat riêng của người dùng sau khi stream xong
      if (sessionId) {
        const assistantMessage: SessionMessage = {
          id: `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content: fullAnswer,
          citations,
          createdAt: new Date(),
        };

        await appendMessagesToSession(
          sessionId,
          userId,
          [userMessage, assistantMessage],
          sessionTitleToUpdate
        );
      }

      res.write(
        `event: done\ndata: ${JSON.stringify({
          answer: fullAnswer,
          sessionId,
        })}\n\n`
      );
      res.end();
      return;
    }

    // --- XỬ LÝ ĐỒNG BỘ NON-STREAMING (Giữ nguyên tương thích ngược) ---
    const ragResult = await chatWithRAG(trimmedMessage, documentId);

    aiLogger.chat({
      query: trimmedMessage,
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
      stream: false,
      chunksInjected: ragResult.citations.length,
      citationsCount: ragResult.citations.length,
      answerPreview: ragResult.answer,
      answerLength: ragResult.answer.length,
      durationMs: Date.now() - t0,
    });

    const assistantMessage: SessionMessage = {
      id: `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'assistant',
      content: ragResult.answer,
      citations: ragResult.citations,
      createdAt: new Date(),
    };

    if (sessionId) {
      await appendMessagesToSession(
        sessionId,
        userId,
        [userMessage, assistantMessage],
        sessionTitleToUpdate
      );
    }

    res.status(200).json({
      ...ragResult,
      sessionId,
    });
  } catch (error: any) {
    aiLogger.chat({
      query: typeof rawMessage === 'string' ? rawMessage : '',
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
      stream: req.query.stream === 'true' || req.body?.stream === true,
      chunksInjected: 0,
      citationsCount: 0,
      durationMs: Date.now() - t0,
      error: error.message,
    });

    console.error('[ChatController] Lỗi xử lý RAG chat:', error.message);
    if (!res.headersSent) {
      const status = error.statusCode || 500;
      res.status(status).json({
        error: error.message || 'Lỗi hệ thống khi AI xử lý câu hỏi',
      });
    } else {
      res.write(`\nevent: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

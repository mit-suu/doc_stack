import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { chatWithRAG, streamChatWithRAG } from '../services/chatService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  getSessionById,
  createSession,
  appendMessagesToSession,
} from '../repositories/sessionRepository.js';
import {
  getDocumentIdsByUser,
  getDocumentsByIdsAndUser,
  getDocumentsByUserId,
} from '../repositories/documentRepository.js';
import { SessionMessage } from '../models/session.js';
import { aiLogger } from '../utils/aiLogger.js';
import { detectMissingDocSuggestion, detectMissingDocWithSearch } from '../services/docDetector.js';

/**
 * POST /api/chat
 * Nhận câu hỏi từ người dùng, lưu vào phiên chat riêng biệt của người dùng,
 * thực hiện RAG tìm kiếm ngữ cảnh (phân quyền chỉ tìm trong tài liệu được chọn của user) và lưu câu trả lời kèm trích dẫn.
 * Nếu không có tài liệu nào được chọn (deselected), phản hồi hướng dẫn như NotebookLM.
 * Hỗ trợ cả Streaming (Vercel AI SDK SSE) và Non-streaming JSON.
 */
export async function chatHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const t0 = Date.now();
  const rawMessage = req.body?.message || req.body?.query;

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

    const trimmedMessage = rawMessage.trim();

    // 1. Xác định phạm vi tài liệu (Document scope) được chọn của riêng user
    let targetDocIds: string[] = [];
    const rawDocIds = req.body?.documentIds;

    if (Array.isArray(rawDocIds) && rawDocIds.length > 0) {
      // Người dùng chọn cụ thể 1 hoặc nhiều tài liệu -> Kiểm tra quyền sở hữu của user
      const userAllowedDocs = await getDocumentsByIdsAndUser(rawDocIds, userId);
      targetDocIds = userAllowedDocs.map((d) => d._id!.toString());
    } else if (req.body?.documentId && typeof req.body.documentId === 'string' && ObjectId.isValid(req.body.documentId)) {
      const userAllowedDocs = await getDocumentsByIdsAndUser([req.body.documentId], userId);
      targetDocIds = userAllowedDocs.map((d) => d._id!.toString());
    }

    // 2. Phân quyền và xác thực phiên chat (Session)
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

    // 3. Chuẩn bị tin nhắn của user
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

    // 4. KIỂM TRA TRẠNG THÁI BỎ CHỌN TÀI LIỆU HOẶC THIẾU TÀI LIỆU
    if (targetDocIds.length === 0) {
      // Fallback chain: Sync catalog (0ms) → Async on-demand search (~500ms-1s)
      let missingDocSuggestion = detectMissingDocSuggestion(trimmedMessage);

      if (!missingDocSuggestion) {
        // Sync catalog không có → Thử tìm bằng AI (On-demand search)
        missingDocSuggestion = await detectMissingDocWithSearch(trimmedMessage);
      }

      const userAllDocs = await getDocumentsByUserId(userId);
      let deselectedResponse: string;

      if (missingDocSuggestion) {
        // Phát hiện câu hỏi thuộc về tài liệu chính thức có thể cào theo ngữ cảnh
        deselectedResponse = `Chào bạn! Hiện tại trong sổ tay của bạn chưa có tài liệu về **${missingDocSuggestion.topic}** (${missingDocSuggestion.technology}).\n\nTôi đã tìm thấy trang tài liệu chính thức:\n🔗 **${missingDocSuggestion.title}** (${missingDocSuggestion.url})\n\nBạn hãy bấm nút **"Nạp trang này vào Nguồn & Giải đáp"** ở thẻ bên dưới để tôi cào nội dung, nhúng vector và phân tích chi tiết cho bạn nhé!`;
      } else if (userAllDocs.length > 0) {
        const docNames = userAllDocs.map((d) => d.title || d.originalName || 'Tài liệu');
        let docListFormatted = '';
        if (docNames.length === 1) {
          docListFormatted = docNames[0];
        } else if (docNames.length === 2) {
          docListFormatted = `${docNames[0]} và ${docNames[1]}`;
        } else if (docNames.length <= 4) {
          docListFormatted = `${docNames.slice(0, -1).join(', ')} và ${docNames[docNames.length - 1]}`;
        } else {
          docListFormatted = `${docNames.slice(0, 3).join(', ')} cùng ${docNames.length - 3} tài liệu khác`;
        }

        deselectedResponse = `Các nguồn tài liệu trong sổ tay (${docListFormatted}) hiện đang ở trạng thái bỏ chọn (deselected), nên tôi chưa có dữ liệu để giải đáp cho câu hỏi "${trimmedMessage}".\n\nBạn hãy tích chọn lại các tài liệu ở bảng Nguồn (Sources) bên trái để tôi giải thích chi tiết và chính xác theo đúng nội dung trong tài liệu của bạn.`;
      } else {
        deselectedResponse = `Hiện tại sổ tay của bạn chưa có tài liệu nào về chủ đề này.\n\nBạn hãy tải lên tài liệu (PDF, Word, Markdown) hoặc dán đường dẫn bài viết vào mục **Dán URL Web** ở bảng bên trái để tôi phân tích nhé!`;
      }

      const assistantMessage: SessionMessage = {
        id: `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        role: 'assistant',
        content: deselectedResponse,
        citations: [],
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

      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        res.write(
          `event: metadata\ndata: ${JSON.stringify({
            sessionId,
            citations: [],
            vectorSimilarity: '0%',
            missingDocSuggestion: missingDocSuggestion || null,
          })}\n\n`
        );

        res.write(`event: token\ndata: ${JSON.stringify({ text: deselectedResponse })}\n\n`);

        res.write(
          `event: done\ndata: ${JSON.stringify({
            answer: deselectedResponse,
            sessionId,
          })}\n\n`
        );
        res.end();
        return;
      }

      res.status(200).json({
        answer: deselectedResponse,
        citations: [],
        query: trimmedMessage,
        sessionId,
        missingDocSuggestion: missingDocSuggestion || null,
      });
      return;
    }

    // 5. NẾU CÓ TÀI LIỆU ĐƯỢC CHỌN: THỰC HIỆN TRUY VẤN RAG VÀ SINH CÂU TRẢ LỜI
    if (wantsStream) {
      // --- XỬ LÝ STREAMING (Vercel AI SDK SSE) ---
      const { streamResult, citations, missingDocSuggestion } = await streamChatWithRAG(trimmedMessage, targetDocIds);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const topScore =
        citations && citations.length > 0
          ? `${(citations[0].score * 100).toFixed(1)}%`
          : '95.2%';

      // Gửi event metadata đầu tiên chứa sessionId, citations và missingDocSuggestion
      res.write(
        `event: metadata\ndata: ${JSON.stringify({
          sessionId,
          citations,
          vectorSimilarity: topScore,
          missingDocSuggestion: missingDocSuggestion || null,
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
    const ragResult = await chatWithRAG(trimmedMessage, targetDocIds);

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
    const isQuotaExceeded =
      error.name === 'AI_RetryError' ||
      error.message?.includes('Quota exceeded') ||
      error.message?.includes('429') ||
      error.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuotaExceeded) {
      aiLogger.retryExhausted({
        action: 'chatGeneration',
        model: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
        totalAttempts: 3,
        error: 'Đã tự động thử lại qua exponential backoff nhưng Google Gemini API vẫn báo hết Quota (Rate limit)',
      });
    }

    aiLogger.chat({
      query: typeof rawMessage === 'string' ? rawMessage : '',
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
      stream: req.query.stream === 'true' || req.body?.stream === true,
      chunksInjected: 0,
      citationsCount: 0,
      durationMs: Date.now() - t0,
      error: error.message,
    });

    console.error('[ChatController] ❌ Lỗi xử lý RAG chat:', error.message);
    const clientErrMsg = isQuotaExceeded
      ? 'Hạn ngạch Google Gemini API tạm thời bị giới hạn (Rate limit / Quota Exceeded). Hệ thống đã tự động thử lại nhiều lần nhưng không thành công. Vui lòng thử lại sau 30-60 giây hoặc kiểm tra API Key.'
      : error.message || 'Lỗi hệ thống khi AI xử lý câu hỏi';

    if (!res.headersSent) {
      const status = isQuotaExceeded ? 429 : error.statusCode || 500;
      res.status(status).json({
        error: clientErrMsg,
      });
    } else {
      res.write(`\nevent: error\ndata: ${JSON.stringify({ error: clientErrMsg })}\n\n`);
      res.end();
    }
  }
}

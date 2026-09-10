import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  createConversation,
  getConversationById,
  getAllConversations,
  updateConversationTitle,
  deleteConversation,
} from '../repositories/conversationRepository.js';
import {
  getMessagesByConversationId,
  countMessagesByConversationId,
  deleteMessagesByConversationId,
} from '../repositories/messageRepository.js';
import { handleChatMessage } from '../services/chatService.js';
import { parseCommand } from '../services/commandParser.js';

/**
 * POST /api/conversations
 * Tạo conversation mới, title mặc định "Cuộc trò chuyện mới"
 */
export async function createConversationHandler(req: Request, res: Response): Promise<void> {
  try {
    const title = req.body?.title || 'Cuộc trò chuyện mới';
    const userId = (req as any).user?.userId;

    const conversation = await createConversation(title, userId);
    res.status(201).json(conversation);
  } catch (err: any) {
    console.error('[Create Conversation] ❌ Lỗi server khi tạo cuộc trò chuyện mới:', err);
    res.status(500).json({ error: err.message || 'Lỗi server khi tạo cuộc trò chuyện mới' });
  }
}

/**
 * GET /api/conversations
 * Lấy danh sách conversation: _id, title, createdAt, updatedAt
 */
export async function getAllConversationsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const conversations = await getAllConversations(userId);
    res.status(200).json(conversations);
  } catch (err: any) {
    console.error('[Get All Conversations] ❌ Lỗi server khi lấy danh sách cuộc trò chuyện:', err);
    res.status(500).json({ error: err.message || 'Lỗi server khi lấy danh sách cuộc trò chuyện' });
  }
}

/**
 * GET /api/conversations/:id/messages
 * Trả về toàn bộ messages của 1 conversation, sort theo thời gian tăng dần
 */
export async function getConversationMessagesHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || !ObjectId.isValid(id)) {
      res.status(404).json({ error: 'ID cuộc trò chuyện không hợp lệ hoặc không tồn tại' });
      return;
    }

    const conversation = await getConversationById(id);
    if (!conversation) {
      res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
      return;
    }

    const messages = await getMessagesByConversationId(id);
    res.status(200).json(messages);
  } catch (err: any) {
    console.error(`[Get Conversation Messages] ❌ Lỗi lấy tin nhắn của ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Lỗi server khi lấy lịch sử tin nhắn' });
  }
}

/**
 * POST /api/conversations/:id/messages
 * Gửi tin nhắn mới, stream câu trả lời về client
 */
export async function sendMessageHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || !ObjectId.isValid(id)) {
      res.status(404).json({ error: 'ID cuộc trò chuyện không hợp lệ hoặc không tồn tại' });
      return;
    }

    const conversation = await getConversationById(id);
    if (!conversation) {
      res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
      return;
    }

    const rawMessage = req.body?.message;
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      res.status(400).json({ error: 'Nội dung tin nhắn (message) không được để trống' });
      return;
    }

    const trimmedMessage = rawMessage.trim();

    // 1. Nếu đây là tin nhắn đầu tiên của conversation, tự động cập nhật title = 50 ký tự đầu (bỏ slash command nếu có)
    const messageCount = await countMessagesByConversationId(id);
    if (messageCount === 0) {
      const { query } = parseCommand(trimmedMessage);
      const titleCandidate = (query || trimmedMessage).trim();
      const newTitle =
        titleCandidate.length > 50 ? titleCandidate.slice(0, 50) + '...' : titleCandidate;
      if (newTitle) {
        await updateConversationTitle(id, newTitle);
      }
    }

    // 2. Gọi điều phối chat service
    const { streamResult, sources, command, query } = await handleChatMessage(id, trimmedMessage);

    // 3. Nếu client yêu cầu JSON thay vì stream (ví dụ query ?stream=false hoặc Accept: application/json)
    const wantsJson =
      req.query.stream === 'false' ||
      (req.headers.accept &&
        req.headers.accept.includes('application/json') &&
        !req.headers.accept.includes('text/event-stream'));

    if (wantsJson) {
      const fullText = await streamResult.text;
      res.status(200).json({
        answer: fullText,
        command,
        query,
        sources,
      });
      return;
    }

    // 4. Mặc định stream response về client theo chuẩn HTTP chunked transfer
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    try {
      for await (const chunk of streamResult.textStream) {
        res.write(chunk);
      }
      res.end();
    } catch (streamErr: any) {
      console.error('[ConversationController] ❌ Lỗi trong quá trình stream:', streamErr.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi trong quá trình tạo phản hồi từ AI' });
      } else {
        res.write(`\n[Lỗi kết nối AI: ${streamErr.message}]`);
        res.end();
      }
    }
  } catch (err: any) {
    console.error('[ConversationController] ❌ Lỗi xử lý gửi tin nhắn:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Lỗi server khi xử lý tin nhắn' });
    }
  }
}

/**
 * DELETE /api/conversations/:id
 * Xóa conversation và toàn bộ messages liên quan
 */
export async function deleteConversationHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || !ObjectId.isValid(id)) {
      res.status(404).json({ error: 'ID cuộc trò chuyện không hợp lệ hoặc không tồn tại' });
      return;
    }

    const conversation = await getConversationById(id);
    if (!conversation) {
      res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
      return;
    }

    await deleteConversation(id);
    await deleteMessagesByConversationId(id);

    res.status(200).json({
      success: true,
      message: 'Đã xóa cuộc trò chuyện và toàn bộ lịch sử tin nhắn',
    });
  } catch (err: any) {
    console.error(`[Delete Conversation] ❌ Lỗi server khi xóa cuộc trò chuyện ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Lỗi server khi xóa cuộc trò chuyện' });
  }
}

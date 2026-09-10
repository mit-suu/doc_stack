import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { chatWithRAG } from '../services/chatService.js';

/**
 * POST /api/chat
 * Nhận câu hỏi từ người dùng, thực hiện RAG tìm kiếm ngữ cảnh và sinh câu trả lời
 */
export async function chatHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawMessage = req.body.message || req.body.query;
    const documentId = req.body.documentId;

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      res.status(400).json({ error: 'Nội dung câu hỏi (message) không được để trống' });
      return;
    }

    if (documentId && !ObjectId.isValid(documentId)) {
      res.status(400).json({ error: 'documentId không hợp lệ (phải là 24 ký tự hex)' });
      return;
    }

    const trimmedMessage = rawMessage.trim();
    const result = await chatWithRAG(trimmedMessage, documentId);

    res.status(200).json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || 'Lỗi hệ thống khi AI xử lý câu hỏi',
    });
  }
}

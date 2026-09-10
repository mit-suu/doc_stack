import { Request, Response } from 'express';
import { retrieveContext } from '../services/retrievalService.js';

/**
 * POST /api/retrieve
 * Nhận query tìm kiếm và trả về các chunks ngữ cảnh liên quan nhất cùng điểm tương đồng
 */
export async function retrieveHandler(req: Request, res: Response): Promise<void> {
  try {
    const { query, topK, documentId } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'query không được để trống' });
      return;
    }

    let parsedTopK: number = 5;
    if (topK !== undefined) {
      const num = Number(topK);
      if (isNaN(num) || num <= 0) {
        res.status(400).json({ error: 'topK phải là số nguyên dương lớn hơn 0' });
        return;
      }
      parsedTopK = Math.min(Math.floor(num), 50); // Giới hạn tối đa 50
    }

    const trimmedQuery = query.trim();
    const results = await retrieveContext(trimmedQuery, parsedTopK, documentId);

    res.status(200).json({
      query: trimmedQuery,
      results,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || 'Lỗi server khi tìm kiếm ngữ cảnh tài liệu',
    });
  }
}

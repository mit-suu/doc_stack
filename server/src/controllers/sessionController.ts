import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  getUserSessions,
  getSessionById,
  createSession,
  deleteSession,
} from '../repositories/sessionRepository.js';

/**
 * GET /api/sessions
 * Lấy danh sách các phiên chat của riêng người dùng đang đăng nhập
 */
export async function getSessionsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Chưa xác thực người dùng' });
      return;
    }

    const sessions = await getUserSessions(userId);
    res.status(200).json(sessions);
  } catch (err: any) {
    console.error('[SessionController] Lỗi lấy danh sách sessions:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách phiên trò chuyện' });
  }
}

/**
 * GET /api/sessions/:id
 * Lấy chi tiết lịch sử tin nhắn của một phiên chat (Phân quyền kiểm tra sở hữu)
 */
export async function getSessionDetailHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Chưa xác thực người dùng' });
      return;
    }

    const session = await getSessionById(id, userId);
    if (!session) {
      res.status(404).json({ error: 'Không tìm thấy phiên trò chuyện hoặc bạn không có quyền truy cập' });
      return;
    }

    res.status(200).json(session);
  } catch (err: any) {
    console.error('[SessionController] Lỗi lấy chi tiết session:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết phiên trò chuyện' });
  }
}

/**
 * POST /api/sessions
 * Tạo một phiên chat mới cho người dùng
 */
export async function createSessionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Chưa xác thực người dùng' });
      return;
    }

    const title = (req.body?.title || 'Phiên trò chuyện mới').trim();
    const newSession = await createSession(userId, title);

    res.status(201).json(newSession);
  } catch (err: any) {
    console.error('[SessionController] Lỗi tạo session:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ khi tạo phiên trò chuyện' });
  }
}

/**
 * DELETE /api/sessions/:id
 * Xóa một phiên chat của người dùng (Phân quyền kiểm tra sở hữu)
 */
export async function deleteSessionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Chưa xác thực người dùng' });
      return;
    }

    const success = await deleteSession(id, userId);
    if (!success) {
      res.status(404).json({ error: 'Không tìm thấy phiên trò chuyện để xóa' });
      return;
    }

    res.status(200).json({ message: 'Đã xóa phiên trò chuyện thành công' });
  } catch (err: any) {
    console.error('[SessionController] Lỗi xóa session:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ khi xóa phiên trò chuyện' });
  }
}

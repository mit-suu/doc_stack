import { Router } from 'express';
import {
  getSessionsHandler,
  getSessionDetailHandler,
  createSessionHandler,
  deleteSessionHandler,
} from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Tất cả các routes phiên chat đều bắt buộc phải đăng nhập và phân quyền theo Token
router.use(authenticateToken as any);

// GET /api/sessions - Lấy danh sách các phiên của user
router.get('/', getSessionsHandler as any);

// POST /api/sessions - Tạo phiên chat mới
router.post('/', createSessionHandler as any);

// GET /api/sessions/:id - Lấy chi tiết phiên chat
router.get('/:id', getSessionDetailHandler as any);

// DELETE /api/sessions/:id - Xóa phiên chat
router.delete('/:id', deleteSessionHandler as any);

export default router;

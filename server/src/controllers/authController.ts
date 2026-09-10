import { Request, Response } from 'express';
import { authenticateWithGoogle, getCurrentUser } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

/**
 * POST /api/auth/google
 * Tiếp nhận Google Credential và trả về JWT Access Token
 */
export async function googleLoginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { credential, token } = req.body;
    const credToUse = credential || token;

    if (!credToUse) {
      res.status(400).json({ error: 'Thiếu Google credential trong request body' });
      return;
    }

    const result = await authenticateWithGoogle(credToUse);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[AuthController] Lỗi đăng nhập Google:', err.message);
    res.status(401).json({ error: err.message || 'Xác thực Google thất bại' });
  }
}

/**
 * GET /api/auth/me
 * Lấy thông tin tài khoản người dùng hiện tại từ Access Token
 */
export async function getMeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Chưa đăng nhập' });
      return;
    }

    const user = await getCurrentUser(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'Không tìm thấy người dùng' });
      return;
    }

    res.status(200).json({ user });
  } catch (err: any) {
    console.error('[AuthController] Lỗi lấy thông tin me:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy thông tin người dùng' });
  }
}

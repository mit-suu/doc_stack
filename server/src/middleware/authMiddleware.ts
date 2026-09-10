import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/authService.js';
import { JWTPayload } from '../models/user.js';

// Mở rộng interface Request để đính kèm user
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    res.status(401).json({ error: 'Yêu cầu token xác thực (Authorization: Bearer <token>)' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    return;
  }
}

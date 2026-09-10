import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { upsertGoogleUser, findUserById } from '../repositories/userRepository.js';
import { User, UserDTO, JWTPayload } from '../models/user.js';

const JWT_SECRET = process.env.JWT_SECRET || 'docstack_jwt_secret_key_access_token_only_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Chuyển đổi User model sang UserDTO an toàn
 */
export function toUserDTO(user: User): UserDTO {
  return {
    id: user._id?.toString() || '',
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt.toISOString(),
  };
}

/**
 * Ký JWT Access Token (hạn 7 ngày, chỉ dùng access token)
 */
export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user._id?.toString() || '',
    email: user.email,
    name: user.name,
    picture: user.picture,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Xác thực chuỗi JWT Access Token
 */
export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Xác thực Google Credential (ID Token) hoặc Google Access Token và lưu/cập nhật người dùng
 */
export async function authenticateWithGoogle(credential: string): Promise<{
  accessToken: string;
  user: UserDTO;
}> {
  if (!credential) {
    throw new Error('Google credential không được để trống');
  }

  let googleId: string = '';
  let email: string = '';
  let name: string = '';
  let picture: string | undefined = undefined;

  // 1. Thử xác thực qua OAuth2Client với verifyIdToken
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID || undefined,
    });

    const payload = ticket.getPayload();
    if (payload && payload.sub && payload.email) {
      googleId = payload.sub;
      email = payload.email;
      name = payload.name || payload.email.split('@')[0];
      picture = payload.picture;
    }
  } catch (verifyErr: any) {
    // 2. Fallback: Nếu không phải ID token mà là access token hoặc tokeninfo
    try {
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (tokenInfoRes.ok) {
        const info = (await tokenInfoRes.json()) as any;
        googleId = info.sub;
        email = info.email;
        name = info.name || info.email?.split('@')[0] || 'Google User';
        picture = info.picture;
      } else {
        // Thử tiếp userinfo nếu client gửi raw access token
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${credential}` },
        });
        if (userInfoRes.ok) {
          const uInfo = (await userInfoRes.json()) as any;
          googleId = uInfo.sub;
          email = uInfo.email;
          name = uInfo.name || uInfo.email?.split('@')[0] || 'Google User';
          picture = uInfo.picture;
        } else {
          throw new Error(`Xác thực Google thất bại: ${verifyErr.message}`);
        }
      }
    } catch (fallbackErr: any) {
      console.error('[AuthService] Lỗi xác thực token Google:', fallbackErr.message);
      throw new Error(`Google token không hợp lệ hoặc đã hết hạn: ${verifyErr.message}`);
    }
  }

  if (!email || !googleId) {
    throw new Error('Không thể lấy thông tin email hoặc googleId từ Google credential');
  }

  // Lưu hoặc cập nhật người dùng vào MongoDB
  const user = await upsertGoogleUser({
    googleId,
    email,
    name,
    picture,
  });

  // Tạo access token
  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    user: toUserDTO(user),
  };
}

/**
 * Lấy thông tin người dùng hiện tại từ userId trong JWT
 */
export async function getCurrentUser(userId: string): Promise<UserDTO | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  return toUserDTO(user);
}

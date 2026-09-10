import { AuthResponse, User } from '../types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Gửi Google Credential (ID token) lên backend để đăng nhập/đăng ký
 */
export async function loginWithGoogleApi(credential: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Đăng nhập với Google thất bại');
  }

  return data;
}

/**
 * Lấy thông tin người dùng hiện tại qua Access Token
 */
export async function getMeApi(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Token không hợp lệ hoặc đã hết hạn');
  }

  return data.user;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Lấy Access Token từ localStorage để gắn vào header Authorization
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('docstack_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface BackendDocument {
  _id: string;
  title: string;
  sourceType: 'file' | 'url';
  originalName?: string;
  fileType?: 'pdf' | 'docx' | 'md' | 'txt';
  sourceUrl?: string;
  status: 'pending' | 'processing' | 'ready' | 'embedded' | 'failed';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitationItem {
  title: string;
  sourceType: string;
  sourceUrl?: string;
  originalName?: string;
  score: number;
  snippet: string;
  chunkIndex: number;
}

export interface ChatResponse {
  answer: string;
  citations: CitationItem[];
  query: string;
  sessionId?: string;
}

export interface BackendSession {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[];
  createdAt: string;
}

export interface BackendSessionDetail {
  _id: string;
  userId: string;
  title: string;
  lastMessage?: string;
  messages: BackendMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Lấy danh sách tài liệu từ backend
 */
export async function fetchDocuments(): Promise<BackendDocument[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(`Server trả về mã ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error('[API] Lỗi khi tải danh sách tài liệu:', err);
    throw err;
  }
}

/**
 * Upload tệp tài liệu và tự động kích hoạt tạo embedding
 */
export async function uploadDocument(file: File): Promise<BackendDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi tải file lên máy chủ');
  }
  return data;
}

/**
 * Crawl nội dung bài viết từ URL
 */
export async function crawlDocument(url: string): Promise<BackendDocument> {
  const res = await fetch(`${API_BASE_URL}/api/documents/crawl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi crawl URL');
  }
  return data;
}

/**
 * Lấy danh sách các phiên chat của riêng user hiện tại
 */
export async function fetchSessions(): Promise<BackendSession[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      headers: { ...getAuthHeaders() },
    });

    if (!res.ok) {
      if (res.status === 401) return [];
      throw new Error(`Server trả về mã ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('[API] Lỗi khi tải danh sách phiên chat:', err);
    return [];
  }
}

/**
 * Lấy chi tiết lịch sử tin nhắn của 1 phiên chat
 */
export async function fetchSessionDetail(sessionId: string): Promise<BackendSessionDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      headers: { ...getAuthHeaders() },
    });

    if (!res.ok) {
      throw new Error(`Không thể lấy chi tiết phiên chat (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('[API] Lỗi khi tải chi tiết phiên chat:', err);
    return null;
  }
}

/**
 * Tạo một phiên chat mới
 */
export async function createNewSession(title?: string): Promise<BackendSessionDetail> {
  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ title }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi tạo phiên trò chuyện mới');
  }
  return data;
}

/**
 * Xóa một phiên chat
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Lỗi khi xóa phiên trò chuyện');
  }
}

/**
 * Gửi câu hỏi chat tới AI RAG (kèm sessionId để lưu vào đúng phiên của người dùng)
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
  documentId?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ message, sessionId, documentId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi AI xử lý câu hỏi');
  }
  return data;
}

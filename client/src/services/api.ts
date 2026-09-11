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

export interface BackendDocumentDetail extends BackendDocument {
  rawText: string;
}

export interface BackendDocumentChunk {
  _id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: {
    title?: string;
    sourceType?: string;
    originalName?: string;
    sourceUrl?: string;
  };
  embeddingLength?: number;
  createdAt?: string;
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
 * Lấy chi tiết tài liệu kèm nội dung văn bản đầy đủ (rawText)
 */
export async function fetchDocumentDetail(id: string): Promise<BackendDocumentDetail> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(`Không thể lấy chi tiết tài liệu (Mã lỗi ${res.status})`);
    }
    return await res.json();
  } catch (err: any) {
    console.error(`[API] Lỗi khi tải chi tiết tài liệu ${id}:`, err);
    throw err;
  }
}

/**
 * Lấy danh sách các chunk đã tạo của tài liệu
 */
export async function fetchDocumentChunks(id: string): Promise<BackendDocumentChunk[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}/chunks`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(`Không thể lấy danh sách chunks (Mã lỗi ${res.status})`);
    }
    return await res.json();
  } catch (err: any) {
    console.error(`[API] Lỗi khi tải chunks của tài liệu ${id}:`, err);
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
 * Xóa một tài liệu và các vector chunks liên quan
 */
export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Lỗi khi xóa tài liệu');
  }
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
  documentIds?: string[] | string
): Promise<ChatResponse> {
  const docIdsArray = Array.isArray(documentIds)
    ? documentIds
    : documentIds
    ? [documentIds]
    : undefined;

  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      message,
      sessionId,
      documentIds: docIdsArray,
      documentId: docIdsArray?.[0],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi AI xử lý câu hỏi');
  }
  return data;
}

export type ChatCitation = CitationItem;

export interface StreamChatMetadata {
  sessionId: string;
  citations: CitationItem[];
  vectorSimilarity: string;
  missingDocSuggestion?: {
    technology: string;
    topic: string;
    title: string;
    url: string;
    reason: string;
  } | null;
}

export interface StreamChatCallbacks {
  onToken: (token: string, accumulated: string) => void;
  onMetadata?: (meta: StreamChatMetadata) => void;
  onComplete?: (fullAnswer: string) => void;
  onError?: (err: Error) => void;
}

/**
 * Gửi câu hỏi chat và stream nhận câu trả lời theo thời gian thực (Vercel AI SDK SSE)
 * Cho trải nghiệm người dùng mượt mà giống hệt ChatGPT / Claude
 */
export async function streamChatMessage(
  message: string,
  sessionId?: string,
  documentIds?: string[] | string,
  callbacks?: StreamChatCallbacks
): Promise<{ answer: string; citations: CitationItem[]; sessionId?: string }> {
  const docIdsArray = Array.isArray(documentIds)
    ? documentIds
    : documentIds
    ? [documentIds]
    : undefined;

  const res = await fetch(`${API_BASE_URL}/api/chat?stream=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      message,
      sessionId,
      documentIds: docIdsArray,
      documentId: docIdsArray?.[0],
      stream: true,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi máy chủ (${res.status})`);
  }

  if (!res.body) {
    throw new Error('Trình duyệt không hỗ trợ luồng dữ liệu (ReadableStream)');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let metadataReceived: StreamChatMetadata | null = null;
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Giữ lại dòng dở dang chưa hoàn tất

      let currentEvent = 'message';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace(/^event:\s*/, '');
        } else if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(dataStr);
            if (currentEvent === 'metadata') {
              metadataReceived = parsed;
              callbacks?.onMetadata?.(parsed);
            } else if (currentEvent === 'token') {
              if (parsed.text) {
                accumulated += parsed.text;
                callbacks?.onToken?.(parsed.text, accumulated);
              }
            } else if (currentEvent === 'done') {
              callbacks?.onComplete?.(parsed.answer || accumulated);
            } else if (currentEvent === 'error') {
              throw new Error(parsed.error || 'Lỗi streaming từ AI');
            }
          } catch (jsonErr: any) {
            if (currentEvent === 'error') {
              throw jsonErr;
            }
            if (currentEvent === 'token' || currentEvent === 'message') {
              accumulated += dataStr;
              callbacks?.onToken?.(dataStr, accumulated);
            }
          }
        }
      }
    }
  } catch (err: any) {
    callbacks?.onError?.(err);
    throw err;
  }

  return {
    answer: accumulated,
    citations: metadataReceived?.citations || [],
    sessionId: metadataReceived?.sessionId || sessionId,
  };
}

export interface DocPresetSummary {
  id: string;
  name: string;
  urlCount: number;
}

export interface PresetImportResult {
  presetId: string;
  presetName: string;
  totalUrls: number;
  succeeded: string[];
  failed: { url: string; error: string }[];
}

/**
 * Lấy danh sách preset tài liệu có sẵn từ backend
 */
export async function fetchDocPresets(): Promise<DocPresetSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/presets`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      throw new Error(`Server trả về mã ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error('[API] Lỗi khi tải danh sách preset tài liệu:', err);
    return [];
  }
}

/**
 * Tải về toàn bộ tài liệu theo preset
 */
export async function importDocPreset(presetId: string): Promise<PresetImportResult> {
  const res = await fetch(`${API_BASE_URL}/api/presets/${presetId}/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi tải tài liệu theo preset');
  }
  return data;
}


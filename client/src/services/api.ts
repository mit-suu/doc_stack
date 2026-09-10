const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
}

/**
 * Lấy danh sách tài liệu từ backend
 */
export async function fetchDocuments(): Promise<BackendDocument[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/documents`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi crawl URL');
  }
  return data;
}

/**
 * Gửi câu hỏi chat tới AI RAG
 */
export async function sendChatMessage(
  message: string,
  documentId?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, documentId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi khi AI xử lý câu hỏi');
  }
  return data;
}

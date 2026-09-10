# DocStack Backend - RAG Intelligence Engine

Hệ thống Backend cung cấp dịch vụ RAG (Retrieval-Augmented Generation) thông minh, hỗ trợ xử lý tài liệu đa định dạng (PDF, DOCX, Markdown, Text, URL Crawling), vector hóa với Gemini 3072 chiều, lưu trữ trên MongoDB Atlas Vector Search, và cung cấp API trò chuyện có trích dẫn nguồn với cơ chế chống hallucination tuyệt đối.

---

## 🚀 Hướng dẫn Khởi chạy (Quick Start)

### 1. Cài đặt Thư viện
```bash
npm install
```

### 2. Cấu hình Môi trường
Tạo file `.env` tại thư mục `server/` dựa trên `.env.example`:
```env
# Cổng chạy server
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?appName=docstack
MONGODB_DB_NAME=docstack

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# CORS Whitelist (phân cách bằng dấu phẩy)
CLIENT_URL=http://localhost:3000,https://doc-stack.vercel.app

# Xác thực người dùng & Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
JWT_SECRET=your_jwt_secret_key
```

### 3. Khởi chạy Development
```bash
npm run dev
```

### 4. Build Production
```bash
npm run build
npm start
```

---

## 🧠 Cấu hình Vector Search (MongoDB Atlas)

Hệ thống sử dụng mô hình embedding Google Gemini `gemini-embedding-001` sinh vector **3072 chiều**.
Trên MongoDB Atlas, collection `document_chunks` cần cấu hình Search Index với tên **`vector_index`**:

```json
{
  "fields": [
    {
      "numDimensions": 3072,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "documentId",
      "type": "filter"
    }
  ]
}
```

---

## 📡 Danh mục API Endpoints

### 1. Nhóm Quản lý Tài liệu (`/api/documents`)
| Method | Endpoint | Mô tả | Body / Params |
|---|---|---|---|
| `POST` | `/api/documents/upload` | Tải lên tài liệu (PDF, DOCX, MD, TXT, tối đa 20MB) | Form-data: `file` |
| `POST` | `/api/documents/crawl` | Cào nội dung từ URL tài liệu kỹ thuật | `{ "url": "https://..." }` |
| `GET` | `/api/documents` | Lấy danh sách tất cả tài liệu | Không |
| `GET` | `/api/documents/:id` | Lấy chi tiết tài liệu (kèm toàn bộ `rawText`) | Param `:id` |
| `POST` | `/api/documents/:id/process` | Kích hoạt lại cắt chunk và tạo embedding vector | Param `:id` |
| `GET` | `/api/documents/:id/chunks` | Xem danh sách các chunks và độ dài vector | Param `:id` |

### 2. Nhóm Truy xuất Ngữ cảnh (`/api/retrieve`)
| Method | Endpoint | Mô tả | Body |
|---|---|---|---|
| `POST` | `/api/retrieve` | Tìm kiếm semantic vector chunks liên quan | `{ "query": string, "topK"?: number (1-20), "documentId"?: string }` |

### 3. Nhóm Hội thoại & Slash Commands (`/api/conversations`)
| Method | Endpoint | Mô tả | Body / Params |
|---|---|---|---|
| `POST` | `/api/conversations` | Tạo cuộc trò chuyện mới | `{ "title"?: string }` |
| `GET` | `/api/conversations` | Lấy danh sách cuộc trò chuyện | Không |
| `GET` | `/api/conversations/:id/messages` | Lấy toàn bộ lịch sử tin nhắn của cuộc trò chuyện | Param `:id` |
| `POST` | `/api/conversations/:id/messages` | Gửi tin nhắn, hỗ trợ slash commands và stream HTTP chunked | `{ "message": string }` |
| `DELETE` | `/api/conversations/:id` | Xóa cuộc trò chuyện và toàn bộ tin nhắn liên quan | Param `:id` |

#### Các Slash Commands được hỗ trợ:
- `/explain <câu hỏi>`: Giải thích cân bằng, dễ hiểu (mặc định).
- `/simple <câu hỏi>`: Giải thích đơn giản, ngôn ngữ bình dân, ví dụ đời thường.
- `/deep <câu hỏi>`: Đi sâu vào cơ chế hoạt động, phân tích kỹ thuật chi tiết.
- `/example <câu hỏi>`: Tập trung vào ví dụ thực tế và minh họa code.
- `/compare <A> vs <B>`: Lập bảng so sánh 2 khái niệm dựa trên tài liệu.
- `/quiz <chủ đề>`: Tạo bộ câu hỏi trắc nghiệm kèm đáp án.

### 4. Nhóm Xác thực & Phiên Người Dùng (`/api/auth`, `/api/sessions`, `/api/chat`)
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/google` | Đăng nhập bằng Google Credential/Token |
| `GET` | `/api/auth/me` | Lấy thông tin user hiện tại qua JWT |
| `POST` | `/api/auth/logout` | Đăng xuất phiên làm việc |
| `GET` | `/api/sessions` | Lấy lịch sử phiên chat của user đã đăng nhập |
| `POST` | `/api/chat` | Chat RAG với streaming SSE (Vercel AI SDK), phân quyền theo user |

---

## 🛡️ Nguyên tắc Chống Bịa Đặt (Anti-Hallucination Guardrails)

DocStack AI được thiết lập prompt hệ thống nghiêm ngặt:
- **Chỉ trả lời dựa trên context được cung cấp** từ tài liệu.
- **Nếu context không đủ hoặc không có**, AI từ chối trả lời và thông báo rõ ràng không tìm thấy thông tin trong tài liệu.
- Tuyệt đối không tự suy diễn hoặc bịa đặt số liệu ngoài phạm vi tài liệu đã nạp.

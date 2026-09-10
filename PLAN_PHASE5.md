# Phase 5: RAG Chat Service & Frontend Integration

## Bối cảnh
Backend đã hoàn thành 4 Phase:
- Phase 1: Upload tài liệu (PDF, DOCX, MD, TXT) và Crawl URL $\to$ trích xuất `rawText` sạch vào MongoDB.
- Phase 2: Cắt chunk (`RecursiveCharacterTextSplitter`) và nhúng vector embedding (`gemini-embedding-001`) vào collection `document_chunks`.
- Phase 3: Tạo Atlas Vector Search Index (`vector_index`) trên MongoDB Atlas.
- Phase 4: Retrieval Service với pipeline `$vectorSearch` tìm kiếm ngữ cảnh liên quan và chấm điểm cosine similarity.

Tuy nhiên:
1. Backend chưa có endpoint RAG Chat hoàn chỉnh (chưa kết hợp Context từ Vector Search vào prompt gửi LLM Gemini).
2. Frontend (`client/`) hiện vẫn đang sử dụng 100% Mock Data và chưa gửi request thật sang Backend (`http://localhost:5000`).

Mục tiêu Phase 5: Hoàn thiện toàn diện luồng RAG từ Backend đến Frontend để người dùng có thể:
1. Kéo thả / chọn tệp tải lên thật $\to$ hệ thống tự động lưu, cắt chunk, tạo embedding vào database.
2. Gõ câu hỏi trong khung chat $\to$ hệ thống tìm kiếm ngữ cảnh tương đồng $\to$ Gemini sinh câu trả lời chính xác dựa trên tài liệu kèm trích dẫn nguồn (citations) hiển thị trực quan trên giao diện Next.js.

---

## 1. Backend: RAG Chat Service & Controller

### 1.1 Tạo `server/src/services/chatService.ts`
- Hàm `chatWithRAG(query: string, documentId?: string): Promise<ChatResponse>`:
  1. Gọi `retrieveContext(query, 4, documentId)` từ Phase 4 để lấy các chunks có điểm số tương đồng cao nhất.
  2. Lọc các chunk có độ liên quan tốt (ví dụ `score >= 0.75`).
  3. Nếu không tìm thấy ngữ cảnh nào hoặc điểm quá thấp: LLM sẽ lịch sự thông báo không có đủ thông tin từ tài liệu đã nạp.
  4. Đóng gói ngữ cảnh vào System Prompt theo format có cấu trúc:
     ```
     Bạn là trợ lý AI chuyên nghiệp phân tích tài liệu của hệ thống DocStack.
     Chỉ trả lời dựa trên các đoạn tài liệu được cung cấp dưới đây. Nếu thông tin không có trong tài liệu, hãy nói rõ ràng rằng bạn không tìm thấy thông tin trong tài liệu.
     ...
     [NGỮ CẢNH TÀI LIỆU]:
     [1] Tiêu đề: {title}
     Nội dung: {content}
     ```
  5. Gọi Gemini model (`gemini-3.6-flash`) qua Vercel AI SDK `generateText`.
  6. Tổng hợp kết quả trả về gồm: câu trả lời (`answer`), danh sách nguồn trích dẫn (`citations` gồm tên file, nguồn, điểm liên quan, trích đoạn), và câu query gốc.

### 1.2 Tạo Controller & Route `POST /api/chat`
- Tạo `server/src/controllers/chatController.ts` và `server/src/routes/chatRoutes.ts`.
- Mount tại `/api/chat` trong `server/src/index.ts`.
- Nhận request body: `{ message: string, documentId?: string }`.
- Validate `message` không được rỗng (400).
- Trả về JSON:
  ```json
  {
    "answer": "...",
    "citations": [
      {
        "title": "sample.md",
        "sourceType": "file",
        "score": 0.851,
        "snippet": "..."
      }
    ]
  }
  ```

### 1.3 Tối ưu luồng Upload tự động xử lý
- Trong `uploadDocumentHandler` và `crawlDocumentHandler`: sau khi lưu text thô thành công, tự động gọi `processDocument(doc._id)` để tài liệu được chunk và embed ngay lập tức mà không cần người dùng phải bấm nút xử lý riêng.

---

## 2. Frontend: API Client & Kết nối giao diện thật

### 2.1 Cấu hình biến môi trường
- Tạo `client/.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5000
  ```

### 2.2 Tạo Service API phía Client (`client/src/services/api.ts`)
- `getDocuments()`: Gọi `GET /api/documents` lấy danh sách tài liệu thật từ MongoDB.
- `uploadFile(file: File)`: Gửi `multipart/form-data` lên `POST /api/documents/upload`.
- `crawlUrl(url: string)`: Gửi URL lên `POST /api/documents/crawl`.
- `sendChatMessage(message: string, documentId?: string)`: Gửi câu hỏi lên `POST /api/chat`.

### 2.3 Cập nhật giao diện `client/src/app/home/page.tsx`
- **Quản lý tài liệu thật**:
  - `useEffect`: Tự động tải danh sách tài liệu từ backend khi mở trang.
  - Tính toán số lượng tài liệu (`totalCount`), tổng dung lượng thực tế.
- **Upload tệp thật**:
  - Dropzone (`DocumentDropzone`): Khi người dùng thả hoặc chọn file $\to$ gọi `uploadFile`.
  - Hiển thị trạng thái loading / toast: "Đang tải lên và xử lý embedding..." $\to$ "Tải lên và xử lý thành công!".
  - Tự động cập nhật lại danh sách tài liệu trên sidebar.
- **Khung chat tương tác thật**:
  - Khi người dùng gửi câu hỏi từ `PromptInputBar` $\to$ thêm tin nhắn người dùng vào danh sách hội thoại.
  - Hiển thị trạng thái AI đang suy nghĩ / phân tích.
  - Gọi `sendChatMessage` $\to$ hiển thị phản hồi thật từ Gemini trên thẻ `AiResponseCard`.
  - Hiển thị các thẻ trích dẫn nguồn thực tế trên `CitationsCard` kèm tên file và độ tin cậy.

---

## 3. Yêu cầu khi hoàn thành
- Test toàn bộ luồng trực tiếp trên trình duyệt hoặc API:
  1. Upload một file mới từ giao diện $\to$ kiểm tra danh sách tài liệu cập nhật ngay lập tức.
  2. Gõ câu hỏi về nội dung file vừa upload $\to$ nhận được câu trả lời chính xác từ AI và thẻ trích dẫn đúng file đó.
- Giao diện mượt mà, giữ nguyên phong cách thiết kế hiện đại, dark mode / glassmorphism sẵn có.

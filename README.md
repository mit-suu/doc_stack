# DocStack 🦈

Sổ ghi chú RAG — hỗ trợ học và làm công nghệ mới bằng crawl tài liệu chính thức.

---

## Tổng quan

DocStack là một sổ ghi chú thông minh sử dụng RAG (Retrieval-Augmented Generation) để giúp developer học và làm việc với công nghệ mới nhanh hơn.

Thay vì đọc từng trang documentation rồi tự tổng hợp, bạn chỉ cần:

1. **Crawl** tài liệu chính thức (Next.js, Flutter, React, ...) vào hệ thống.
2. **Hỏi** bất kỳ điều gì về công nghệ đó bằng ngôn ngữ tự nhiên.
3. **Nhận** câu trả lời có ngữ cảnh, kèm trích dẫn nguồn gốc.

---

## Luồng hoạt động

```text
┌─────────────────────────────────────────────────┐
│                  DATA IMPORT                     │
│                                                  │
│   URL tài liệu ──→ Crawl ──→ Extract nội dung   │
│                        │                         │
│                        ↓                         │
│               Chunking + Embedding               │
│                        │                         │
│                        ↓                         │
│              MongoDB Atlas Vector DB             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                    CHAT                          │
│                                                  │
│   Câu hỏi ──→ Embedding ──→ Vector Search       │
│                                  │               │
│                                  ↓               │
│                         Top relevant chunks      │
│                                  │               │
│                                  ↓               │
│                    LLM + Context ──→ Trả lời     │
│                                      + Sources   │
└─────────────────────────────────────────────────┘
```

---

## Slash Commands

Gõ `/` trong chat để chọn chế độ tương tác:

| Command | Mô tả | Ví dụ |
|---------|--------|-------|
| `/explain` | Giải thích khái niệm | `/explain React Server Components` |
| `/simple` | Giải thích đơn giản | `/simple Next.js Middleware` |
| `/deep` | Phân tích chi tiết từ docs | `/deep Next.js Server Actions` |
| `/example` | Ví dụ thực tế | `/example Center a div with Tailwind` |
| `/compare` | So sánh công nghệ | `/compare SSR vs SSG` |
| `/quiz` | Kiểm tra kiến thức | `/quiz Next.js Routing` |

---

## Tính năng

- **Crawl tài liệu tự động** — Nhập URL documentation chính thức, hệ thống tự crawl batch nhiều trang và embedding.
- **Chat RAG** — Hỏi đáp dựa trên tài liệu đã crawl, trả lời kèm trích dẫn nguồn.
- **GLM-5.3 Thinking** — Sử dụng model GLM-5.3 (deploy trên Modal) với khả năng suy luận `<think>`, tự động loại bỏ phần thinking trước khi trả về kết quả.
- **Fallback thông minh** — GLM-5.3 → Gemini Flash tự động chuyển khi model chính lỗi.
- **Auto-detect tài liệu thiếu** — Khi hỏi về công nghệ chưa có trong kho, hệ thống tự gợi ý nạp tài liệu chính thức.
- **Upload file** — Hỗ trợ upload PDF, Markdown, Text trực tiếp.
- **Slash Commands** — `/explain`, `/simple`, `/deep`, `/example`, `/compare`, `/quiz`.
- **Quản lý tài liệu** — Thêm, xóa, xem trạng thái embedding từng nguồn.
- **Chống trùng lặp** — Tự động phát hiện và bỏ qua tài liệu đã tồn tại.

---

## Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Next.js (App Router) |
| Backend | Express.js + TypeScript |
| Database | MongoDB Atlas (Vector Search) |
| Embedding | Gemini Embedding 001 (3072 dims) |
| LLM chính | GLM-5.3 (Modal) + `<think>` reasoning |
| LLM dự phòng | Gemini Flash |
| Crawling | Cheerio + batch crawler |

---

## Cài đặt

```bash
# Clone
git clone https://github.com/your-repo/docstack.git
cd docstack

# Server
cd server
npm install
cp .env.example .env   # Cấu hình MONGODB_URI, GOOGLE_GENERATIVE_AI_API_KEY, MODAL_*
npm run dev

# Client
cd client
npm install
cp .env.example .env.local
npm run dev
```

---

## Phát triển tiếp

- [ ] Hybrid Search (vector + keyword kết hợp)
- [ ] Re-ranking kết quả tìm kiếm
- [ ] Learning Path & Quiz tracking
- [ ] Documentation update detection & auto re-indexing

Để dễ hình dung nhất, toàn bộ luồng AI của dự án chia làm **2 pha độc lập**: **Pha Nạp Kiến Thức (Ingestion)** và **Pha Hỏi Đáp (RAG Inference)**.

---

### Pha 1: Nạp kiến thức vào "Bộ nhớ" (Crawl / Upload)

```text
[URL Docs / File PDF]
        │
        ▼
   1. CÀO & TÁCH CHỮ (Cheerio / Multer)
      Lọc bỏ menu, header, footer thừa; chỉ giữ lại nội dung cốt lõi của bài viết.
        │
        ▼
   2. BẺ NHỎ (Chunking)
      Cắt bài viết dài thành nhiều đoạn nhỏ (~1000 - 1500 ký tự) có gối đầu (overlap).
        │
        ▼
   3. MÃ HÓA NGỮ NGHĨA (Gemini Embedding)
      Biến từng đoạn chữ thành chuỗi 3072 con số (Vector) mang ý nghĩa nội dung.
        │
        ▼
   4. CẤT KHO (MongoDB Atlas Vector Search)
      Lưu trữ Vector + Text gốc + Metadata (URL, tiêu đề) vào DB.
```

---

### Pha 2: Bạn hỏi một câu trong Chat (Luồng RAG + Thinking + Fallback)

Khi bạn gõ câu hỏi (ví dụ: `/explain Next.js Caching hoạt động thế nào?`):

```text
   [Người dùng nhập câu hỏi + Slash command]
                        │
                        ▼
           1. BÓC TÁCH LỆNH (Command Parser)
           Nhận diện lệnh `/explain` để nạp luật cho AI (giải thích từ căn bản, có code demo).
                        │
                        ▼
           2. VECTƠ HÓA CÂU HỎI (Gemini Embedding)
           Biến câu hỏi của bạn thành 1 Vector tọa độ ngữ nghĩa.
                        │
                        ▼
           3. TÌM KIẾM TRONG KHO (Atlas Vector Search)
           So sánh góc/khoảng cách vector để lôi ra 3-5 đoạn doc sát với câu hỏi nhất.
                        │
                        ▼
           4. PHÁT HIỆN TÀI LIỆU THIẾU (Doc Detector)
           - Nếu điểm tương đồng quá thấp (chưa có trong kho): Hệ thống tự tìm URL chính thức
             rồi hiện nút "Bấm để nạp tài liệu này vào nguồn".
           - Nếu đã có tài liệu: Ghép các đoạn tài liệu tìm được vào chung 1 Prompt.
                        │
                        ▼
           5. SINH CÂU TRẢ LỜI (Model Thinking & Dual Engine)
           
               Ưu tiên 1: GLM-5.3 (Modal Server)
               ├── Bước 1: Tự suy luận nháp trong thẻ <think>...</think>
               │           (đọc tài liệu được cấp, đối chiếu logic, cấu trúc câu trả lời).
               ├── Bước 2: Server tự động bóc bỏ <think>, chỉ giữ câu trả lời chuẩn xác.
               └── Bước 3: Stream từng chữ về cho giao diện kèm Sources trích dẫn.

               ─── [Nếu Modal GLM bận hoặc lỗi mạng] ───
                                │ (Auto-Fallback)
                                ▼
               Ưu tiên 2: Gemini Flash
               Nhảy vào thay thế ngay lập tức để user không bị gián đoạn chat!
```

---

> **"Cào docs về băm nhỏ biến thành số (Vector) cất kho; khi hỏi thì lấy đoạn doc tương ứng nhét cho AI Thinking đọc nháp rồi trả lời có trích dẫn nguồn, nếu AI chính bận thì AI phụ nhảy vào làm thay."**
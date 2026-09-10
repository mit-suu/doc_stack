```markdown
# Phase 8: Dọn dẹp & Error Handling

## Bối cảnh
Toàn bộ pipeline RAG đã chạy được từ đầu đến cuối: upload/crawl → chunk/embed → retrieval → 
chat với slash command → lưu lịch sử. Phase này là dọn dẹp các vấn đề nhỏ đã phát hiện qua 
các Phase trước, và tăng độ chắc chắn (robustness) chung của API trước khi coi backend hoàn thiện.

## 1. Làm sạch rác UI trong crawl (phát hiện từ test Phase 1)

Sửa `server/src/services/urlCrawler.ts`:

- Sau khi đã lấy text từ `<article>`/`<main>`/`<body>`, thêm bước lọc bỏ các cụm từ rác 
  phổ biến thường xuất hiện trong docs site (nút UI, không phải nội dung):
  - `"Copy page"`, `"On this page"`, `"Was this page's content helpful?"`, 
    `"Edit this page on GitHub"`, `"thumb_up"`, `"thumb_down"`, 
    `"This page is also available as Markdown..."` (và các biến thể tương tự)
  - Cách làm: dùng danh sách regex/string match, loại bỏ các cụm này khỏi text sau khi 
    đã extract, trước khi lưu vào `rawText`
  - Không cần danh sách hoàn hảo bao quát mọi site — chỉ cần xử lý các mẫu đã thấy thực tế 
    qua 4 site đã test (Next.js, React, Flutter, React Native), để dễ mở rộng thêm sau này 
    khi gặp site mới
- Sau khi sửa, re-crawl lại 4 URL đã test trước đó để xác nhận rác đã giảm, nội dung chính 
  không bị ảnh hưởng

## 2. Global Error Middleware (đã note từ review Phase 1, làm chính thức ở đây)

Thêm vào cuối `server/src/index.ts`, sau tất cả route:

```typescript
import { Request, Response, NextFunction } from 'express';

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Cú pháp JSON trong request body không hợp lệ' });
  }
  return res.status(err.status || 500).json({ error: err.message || 'Lỗi hệ thống' });
});
```

Đảm bảo middleware này đặt SAU toàn bộ route đã mount (`/api/documents`, `/api/retrieve`, 
`/api/conversations`), vì Express xử lý error middleware theo thứ tự khai báo.

## 3. Fix tên file tiếng Việt bị lỗi encoding (đã note từ review Phase 1)

Trong `server/src/controllers/documentController.ts`, hàm xử lý upload:
- Chuẩn hóa `req.file.originalname` bằng cách decode lại từ latin1 sang utf8:
  ```typescript
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  ```
- Dùng `originalName` đã chuẩn hóa này khi lưu vào DB, thay vì dùng trực tiếp `req.file.originalname`

## 4. Validate & giới hạn input chung cho toàn bộ endpoint

Rà lại tất cả endpoint đã có, đảm bảo mỗi endpoint có validate cơ bản:

- `POST /api/documents/upload`: xác nhận đã giới hạn file size tối đa (20MB) — nếu chưa có, 
  bổ sung qua config của `multer`
- `POST /api/documents/crawl`: xác nhận `url` hợp lệ trước khi gọi crawl (đã có từ Phase 1, 
  chỉ rà lại)
- `POST /api/retrieve`: xác nhận `topK` nếu truyền vào phải là số dương hợp lý, chặn giá trị 
  âm hoặc quá lớn (ví dụ giới hạn tối đa `topK <= 20`, tránh query quá nặng)
- `POST /api/conversations/:id/messages`: xác nhận `message` không rỗng, không chỉ toàn 
  khoảng trắng

## 5. Xử lý trạng thái document chưa sẵn sàng khi chat

Trong `chatService.ts` (Phase 5), khi retrieval không tìm thấy context vì document liên quan 
đang ở trạng thái `pending`/`processing`/`failed` (chưa kịp embedding xong):
- Không cần code phức tạp — vì `retrieveContext` chỉ query trên `document_chunks` 
  (chỉ có document đã `embedded` mới có chunk ở đây), nên document chưa xử lý xong tự nhiên 
  sẽ không xuất hiện trong kết quả retrieval, không cần thêm check riêng
- Chỉ cần xác nhận lại: hệ thống không bị lỗi/crash nếu user hỏi ngay sau khi upload 
  (trước khi kịp gọi `/process`) — lúc này retrieval trả về rỗng, AI theo đúng nguyên tắc 
  chống hallucination sẽ báo không tìm thấy thông tin, đây là hành vi đúng, không phải bug

## 6. Rà soát log lỗi

- Đảm bảo tất cả các chỗ `catch (error)` đều có `console.error()` ghi lại lỗi thật (kèm context: 
  đang xử lý gì, document/conversation nào) — không chỉ trả lỗi generic cho client mà log rỗng, 
  gây khó debug sau này
- Không cần dùng logging library phức tạp (winston, pino...) ở giai đoạn này — `console.error` 
  là đủ cho MVP

## 7. README tổng hợp

Tạo/cập nhật `server/README.md` liệt kê:
- Toàn bộ endpoint hiện có (gộp từ Phase 1 → 6), theo từng nhóm: Documents, Retrieval, 
  Conversations
- Các biến môi trường cần thiết (tham chiếu `.env.example` đã có)
- Hướng dẫn chạy dev (`npm run dev`)
- Ghi chú ngắn: hệ thống dùng Gemini `gemini-embedding-001` (3072 chiều) cho embedding, 
  Atlas Vector Search index tên `vector_index`

## 8. Test cần làm sau khi hoàn thành

- Re-crawl lại 4 site đã test, xác nhận rác UI đã giảm rõ rệt (so sánh 300 ký tự đầu/cuối 
  trước và sau khi sửa)
- Gửi request với JSON body sai cú pháp tới `/api/documents/crawl`, xác nhận trả về 
  `{ error: "Cú pháp JSON..." }` thay vì trang lỗi HTML mặc định của Express
- Upload 1 file có tên tiếng Việt có dấu, xác nhận `originalName` lưu đúng, không bị lỗi 
  encoding kiểu "BÃ¡o cÃ¡o"
- Thử `topK` âm hoặc quá lớn ở `/api/retrieve`, xác nhận bị chặn đúng
- Gửi message rỗng/toàn khoảng trắng tới `/api/conversations/:id/messages`, xác nhận 
  bị từ chối với lỗi rõ ràng

## Yêu cầu khi hoàn thành
- Báo cáo lại từng mục đã sửa, kèm before/after cho phần dọn rác crawl (quan trọng nhất)
- Đây là phase cuối của backend theo plan ban đầu — sau phase này, toàn bộ API RAG (upload, 
  crawl, chunk, embed, retrieval, chat, lưu lịch sử) coi như hoàn thiện ở mức MVP, sẵn sàng 
  để nối với giao diện Next.js
```

Sau khi agent báo cáo xong Phase 6, coi như bạn đã hoàn thành toàn bộ backend RAG pipeline theo đúng target "Nhiệm vụ tuần đầu". Bước tiếp theo tự nhiên sẽ là nối API này với giao diện chat Next.js bạn đã có prompt thiết kế từ đầu — báo lại khi bạn tới đó.
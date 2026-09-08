# Phase 1: Document Ingestion — Upload & Parse

## Bối cảnh
Server Express + TypeScript đã setup xong: kết nối MongoDB (`server/src/config/db.ts`), 
Gemini qua Vercel AI SDK (`server/src/config/ai.ts`). Chưa có route/collection nào khác.

Mục tiêu Phase này: nhận file (PDF/DOCX/Markdown/txt) hoặc URL, trích xuất ra text thô, 
lưu thông tin document vào MongoDB. CHƯA chunk, CHƯA embedding — chỉ dừng ở việc có 
text thô sạch trong DB.

## 1. Cài thêm package cần thiết (nếu chưa có)

Trong `server`:
- `multer` + `@types/multer` — nhận file upload multipart/form-data
- `pdf-parse` + kiểu type tương ứng (nếu không có type sẵn thì khai báo module tối giản)
- `mammoth` — extract text từ DOCX
- `axios` — fetch HTML từ URL
- `cheerio` + `@types/cheerio` — parse HTML lấy nội dung chính

## 2. Tạo collection `documents` trong MongoDB

Không cần migration thủ công — MongoDB tự tạo collection khi insert document đầu tiên. 
Nhưng cần định nghĩa rõ shape dữ liệu (dùng TypeScript interface, đặt trong `server/src/models/document.ts`):

```typescript
interface Document {
  _id?: ObjectId;
  title: string;
  sourceType: "file" | "url";
  originalName?: string;      // tên file gốc, nếu sourceType = "file"
  fileType?: "pdf" | "docx" | "md" | "txt";
  sourceUrl?: string;         // URL gốc, nếu sourceType = "url"
  rawText: string;            // text thô đã extract
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage?: string;      // nếu status = "failed"
  createdAt: Date;
  updatedAt: Date;
}
```

## 3. Viết service extract text theo loại file

Tạo `server/src/services/documentParser.ts`, gồm các hàm:

- `parsePdf(buffer: Buffer): Promise<string>` — dùng `pdf-parse`
- `parseDocx(buffer: Buffer): Promise<string>` — dùng `mammoth`
- `parseTextFile(buffer: Buffer): string` — đọc trực tiếp (md/txt), decode UTF-8
- `parseByFileType(buffer: Buffer, fileType: string): Promise<string>` — hàm điều phối, 
  gọi đúng hàm parse theo `fileType`, throw error rõ ràng nếu loại file không hỗ trợ

## 4. Viết service crawl URL

Tạo `server/src/services/urlCrawler.ts`:

- `crawlUrl(url: string): Promise<{ title: string; content: string }>`:
  - Dùng `axios` fetch HTML (set timeout hợp lý, ví dụ 10s, tránh treo request)
  - Dùng `cheerio` load HTML
  - Cố gắng lấy nội dung chính: ưu tiên thẻ `<article>`, `<main>`, hoặc fallback `<body>` 
    nếu không tìm thấy — loại bỏ `<nav>`, `<footer>`, `<script>`, `<style>`, `<aside>` trước khi lấy text
  - Lấy `title` từ thẻ `<title>` hoặc `<h1>` đầu tiên
  - Trả về text đã làm sạch (loại bỏ khoảng trắng thừa, nhiều dòng trống liên tiếp)
  - Throw error rõ ràng nếu fetch thất bại (timeout, 404, domain không tồn tại...)

## 5. Tạo repository layer cho document

Tạo `server/src/repositories/documentRepository.ts`:
- `createDocument(data): Promise<Document>` — insert vào collection `documents`
- `updateDocumentStatus(id, status, errorMessage?)` — update status
- `getDocumentById(id): Promise<Document | null>`
- `getAllDocuments(): Promise<Document[]>` — lấy danh sách, sắp xếp theo `createdAt` giảm dần

## 6. Tạo controller + route

Tạo `server/src/controllers/documentController.ts` với các handler, tạo `server/src/routes/documentRoutes.ts` để khai báo route, mount vào `server/src/index.ts` với prefix `/api/documents`.

### `POST /api/documents/upload`
- Dùng `multer` middleware nhận field `file` (giới hạn size tối đa 20MB, chỉ nhận đúng mimetype pdf/docx/md/txt — reject file khác với lỗi rõ ràng)
- Xác định `fileType` theo extension
- Tạo document với `status: "pending"` trước
- Gọi `parseByFileType` để lấy `rawText`
- Nếu parse thành công: update document với `rawText` đã có, `status: "ready"`
- Nếu parse lỗi: update `status: "failed"`, `errorMessage`
- Trả về JSON document đã tạo (kèm `_id`)

### `POST /api/documents/crawl`
- Nhận body `{ url: string }` — validate là URL hợp lệ trước khi crawl
- Tạo document với `status: "pending"`, `sourceType: "url"`
- Gọi `crawlUrl(url)`
- Update `rawText`, `title`, `status: "ready"` nếu thành công, hoặc `"failed"` + `errorMessage` nếu lỗi
- Trả về JSON document đã tạo

### `GET /api/documents`
- Trả về danh sách tất cả document (không cần trả full `rawText` trong list — chỉ trả `_id, title, sourceType, fileType/sourceUrl, status, createdAt` để danh sách nhẹ)

### `GET /api/documents/:id`
- Trả về đầy đủ chi tiết 1 document (bao gồm `rawText`)
- Trả 404 rõ ràng nếu không tìm thấy `id`

## 7. Error handling cơ bản cho Phase này
- Tất cả handler bọc try/catch, không để lỗi làm crash server
- Lỗi trả về dạng nhất quán: `{ error: string }` kèm status code phù hợp (400 cho input sai, 404 không tìm thấy, 500 lỗi server)
- File upload sai định dạng/quá lớn → trả 400 với thông báo cụ thể loại lỗi gì

## Yêu cầu khi hoàn thành
- Sau khi code xong, liệt kê lại toàn bộ endpoint đã tạo kèm ví dụ request/response mẫu (dùng để tôi test bằng Postman/curl)
- Không tự tạo thêm collection `document_chunks`, không viết logic chunk/embedding — đó là Phase 2, chưa làm ở đây
- Không cần viết test tự động, ưu tiên chạy đúng và log rõ ràng khi có lỗi
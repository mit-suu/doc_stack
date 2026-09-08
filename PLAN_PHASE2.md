# Phase 2: Chunking & Embedding

## Bối cảnh
Phase 1 đã hoàn thành: document được upload/crawl, text thô lưu trong collection `documents` 
(field `rawText`, `status: "ready"`). Đã fix xong SSRF + undefined trong $set.

Mục tiêu Phase 2: lấy `rawText` của document, cắt thành các đoạn nhỏ (chunk), tạo embedding 
vector cho từng chunk bằng Gemini, lưu vào collection riêng. CHƯA làm retrieval (query/search) 
— đó là Phase 4.

## 1. Cài thêm package (nếu chưa có)

Trong `server`:
- `langchain` — dùng `RecursiveCharacterTextSplitter` để chunk text
- Gemini embedding gọi qua `@ai-sdk/google` đã setup sẵn ở `server/src/config/ai.ts` 
  (dùng hàm `embed`/`embedMany` từ package `ai`)

## 2. Định nghĩa model cho chunk

Tạo `server/src/models/chunk.ts`:

```typescript
interface DocumentChunk {
  _id?: ObjectId;
  documentId: ObjectId;       // ref tới collection documents
  content: string;            // text của chunk
  embedding: number[];        // vector embedding
  chunkIndex: number;         // thứ tự chunk trong document
  metadata: {
    title: string;            // title của document gốc
    sourceType: "file" | "url";
    sourceUrl?: string;
    originalName?: string;
  };
  createdAt: Date;
}
```

## 3. Viết service chunking

Tạo `server/src/services/textChunker.ts`:

- `chunkText(text: string): Promise<string[]>`:
  - Dùng `RecursiveCharacterTextSplitter` từ langchain
  - Cấu hình: `chunkSize` khoảng 800-1000 ký tự, `chunkOverlap` khoảng 150-200 ký tự
  - Trả về mảng các đoạn text đã cắt
  - Xử lý edge case: text rỗng hoặc quá ngắn (dưới chunkSize) → trả về mảng 1 phần tử chứa nguyên text đó, không cần cắt

## 4. Viết service embedding

Tạo `server/src/services/embeddingService.ts`:

- `generateEmbedding(text: string): Promise<number[]>`:
  - Gọi Gemini embedding model (`text-embedding-004`) qua Vercel AI SDK, dùng instance đã 
    khởi tạo ở `server/src/config/ai.ts`
  - Trả về vector embedding của 1 đoạn text
- `generateEmbeddings(texts: string[]): Promise<number[][]>`:
  - Batch nhiều đoạn text cùng lúc (dùng `embedMany` nếu AI SDK hỗ trợ), hiệu quả hơn 
    gọi tuần tự từng cái
  - Xử lý rate limit: nếu Gemini free tier giới hạn số request/phút, thêm delay nhỏ 
    giữa các batch hoặc retry với backoff khi gặp lỗi 429

## 5. Repository cho chunk

Tạo `server/src/repositories/chunkRepository.ts`:
- `insertChunks(chunks: DocumentChunk[]): Promise<void>` — insert nhiều chunk cùng lúc 
  (dùng `insertMany`)
- `getChunksByDocumentId(documentId): Promise<DocumentChunk[]>` — lấy tất cả chunk của 
  1 document (dùng để debug/kiểm tra)
- `deleteChunksByDocumentId(documentId): Promise<void>` — xóa toàn bộ chunk của 1 document 
  (dùng khi cần re-process lại document)

## 6. Service điều phối tổng (orchestration)

Tạo `server/src/services/documentProcessor.ts`:

- `processDocument(documentId: string): Promise<void>`:
  1. Lấy document theo `documentId`, kiểm tra `status` phải là `"ready"` (đã có rawText từ Phase 1) 
     hoặc `"pending"` — nếu không tồn tại/đã `"processing"` thì throw lỗi rõ ràng
  2. Update `status` document thành `"processing"`
  3. Gọi `chunkText(rawText)` → lấy mảng chunk text
  4. Gọi `generateEmbeddings()` cho toàn bộ chunk (batch)
  5. Map kết quả thành mảng `DocumentChunk[]` (kèm `documentId`, `chunkIndex`, `metadata` 
     lấy từ document gốc)
  6. Gọi `insertChunks()` lưu vào DB
  7. Update `status` document thành `"embedded"` (thêm giá trị status mới này vào Document 
     interface, phân biệt với `"ready"` = đã có text thô nhưng chưa chunk/embed)
  8. Nếu bất kỳ bước nào lỗi: update `status` thành `"failed"`, lưu `errorMessage`, 
     không để lỗi làm crash server

## 7. Endpoint kích hoạt xử lý

Thêm vào `server/src/controllers/documentController.ts` + route:

### `POST /api/documents/:id/process`
- Nhận `id` document từ params
- Gọi `processDocument(id)`
- Trả về document đã update (kèm status mới) khi xử lý xong
- Vì embedding có thể mất vài giây (nhiều chunk), cân nhắc: xử lý đồng bộ trước (đơn giản, 
  chấp nhận request chờ lâu) — KHÔNG cần làm queue/background job ở giai đoạn này

### `GET /api/documents/:id/chunks`
- Trả về danh sách chunk của 1 document (dùng để debug, xem chunk đã cắt và có embedding chưa)
- Không cần trả full vector embedding trong response (dài, không cần thiết để xem bằng mắt) 
  — chỉ trả `content`, `chunkIndex`, và `embeddingLength` (số chiều vector, để xác nhận có 
  embedding thật, không cần in hết mảng số)

## 8. Cập nhật Document status enum
Sửa `server/src/models/document.ts`: mở rộng `status` thành 
`"pending" | "processing" | "ready" | "embedded" | "failed"` 
(`"ready"` = đã có rawText từ Phase 1, `"embedded"` = đã chunk + embedding xong ở Phase 2)

## 9. Error handling
- Nếu Gemini API lỗi (hết quota, key sai, rate limit) → catch rõ ràng, update document 
  `status: "failed"` với `errorMessage` mô tả đúng loại lỗi (không để lỗi generic chung chung)
- Nếu document không tồn tại → 404
- Nếu document đã `"embedded"` rồi mà gọi `/process` lại → cho phép re-process (xóa chunk cũ 
  bằng `deleteChunksByDocumentId` trước khi insert chunk mới), không báo lỗi

## Yêu cầu khi hoàn thành
- Liệt kê lại endpoint mới kèm ví dụ request/response mẫu
- Xác nhận: sau khi gọi `/process`, kiểm tra trong MongoDB collection `document_chunks` 
  có dữ liệu, mỗi chunk có `embedding` là mảng số đúng độ dài cố định (Gemini `text-embedding-004` 
  cho ra vector 768 chiều — xác nhận đúng con số này)
- Chưa viết logic vector search/retrieval — đó là Phase 4
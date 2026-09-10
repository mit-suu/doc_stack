# Phase 4: Retrieval Service

## Bối cảnh
Đã có: collection `document_chunks` với embedding, Atlas Vector Search Index tên `vector_index` 
đã ở trạng thái READY. Mục tiêu Phase 4: viết service nhận 1 câu query, trả về các chunk 
liên quan nhất bằng cách chạy `$vectorSearch` trên MongoDB.

CHƯA nối vào chat/LLM ở Phase này — chỉ dừng ở việc retrieval hoạt động đúng, test độc lập 
qua 1 endpoint riêng.

## 1. Viết service retrieval

Tạo `server/src/services/retrievalService.ts`:

- `retrieveContext(query: string, topK: number = 5, documentId?: string): Promise<RetrievedChunk[]>`:
  1. Gọi `generateEmbedding(query)` (đã có từ Phase 2, tái sử dụng) để lấy vector của câu hỏi
  2. Chạy aggregation pipeline `$vectorSearch` trên collection `document_chunks`:
     - `index: "vector_index"`
     - `path: "embedding"`
     - `queryVector`: vector vừa tạo từ query
     - `numCandidates`: khoảng 100-150 (số ứng viên xét trước khi rank, nên cao hơn `topK` nhiều lần)
     - `limit`: giá trị `topK`
     - Nếu có truyền `documentId` (optional — lọc theo 1 document cụ thể): thêm `filter` 
       trong pipeline dùng field `documentId` đã index
  3. Dùng `$project` lấy thêm field `score` (`$meta: "vectorSearchScore"`) để biết độ liên quan
  4. Trả về mảng kết quả gồm: `content`, `metadata`, `score`, `documentId`, `chunkIndex`

Định nghĩa type kết quả trả về trong `server/src/models/chunk.ts` (bổ sung thêm, không sửa 
`DocumentChunk` cũ):

```typescript
interface RetrievedChunk {
  content: string;
  metadata: {
    title: string;
    sourceType: "file" | "url";
    sourceUrl?: string;
    originalName?: string;
  };
  score: number;
  documentId: string;
  chunkIndex: number;
}
```

## 2. Endpoint test riêng

Thêm vào `server/src/controllers/documentController.ts` (hoặc tạo `retrievalController.ts` 
riêng nếu muốn tách rõ, không bắt buộc) + route:

### `POST /api/retrieve`
- Nhận body `{ query: string, topK?: number, documentId?: string }`
  - `topK` mặc định 5 nếu không truyền
  - `documentId` optional, dùng khi muốn giới hạn tìm kiếm trong 1 tài liệu cụ thể
- Validate: `query` không được rỗng
- Gọi `retrieveContext(query, topK, documentId)`
- Trả về JSON: mảng các chunk tìm được, sắp xếp theo `score` giảm dần (Atlas tự trả theo 
  thứ tự liên quan nhất trước, không cần sort lại thủ công)

Response mẫu:

```json
{
  "query": "React Server Components là gì",
  "results": [
    {
      "content": "React Server Components (RSC) là...",
      "metadata": {
        "title": "React Docs",
        "sourceType": "url",
        "sourceUrl": "https://react.dev/..."
      },
      "score": 0.87,
      "documentId": "6a9fb044f848b828f1c7af49",
      "chunkIndex": 2
    }
  ]
}
```

## 3. Error handling
- Nếu `query` rỗng/thiếu → 400 `{ error: "query không được để trống" }`
- Nếu `generateEmbedding` lỗi (Gemini API fail) → 500, thông báo rõ nguyên nhân, không để crash
- Nếu collection `document_chunks` rỗng (chưa có document nào được process) → vẫn trả 200 
  với `results: []`, không phải lỗi

## 4. Test thủ công cần làm

Sau khi code xong, test các trường hợp:
- Query rõ ràng liên quan tới nội dung đã upload → xác nhận chunk trả về đúng chủ đề, 
  `score` hợp lý (càng gần 1 càng liên quan)
- Query hoàn toàn không liên quan gì tới tài liệu đã có → xem chunk trả về có `score` thấp 
  hẳn không (để sau này ở Phase 5 có thể set ngưỡng score tối thiểu, tránh AI trả lời dựa 
  trên context không liên quan)
- Query kèm `documentId` cụ thể → xác nhận chỉ trả chunk thuộc đúng document đó, không lẫn 
  chunk từ document khác

## Yêu cầu khi hoàn thành
- Liệt kê lại endpoint `/api/retrieve` kèm 2-3 ví dụ request/response thực tế đã test 
  (không phải mẫu giả định), có ghi rõ `score` thực tế trả về để tôi đánh giá chất lượng retrieval
- Không viết logic gọi LLM, không viết prompt template — đó là Phase 5
- Không sửa gì ở Phase 1/2, chỉ thêm mới
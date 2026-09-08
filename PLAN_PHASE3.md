# Phase 3: Vector Search Index (thao tác thủ công trên MongoDB Atlas)

## Bối cảnh
Đây KHÔNG phải phase code — là bước thao tác tay trên giao diện MongoDB Atlas, để tạo 
index cho phép query vector similarity trên collection `document_chunks`.

Agent không cần viết code cho Phase này. Agent chỉ cần chuẩn bị đúng định nghĩa index 
JSON, còn tôi tự vào Atlas UI để tạo.

## Việc agent cần làm

Xác nhận lại (dựa trên code Phase 2 đã viết):
- Tên collection chứa embedding là gì (mặc định: `document_chunks`)
- Tên field chứa vector là gì (mặc định: `embedding`)
- Số chiều vector là bao nhiêu (Gemini `text-embedding-004` = 768 chiều — xác nhận đúng 
  bằng cách log `embedding.length` thực tế từ 1 lần gọi thử)

Sau đó agent viết ra định nghĩa index mẫu (để tôi copy dán vào Atlas), dạng:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

(field `filter` cho `documentId` thêm vào để sau này có thể lọc retrieval theo document 
cụ thể nếu cần, không bắt buộc nhưng nên có sẵn)

Agent ghi định nghĩa này vào file `server/README.md` hoặc 1 file riêng 
`server/docs/vector-index-setup.md`, kèm hướng dẫn ngắn gọn các bước thao tác trên Atlas UI:

```markdown
## Setup Atlas Vector Search Index

1. Đăng nhập MongoDB Atlas → chọn Cluster đang dùng
2. Vào tab "Search" (hoặc "Atlas Search") ở sidebar cluster
3. Nhấn "Create Search Index"
4. Chọn "Atlas Vector Search" → "JSON Editor"
5. Chọn Database: docstack (hoặc tên DB đang dùng), Collection: document_chunks
6. Đặt tên index: vector_index (hoặc tên khác, nhớ tên này để dùng trong code query)
7. Dán định nghĩa JSON ở trên vào
8. Nhấn "Create Search Index", đợi vài phút để Atlas build xong (trạng thái chuyển 
   từ "Building" sang "Active")
```

## Việc tôi (người dùng) tự làm
- Vào Atlas theo hướng dẫn agent ghi ra, tạo index thật
- Xác nhận index chuyển sang trạng thái "Active" trước khi báo lại để làm Phase 4

## Lưu ý cho agent
- Không viết code aggregation `$vectorSearch` ở Phase này — đó là Phase 4 (Retrieval Service), 
  cần index đã "Active" thì query mới chạy được
- Không cần tạo thêm collection hay sửa gì trong code Phase 2 — Phase 3 chỉ là tài liệu 
  hướng dẫn + xác nhận thông số kỹ thuật (tên field, số chiều vector)
# Hướng Dẫn Cấu Hình MongoDB Atlas Vector Search Index (Phase 3)

Tài liệu này cung cấp định nghĩa JSON và các bước thao tác thủ công trên giao diện MongoDB Atlas để tạo **Vector Search Index** cho collection `document_chunks`, phục vụ cho tính năng tìm kiếm tương đồng vector (Vector Similarity Search) ở Phase 4.

---

## 1. Thông số kỹ thuật đã xác nhận từ Phase 2

| Thông số | Giá trị cấu hình | Ghi chú |
| :--- | :--- | :--- |
| **Database** | `docstack` | Hoặc tên DB trong biến môi trường `MONGODB_DB_NAME` |
| **Collection** | `document_chunks` | Collection lưu trữ các chunk và vector embeddings |
| **Index Name** | `vector_index` | Tên index sẽ dùng trong pipeline `$vectorSearch` ở Phase 4 |
| **Vector Field** | `embedding` | Field lưu mảng số thực vector embedding |
| **Vector Dimensions** | **`3072`** | Kích thước vector thực tế từ Gemini embedding model (`gemini-embedding-001`) |
| **Similarity Metric** | `cosine` | Đo lường độ tương đồng ngữ nghĩa (Cosine Similarity) |
| **Filter Field** | `documentId` | Cho phép lọc tìm kiếm theo từng tài liệu cụ thể |

> [!IMPORTANT]
> **Lưu ý về số chiều vector (Dimensions)**:
> Khi kiểm thử thực tế với Google Gemini API v1beta, model `gemini-embedding-001` tạo ra vector có độ dài **3072 chiều**. Vì vậy cấu hình index bắt buộc phải đặt `numDimensions: 3072` để khớp với dữ liệu được lưu trong database.

---

## 2. Định nghĩa Index JSON (Copy dán vào Atlas)

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

---

## 3. Các bước thao tác trên MongoDB Atlas UI

1. **Đăng nhập** vào [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Chọn **Cluster** đang sử dụng cho dự án.
3. Tại menu điều hướng bên trái của Cluster, chọn mục **"Atlas Search"** (hoặc **"Search"**).
4. Nhấn nút **"Create Search Index"**.
5. Trong giao diện tạo index:
   - Chọn mục **"Atlas Vector Search"** $\to$ nhấn **"JSON Editor"** $\to$ nhấn **Next**.
6. Tại màn hình JSON Editor:
   - **Database and Collection**:
     - Database: chọn `docstack`
     - Collection: chọn `document_chunks`
   - **Index Name**: nhập `vector_index` (giữ đúng tên này để Phase 4 query chính xác).
   - **JSON Configuration**: Dán đoạn mã JSON ở **Mục 2** vào ô soạn thảo.
7. Nhấn nút **"Create Search Index"**.
8. **Chờ Index kích hoạt**:
   - Trạng thái ban đầu sẽ là `Building`.
   - Đợi từ 1 đến 3 phút, trạng thái sẽ chuyển sang **`Active`** (màu xanh lá).
   - Sau khi trạng thái là `Active`, hệ thống đã sẵn sàng cho Phase 4 (Retrieval Service).

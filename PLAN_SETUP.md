Ghi chú nhanh: chưa có model nào tên "Gemini 3.5" — dòng Gemini hiện tại là 1.5/2.0/2.5. Không sao, để đúng SDK trong plan nói chung là `@google/generative-ai` hoặc qua Vercel AI SDK provider `@ai-sdk/google`, bạn chỉnh tên model cụ thể sau.

Đây là plan để đưa cho agent (Claude Code) thực hiện setup:

```markdown
# Setup Plan: DocStack - Environment & Dependencies

## Bối cảnh
Monorepo đã có sẵn 2 thư mục: `client` (Next.js + TS + Tailwind) và `server` (Express + TS).
Cần setup: MongoDB kết nối, Google Gemini API, Vercel AI SDK, và toàn bộ biến môi trường.

## 1. Cài đặt package cho server

Trong thư mục `server`, cài các package sau:
- `mongodb` — driver kết nối MongoDB Atlas
- `ai` — Vercel AI SDK core (streaming, generateText, generateObject...)
- `@ai-sdk/google` — provider Google Gemini cho Vercel AI SDK
- `multer` + `@types/multer` — xử lý upload file (multipart/form-data)
- `pdf-parse` — extract text từ file PDF
- `mammoth` — extract text từ file DOCX
- `langchain` — dùng cho text splitter (chunking)

## 2. Cài đặt package cho client (nếu cần gọi AI SDK ở phía Next.js)

Trong thư mục `client`, cài:
- `ai` — Vercel AI SDK (cho hook `useChat` ở phía React)

## 3. Tạo file `.env` ở thư mục `server`

Tạo file `server/.env` với các biến sau (giá trị thật do tôi tự điền, agent chỉ tạo khung với placeholder):

```
# Server
PORT=5000

# MongoDB
MONGODB_URI=your_mongodb_atlas_uri_here
MONGODB_DB_NAME=docstack

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# CORS
CLIENT_URL=http://localhost:3000
```

Đảm bảo `server/.env` được thêm vào `.gitignore` (kiểm tra file `.gitignore` đã có `.env` chưa, nếu chưa thì thêm).

Tạo thêm file `server/.env.example` với cùng cấu trúc nhưng để trống giá trị, để làm mẫu tham khảo khi push code lên git.

## 4. Kết nối MongoDB trong server

Tạo file `server/src/config/db.ts`:
- Viết hàm `connectDB()` dùng `MongoClient` từ package `mongodb`, đọc `MONGODB_URI` từ biến môi trường
- Export ra instance database để các file khác import dùng (ví dụ dùng cho collection `document_chunks` sau này)
- Gọi hàm `connectDB()` trong `server/src/index.ts` khi khởi động server, log ra console khi kết nối thành công hoặc thất bại

## 5. Setup Google Gemini qua Vercel AI SDK trong server

Tạo file `server/src/config/ai.ts`:
- Import `createGoogleGenerativeAI` từ `@ai-sdk/google`
- Khởi tạo instance với API key đọc từ `process.env.GOOGLE_GENERATIVE_AI_API_KEY`
- Export ra instance này để dùng ở các route sau (chat, embedding...)

## 6. Cấu trúc thư mục server đề xuất sau khi setup xong

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts          # MongoDB connection
│   │   └── ai.ts          # Gemini/AI SDK setup
│   ├── routes/            # (để trống, làm sau)
│   ├── controllers/       # (để trống, làm sau)
│   ├── services/          # (để trống, làm sau)
│   └── index.ts           # entry point, đã update để gọi connectDB()
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

## 7. Kiểm tra sau khi setup

- Chạy `npm run dev` ở server, xác nhận log hiện: kết nối MongoDB thành công + server chạy port 5000, không có lỗi thiếu package hoặc thiếu biến môi trường
- Không cần viết route API thật nào ở bước này — chỉ cần đảm bảo kết nối DB và khởi tạo AI SDK instance không lỗi

## Lưu ý cho agent
- Chưa cần tạo route `/api/chat`, `/api/upload` hay bất kỳ logic nghiệp vụ nào — bước này CHỈ setup hạ tầng kết nối
- Không tự ý đổi cấu trúc `client` đã có sẵn
- Nếu cần thêm `.gitignore` ở thư mục gốc monorepo (chưa có), tạo với nội dung chuẩn cho Node.js + Next.js project
```
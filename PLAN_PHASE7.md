```markdown
# Phase 7: Chat API (RAG + Slash Commands + Conversation History)

## Bối cảnh
Đã có: `retrieveContext()` (Phase 4) hoạt động đúng, Gemini kết nối qua Vercel AI SDK.
Mục tiêu Phase 5: xây API chat hoàn chỉnh — nối retrieval vào LLM, hỗ trợ slash command, 
stream response, lưu lịch sử hội thoại vào MongoDB (nhiều conversation riêng biệt, giống ChatGPT).

Nguyên tắc bắt buộc: AI CHỈ được trả lời dựa trên context lấy từ tài liệu. Nếu context 
không đủ thông tin để trả lời, AI PHẢI nói rõ không tìm thấy thông tin trong tài liệu — 
TUYỆT ĐỐI không tự suy luận, không bịa số liệu, không dùng kiến thức ngoài context để lấp đầy.

## 1. Định nghĩa model cho Conversation & Message

Tạo `server/src/models/conversation.ts`:

```typescript
interface Conversation {
  _id?: ObjectId;
  title: string;              // tự động lấy từ tin nhắn đầu tiên, hoặc "Cuộc trò chuyện mới"
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  _id?: ObjectId;
  conversationId: ObjectId;
  role: "user" | "assistant";
  content: string;
  command?: "explain" | "simple" | "deep" | "example" | "compare" | "quiz" | null;
  sources?: {
    documentId: string;
    title: string;
    content: string;         // snippet đã dùng
    score: number;
  }[];
  createdAt: Date;
}
```

## 2. Service parse slash command

Tạo `server/src/services/commandParser.ts`:

- `parseCommand(input: string): { command: string | null; query: string }`:
  - Regex kiểm tra input có bắt đầu bằng `/explain`, `/simple`, `/deep`, `/example`, `/compare`, `/quiz` không
  - Nếu có: tách command ra khỏi phần query còn lại (bỏ khoảng trắng thừa)
  - Nếu không có command hợp lệ ở đầu: `command: null`, `query` = nguyên input gốc
  - Xử lý case: user gõ `/xyz` (lệnh không tồn tại) → coi như không có command, giữ nguyên 
    toàn bộ input làm query (không throw lỗi, không chặn user)

## 3. Service xây system prompt theo từng command

Tạo `server/src/services/promptBuilder.ts`:

- `buildSystemPrompt(command: string | null): string` — trả về system prompt riêng theo từng lệnh, 
  nhưng TẤT CẢ đều phải bắt buộc gồm đoạn nguyên tắc chung sau (chèn vào mọi prompt, bất kể command):

```
NGUYÊN TẮC BẮT BUỘC:
- Bạn CHỈ được trả lời dựa trên nội dung được cung cấp trong phần CONTEXT bên dưới.
- Nếu CONTEXT không chứa đủ thông tin để trả lời câu hỏi, bạn PHẢI trả lời rõ ràng rằng 
  không tìm thấy thông tin này trong tài liệu đã cung cấp. TUYỆT ĐỐI KHÔNG tự suy luận, 
  KHÔNG bịa số liệu, KHÔNG dùng kiến thức bên ngoài để lấp đầy khoảng trống.
- Khi trích dẫn thông tin, chỉ dùng đúng số liệu, sự kiện xuất hiện nguyên văn trong CONTEXT.
```

Sau đó thêm phần riêng theo từng command:
- **explain (mặc định)**: giải thích cân bằng, đủ hiểu khái niệm, độ dài vừa phải
- **simple**: dùng ngôn ngữ đơn giản, tránh thuật ngữ, ví dụ đời thường dễ hình dung
- **deep**: giải thích chi tiết, trích dẫn nhiều đoạn context, đi sâu cơ chế hoạt động
- **example**: ưu tiên đưa ra ví dụ code/thực tế cụ thể lấy cảm hứng từ context, hạn chế lý thuyết dài dòng
- **compare**: yêu cầu format trả lời dạng bảng so sánh 2 khái niệm, dựa trên context của cả 2 vế
- **quiz**: sinh ra một bộ câu hỏi trắc nghiệm kèm đáp án đúng, dựa trên nội dung context, 
  trả về dạng có cấu trúc rõ ràng (câu hỏi, các lựa chọn, đáp án đúng)

## 4. Service điều phối chat chính

Tạo `server/src/services/chatService.ts`:

- `handleChatMessage(conversationId: string, userInput: string): Promise<{ stream, sources }>`:
  1. `parseCommand(userInput)` → lấy `command` và `query`
  2. Xử lý riêng cho `compare`: nếu command là `compare`, tách `query` thành 2 vế 
     (ví dụ theo từ khóa "vs", "với", "và") → gọi `retrieveContext()` riêng cho từng vế, 
     merge context lại. Nếu không tách được 2 vế rõ ràng, coi như query thường, retrieve 1 lần
  3. Với các command khác: gọi `retrieveContext(query, topK: 5)` như bình thường
  4. Nếu context trả về rỗng (không tìm thấy chunk nào liên quan): vẫn tiếp tục gọi LLM 
     nhưng context truyền vào là rỗng — dựa vào system prompt, AI sẽ tự báo không tìm thấy 
     thông tin, không cần code chặn cứng ở đây
  5. `buildSystemPrompt(command)` → lấy system prompt
  6. Ghép context vào prompt dạng: liệt kê từng chunk kèm nguồn (title + đoạn trích), 
     đặt trước câu hỏi của user
  7. Gọi `streamText()` từ Vercel AI SDK với Gemini, truyền `system` + `prompt` đã build
  8. Lưu message user vào DB NGAY (trước khi đợi AI trả lời xong) — tránh mất dữ liệu 
     nếu client bị ngắt kết nối giữa chừng
  9. Sau khi stream hoàn tất: lưu message assistant vào DB kèm `sources` (danh sách chunk 
     đã dùng, rút gọn: documentId, title, snippet, score) và `command` đã dùng
  10. Trả về stream để controller pipe thẳng ra response

## 5. Repository cho Conversation & Message

Tạo `server/src/repositories/conversationRepository.ts`:
- `createConversation(title?: string): Promise<Conversation>`
- `getConversationById(id): Promise<Conversation | null>`
- `getAllConversations(): Promise<Conversation[]>` — sort theo `updatedAt` giảm dần
- `updateConversationTitle(id, title)` 
- `touchConversation(id)` — cập nhật `updatedAt` mỗi khi có message mới

Tạo `server/src/repositories/messageRepository.ts`:
- `createMessage(data): Promise<Message>`
- `getMessagesByConversationId(id): Promise<Message[]>` — sort theo `createdAt` tăng dần

## 6. Controller & Routes

Tạo `server/src/controllers/chatController.ts` + `server/src/routes/chatRoutes.ts`, 
mount tại `/api/conversations`.

### `POST /api/conversations`
- Tạo conversation mới, `title` mặc định `"Cuộc trò chuyện mới"` (sẽ tự động cập nhật 
  title thật ở request chat đầu tiên)
- Trả về `{ _id, title, createdAt }`

### `POST /api/conversations/:id/messages`
- Nhận `{ message: string }`
- Kiểm tra `conversationId` tồn tại, nếu không → 404
- Nếu đây là tin nhắn đầu tiên của conversation (chưa có message nào): tự động set 
  `title` conversation = 50 ký tự đầu của `message` (bỏ phần slash command nếu có)
- Gọi `handleChatMessage()`, stream response về client theo chuẩn Vercel AI SDK 
  (dùng `toDataStreamResponse()` hoặc tương đương, để phía Next.js dùng `useChat` được luôn)
- Sau khi stream xong, đảm bảo đã lưu đầy đủ cả 2 message (user + assistant) vào DB

### `GET /api/conversations`
- Trả về danh sách conversation: `_id, title, createdAt, updatedAt` (không cần trả messages ở đây)

### `GET /api/conversations/:id/messages`
- Trả về toàn bộ messages của 1 conversation, sort theo thời gian tăng dần, dùng để load lại 
  lịch sử khi user click vào 1 đoạn chat cũ ở sidebar

### `DELETE /api/conversations/:id`
- Xóa conversation + toàn bộ messages liên quan (dọn dẹp cơ bản, tiện cho việc test)

## 7. Error handling
- `conversationId` không tồn tại → 404 rõ ràng
- `message` rỗng → 400
- Nếu Gemini API lỗi giữa chừng khi đang stream → vẫn phải lưu được message user đã gửi 
  (đã lưu ở bước 8 trong chatService), báo lỗi rõ ràng cho client, không để mất dữ liệu 
  phía user

## 8. Test cần làm sau khi hoàn thành

- Tạo conversation mới, gửi vài tin nhắn với các slash command khác nhau (`/explain`, `/deep`, 
  `/simple`, `/example`, `/compare`, `/quiz`) — xác nhận mỗi lệnh cho ra văn phong/format khác nhau rõ rệt
- **Quan trọng nhất**: gửi 1 câu hỏi CHẮC CHẮN không có trong tài liệu đã upload (ví dụ hỏi 
  về 1 công nghệ hoàn toàn khác) — xác nhận AI trả lời đúng kiểu "không tìm thấy thông tin 
  trong tài liệu", KHÔNG bịa ra câu trả lời nghe hợp lý
- Gọi `GET /api/conversations` và `GET /api/conversations/:id/messages` — xác nhận lịch sử 
  lưu đúng, load lại được, `sources` đính kèm đúng chunk đã dùng
- Test `/compare` với 2 khái niệm có trong tài liệu khác nhau (ví dụ "SSR vs SSG" nếu tài liệu 
  có nói tới cả 2) — xác nhận context lấy được cho cả 2 vế

## Yêu cầu khi hoàn thành
- Liệt kê lại toàn bộ endpoint mới kèm ví dụ request/response
- Đặc biệt báo cáo rõ kết quả test case "câu hỏi ngoài phạm vi tài liệu" — đây là điểm bắt 
  buộc phải đúng trước khi coi Phase 5 hoàn thành, vì đây chính là vấn đề hallucination đã 
  phát hiện trước đó
- Không cần làm giao diện, không sửa gì ở Phase 1-4
```

Điểm mình nhấn mạnh nhất trong guide này là test case "hỏi ngoài phạm vi tài liệu" — đây là thứ trực tiếp giải quyết vấn đề bạn thấy ở ảnh trước (số liệu bịa). Khi agent báo cáo lại, bạn nhớ tự kiểm tra kỹ phần đó trước khi chuyển qua Phase 6.
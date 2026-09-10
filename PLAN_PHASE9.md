```markdown
# Phase 7: Tải Docs Về — Crawl Nhiều Trang Từ Site Nổi Tiếng

## Bối cảnh
Hiện tại crawl chỉ hỗ trợ 1 URL lẻ mỗi lần (`POST /api/documents/crawl`). Tính năng mới: 
cho phép user bấm 1 nút để "tải về" nhiều trang docs chính của 1 framework/thư viện phổ biến 
cùng lúc — không cần tự dán từng URL.

Về mặt kỹ thuật, đây vẫn là crawl trực tiếp từ web (dùng lại `crawlUrl()` đã có từ Phase 1), 
chỉ khác là chạy hàng loạt URL đã chọn sẵn theo từng preset, thay vì 1 URL đơn lẻ. Trên giao 
diện, gọi tính năng này là "Tải Docs về" để dễ hiểu với người dùng — không phải "crawl" hay 
"import".

Giới hạn: mỗi preset crawl tối đa 5-10 trang, tránh quá tải và tốn quota embedding.

## Phần Backend

### 1. Định nghĩa danh sách preset site

Tạo `server/src/config/docPresets.ts`:

```typescript
interface DocPreset {
  id: string;              // "nextjs", "react", "flutter", "react-native", 
                            // "tailwindcss", "typescript", "mongodb", "sepay"
  name: string;             // "Next.js", "React", "Flutter", "React Native", 
                            // "Tailwind CSS", "TypeScript", "MongoDB", "Sepay"
  baseUrl: string;          // domain gốc, dùng để giới hạn crawl trong cùng domain
  urls: string[];           // danh sách URL cụ thể sẽ crawl (5-10 trang chọn lọc thủ công)
}
```

Định nghĩa đủ 8 preset sau, mỗi preset chọn thủ công 5-10 URL trang docs quan trọng nhất 
(KHÔNG tự động dò sitemap ở bản này — chọn tay để đảm bảo chất lượng, đúng trọng tâm kỹ thuật, 
tránh crawl nhầm trang linh tinh như blog/changelog):

1. **Next.js** — gốc `https://nextjs.org/docs` — chọn các trang: routing, server components, 
   client components, server actions, data fetching, caching, middleware, rendering
2. **React** — gốc `https://react.dev/learn` — chọn các trang: thinking in react, describing 
   the UI, adding interactivity, managing state, escape hatches
3. **Flutter** — gốc `https://docs.flutter.dev` — chọn các trang: widgets fundamentals, 
   layout, state management, navigation, async programming
4. **React Native** — gốc `https://reactnative.dev/docs` — chọn các trang: getting started, 
   components and APIs, style, handling text input, navigation
5. **Tailwind CSS** — gốc `https://tailwindcss.com/docs` — chọn các trang: installation, 
   styling with utility classes, responsive design, dark mode, customizing your theme
6. **TypeScript** — gốc `https://www.typescriptlang.org/docs` — chọn các trang: basic types, 
   interfaces, functions, generics, everyday types
7. **MongoDB** — gốc `https://www.mongodb.com/docs` — chọn các trang: CRUD operations, 
   aggregation pipeline, indexes, data modeling, Atlas Vector Search
8. **Sepay** — gốc `https://docs.sepay.vn` — chọn các trang chính trong docs (API, webhook, 
   tích hợp thanh toán — agent tự khảo sát cấu trúc trang thật để chọn URL phù hợp)

QUAN TRỌNG: với mỗi URL chọn, agent phải xác nhận URL đó THẬT SỰ TỒN TẠI (không đoán bừa 
theo pattern, vì cấu trúc docs hay đổi theo version) — có thể dùng web fetch/search để kiểm 
tra trước khi đưa vào danh sách cuối cùng.

### 2. Service crawl hàng loạt

Tạo `server/src/services/batchCrawler.ts`:

- `crawlPreset(presetId: string): Promise<{ succeeded: string[]; failed: { url: string; error: string }[] }>`:
  1. Tra `presetId` trong danh sách preset, throw lỗi nếu không tồn tại
  2. Với từng URL trong preset, gọi lại `crawlUrl()` (đã có từ Phase 1) tuần tự 
     (KHÔNG chạy song song toàn bộ — tuần tự với delay nhỏ giữa mỗi request, ví dụ 500ms-1s, 
     để không bị site chặn và không làm quá tải Gemini embedding API)
  3. Với mỗi URL: tạo document (như luồng crawl thường) → gọi luôn `processDocument()` 
     (chunk + embedding, đã có từ Phase 2) ngay sau khi crawl xong URL đó, thay vì đợi 
     user tự bấm xử lý riêng cho từng cái
  4. Bọc try/catch riêng cho từng URL — 1 URL lỗi (404, timeout, bị chặn) không được làm 
     dừng cả batch, tiếp tục crawl các URL còn lại
  5. Trả về danh sách `succeeded` (URL thành công) và `failed` (URL lỗi kèm lý do)

### 3. Endpoint kích hoạt

Thêm vào `documentController.ts` + route:

### `GET /api/presets`
- Trả về danh sách preset có sẵn: `[{ id, name, urlCount }]` (không cần trả full URL list, 
  chỉ đủ thông tin để hiển thị nút chọn ở frontend)

### `POST /api/presets/:id/import`
- Gọi `crawlPreset(id)`
- Vì việc này chạy khá lâu (5-10 trang, mỗi trang có delay + embedding), xử lý đồng bộ 
  trước (chấp nhận request chờ lâu, KHÔNG cần làm queue/background job/WebSocket ở bản này)
- Trả về kết quả tổng hợp: `{ presetId, totalUrls, succeeded: [...], failed: [...] }`

### 4. Error handling
- Preset `id` không tồn tại → 404
- Nếu TẤT CẢ URL trong preset đều lỗi (site đổi cấu trúc, bị chặn toàn bộ) → vẫn trả 200 
  với `succeeded: []`, không phải lỗi 500 — để frontend tự hiển thị thông báo phù hợp

## Phần Frontend

### 5. UI chọn preset — gọi là "Tải Docs về"

Trong khu vực upload/crawl hiện có (sidebar hoặc modal upload):
- Thêm 1 khu vực mới, tiêu đề **"Tải Docs về"** (hoặc "Tải tài liệu có sẵn") bên cạnh phần 
  upload file/crawl URL lẻ đã có
- Hiển thị các nút/card cho từng preset (gọi `GET /api/presets` để lấy danh sách, KHÔNG 
  hardcode tên site ở frontend — để backend là nguồn chân lý duy nhất về preset nào có sẵn)
- Mỗi nút hiển thị dạng: **"Tải Next.js Docs"**, **"Tải Flutter Docs"**, **"Tải React Docs"**... 
  kèm số lượng trang sẽ tải (ví dụ "Tải Next.js Docs — 8 trang")
- Dùng verb "Tải" xuyên suốt UI (không dùng chữ "Import"/"Crawl"/"Nhập" ở bất kỳ đâu user 
  nhìn thấy), dù phía sau cơ chế vẫn là crawl trực tiếp — đây chỉ là lựa chọn về wording 
  cho dễ hiểu với người dùng cuối

### 6. Xử lý khi click tải

- Khi user click 1 nút preset: gọi `POST /api/presets/:id/import`
- Vì quá trình này chạy lâu (có thể 10-30 giây tùy số trang), hiển thị trạng thái loading 
  rõ ràng: **"Đang tải Next.js Docs... (có thể mất khoảng 1 phút)"**
- Sau khi xong, hiển thị kết quả tóm tắt dạng: **"Đã tải về X/Y trang tài liệu Next.js"** 
  (nếu có URL lỗi, liệt kê ngắn gọn URL nào không tải được)
- Refresh lại danh sách document ở sidebar để hiển thị các trang mới tải về (áp dụng đúng 
  logic dedupe đã làm ở phase sửa mock data trước đó, tránh trùng lặp nếu user lỡ bấm tải 
  preset 2 lần)

## Test cần làm sau khi hoàn thành

- Gọi `GET /api/presets`, xác nhận danh sách trả về đúng 8 preset đã định nghĩa
- Tải thử 1 preset (ví dụ Flutter hoặc Sepay, ít trang nhất), xác nhận:
  - Đúng số lượng document mới xuất hiện trong `GET /api/documents`
  - Từng document đã tự động `status: "embedded"` (không cần xử lý thêm tay)
  - Nội dung `rawText` từng trang có thật, không rỗng
- Thử tải preset đã tải rồi lần 2 — xác nhận có bị tạo trùng document không (nếu có, ghi 
  chú lại, xử lý dedupe ở backend làm riêng sau, không bắt buộc ở phase này)
- Thử với 1 preset mà 1-2 URL trong đó cố tình sai (test bằng cách tạm sửa 1 URL thành link 
  hỏng) — xác nhận batch vẫn tiếp tục crawl các URL còn lại, không bị dừng giữa chừng

## Yêu cầu khi hoàn thành
- Liệt kê rõ toàn bộ URL thật đã chọn cho cả 8 preset (Next.js, React, Flutter, React Native, 
  Tailwind CSS, TypeScript, MongoDB, Sepay), để tôi tự kiểm tra từng link có đúng/còn tồn 
  tại không
- Báo cáo kết quả tải thực tế của ít nhất 2 preset khác nhau (không phải giả định)
- Không cần làm real-time progress bar (ví dụ "đang tải trang 3/8") ở bản này — chỉ cần 
  loading state đơn giản + kết quả tổng hợp sau khi xong
- Đảm bảo toàn bộ text hiển thị cho user dùng đúng wording "Tải Docs về" / "Tải [Tên] Docs", 
  không lộ thuật ngữ kỹ thuật "crawl"/"import" ra giao diện
```
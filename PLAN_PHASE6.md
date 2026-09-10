# Phase 6: Đăng Nhập & Đăng Ký bằng Google (Access Token Only)

## Bối cảnh & Mục tiêu
Dự án DocStack RAG Demo đã hoàn thành 5 Phase:
- Ingestion tài liệu đa định dạng (PDF, DOCX, MD, TXT, Web Crawler với SSRF protection).
- Chunking & Gemini Vector Embedding (3072 dims) vào MongoDB.
- Atlas Vector Search Index (`vector_index`).
- Retrieval Service với `$vectorSearch` pipeline và lọc ngữ cảnh.
- RAG Chat Service (`gemini-3.6-flash`), citations, kết nối trực tiếp với Frontend Next.js.

Mục tiêu của **Phase 6**:
1. Tích hợp tính năng **xác thực người dùng duy nhất bằng Google OAuth (Sign-in / Sign-up with Google)**. Không cần form đăng ký/đăng nhập email/password truyền thống.
2. Quản lý phiên làm việc bằng **chỉ duy nhất Access Token (JWT)**, không cần refresh token theo yêu cầu.
3. Luồng UI ở Frontend:
   - Trang bắt đầu mặc định của hệ thống là `/login`.
   - Người dùng bấm **"Continue with Google"** để đăng nhập/đăng ký tự động $\to$ chuyển tiếp vào `/home`.
   - Tại trang `/home`, thanh Top System Header hiển thị Avatar, Tên và nút **"Đăng xuất" (Logout)**. Khi click đăng xuất $\to$ xóa access token và đưa người dùng về `/login`.
   - Nếu chưa đăng nhập mà truy cập trực tiếp `/home` $\to$ chuyển hướng về `/login`.

---

## 1. Kiến trúc Dữ liệu (Backend Model & Repository)

### Collection MongoDB: `users`
```typescript
export interface User {
  _id?: ObjectId;
  googleId: string;       // Google Sub ID (duy nhất)
  email: string;          // Email tài khoản Google (duy nhất)
  name: string;           // Họ và tên
  picture?: string;       // URL ảnh đại diện Google
  createdAt: Date;        // Thời điểm đăng ký đầu tiên
  updatedAt: Date;        // Thời điểm cập nhật
  lastLoginAt: Date;      // Lần đăng nhập gần nhất
}
```

### Các hàm Repository (`userRepository.ts`):
- `findUserByGoogleId(googleId: string): Promise<User | null>`
- `findUserByEmail(email: string): Promise<User | null>`
- `upsertGoogleUser(data: { googleId, email, name, picture }): Promise<User>`
- `findUserById(id: string): Promise<User | null>`

---

## 2. Dịch vụ Xác thực Backend (`authService.ts`)

1. **Xác thực Google ID Token / Credential**:
   - Sử dụng `google-auth-library` (`OAuth2Client.verifyIdToken`) với `GOOGLE_CLIENT_ID`.
   - Bóc tách thông tin: `sub`, `email`, `name`, `picture`.
   - Tự động tạo người dùng mới nếu chưa tồn tại trong MongoDB (Sign-Up), hoặc cập nhật `lastLoginAt` nếu đã tồn tại (Sign-In).
2. **Ký JWT Access Token**:
   - Sử dụng thư viện `jsonwebtoken` với `JWT_SECRET`.
   - Payload:
     ```json
     {
       "userId": "6a9f...",
       "email": "user@gmail.com",
       "name": "User Name",
       "picture": "https://..."
     }
     ```
   - Thời hạn: 7 ngày (Access Token độc lập, không refresh token).

---

## 3. Endpoints REST API (`authRoutes.ts`)

| Phương thức | Đường dẫn | Chức năng | Input | Output |
|---|---|---|---|---|
| `POST` | `/api/auth/google` | Đăng nhập / Đăng ký qua Google | `{ credential: string }` | `{ accessToken, user }` |
| `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại | Header `Authorization: Bearer <token>` | `{ user }` |

---

## 4. Giao diện Frontend (`client/`)

1. **Trang Bắt Đầu `/login`**:
   - Thiết kế chuẩn Apple Glassmorphism & Cyber Dark mode đồng bộ với hệ thống.
   - Nút bấm **"Continue with Google"** kích hoạt Google Identity Services (GSI).
   - Tự động chuyển hướng vào `/home` ngay sau khi đăng nhập.
2. **Quản lý Phiên (`AuthContext.tsx`)**:
   - Lưu trữ `accessToken` và `user` trong `localStorage`.
   - Cung cấp hàm `logout()` xóa token và chuyển hướng về `/login`.
3. **Bảo vệ Route (Auth Guard)**:
   - `client/src/app/page.tsx` chuyển hướng ngay sang `/login`.
   - `client/src/app/home/page.tsx` kiểm tra nếu chưa đăng nhập sẽ chuyển hướng về `/login`.
4. **Header Profile & Logout**:
   - Hiển thị avatar Google thật và tên người dùng tại `TopSystemHeader.tsx`.
   - Bấm vào mở menu có nút **"Đăng xuất"** màu sắc nổi bật, tương tác mượt mà.

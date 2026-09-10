# DocStack

Nền tảng tri thức kỹ thuật ứng dụng AI, giúp developer hiểu công nghệ mới và xác định cách áp dụng công nghệ đó vào các hệ thống phần mềm thực tế.

## 1. Tổng quan

DocStack là một AI-powered Engineering Knowledge Platform sử dụng Retrieval-Augmented Generation (RAG) để tập trung hóa và khai thác tri thức kỹ thuật.

DocStack kết hợp hai nguồn kiến thức:

- Kiến thức kỹ thuật mới: Official documentation, API docs, SDK docs, integration guides, PDF, Markdown, text...
- Kiến thức của dự án hiện tại: kiến trúc, technical spec, API spec, database schema, source code, internal docs...

Từ các nguồn dữ liệu này, DocStack truy xuất thông tin liên quan và tạo câu trả lời có ngữ cảnh, giúp developer không chỉ hiểu một công nghệ mà còn biết cách áp dụng vào dự án hiện tại.

---

## 2. Vấn đề

Trong quá trình phát triển phần mềm, developer thường phải vừa hiểu hệ thống hiện tại vừa tìm hiểu công nghệ mới.

- Kiến thức của dự án thường phân tán trong source code, kiến trúc, API spec, schema, và tài liệu nội bộ.
- Kiến thức về công nghệ mới nằm rải rác trong documentation chính thức, bài viết, và tài liệu cộng đồng.

AI chatbot thông thường có thể giải thích công nghệ, nhưng thiếu ngữ cảnh của dự án cụ thể. Kết quả: developer phải tự tổng hợp và suy diễn cách áp dụng công nghệ đó vào hệ thống hiện tại.

Vấn đề cốt lõi: developer cần biết cả cách công nghệ hoạt động và cách áp dụng nó vào kiến trúc/dữ liệu/flow của dự án.

---

## 3. Giải pháp

DocStack đưa Project Knowledge và New Technical Knowledge vào cùng một workspace và sử dụng RAG để:

1. Thu thập tài liệu kỹ thuật và dữ liệu của dự án.
2. Phân tích và chia tài liệu thành các đoạn (chunks).
3. Sinh embedding cho từng chunk và lưu vào Vector Database.
4. Tìm kiếm các nội dung liên quan tới câu hỏi của developer.
5. Kết hợp context từ dự án hiện tại và tài liệu công nghệ mới.
6. Sử dụng LLM để phân tích và tạo câu trả lời kèm trích dẫn nguồn.

Luồng chính:
Project Knowledge + New Technical Knowledge → RAG Retrieval → Context-aware AI → Engineering Analysis → Source Verification

---

## 4. Nguồn dữ liệu (Data Sources)

DocStack hỗ trợ nhiều nguồn:

### Documentation website
Ví dụ: Next.js, React, Tailwind CSS, Express.js documentation.

### Document files
Admin/user có thể upload:
- PDF
- Markdown
- Text

Ví dụ nội dung:
- Next.js Documentation
- React Documentation
- Company Technical Guide
- Internal Documentation

---

## 5. Thu thập dữ liệu (Data Collection)

Đối với website documentation:

- Tìm các trang documentation liên quan.
- Thu thập nội dung trang.
- Trích xuất phần nội dung chính.

Mỗi trang lưu cùng metadata ví dụ:
```json
{
  "title": "Installation",
  "content": "...",
  "source": "https://nextjs.org/docs/app/getting-started/installation",
  "technology": "Next.js"
}
# 6. Chunking

Documentation thường quá dài để gửi toàn bộ trực tiếp vào LLM.

Vì vậy nội dung sẽ được chia thành các phần nhỏ gọi là **chunks**.

```text
Original Documentation
        ↓
┌───────────────────┐
│ Chunk 1           │
│ Installation      │
└───────────────────┘

┌───────────────────┐
│ Chunk 2           │
│ Project Structure │
└───────────────────┘

┌───────────────────┐
│ Chunk 3           │
│ Routing           │
└───────────────────┘
```

Mỗi chunk sẽ giữ metadata như:

* Source URL
* Document title
* Technology
* Section
* Chunk ID

---

# 7. Embedding

Sau khi chunking, mỗi chunk sẽ được chuyển thành **vector embedding**.

```text
Text Chunk
     ↓
Embedding Model
     ↓
Vector
```

Ví dụ:

```text
"Install Next.js using create-next-app"
                    ↓
[0.12, -0.45, 0.87, ...]
```

Embedding giúp hệ thống hiểu sự tương đồng về ngữ nghĩa giữa câu hỏi của user và nội dung documentation.

---

# 8. Vector Database

Các vector embedding sẽ được lưu trong Vector Database.

```text
Chunk
  +
Embedding
  +
Metadata
      ↓
Vector Database
```

Ví dụ metadata:

```json
{
  "technology": "Next.js",
  "source": "Official Documentation",
  "url": "...",
  "content": "..."
}
```

Vector Database được sử dụng để tìm kiếm các nội dung liên quan đến câu hỏi của user.

---

# 9. Retrieval

Khi user gửi câu hỏi:

> "How do I install Next.js from CLI?"

Hệ thống sẽ:

```text
User Question
      ↓
Query Embedding
      ↓
Vector Search
      ↓
Find Similar Chunks
      ↓
Top Relevant Results
```

Ví dụ:

```text
User Question
        ↓
"How do I install Next.js?"
        ↓
Top Results:

1. Next.js Installation
2. create-next-app CLI
3. System Requirements
```

---

# 10. Context Building

Các chunks được tìm thấy sẽ được đưa vào context của LLM.

```text
User Question
       +
Retrieved Documentation
       ↓
       Context
       ↓
        LLM
```

LLM được yêu cầu trả lời dựa trên context đã được cung cấp thay vì tự suy đoán thông tin.

---

# 11. AI Response

Kết quả cuối cùng:

```text
User Question
      ↓
Retrieval
      ↓
Relevant Context
      ↓
LLM
      ↓
Final Answer
```

Ví dụ:

> To create a new Next.js application, you can use:

```bash
npx create-next-app@latest
```

### Sources

* Next.js Documentation
* Getting Started
* Installation

User có thể mở source để đọc nội dung gốc.

---

# 12. Slash Commands

DocStack cung cấp các chế độ tương tác khác nhau trong chat.

### `/explain`

Giải thích một khái niệm.

```text
/explain React Server Components
```

### `/simple`

Giải thích đơn giản và dễ hiểu.

```text
/simple Next.js Middleware
```

### `/deep`

Giải thích chi tiết hơn dựa trên documentation.

```text
/deep Next.js Server Actions
```

### `/example`

Yêu cầu ví dụ thực tế.

```text
/example Center a div using Tailwind CSS
```

### `/compare`

So sánh các khái niệm.

```text
/compare SSR vs SSG
```

### `/quiz`

Tạo câu hỏi để kiểm tra kiến thức.

```text
/quiz Next.js Routing
```

---

# 13. Knowledge-Aware Learning

DocStack không chỉ trả lời câu hỏi mà có thể điều chỉnh cách giải thích dựa trên background của user.

Ví dụ:

```text
User Background:
- React
- Node.js
- Express.js

Learning:
- Next.js
```

Khi user hỏi:

> "What is a Server Component?"

Hệ thống có thể giải thích dựa trên kiến thức React mà user đã có thay vì bắt đầu từ những kiến thức cơ bản.

---

# 14. Agent-Based Retrieval

Trong tương lai, DocStack có thể sử dụng AI Agent để quyết định cách tìm kiếm thông tin.

```text
User Question
       ↓
      Agent
       ↓
Is information available in Knowledge Base?
       │
   ┌───┴────┐
   ↓        ↓
  Yes       No
   ↓        ↓
Vector      Search Official
Search      Documentation
   ↓        ↓
   └────┬───┘
        ↓
      Context
        ↓
       LLM
        ↓
      Answer
```

Nếu Knowledge Base chưa có đủ thông tin, Agent có thể tìm kiếm nguồn documentation phù hợp và sử dụng thông tin đó để hỗ trợ câu trả lời.

---

# 15. Proposed Architecture

```text
                    DATA SOURCES
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       Website          PDF           Markdown
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                  Data Processing
                         ↓
                    Chunking
                         ↓
                    Embedding
                         ↓
                 Vector Database


USER
  │
  ↓
Chat Interface
  │
  ↓
AI / RAG Service
  │
  ├── Query Understanding
  │
  ├── Vector Retrieval
  │
  ├── Context Building
  │
  └── LLM Generation
          │
          ↓
   Answer + Sources
```

---

# 16. MVP Scope

Phiên bản đầu tiên tập trung vào:

* Import documentation từ URL.
* Extract nội dung từ website.
* Chunking content.
* Generate embeddings.
* Store embeddings in Vector Database.
* Chat với documentation.
* Retrieval based on semantic similarity.
* AI response based on retrieved context.
* Source citation.
* Basic slash commands.

---

# 17. Future Development

* Crawl multiple documentation pages automatically.
* AI Agent tự tìm official documentation khi Knowledge Base không có thông tin.
* Learning Path.
* Knowledge Assessment.
* Personalized explanation based on user background.
* Quiz and progress tracking.
* Multiple documentation sources in one conversation.
* Documentation update detection and automatic re-indexing.

---

# 18. Key Value

DocStack không được xây dựng chỉ để trở thành một chatbot trả lời câu hỏi về lập trình.

Mục tiêu là xây dựng một AI-powered documentation learning system giúp developer:

> **Find → Understand → Learn → Verify**

thông qua documentation có nguồn rõ ràng và kiến thức được truy xuất theo ngữ cảnh.


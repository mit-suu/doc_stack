
# DocStack

> AI-powered documentation learning assistant that helps developers understand new technologies using official documentation.

## 1. Problem

Khi học một công nghệ mới như Next.js, React hoặc Tailwind CSS, developer thường gặp một số vấn đề:

- Documentation có quá nhiều trang và khó biết nên tìm thông tin ở đâu.
- Việc tìm kiếm thông tin thủ công mất thời gian.
- AI thông thường có thể trả lời nhanh nhưng thông tin có thể không dựa trên documentation chính thức hoặc phiên bản mới nhất.
- Sau khi AI trả lời, người học vẫn khó xác minh thông tin và tìm nguồn để đọc sâu hơn.

## 2. Solution

DocStack là một AI assistant giúp developer học công nghệ mới thông qua official documentation.

User có thể đặt câu hỏi trực tiếp như:

> "How do I install Next.js using CLI?"

hoặc:

> "How do I center a div using Tailwind CSS?"

Hệ thống sẽ tìm kiếm nội dung liên quan từ documentation, truy xuất thông tin phù hợp và cung cấp câu trả lời dựa trên context tìm được.

Mỗi câu trả lời sẽ đi kèm source để user có thể kiểm tra và đọc thêm nội dung gốc.

---

# 3. Core RAG Pipeline

DocStack áp dụng kiến trúc Retrieval-Augmented Generation (RAG).

```text
Documentation Website / File
            ↓
       Data Collection
            ↓
       Text Extraction
            ↓
         Chunking
            ↓
        Embedding
            ↓
      Vector Database
            ↓
        User Question
            ↓
      Query Embedding
            ↓
   Similarity Search / Retrieval
            ↓
      Relevant Context
            ↓
            LLM
            ↓
Answer + Source Citation
````

---

# 4. Data Sources

DocStack có thể sử dụng nhiều nguồn dữ liệu:

### Documentation Website

Ví dụ:

* Next.js Documentation
* React Documentation
* Tailwind CSS Documentation
* Express.js Documentation

Hệ thống có thể thu thập nội dung từ các trang documentation để xây dựng Knowledge Base.

### Document Files

Admin hoặc user có thể thêm các tài liệu như:

* PDF
* Markdown
* Text files

Ví dụ:

```text
Next.js Documentation
React Documentation
Company Technical Guide
Internal Documentation
```

---

# 5. Data Collection

Đối với website documentation, hệ thống sẽ thu thập nội dung từ các trang liên quan.

```text
https://nextjs.org/docs
        ↓
Find Documentation Pages
        ↓
Collect Page Content
        ↓
Extract Main Content
```

Mỗi trang sẽ được lưu cùng metadata:

```json
{
  "title": "Installation",
  "content": "...",
  "source": "https://nextjs.org/docs/app/getting-started/installation",
  "technology": "Next.js"
}
```

---

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


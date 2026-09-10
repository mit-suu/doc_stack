import { generateText } from 'ai';
import { google } from '../config/ai.js';
import { retrieveContext } from './retrievalService.js';
import { RetrievedChunk } from '../models/chunk.js';

export interface ChatCitation {
  title: string;
  sourceType: string;
  sourceUrl?: string;
  originalName?: string;
  score: number;
  snippet: string;
  chunkIndex: number;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
  query: string;
}

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash';

/**
 * Service xử lý RAG Chat: Truy xuất ngữ cảnh liên quan và sinh câu trả lời bằng Gemini
 */
export async function chatWithRAG(
  query: string,
  documentId?: string
): Promise<ChatResponse> {
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    throw new Error('Câu hỏi không được để trống');
  }

  // 1. Truy xuất các đoạn ngữ cảnh liên quan nhất từ Atlas Vector Search
  let relevantChunks: RetrievedChunk[] = [];
  try {
    relevantChunks = await retrieveContext(trimmedQuery, 4, documentId);
  } catch (err: any) {
    console.warn('[ChatService] ⚠️ Lỗi khi retrieveContext:', err.message);
    // Nếu chưa có index hoặc lỗi retrieval, vẫn tiếp tục để Gemini thông báo
  }

  // Chuẩn bị danh sách citations
  const citations: ChatCitation[] = relevantChunks.map((chunk) => ({
    title: chunk.metadata.title || 'Tài liệu không tên',
    sourceType: chunk.metadata.sourceType || 'file',
    sourceUrl: chunk.metadata.sourceUrl,
    originalName: chunk.metadata.originalName,
    score: chunk.score,
    snippet: chunk.content.length > 250 ? chunk.content.slice(0, 250) + '...' : chunk.content,
    chunkIndex: chunk.chunkIndex,
  }));

  // 2. Xây dựng prompt có cấu trúc dựa trên ngữ cảnh
  let systemPrompt: string;
  let userPrompt: string;

  if (relevantChunks.length > 0) {
    const contextText = relevantChunks
      .map(
        (chunk, idx) =>
          `[Đoạn ${idx + 1}] Nguồn: "${chunk.metadata.title}" (Độ liên quan: ${Math.round(
            chunk.score * 100
          )}%)\n${chunk.content}`
      )
      .join('\n\n---\n\n');

    systemPrompt = `Bạn là DocStack AI - Trợ lý phân tích tài liệu thông minh và chuẩn xác.
Quy tắc cốt lõi:
1. Bạn CHỈ ĐƯỢC PHÉP trả lời dựa trên thông tin có trong [NGỮ CẢNH TÀI LIỆU] được cung cấp.
2. Nếu thông tin không có trong tài liệu, hãy nói rõ: "Rất tiếc, thông tin này không có trong các tài liệu hiện tại của hệ thống." Tuyệt đối không tự suy diễn hoặc bịa đặt.
3. Trình bày câu trả lời rõ ràng, mạch lạc bằng tiếng Việt, sử dụng định dạng Markdown (tiêu đề, in đậm, gạch đầu dòng, bảng nếu phù hợp) để người dùng dễ đọc.
4. Ở cuối câu trả lời, hãy trích dẫn ngắn gọn tài liệu đã tham khảo.`;

    userPrompt = `[NGỮ CẢNH TÀI LIỆU]:
${contextText}

[CÂU HỎI]:
${trimmedQuery}`;
  } else {
    systemPrompt = `Bạn là DocStack AI. Hiện tại chưa có tài liệu liên quan nào được tìm thấy trong hệ thống để trả lời câu hỏi. Hãy lịch sự thông báo cho người dùng tải lên tài liệu liên quan trước khi đặt câu hỏi.`;
    userPrompt = `Người dùng hỏi: "${trimmedQuery}". Hãy thông báo chưa tìm thấy tài liệu liên quan.`;
  }

  // 3. Gọi model Gemini để sinh câu trả lời
  try {
    const { text } = await generateText({
      model: google(CHAT_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      answer: text,
      citations,
      query: trimmedQuery,
    };
  } catch (err: any) {
    console.error('[ChatService] ❌ Lỗi khi gọi Gemini generateText:', err.message);
    throw new Error(`Lỗi khi AI xử lý câu trả lời: ${err.message}`);
  }
}

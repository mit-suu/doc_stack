import { generateText, streamText } from 'ai';
import { ObjectId } from 'mongodb';
import { google } from '../config/ai.js';
import { retrieveContext } from './retrievalService.js';
import { RetrievedChunk } from '../models/chunk.js';
import { MessageSource, SlashCommandType } from '../models/conversation.js';
import { parseCommand } from './commandParser.js';
import { buildSystemPrompt } from './promptBuilder.js';
import { createMessage } from '../repositories/messageRepository.js';
import { touchConversation } from '../repositories/conversationRepository.js';

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

export interface ChatStreamOutput {
  streamResult: any;
  sources: MessageSource[];
  command: SlashCommandType | null;
  query: string;
}

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash';

/**
 * Service xử lý RAG Chat: Truy xuất ngữ cảnh liên quan và sinh câu trả lời bằng Gemini (Non-streaming, giữ tương thích ngược)
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
    systemPrompt = `Bạn là DocStack AI. Hiện tại chưa có tài liệu liên quan nào được tìm thấy trong hệ thống để trả lời câu hỏi. Hãy lịch sự thông báo cho người dùng rằng không tìm thấy thông tin trong tài liệu.`;
    userPrompt = `Người dùng hỏi: "${trimmedQuery}". Hãy thông báo rõ ràng không tìm thấy thông tin trong tài liệu.`;
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

export interface StreamChatRAGResult {
  streamResult: any;
  citations: ChatCitation[];
  query: string;
}

/**
 * Service xử lý RAG Chat Streaming: Truy xuất ngữ cảnh và stream câu trả lời theo thời gian thực (Vercel AI SDK)
 */
export async function streamChatWithRAG(
  query: string,
  documentId?: string
): Promise<StreamChatRAGResult> {
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
  }

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
    systemPrompt = `Bạn là DocStack AI. Hiện tại chưa có tài liệu liên quan nào được tìm thấy trong hệ thống để trả lời câu hỏi. Hãy lịch sự thông báo cho người dùng rằng không tìm thấy thông tin trong tài liệu.`;
    userPrompt = `Người dùng hỏi: "${trimmedQuery}". Hãy thông báo rõ ràng không tìm thấy thông tin trong tài liệu.`;
  }

  // 3. Gọi streamText() với Gemini từ Vercel AI SDK
  const streamResult = streamText({
    model: google(CHAT_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return {
    streamResult,
    citations,
    query: trimmedQuery,
  };
}

/**
 * Service điều phối Chat chính cho Phase 7 (RAG + Slash Commands + Streaming + Conversation History)
 */
export async function handleChatMessage(
  conversationId: string,
  userInput: string
): Promise<ChatStreamOutput> {
  const trimmedInput = (userInput || '').trim();
  if (!trimmedInput) {
    throw new Error('Nội dung tin nhắn không được để trống');
  }

  // 1. Phân tích slash command
  const { command, query } = parseCommand(trimmedInput);
  const effectiveQuery = query || trimmedInput;

  // 2. Truy xuất ngữ cảnh RAG
  let relevantChunks: RetrievedChunk[] = [];

  try {
    if (command === 'compare') {
      // Tách 2 vế câu hỏi theo từ khóa so sánh (vs, với, và)
      const splitMatch = effectiveQuery.match(/\s+(?:vs|với|và)\s+/i);
      if (splitMatch && splitMatch.index !== undefined) {
        const part1 = effectiveQuery.slice(0, splitMatch.index).trim();
        const part2 = effectiveQuery.slice(splitMatch.index + splitMatch[0].length).trim();

        if (part1 && part2) {
          const [chunks1, chunks2] = await Promise.all([
            retrieveContext(part1, 4).catch(() => []),
            retrieveContext(part2, 4).catch(() => []),
          ]);

          // Ghép kết quả và loại bỏ trùng lặp
          const seen = new Set<string>();
          for (const c of [...chunks1, ...chunks2]) {
            const key = `${c.documentId}_${c.chunkIndex}`;
            if (!seen.has(key)) {
              seen.add(key);
              relevantChunks.push(c);
            }
          }
        } else {
          relevantChunks = await retrieveContext(effectiveQuery, 5);
        }
      } else {
        relevantChunks = await retrieveContext(effectiveQuery, 5);
      }
    } else {
      // Các lệnh khác: retrieveContext bình thường topK: 5
      relevantChunks = await retrieveContext(effectiveQuery, 5);
    }
  } catch (err: any) {
    console.warn('[ChatService] ⚠️ Lỗi khi truy xuất ngữ cảnh:', err.message);
    // Nếu lỗi hoặc DB chưa có chunk, tiếp tục với relevantChunks rỗng để AI tự báo không có tài liệu
    relevantChunks = [];
  }

  // 3. Chuẩn bị sources đính kèm
  const sources: MessageSource[] = relevantChunks.map((chunk) => ({
    documentId: chunk.documentId,
    title: chunk.metadata.title || 'Tài liệu không tên',
    content: chunk.content.length > 250 ? chunk.content.slice(0, 250) + '...' : chunk.content,
    score: chunk.score,
  }));

  // 4. Xây dựng System Prompt theo command (kèm nguyên tắc bắt buộc chống hallucination)
  const systemPrompt = buildSystemPrompt(command);

  // 5. Ghép context vào User Prompt
  let userPrompt: string;
  if (relevantChunks.length > 0) {
    const contextText = relevantChunks
      .map(
        (chunk, idx) =>
          `[Đoạn ${idx + 1}] Nguồn: "${chunk.metadata.title || 'Tài liệu'}" (Độ tương đồng: ${Math.round(
            chunk.score * 100
          )}%)\n${chunk.content}`
      )
      .join('\n\n---\n\n');

    userPrompt = `[NGỮ CẢNH TÀI LIỆU]:
${contextText}

[CÂU HỎI CỦA NGƯỜI DÙNG]:
${effectiveQuery}`;
  } else {
    userPrompt = `[NGỮ CẢNH TÀI LIỆU]:
(Không tìm thấy bất kỳ đoạn tài liệu nào liên quan trong kho dữ liệu của hệ thống)

[CÂU HỎI CỦA NGƯỜI DÙNG]:
${effectiveQuery}`;
  }

  // 6. Lưu NGAY tin nhắn của user vào DB (trước khi đợi stream xong để tránh mất dữ liệu)
  await createMessage({
    conversationId: new ObjectId(conversationId),
    role: 'user',
    content: trimmedInput,
    command: command || null,
    createdAt: new Date(),
  });

  // 7. Gọi streamText() với Gemini
  const streamResult = streamText({
    model: google(CHAT_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
    onFinish: async ({ text }) => {
      try {
        // Sau khi stream hoàn tất: lưu message assistant vào DB kèm sources và command
        await createMessage({
          conversationId: new ObjectId(conversationId),
          role: 'assistant',
          content: text,
          command: command || null,
          sources,
          createdAt: new Date(),
        });

        // Cập nhật thời gian sửa đổi của conversation
        await touchConversation(conversationId);
      } catch (saveErr: any) {
        console.error('[ChatService] ❌ Lỗi khi lưu assistant message vào DB:', saveErr.message);
      }
    },
  });

  return {
    streamResult,
    sources,
    command,
    query: effectiveQuery,
  };
}

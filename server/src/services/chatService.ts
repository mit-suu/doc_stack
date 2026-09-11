import { generateText, streamText } from 'ai';
import { ObjectId } from 'mongodb';
import OpenAI from 'openai';
import {
  google,
  getActiveChatModel,
  isModalConfigured,
  MODAL_CHAT_MODEL,
  streamModalGLM,
  generateWithModalGLM,
} from '../config/ai.js';
import { aiLogger } from '../utils/aiLogger.js';
import { retrieveContext } from './retrievalService.js';
import { RetrievedChunk } from '../models/chunk.js';
import { MessageSource, SlashCommandType } from '../models/conversation.js';
import { parseCommand } from './commandParser.js';
import { buildSystemPrompt } from './promptBuilder.js';
import { createMessage } from '../repositories/messageRepository.js';
import { touchConversation } from '../repositories/conversationRepository.js';
import { detectMissingDocSuggestion, detectMissingDocWithSearch, MissingDocSuggestion } from './docDetector.js';

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
  modelName?: string;
  missingDocSuggestion?: MissingDocSuggestion | null;
}

export interface ChatStreamOutput {
  streamResult: any;
  sources: MessageSource[];
  command: SlashCommandType | null;
  query: string;
  modelName?: string;
}

/**
 * Service xử lý RAG Chat: Truy xuất ngữ cảnh liên quan và sinh câu trả lời bằng Gemini (Non-streaming, giữ tương thích ngược)
 */
export async function chatWithRAG(
  query: string,
  documentIds?: string[] | string
): Promise<ChatResponse> {
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    throw new Error('Câu hỏi không được để trống');
  }

  // 1. Truy xuất các đoạn ngữ cảnh liên quan nhất từ Atlas Vector Search
  let relevantChunks: RetrievedChunk[] = [];
  try {
    relevantChunks = await retrieveContext(trimmedQuery, 4, documentIds);
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

  // Kiểm tra missing doc suggestion khi không có chunk hoặc điểm vector quá thấp
  let missingDocSuggestion: MissingDocSuggestion | null = null;
  if (relevantChunks.length === 0 || (citations.length > 0 && citations[0].score < 0.65)) {
    // Fallback chain: Sync catalog (0ms) → Async on-demand search (~500ms-1s)
    missingDocSuggestion = detectMissingDocSuggestion(trimmedQuery);
    if (!missingDocSuggestion) {
      missingDocSuggestion = await detectMissingDocWithSearch(trimmedQuery);
    }
  }

  // 2. Xây dựng prompt có cấu trúc dựa trên ngữ cảnh
  let systemPrompt: string;
  let userPrompt: string;

  if (relevantChunks.length > 0 && citations[0]?.score >= 0.65) {
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
1. Bạn trả lời dựa trên thông tin có trong [NGỮ CẢNH TÀI LIỆU] được cung cấp.
2. Trả lời trực tiếp bằng tiếng Việt chuẩn mực, đi thẳng vào trọng tâm. Tuyệt đối KHÔNG xuất bất kỳ suy nghĩ hay phân tích nội bộ nào bằng tiếng Anh (no English internal thoughts).
3. Khi người dùng yêu cầu viết code (/code-mau, sinh code, ví dụ code implementation), hãy thiết kế và viết code implementation hoàn chỉnh, chi tiết bằng Markdown dựa trên các module, cấu trúc và schema được mô tả trong tài liệu.
4. Trình bày câu trả lời rõ ràng, mạch lạc bằng tiếng Việt, sử dụng định dạng Markdown (tiêu đề, in đậm, gạch đầu dòng, code block nếu phù hợp) để người dùng dễ đọc.
5. Ở cuối câu trả lời, hãy trích dẫn ngắn gọn tài liệu đã tham khảo.`;

    userPrompt = `[NGỮ CẢNH TÀI LIỆU]:
${contextText}

[CÂU HỎI]:
${trimmedQuery}`;
  } else if (missingDocSuggestion) {
    // KỊCH BẢN 1: Có trang tài liệu chính thức uy tín (Next.js, React, Docker...)
    systemPrompt = `Bạn là DocStack AI - Trợ lý phân tích tài liệu kỹ thuật thông minh.
Quy tắc ứng xử khi phát hiện tài liệu còn thiếu:
1. Thông báo lịch sự bằng tiếng Việt rằng trong sổ tay hiện tại chưa có tài liệu về **${missingDocSuggestion.topic}** (${missingDocSuggestion.technology}).
2. Thông báo bạn đã tìm thấy trang tài liệu chính thức từ: **${missingDocSuggestion.title}** (${missingDocSuggestion.url}).
3. Mời người dùng bấm vào nút **"Nạp trang này vào Nguồn"** (hiển thị ngay bên dưới) để hệ thống tự động cào, nhúng vector và giải đáp chuẩn xác nhất cho câu hỏi.
4. Trả lời ngắn gọn, nhã nhặn, chuyên nghiệp bằng tiếng Việt. Tuyệt đối không xuất suy nghĩ nội bộ bằng tiếng Anh.`;

    userPrompt = `Người dùng hỏi: "${trimmedQuery}".
Chủ đề nhận diện: ${missingDocSuggestion.topic} (${missingDocSuggestion.technology}).
URL chính thức: ${missingDocSuggestion.url}.
Hãy phản hồi lịch sự hướng dẫn người dùng bấm nút nạp tài liệu.`;
  } else {
    // KỊCH BẢN 2: Không có trang doc lớn (chủ đề ngách, thuật toán chung, câu hỏi tổng quát)
    systemPrompt = `Bạn là DocStack AI - Trợ lý kỹ thuật và tài liệu thông minh.
Quy tắc phản hồi khi câu hỏi không có trong kho tài liệu và không có trang doc lớn định sẵn:
1. Mở đầu câu trả lời bằng một thông báo nhã nhặn: Hiện tại trong kho tài liệu chưa có thông tin về chủ đề này, dưới đây là giải đáp chi tiết dựa trên **kiến thức tổng quát của AI**.
2. Giải thích câu hỏi một cách chi tiết, mạch lạc, chuẩn xác, đầy đủ bằng tiếng Việt (sử dụng định dạng Markdown, gạch đầu dòng, code block nếu liên quan đến lập trình).
3. Tuyệt đối KHÔNG tự ý bịa đặt đường link hoặc URL không có thật.
4. Ở cuối câu trả lời, nhắc nhở nhẹ nhàng: nếu người dùng có tài liệu riêng (PDF, Word, Markdown) hoặc liên kết bài viết cụ thể, có thể tải lên hoặc dán URL ở bảng Nguồn bên trái để AI phân tích chuyên sâu hơn.`;

    userPrompt = `Người dùng hỏi: "${trimmedQuery}". Hãy giải đáp chi tiết theo quy tắc trên.`;
  }

  const primaryModel = isModalConfigured
    ? {
        modelName: MODAL_CHAT_MODEL,
        provider: 'modal' as const,
      }
    : {
        modelName: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
        provider: 'gemini' as const,
      };

  const fallbackModel = {
    modelInstance: google(process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash'),
    modelName: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
    provider: 'gemini' as const,
  };

  try {
    if (isModalConfigured) {
      const modalMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      const text = await generateWithModalGLM(modalMessages);

      return {
        answer: text,
        citations,
        query: trimmedQuery,
        modelName: primaryModel.modelName,
        missingDocSuggestion,
      };
    }

    const { text } = await generateText({
      model: fallbackModel.modelInstance,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    return {
      answer: text,
      citations,
      query: trimmedQuery,
      modelName: fallbackModel.modelName,
      missingDocSuggestion,
    };
  } catch (primaryErr: any) {
    if (isModalConfigured) {
      aiLogger.fallback({
        primaryModel: primaryModel.modelName,
        fallbackModel: fallbackModel.modelName,
        reason: primaryErr.message,
      });

      const { text } = await generateText({
        model: fallbackModel.modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
      });

      return {
        answer: text,
        citations,
        query: trimmedQuery,
        modelName: `${fallbackModel.modelName} (Dự phòng)`,
        missingDocSuggestion,
      };
    }
    throw primaryErr;
  }
}

export interface StreamChatRAGResult {
  streamResult: any;
  citations: ChatCitation[];
  query: string;
  modelName: string;
  provider: 'modal' | 'gemini';
  missingDocSuggestion?: MissingDocSuggestion | null;
}

/**
 * Service xử lý RAG Chat Streaming: Truy xuất ngữ cảnh và stream câu trả lời theo thời gian thực (Vercel AI SDK)
 */
export async function streamChatWithRAG(
  query: string,
  documentIds?: string[] | string
): Promise<StreamChatRAGResult> {
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    throw new Error('Câu hỏi không được để trống');
  }

  // 1. Truy xuất các đoạn ngữ cảnh liên quan nhất từ Atlas Vector Search
  let relevantChunks: RetrievedChunk[] = [];
  try {
    relevantChunks = await retrieveContext(trimmedQuery, 4, documentIds);
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

  // Kiểm tra missing doc suggestion khi không có chunk hoặc điểm vector quá thấp
  let missingDocSuggestion: MissingDocSuggestion | null = null;
  if (relevantChunks.length === 0 || (citations.length > 0 && citations[0].score < 0.65)) {
    // Fallback chain: Sync catalog (0ms) → Async on-demand search (~500ms-1s)
    missingDocSuggestion = detectMissingDocSuggestion(trimmedQuery);
    if (!missingDocSuggestion) {
      missingDocSuggestion = await detectMissingDocWithSearch(trimmedQuery);
    }
  }

  // 2. Xây dựng prompt có cấu trúc dựa trên ngữ cảnh
  let systemPrompt: string;
  let userPrompt: string;

  if (relevantChunks.length > 0 && citations[0]?.score >= 0.65) {
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
1. Bạn trả lời dựa trên thông tin có trong [NGỮ CẢNH TÀI LIỆU] được cung cấp.
2. Trả lời trực tiếp bằng tiếng Việt chuẩn mực, đi thẳng vào trọng tâm. Tuyệt đối KHÔNG xuất bất kỳ suy nghĩ hay phân tích nội bộ nào bằng tiếng Anh (no English internal thoughts).
3. Khi người dùng yêu cầu viết code (/code-mau, sinh code, ví dụ code implementation), hãy thiết kế và viết code implementation hoàn chỉnh, chi tiết bằng Markdown dựa trên các module, cấu trúc và schema được mô tả trong tài liệu.
4. Trình bày câu trả lời rõ ràng, mạch lạc bằng tiếng Việt, sử dụng định dạng Markdown (tiêu đề, in đậm, gạch đầu dòng, code block nếu phù hợp) để người dùng dễ đọc.
5. Ở cuối câu trả lời, hãy trích dẫn ngắn gọn tài liệu đã tham khảo.`;

    userPrompt = `[NGỮ CẢNH TÀI LIỆU]:
${contextText}

[CÂU HỎI]:
${trimmedQuery}`;
  } else if (missingDocSuggestion) {
    // KỊCH BẢN 1: Có trang tài liệu chính thức uy tín (Next.js, React, Docker...)
    systemPrompt = `Bạn là DocStack AI - Trợ lý phân tích tài liệu kỹ thuật thông minh.
Quy tắc ứng xử khi phát hiện tài liệu còn thiếu:
1. Thông báo lịch sự bằng tiếng Việt rằng trong sổ tay hiện tại chưa có tài liệu về **${missingDocSuggestion.topic}** (${missingDocSuggestion.technology}).
2. Thông báo bạn đã tìm thấy trang tài liệu chính thức từ: **${missingDocSuggestion.title}** (${missingDocSuggestion.url}).
3. Mời người dùng bấm vào nút **"Nạp trang này vào Nguồn"** (hiển thị ngay bên dưới) để hệ thống tự động cào, nhúng vector và giải đáp chuẩn xác nhất cho câu hỏi.
4. Trả lời ngắn gọn, nhã nhặn, chuyên nghiệp bằng tiếng Việt. Tuyệt đối không xuất suy nghĩ nội bộ bằng tiếng Anh.`;

    userPrompt = `Người dùng hỏi: "${trimmedQuery}".
Chủ đề nhận diện: ${missingDocSuggestion.topic} (${missingDocSuggestion.technology}).
URL chính thức: ${missingDocSuggestion.url}.
Hãy phản hồi lịch sự hướng dẫn người dùng bấm nút nạp tài liệu.`;
  } else {
    // KỊCH BẢN 2: Không có trang doc lớn (chủ đề ngách, thuật toán chung, câu hỏi tổng quát)
    systemPrompt = `Bạn là DocStack AI - Trợ lý kỹ thuật và tài liệu thông minh.
Quy tắc phản hồi khi câu hỏi không có trong kho tài liệu và không có trang doc lớn định sẵn:
1. Mở đầu câu trả lời bằng một thông báo nhã nhặn: Hiện tại trong kho tài liệu chưa có thông tin về chủ đề này, dưới đây là giải đáp chi tiết dựa trên **kiến thức tổng quát của AI**.
2. Giải thích câu hỏi một cách chi tiết, mạch lạc, chuẩn xác, đầy đủ bằng tiếng Việt (sử dụng định dạng Markdown, gạch đầu dòng, code block nếu liên quan đến lập trình).
3. Tuyệt đối KHÔNG tự ý bịa đặt đường link hoặc URL không có thật.
4. Ở cuối câu trả lời, nhắc nhở nhẹ nhàng: nếu người dùng có tài liệu riêng (PDF, Word, Markdown) hoặc liên kết bài viết cụ thể, có thể tải lên hoặc dán URL ở bảng Nguồn bên trái để AI phân tích chuyên sâu hơn.`;

    userPrompt = `Người dùng hỏi: "${trimmedQuery}". Hãy giải đáp chi tiết theo quy tắc trên.`;
  }

  // 3. Chuẩn bị model chính (Modal GLM-5.3) và model dự phòng (Gemini 3.6 Flash)
  const primaryModel = isModalConfigured
    ? {
        modelName: MODAL_CHAT_MODEL,
        provider: 'modal' as const,
      }
    : {
        modelName: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
        provider: 'gemini' as const,
      };

  const fallbackModel = {
    modelInstance: google(process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash'),
    modelName: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
    provider: 'gemini' as const,
  };

  // 4. Stream generator với cơ chế tự động Fallback sang Gemini 3.6
  async function* fallbackStreamGenerator(): AsyncGenerator<string, void, unknown> {
    let started = false;
    try {
      if (isModalConfigured) {
        const modalMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        for await (const chunk of streamModalGLM(modalMessages)) {
          started = true;
          yield chunk;
        }
        return;
      }

      const primaryStream = streamText({
        model: fallbackModel.modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
      });

      for await (const chunk of primaryStream.textStream) {
        started = true;
        yield chunk;
      }
    } catch (primaryErr: any) {
      if (!started && isModalConfigured) {
        aiLogger.fallback({
          primaryModel: primaryModel.modelName,
          fallbackModel: fallbackModel.modelName,
          reason: primaryErr.message,
        });

        const fallbackStream = streamText({
          model: fallbackModel.modelInstance,
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.3,
        });

        for await (const fallbackChunk of fallbackStream.textStream) {
          yield fallbackChunk;
        }
      } else {
        throw primaryErr;
      }
    }
  }

  return {
    streamResult: { textStream: fallbackStreamGenerator() },
    citations,
    query: trimmedQuery,
    modelName: primaryModel.modelName,
    provider: primaryModel.provider,
    missingDocSuggestion,
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

  // 7. Tạo Stream Generator với cơ chế Fallback sang Gemini và lưu tin nhắn vào DB
  const primaryModel = isModalConfigured
    ? {
        modelName: MODAL_CHAT_MODEL,
        provider: 'modal' as const,
      }
    : {
        modelName: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
        provider: 'gemini' as const,
      };

  const fallbackModel = {
    modelInstance: google(process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash'),
    modelName: process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash',
    provider: 'gemini' as const,
  };

  let fullAnswerText = '';
  async function* conversationStreamGenerator(): AsyncGenerator<string, void, unknown> {
    let started = false;
    try {
      if (isModalConfigured) {
        const modalMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        for await (const chunk of streamModalGLM(modalMessages)) {
          started = true;
          fullAnswerText += chunk;
          yield chunk;
        }
        return;
      }

      const stream = streamText({
        model: fallbackModel.modelInstance,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
      });

      for await (const chunk of stream.textStream) {
        started = true;
        fullAnswerText += chunk;
        yield chunk;
      }
    } catch (primaryErr: any) {
      if (!started && isModalConfigured) {
        aiLogger.fallback({
          primaryModel: primaryModel.modelName,
          fallbackModel: fallbackModel.modelName,
          reason: primaryErr.message,
        });

        const fallbackStream = streamText({
          model: fallbackModel.modelInstance,
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.3,
        });

        for await (const fallbackChunk of fallbackStream.textStream) {
          fullAnswerText += fallbackChunk;
          yield fallbackChunk;
        }
      } else {
        throw primaryErr;
      }
    } finally {
      if (fullAnswerText) {
        try {
          await createMessage({
            conversationId: new ObjectId(conversationId),
            role: 'assistant',
            content: fullAnswerText,
            command: command || null,
            sources,
            createdAt: new Date(),
          });
          await touchConversation(conversationId);
        } catch (saveErr: any) {
          console.error('[ChatService] ❌ Lỗi khi lưu assistant message vào DB:', saveErr.message);
        }
      }
    }
  }

  return {
    streamResult: {
      textStream: conversationStreamGenerator(),
      get text() {
        return (async () => {
          let text = '';
          for await (const chunk of conversationStreamGenerator()) {
            text += chunk;
          }
          return text;
        })();
      },
    },
    sources,
    command,
    query: effectiveQuery,
    modelName: primaryModel.modelName,
  };
}

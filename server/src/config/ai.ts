import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { aiLogger } from '../utils/aiLogger.js';

// ============================================================================
// 1. GOOGLE GEMINI CONFIGURATION
// ============================================================================
const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!googleApiKey || googleApiKey === 'your_gemini_api_key_here') {
  console.warn(
    '[AI SDK] ⚠️  GOOGLE_GENERATIVE_AI_API_KEY chưa được cấu hình hoặc vẫn là placeholder. Hãy cập nhật server/.env để sử dụng Gemini.'
  );
}

// Bảng theo dõi số lần thử (retry attempt) cho từng tác vụ / model
const attemptTracker = new Map<string, { count: number; firstAttemptAt: number }>();

/**
 * Custom Fetch Middleware để bắt toàn bộ các sự kiện AI:
 * - Theo dõi từng HTTP request gọi sang Gemini / Modal (generateContent, chat completions, embeddings)
 * - Bắt các lỗi Rate Limit (HTTP 429), Server Error (HTTP 5xx)
 * - Tự động ghi AI Retry Log với lần thử (Attempt #), nguyên nhân (Quota exceeded), thời gian chờ retry
 * - Ghi nhận khi AI call thành công sau khi retry
 */
export const customAiFetch: typeof fetch = async (input, init) => {
  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;

  const matchModel = urlStr.match(/models\/([^:/?]+)/) || urlStr.match(/model=([^&]+)/);
  const modelName = matchModel ? matchModel[1] : 'ai-model';

  const actionMatch = urlStr.match(/:([^?]+)/) || urlStr.match(/\/v1\/([^/?]+)/);
  const actionName = actionMatch ? actionMatch[1] : 'chatCompletion';

  const trackerKey = `${modelName}:${actionName}`;
  const now = Date.now();
  const existing = attemptTracker.get(trackerKey);

  // Nếu cách lần gọi trước quá 60 giây, reset bộ đếm
  let attempt = 1;
  let firstAttemptAt = now;
  if (existing && now - existing.firstAttemptAt < 60000) {
    attempt = existing.count + 1;
    firstAttemptAt = existing.firstAttemptAt;
  }
  attemptTracker.set(trackerKey, { count: attempt, firstAttemptAt });

  try {
    const response = await fetch(input, init);

    if (response.status === 429) {
      // Rate limit / Quota Exceeded
      let reason = 'Đã vượt quá giới hạn hạn ngạch hoặc tần suất gọi API (HTTP 429 Rate Limit / Quota Exceeded)';
      let retryDelayMs: number | undefined = undefined;

      try {
        const cloned = response.clone();
        const json: any = await cloned.json();
        if (json?.error?.message) {
          reason = json.error.message;
          const retryMatch = reason.match(/retry in ([0-9.]+)s/i);
          if (retryMatch) {
            retryDelayMs = Math.round(parseFloat(retryMatch[1]) * 1000);
          }
        }
      } catch {}

      aiLogger.retry({
        action: actionName,
        model: modelName,
        attempt,
        status: 429,
        reason,
        delayMs: retryDelayMs || 2000,
      });

      return response;
    }

    if (response.status >= 500) {
      // AI Server Error (500, 503...)
      let reason = `AI Server Error (HTTP ${response.status})`;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        if (text) reason += `: ${text.slice(0, 150)}`;
      } catch {}

      aiLogger.retry({
        action: actionName,
        model: modelName,
        attempt,
        status: response.status,
        reason,
        delayMs: 2000,
      });

      return response;
    }

    // Nếu thành công sau khi đã retry ít nhất 1 lần
    if (attempt > 1 && response.ok) {
      aiLogger.retrySuccess({
        action: actionName,
        model: modelName,
        attempt,
        durationMs: now - firstAttemptAt,
      });
      attemptTracker.delete(trackerKey);
    } else if (response.ok) {
      attemptTracker.delete(trackerKey);
    }

    return response;
  } catch (netErr: any) {
    aiLogger.retry({
      action: actionName,
      model: modelName,
      attempt,
      status: 0,
      reason: `Lỗi kết nối mạng: ${netErr.message}`,
      delayMs: 2000,
    });
    throw netErr;
  }
};

export const google = createGoogleGenerativeAI({
  apiKey: googleApiKey || '',
  fetch: customAiFetch,
});

// ============================================================================
// 2. MODAL GLM-5.3 (OPENAI-COMPATIBLE) CONFIGURATION
// ============================================================================
const modalBaseUrl =
  process.env.MODAL_BASE_URL ||
  'https://trantuanhiep28122003--ep-glm-5-3-server.us-west.modal.direct/v1';

const modalApiKey =
  process.env.MODAL_API_KEY ||
  (process.env.MODAL_PROXY_TOKEN_ID && process.env.MODAL_PROXY_TOKEN_SECRET
    ? `${process.env.MODAL_PROXY_TOKEN_ID}.${process.env.MODAL_PROXY_TOKEN_SECRET}`
    : '');

export const isModalConfigured = Boolean(modalApiKey && modalBaseUrl);

export const MODAL_CHAT_MODEL = process.env.MODAL_MODEL_NAME || 'zai-org/GLM-5.3';

/**
 * Client OpenAI chính thức (Official OpenAI SDK) kết nối tới Modal GLM-5.3 endpoint
 * Dùng cho các tác vụ gọi trực tiếp dạng completion hoặc script tùy chỉnh:
 *
 * const completion = await modalOpenAIClient.chat.completions.create({
 *   model: "zai-org/GLM-5.3",
 *   messages: [...],
 *   temperature: 0.3,
 *   max_tokens: 2048,
 *   top_p: 0.9,
 * });
 */
export const modalOpenAIClient = new OpenAI({
  baseURL: modalBaseUrl,
  apiKey: modalApiKey || 'dummy_key',
  fetch: customAiFetch,
});

/**
 * Vercel AI SDK OpenAI Provider cho Modal GLM-5.3
 * Tương thích 100% với streamText(), generateText() của Vercel AI SDK trong DocStack
 */
export const modalOpenAIProvider = createOpenAI({
  baseURL: modalBaseUrl,
  apiKey: modalApiKey || 'dummy_key',
  fetch: customAiFetch,
});

/**
 * Helper thực thi nhanh completion với Modal GLM-5.3 theo đúng chuẩn OpenAI
 * Tự động lọc sạch các thẻ suy nghĩ nội bộ </think> để trả về văn bản tiếng Việt chuẩn mực
 */
export async function generateWithModalGLM(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.ChatCompletionCreateParamsNonStreaming>
): Promise<string> {
  const completion = await modalOpenAIClient.chat.completions.create({
    model: MODAL_CHAT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 2048,
    top_p: 0.9,
    stream: false,
    reasoning_effort: 'none',
    ...options,
  } as OpenAI.ChatCompletionCreateParamsNonStreaming);

  let raw = completion.choices[0]?.message?.content || '';
  if (raw.includes('</think>')) {
    raw = raw.split('</think>')[1];
  }
  return raw.replace(/<\/?think>/gi, '').trim();
}

/**
 * Helper thực thi streaming với Modal GLM-5.3 theo chuẩn OpenAI SDK
 * - Triệt để lọc bỏ toàn bộ khối suy nghĩ nội bộ <think>...</think> (Chain of Thought), không giới hạn độ dài
 * - Không làm trễ các câu trả lời thông thường (không có thẻ think)
 * - Đảm bảo chỉ phát nội dung phản hồi chính thức tới frontend
 */
export async function* streamModalGLM(
  messages: OpenAI.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.ChatCompletionCreateParamsStreaming>
): AsyncGenerator<string, void, unknown> {
  const stream = await modalOpenAIClient.chat.completions.create({
    model: MODAL_CHAT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 2048,
    top_p: 0.9,
    stream: true,
    reasoning_effort: 'none',
    ...options,
  } as OpenAI.ChatCompletionCreateParamsStreaming);

  let isInsideThink = false;
  let thinkHeaderDetermined = false;
  let buffer = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (!delta) continue;

    buffer += delta;

    // 1. Xác định xem luồng có bắt đầu bằng thẻ <think> hay không
    if (!thinkHeaderDetermined) {
      const trimmed = buffer.trimStart();
      if (trimmed.startsWith('<think>')) {
        isInsideThink = true;
        thinkHeaderDetermined = true;
        const thinkIdx = buffer.indexOf('<think>');
        buffer = buffer.slice(thinkIdx + '<think>'.length);
      } else if (trimmed.length > 0 && !'<think>'.startsWith(trimmed)) {
        // Ký tự đầu tiên không phải là prefix của <think> -> chắc chắn không có think block
        isInsideThink = false;
        thinkHeaderDetermined = true;
        yield buffer;
        buffer = '';
        continue;
      } else {
        // Chưa đủ ký tự (vd: buffer mới chỉ là "<" hoặc "<th") -> chờ token kế tiếp
        continue;
      }
    }

    // 2. Nếu đang trong khối <think>, nuốt toàn bộ nội dung cho đến khi gặp </think>
    if (isInsideThink) {
      if (buffer.includes('</think>')) {
        isInsideThink = false;
        const parts = buffer.split('</think>');
        const afterThink = parts.slice(1).join('</think>');
        buffer = '';
        const cleaned = afterThink.replace(/<\/?think>/gi, '').trimStart();
        if (cleaned) {
          yield cleaned;
        }
      }
      // Vẫn đang suy nghĩ, nuốt tiếp, tuyệt đối không yield ra ngoài
    } else {
      // Đã ra khỏi think: lọc bỏ mọi thẻ think bất thường còn sót lại rồi phát ra
      const safeDelta = buffer.replace(/<\/?think>/gi, '');
      buffer = '';
      if (safeDelta) {
        yield safeDelta;
      }
    }
  }

  // Nếu kết thúc stream mà còn buffer sót lại
  if (buffer) {
    if (isInsideThink && buffer.includes('</think>')) {
      const parts = buffer.split('</think>');
      const afterThink = parts.slice(1).join('</think>');
      const cleaned = afterThink.replace(/<\/?think>/gi, '').trimStart();
      if (cleaned) yield cleaned;
    } else if (!isInsideThink) {
      const cleaned = buffer.replace(/<\/?think>/gi, '');
      if (cleaned) yield cleaned;
    }
  }
}

export interface ActiveChatModel {
  provider: 'modal' | 'gemini';
  modelName: string;
  modelInstance: any;
}

/**
 * Bộ chọn Model thông minh:
 * Ưu tiên Modal GLM-5.3 nếu có cấu hình (tránh rate limit 20 req/ngày của Gemini free tier)
 * Cho phép cấu hình qua AI_CHAT_PROVIDER ('modal' | 'gemini')
 */
export function getActiveChatModel(preferredProvider?: 'modal' | 'gemini'): ActiveChatModel {
  const provider =
    preferredProvider ||
    process.env.AI_CHAT_PROVIDER ||
    (isModalConfigured ? 'modal' : 'gemini');

  if (provider === 'modal' && isModalConfigured) {
    return {
      provider: 'modal',
      modelName: MODAL_CHAT_MODEL,
      modelInstance: modalOpenAIProvider.chat(MODAL_CHAT_MODEL),
    };
  }

  const geminiModel = process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash';
  return {
    provider: 'gemini',
    modelName: geminiModel,
    modelInstance: google(geminiModel),
  };
}

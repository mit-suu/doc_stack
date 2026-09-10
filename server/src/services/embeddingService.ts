import { embed, embedMany } from 'ai';
import { google } from '../config/ai.js';
import { aiLogger } from '../utils/aiLogger.js';

// Model mặc định khả dụng trên v1beta của Gemini API
const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const BATCH_SIZE = 50;

/**
 * Hàm hỗ trợ retry với exponential backoff khi gặp rate limit (429) hoặc lỗi tạm thời
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isRateLimit =
        err?.statusCode === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('quota');

      if (attempt > maxRetries || !isRateLimit) {
        // Chuẩn hóa thông báo lỗi dễ hiểu
        if (isRateLimit) {
          throw new Error(
            `Gemini API Rate Limit: Đã vượt quá giới hạn lượt gọi (quota/rate limit). Chi tiết: ${err.message}`
          );
        }
        throw err;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      console.warn(
        `[EmbeddingService] ⚠️ Gặp rate limit, đang thử lại lần ${attempt}/${maxRetries} sau ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Tạo vector embedding cho 1 đoạn text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const t0 = Date.now();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Không thể tạo embedding cho văn bản rỗng');
  }

  try {
    const result = await retryWithBackoff(async () => {
      const { embedding } = await embed({
        model: google.textEmbeddingModel(DEFAULT_EMBEDDING_MODEL),
        value: trimmed,
      });
      return embedding;
    });

    aiLogger.embedding({
      mode: 'single',
      count: 1,
      model: DEFAULT_EMBEDDING_MODEL,
      durationMs: Date.now() - t0,
      sampleText: trimmed,
    });

    return result;
  } catch (err: any) {
    aiLogger.embedding({
      mode: 'single',
      count: 1,
      model: DEFAULT_EMBEDDING_MODEL,
      durationMs: Date.now() - t0,
      sampleText: trimmed,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Tạo vector embeddings cho danh sách các đoạn text theo batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const t0 = Date.now();
  const results: number[][] = [];

  try {
    // Chia nhỏ thành các batch để tối ưu tốc độ và không vượt quá giới hạn payload
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const batchEmbeddings = await retryWithBackoff(async () => {
        const { embeddings } = await embedMany({
          model: google.textEmbeddingModel(DEFAULT_EMBEDDING_MODEL),
          values: batch,
        });
        return embeddings;
      });

      results.push(...batchEmbeddings);

      // Thêm khoảng nghỉ nhỏ giữa các batch lớn để tránh burst rate limit
      if (i + BATCH_SIZE < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    aiLogger.embedding({
      mode: 'batch',
      count: texts.length,
      model: DEFAULT_EMBEDDING_MODEL,
      durationMs: Date.now() - t0,
      sampleText: texts[0],
    });

    return results;
  } catch (err: any) {
    aiLogger.embedding({
      mode: 'batch',
      count: texts.length,
      model: DEFAULT_EMBEDDING_MODEL,
      durationMs: Date.now() - t0,
      sampleText: texts[0],
      error: err.message,
    });
    throw err;
  }
}

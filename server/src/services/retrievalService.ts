import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { generateEmbedding } from './embeddingService.js';
import { CHUNKS_COLLECTION_NAME } from '../repositories/chunkRepository.js';
import { RetrievedChunk } from '../models/chunk.js';
import { aiLogger } from '../utils/aiLogger.js';

export const VECTOR_INDEX_NAME = 'vector_index';
const DEFAULT_TOP_K = 5;
const DEFAULT_NUM_CANDIDATES = 150;

/**
 * Tìm kiếm các đoạn văn bản (chunks) liên quan nhất với câu hỏi sử dụng Atlas Vector Search
 *
 * @param query - Chuỗi câu hỏi / câu truy vấn tìm kiếm
 * @param topK - Số lượng chunk tối đa trả về (mặc định 5)
 * @param documentIds - Tùy chọn lọc theo một hoặc nhiều documentId cụ thể
 * @returns Danh sách các chunk liên quan nhất kèm điểm tương đồng (score)
 */
export async function retrieveContext(
  query: string,
  topK: number = DEFAULT_TOP_K,
  documentIds?: string[] | string
): Promise<RetrievedChunk[]> {
  const t0 = Date.now();
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    throw new Error('query không được để trống');
  }

  const db = getDb();

  // Kiểm tra nếu collection document_chunks chưa có dữ liệu -> trả về mảng rỗng
  const chunkCount = await db.collection(CHUNKS_COLLECTION_NAME).estimatedDocumentCount();
  if (chunkCount === 0) {
    aiLogger.retrieval({
      query: trimmedQuery,
      topK,
      filterDocId: Array.isArray(documentIds) ? documentIds.join(',') : documentIds,
      resultsCount: 0,
      durationMs: Date.now() - t0,
    });
    return [];
  }

  // 1. Tạo vector embedding cho câu query bằng Gemini (tái sử dụng từ Phase 2)
  const queryVector = await generateEmbedding(trimmedQuery);

  // 2. Xây dựng pipeline $vectorSearch
  const numCandidates = Math.max(topK * 20, DEFAULT_NUM_CANDIDATES);

  // Xây dựng bộ lọc filter nếu có truyền documentIds (hỗ trợ cả 1 hoặc nhiều tài liệu)
  let filter: any = undefined;
  if (Array.isArray(documentIds)) {
    if (documentIds.length === 0) {
      // User không có tài liệu nào thuộc phạm vi cho phép -> không trả về chunk nào
      aiLogger.retrieval({
        query: trimmedQuery,
        topK,
        filterDocId: 'empty_user_scope',
        resultsCount: 0,
        durationMs: Date.now() - t0,
      });
      return [];
    }

    const validObjectIds = documentIds
      .filter((id) => id && ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (validObjectIds.length === 0) {
      return [];
    } else if (validObjectIds.length === 1) {
      filter = {
        documentId: { $eq: validObjectIds[0] },
      };
    } else {
      filter = {
        documentId: { $in: validObjectIds },
      };
    }
  } else if (typeof documentIds === 'string' && ObjectId.isValid(documentIds)) {
    filter = {
      documentId: { $eq: new ObjectId(documentIds) },
    };
  }

  const vectorSearchStage: any = {
    $vectorSearch: {
      index: VECTOR_INDEX_NAME,
      path: 'embedding',
      queryVector,
      numCandidates,
      limit: topK,
      ...(filter ? { filter } : {}),
    },
  };

  const projectStage = {
    $project: {
      _id: 0,
      content: 1,
      metadata: 1,
      chunkIndex: 1,
      documentId: 1,
      score: { $meta: 'vectorSearchScore' },
    },
  };

  const pipeline = [vectorSearchStage, projectStage];

  try {
    const rawResults = await db
      .collection(CHUNKS_COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();

    // 3. Format kết quả trả về đúng chuẩn RetrievedChunk
    const results: RetrievedChunk[] = rawResults.map((item: any) => ({
      content: item.content || '',
      metadata: item.metadata || {
        title: '',
        sourceType: 'file',
      },
      score: typeof item.score === 'number' ? Number(item.score.toFixed(4)) : item.score,
      documentId: item.documentId ? item.documentId.toString() : '',
      chunkIndex: typeof item.chunkIndex === 'number' ? item.chunkIndex : 0,
    }));

    aiLogger.retrieval({
      query: trimmedQuery,
      topK,
      filterDocId: Array.isArray(documentIds) ? documentIds.join(',') : documentIds,
      resultsCount: results.length,
      topScore: results[0]?.score,
      sources: results.map((r) => r.metadata.title),
      durationMs: Date.now() - t0,
    });

    return results;
  } catch (err: any) {
    aiLogger.retrieval({
      query: trimmedQuery,
      topK,
      filterDocId: Array.isArray(documentIds) ? documentIds.join(',') : documentIds,
      resultsCount: 0,
      durationMs: Date.now() - t0,
      error: err.message,
    });

    console.error('[RetrievalService] ❌ Lỗi khi thực hiện $vectorSearch:', err.message);

    // Bắt lỗi phổ biến khi index chưa tồn tại hoặc chưa chuyển sang trạng thái Active trên Atlas
    if (
      err?.message?.includes('vectorSearch') ||
      err?.message?.includes('index') ||
      err?.message?.includes('mongot')
    ) {
      throw new Error(
        `Atlas Vector Search Index '${VECTOR_INDEX_NAME}' chưa sẵn sàng hoặc chưa được tạo trên MongoDB Atlas. Vui lòng tạo index theo hướng dẫn tại server/docs/vector-index-setup.md và chờ trạng thái Active. (Chi tiết: ${err.message})`
      );
    }

    throw err;
  }
}

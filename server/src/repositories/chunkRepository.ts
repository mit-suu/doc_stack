import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { DocumentChunk, DocumentChunkSummary } from '../models/chunk.js';

export const CHUNKS_COLLECTION_NAME = 'document_chunks';

/**
 * Thêm nhiều chunk cùng lúc vào collection document_chunks
 */
export async function insertChunks(chunks: DocumentChunk[]): Promise<void> {
  if (!chunks || chunks.length === 0) {
    return;
  }

  const db = getDb();
  await db.collection<DocumentChunk>(CHUNKS_COLLECTION_NAME).insertMany(chunks as any);
}

/**
 * Lấy toàn bộ chunk của 1 document (bao gồm cả vector embedding), sắp xếp theo chunkIndex tăng dần
 */
export async function getChunksByDocumentId(
  documentId: string | ObjectId
): Promise<DocumentChunk[]> {
  const db = getDb();
  const docId = typeof documentId === 'string' ? new ObjectId(documentId) : documentId;

  return await db
    .collection<DocumentChunk>(CHUNKS_COLLECTION_NAME)
    .find({ documentId: docId })
    .sort({ chunkIndex: 1 })
    .toArray();
}

/**
 * Lấy danh sách chunk rút gọn của 1 document (loại bỏ vector dài, chỉ lấy embeddingLength để debug)
 */
export async function getChunkSummariesByDocumentId(
  documentId: string | ObjectId
): Promise<DocumentChunkSummary[]> {
  const chunks = await getChunksByDocumentId(documentId);

  return chunks.map((chunk) => ({
    _id: chunk._id,
    documentId: chunk.documentId,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    metadata: chunk.metadata,
    embeddingLength: Array.isArray(chunk.embedding) ? chunk.embedding.length : 0,
    createdAt: chunk.createdAt,
  }));
}

/**
 * Xóa toàn bộ chunk của 1 document (phục vụ re-process)
 */
export async function deleteChunksByDocumentId(
  documentId: string | ObjectId
): Promise<void> {
  const db = getDb();
  const docId = typeof documentId === 'string' ? new ObjectId(documentId) : documentId;

  await db.collection<DocumentChunk>(CHUNKS_COLLECTION_NAME).deleteMany({ documentId: docId });
}

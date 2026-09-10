import { ObjectId } from 'mongodb';
import { getDocumentById, updateDocument } from '../repositories/documentRepository.js';
import { insertChunks, deleteChunksByDocumentId } from '../repositories/chunkRepository.js';
import { chunkText } from './textChunker.js';
import { generateEmbeddings } from './embeddingService.js';
import { Document } from '../models/document.js';
import { DocumentChunk } from '../models/chunk.js';
import { aiLogger } from '../utils/aiLogger.js';

/**
 * Service điều phối toàn bộ luồng cắt chunk và tạo embedding cho 1 document
 */
export async function processDocument(documentId: string): Promise<Document> {
  const t0 = Date.now();
  if (!documentId || !ObjectId.isValid(documentId)) {
    const err: any = new Error('ID tài liệu không hợp lệ (phải là 24 ký tự hex)');
    err.statusCode = 400;
    throw err;
  }

  // 1. Lấy document từ DB và kiểm tra hợp lệ
  const doc = await getDocumentById(documentId);
  if (!doc) {
    const err: any = new Error('Không tìm thấy tài liệu với ID đã cung cấp');
    err.statusCode = 404;
    throw err;
  }

  if (doc.status === 'processing') {
    const err: any = new Error('Tài liệu đang trong tiến trình xử lý, vui lòng chờ');
    err.statusCode = 400;
    throw err;
  }

  if (!doc.rawText || !doc.rawText.trim()) {
    const err: any = new Error(
      'Tài liệu chưa có nội dung văn bản (rawText rỗng), không thể thực hiện chunking và embedding'
    );
    err.statusCode = 400;
    throw err;
  }

  // 2. Cập nhật status sang "processing"
  await updateDocument(doc._id!, { status: 'processing' });

  try {
    // 3. Cắt văn bản thành các chunks
    const textChunks = await chunkText(doc.rawText);
    if (textChunks.length === 0) {
      throw new Error('Không thể tạo đoạn văn bản nào từ nội dung tài liệu');
    }

    console.log(
      `[DocumentProcessor] 📄 Đang tạo embedding cho ${textChunks.length} chunks của doc "${doc.title}"...`
    );

    // 4. Tạo embeddings cho toàn bộ chunks theo batch
    const embeddings = await generateEmbeddings(textChunks);

    if (embeddings.length !== textChunks.length) {
      throw new Error(
        `Số lượng embeddings (${embeddings.length}) không khớp với số lượng chunks (${textChunks.length})`
      );
    }

    // 5. Chuẩn bị danh sách DocumentChunk
    const now = new Date();
    const chunkEntities: DocumentChunk[] = textChunks.map((content, idx) => ({
      documentId: doc._id!,
      content,
      embedding: embeddings[idx],
      chunkIndex: idx,
      metadata: {
        title: doc.title,
        sourceType: doc.sourceType,
        sourceUrl: doc.sourceUrl,
        originalName: doc.originalName,
      },
      createdAt: now,
    }));

    // 6. Xóa các chunk cũ nếu đây là lần re-process
    await deleteChunksByDocumentId(doc._id!);

    // 7. Lưu chunks mới vào MongoDB
    await insertChunks(chunkEntities);

    // 8. Cập nhật document status sang "embedded"
    const updatedDoc = await updateDocument(doc._id!, {
      status: 'embedded',
      errorMessage: '',
    });

    aiLogger.document({
      title: doc.title,
      docId: doc._id!.toString(),
      chunksCount: chunkEntities.length,
      durationMs: Date.now() - t0,
    });

    return updatedDoc!;
  } catch (processError: any) {
    aiLogger.document({
      title: doc.title,
      docId: doc._id!.toString(),
      chunksCount: 0,
      durationMs: Date.now() - t0,
      error: processError.message,
    });

    console.error(
      `[DocumentProcessor] ❌ Lỗi khi xử lý document ${documentId}:`,
      processError.message
    );

    // Cập nhật trạng thái failed kèm thông báo lỗi
    await updateDocument(doc._id!, {
      status: 'failed',
      errorMessage: processError.message || 'Lỗi trong quá trình tạo chunking & embedding',
    });

    throw processError;
  }
}

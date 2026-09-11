import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { Document, DocumentSummary, DocumentStatus } from '../models/document.js';
import { deleteChunksByDocumentId } from './chunkRepository.js';

const COLLECTION_NAME = 'documents';

/**
 * Thêm một document mới vào collection documents
 */
export async function createDocument(
  data: Omit<Document, '_id' | 'createdAt' | 'updatedAt'>
): Promise<Document> {
  const db = getDb();
  const now = new Date();

  // Lọc bỏ toàn bộ key có giá trị undefined
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  const newDoc: Document = {
    ...(cleanData as any),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<Document>(COLLECTION_NAME).insertOne(newDoc as any);
  return {
    ...newDoc,
    _id: result.insertedId,
  };
}

/**
 * Cập nhật thông tin document theo ID
 */
export async function updateDocument(
  id: string | ObjectId,
  data: Partial<Document>
): Promise<Document | null> {
  const db = getDb();
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;

  // Lọc bỏ toàn bộ key có giá trị undefined trước khi đưa vào $set
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  const updateData = {
    ...cleanData,
    updatedAt: new Date(),
  };

  const result = await db
    .collection<Document>(COLLECTION_NAME)
    .findOneAndUpdate({ _id: objectId }, { $set: updateData }, { returnDocument: 'after' });

  return result || null;
}

/**
 * Cập nhật trạng thái của document
 */
export async function updateDocumentStatus(
  id: string | ObjectId,
  status: DocumentStatus,
  errorMessage?: string
): Promise<Document | null> {
  const updatePayload: Partial<Document> = { status };
  if (errorMessage !== undefined && errorMessage !== null && errorMessage !== '') {
    updatePayload.errorMessage = errorMessage;
  }
  return updateDocument(id, updatePayload);
}

/**
 * Lấy chi tiết một document theo ID (bao gồm cả rawText)
 */
export async function getDocumentById(id: string | ObjectId): Promise<Document | null> {
  const db = getDb();
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;
  return await db.collection<Document>(COLLECTION_NAME).findOne({ _id: objectId });
}

/**
 * Lấy chi tiết một document theo ID và xác minh quyền sở hữu userId
 */
export async function getDocumentByIdAndUser(
  id: string | ObjectId,
  userId: string
): Promise<Document | null> {
  const db = getDb();
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;
  return await db
    .collection<Document>(COLLECTION_NAME)
    .findOne({ _id: objectId, userId });
}

/**
 * Lấy danh sách tất cả document của một user cụ thể (sắp xếp createdAt giảm dần, không gồm rawText)
 */
export async function getDocumentsByUserId(userId: string): Promise<DocumentSummary[]> {
  const db = getDb();
  const docs = await db
    .collection<Document>(COLLECTION_NAME)
    .find({ userId }, { projection: { rawText: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return docs as unknown as DocumentSummary[];
}

/**
 * Lấy danh sách tất cả document (dùng cho service nội bộ nếu cần)
 */
export async function getAllDocuments(): Promise<DocumentSummary[]> {
  const db = getDb();
  const docs = await db
    .collection<Document>(COLLECTION_NAME)
    .find({}, { projection: { rawText: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return docs as unknown as DocumentSummary[];
}

/**
 * Lấy danh sách các ObjectId document thuộc về một user
 */
export async function getDocumentIdsByUser(userId: string): Promise<ObjectId[]> {
  const db = getDb();
  const docs = await db
    .collection<Document>(COLLECTION_NAME)
    .find({ userId }, { projection: { _id: 1 } })
    .toArray();

  return docs.map((d) => d._id as ObjectId);
}

/**
 * Lấy và kiểm tra danh sách document theo mảng ID và userId
 */
export async function getDocumentsByIdsAndUser(
  ids: string[],
  userId: string
): Promise<DocumentSummary[]> {
  const validObjectIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (validObjectIds.length === 0) return [];

  const db = getDb();
  const docs = await db
    .collection<Document>(COLLECTION_NAME)
    .find(
      { _id: { $in: validObjectIds }, userId },
      { projection: { rawText: 0 } }
    )
    .toArray();

  return docs as unknown as DocumentSummary[];
}

/**
 * Tìm document của user theo URL nguồn (tránh trùng lặp khi crawl lại)
 */
export async function findDocumentByUrlAndUser(
  url: string,
  userId: string
): Promise<Document | null> {
  const db = getDb();
  return await db.collection<Document>(COLLECTION_NAME).findOne({
    userId,
    sourceUrl: url,
  });
}

/**
 * Xóa một document và toàn bộ các chunk liên quan trong collection document_chunks.
 * Đồng thời dọn dẹp triệt để các bản ghi trùng lặp cùng URL hoặc cùng Title của user đó.
 */
export async function deleteDocument(
  id: string | ObjectId,
  userId: string
): Promise<boolean> {
  const db = getDb();
  const objectId = typeof id === 'string' ? new ObjectId(id) : id;

  const targetDoc = await db.collection<Document>(COLLECTION_NAME).findOne({ _id: objectId, userId });
  if (!targetDoc) return false;

  const matchCriteria: any[] = [{ _id: objectId }];
  if (targetDoc.sourceUrl) {
    matchCriteria.push({ sourceUrl: targetDoc.sourceUrl });
  }
  if (targetDoc.title) {
    matchCriteria.push({ title: targetDoc.title });
  }

  const matchingDocs = await db.collection<Document>(COLLECTION_NAME).find(
    { userId, $or: matchCriteria },
    { projection: { _id: 1 } }
  ).toArray();

  const docIdsToDelete = matchingDocs.map((d) => d._id as ObjectId);

  // Xóa toàn bộ các chunk trong collection document_chunks
  const chunksCollection = db.collection('document_chunks');
  await chunksCollection.deleteMany({ documentId: { $in: docIdsToDelete } });

  // Xóa toàn bộ documents trùng lặp
  const result = await db.collection<Document>(COLLECTION_NAME).deleteMany({
    _id: { $in: docIdsToDelete },
    userId,
  });

  return result.deletedCount > 0;
}


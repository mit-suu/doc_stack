import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { Document, DocumentSummary, DocumentStatus } from '../models/document.js';

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
 * Lấy danh sách tất cả document, sắp xếp theo createdAt giảm dần (không bao gồm rawText để giảm payload)
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

import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { Conversation } from '../models/conversation.js';

export const CONVERSATIONS_COLLECTION_NAME = 'conversations';

/**
 * Tạo conversation mới, title mặc định "Cuộc trò chuyện mới"
 */
export async function createConversation(
  title: string = 'Cuộc trò chuyện mới',
  userId?: string
): Promise<Conversation> {
  const db = getDb();
  const now = new Date();

  const conversation: Conversation = {
    title,
    ...(userId ? { userId } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db
    .collection<Conversation>(CONVERSATIONS_COLLECTION_NAME)
    .insertOne(conversation as any);

  return {
    ...conversation,
    _id: result.insertedId,
  };
}

/**
 * Lấy chi tiết conversation theo ID
 */
export async function getConversationById(
  id: string | ObjectId
): Promise<Conversation | null> {
  const db = getDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const objId = typeof id === 'string' ? new ObjectId(id) : id;

  return await db
    .collection<Conversation>(CONVERSATIONS_COLLECTION_NAME)
    .findOne({ _id: objId });
}

/**
 * Lấy tất cả conversation, sắp xếp theo updatedAt giảm dần
 */
export async function getAllConversations(
  userId?: string
): Promise<Conversation[]> {
  const db = getDb();
  const query: any = userId ? { userId } : {};

  return await db
    .collection<Conversation>(CONVERSATIONS_COLLECTION_NAME)
    .find(query)
    .sort({ updatedAt: -1 })
    .toArray();
}

/**
 * Cập nhật tiêu đề conversation
 */
export async function updateConversationTitle(
  id: string | ObjectId,
  title: string
): Promise<Conversation | null> {
  const db = getDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const objId = typeof id === 'string' ? new ObjectId(id) : id;
  const now = new Date();

  const result = await db
    .collection<Conversation>(CONVERSATIONS_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: objId },
      { $set: { title, updatedAt: now } },
      { returnDocument: 'after' }
    );

  return result || null;
}

/**
 * Cập nhật updatedAt mỗi khi có message mới
 */
export async function touchConversation(
  id: string | ObjectId
): Promise<void> {
  const db = getDb();
  if (!ObjectId.isValid(id)) {
    return;
  }
  const objId = typeof id === 'string' ? new ObjectId(id) : id;
  const now = new Date();

  await db
    .collection<Conversation>(CONVERSATIONS_COLLECTION_NAME)
    .updateOne({ _id: objId }, { $set: { updatedAt: now } });
}

/**
 * Xóa conversation theo ID
 */
export async function deleteConversation(
  id: string | ObjectId
): Promise<boolean> {
  const db = getDb();
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const objId = typeof id === 'string' ? new ObjectId(id) : id;

  const result = await db
    .collection<Conversation>(CONVERSATIONS_COLLECTION_NAME)
    .deleteOne({ _id: objId });

  return result.deletedCount > 0;
}

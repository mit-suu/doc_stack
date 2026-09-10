import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { Message } from '../models/conversation.js';

export const MESSAGES_COLLECTION_NAME = 'messages';

/**
 * Lưu một tin nhắn mới vào collection messages
 */
export async function createMessage(
  data: Omit<Message, '_id'>
): Promise<Message> {
  const db = getDb();
  const convId =
    typeof data.conversationId === 'string'
      ? new ObjectId(data.conversationId)
      : data.conversationId;

  const messageDoc: Message = {
    ...data,
    conversationId: convId,
    createdAt: data.createdAt || new Date(),
  };

  const result = await db
    .collection<Message>(MESSAGES_COLLECTION_NAME)
    .insertOne(messageDoc as any);

  return {
    ...messageDoc,
    _id: result.insertedId,
  };
}

/**
 * Lấy toàn bộ messages của 1 conversation, sắp xếp theo thời gian tạo tăng dần (cũ đến mới)
 */
export async function getMessagesByConversationId(
  conversationId: string | ObjectId
): Promise<Message[]> {
  const db = getDb();
  if (!ObjectId.isValid(conversationId)) {
    return [];
  }
  const convId =
    typeof conversationId === 'string'
      ? new ObjectId(conversationId)
      : conversationId;

  return await db
    .collection<Message>(MESSAGES_COLLECTION_NAME)
    .find({ conversationId: convId })
    .sort({ createdAt: 1 })
    .toArray();
}

/**
 * Đếm số lượng message hiện có trong một conversation
 */
export async function countMessagesByConversationId(
  conversationId: string | ObjectId
): Promise<number> {
  const db = getDb();
  if (!ObjectId.isValid(conversationId)) {
    return 0;
  }
  const convId =
    typeof conversationId === 'string'
      ? new ObjectId(conversationId)
      : conversationId;

  return await db
    .collection<Message>(MESSAGES_COLLECTION_NAME)
    .countDocuments({ conversationId: convId });
}

/**
 * Xóa toàn bộ messages liên quan tới 1 conversation
 */
export async function deleteMessagesByConversationId(
  conversationId: string | ObjectId
): Promise<number> {
  const db = getDb();
  if (!ObjectId.isValid(conversationId)) {
    return 0;
  }
  const convId =
    typeof conversationId === 'string'
      ? new ObjectId(conversationId)
      : conversationId;

  const result = await db
    .collection<Message>(MESSAGES_COLLECTION_NAME)
    .deleteMany({ conversationId: convId });

  return result.deletedCount;
}

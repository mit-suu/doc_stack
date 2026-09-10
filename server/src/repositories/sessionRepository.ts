import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';
import { ChatSession, SessionMessage, SessionSummary } from '../models/session.js';

const COLLECTION_NAME = 'chat_sessions';

/**
 * Tạo phiên chat mới cho người dùng
 */
export async function createSession(
  userId: string,
  title: string = 'Phiên trò chuyện mới'
): Promise<ChatSession> {
  const db = getDb();
  const now = new Date();

  const session: ChatSession = {
    userId,
    title,
    lastMessage: '',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<ChatSession>(COLLECTION_NAME).insertOne(session as any);

  return {
    ...session,
    _id: result.insertedId,
  };
}

/**
 * Lấy danh sách các phiên chat của riêng người dùng (sắp xếp mới nhất lên đầu)
 */
export async function getUserSessions(userId: string): Promise<SessionSummary[]> {
  const db = getDb();

  const sessions = await db
    .collection<ChatSession>(COLLECTION_NAME)
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();

  return sessions.map((s) => ({
    id: s._id?.toString() || '',
    title: s.title || 'Phiên trò chuyện',
    lastMessage: s.lastMessage || (s.messages?.length > 0 ? s.messages[s.messages.length - 1].content : ''),
    messageCount: s.messages?.length || 0,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

/**
 * Lấy chi tiết phiên chat kèm lịch sử tin nhắn (Bảo mật: chỉ cho phép chủ sở hữu userId truy cập)
 */
export async function getSessionById(
  sessionId: string,
  userId: string
): Promise<ChatSession | null> {
  if (!ObjectId.isValid(sessionId)) return null;

  const db = getDb();
  return await db.collection<ChatSession>(COLLECTION_NAME).findOne({
    _id: new ObjectId(sessionId),
    userId, // Phân quyền: bắt buộc khớp userId
  });
}

/**
 * Thêm tin nhắn vào phiên chat và cập nhật tiêu đề/thời gian
 */
export async function appendMessagesToSession(
  sessionId: string,
  userId: string,
  messages: SessionMessage[],
  newTitle?: string
): Promise<void> {
  if (!ObjectId.isValid(sessionId) || messages.length === 0) return;

  const db = getDb();
  const now = new Date();
  const lastMsg = messages[messages.length - 1].content;

  const updateFields: any = {
    updatedAt: now,
    lastMessage: lastMsg.length > 80 ? lastMsg.slice(0, 80) + '...' : lastMsg,
  };

  if (newTitle) {
    updateFields.title = newTitle;
  }

  await db.collection<ChatSession>(COLLECTION_NAME).updateOne(
    {
      _id: new ObjectId(sessionId),
      userId, // Phân quyền: chỉ update nếu đúng chủ sở hữu
    },
    {
      $push: {
        messages: { $each: messages },
      } as any,
      $set: updateFields,
    }
  );
}

/**
 * Xóa phiên chat của người dùng
 */
export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  if (!ObjectId.isValid(sessionId)) return false;

  const db = getDb();
  const result = await db.collection<ChatSession>(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(sessionId),
    userId, // Phân quyền: chỉ xóa nếu đúng chủ sở hữu
  });

  return result.deletedCount > 0;
}

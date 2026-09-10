import { ObjectId } from 'mongodb';

export interface Conversation {
  _id?: ObjectId;
  userId?: string;              // Hỗ trợ phân quyền người dùng (tùy chọn)
  title: string;                // Tự động lấy từ tin nhắn đầu tiên, hoặc "Cuộc trò chuyện mới"
  createdAt: Date;
  updatedAt: Date;
}

export type SlashCommandType = 'explain' | 'simple' | 'deep' | 'example' | 'compare' | 'quiz';

export interface MessageSource {
  documentId: string;
  title: string;
  content: string;             // snippet đã dùng
  score: number;
}

export interface Message {
  _id?: ObjectId;
  conversationId: ObjectId;
  role: 'user' | 'assistant';
  content: string;
  command?: SlashCommandType | null;
  sources?: MessageSource[];
  createdAt: Date;
}

import { ObjectId } from 'mongodb';
import { ChatCitation } from '../services/chatService.js';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  createdAt: Date;
}

export interface ChatSession {
  _id?: ObjectId;
  userId: string; // ID người dùng sở hữu phiên này
  title: string;
  lastMessage?: string;
  messages: SessionMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionSummary {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

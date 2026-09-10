import { SlashCommandType } from '../models/conversation.js';

export interface ParsedCommand {
  command: SlashCommandType | null;
  query: string;
}

const VALID_COMMANDS: SlashCommandType[] = [
  'explain',
  'simple',
  'deep',
  'example',
  'compare',
  'quiz',
];

/**
 * Phân tích slash command từ chuỗi input của người dùng
 * - Regex kiểm tra input có bắt đầu bằng /explain, /simple, /deep, /example, /compare, /quiz không
 * - Nếu có: tách command và query
 * - Nếu không có command hợp lệ hoặc lệnh không tồn tại (vd: /xyz): trả về command: null, query = toàn bộ input gốc
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = (input || '').trim();

  if (!trimmed.startsWith('/')) {
    return { command: null, query: trimmed };
  }

  // Khớp slash command ở đầu chuỗi (ví dụ: /explain Tóm tắt nội dung)
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)(?:\s+([\s\S]*))?$/);
  if (!match) {
    return { command: null, query: trimmed };
  }

  const cmdRaw = match[1].toLowerCase();
  const restQuery = (match[2] || '').trim();

  if (VALID_COMMANDS.includes(cmdRaw as SlashCommandType)) {
    return {
      command: cmdRaw as SlashCommandType,
      query: restQuery,
    };
  }

  // Trường hợp user gõ lệnh không hỗ trợ (vd: /xyz) -> giữ nguyên toàn bộ input làm query
  return {
    command: null,
    query: trimmed,
  };
}

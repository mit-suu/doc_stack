import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Cắt văn bản thô thành các đoạn nhỏ (chunks) sử dụng RecursiveCharacterTextSplitter
 */
export async function chunkText(
  text: string,
  options?: ChunkOptions
): Promise<string[]> {
  const trimmed = (text || '').trim();

  // Edge case: Văn bản rỗng
  if (!trimmed) {
    return [];
  }

  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  // Edge case: Văn bản ngắn hơn hoặc bằng kích thước 1 chunk -> không cần cắt
  if (trimmed.length <= chunkSize) {
    return [trimmed];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.splitText(trimmed);

  // Lọc bỏ các chunk rỗng nếu có
  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

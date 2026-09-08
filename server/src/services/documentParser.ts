import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { FileType } from '../models/document.js';

/**
 * Trích xuất text từ file PDF
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text || '').trim();
  } finally {
    await parser.destroy();
  }
}

/**
 * Trích xuất text từ file Word (.docx)
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || '').trim();
}

/**
 * Đọc trực tiếp text từ file Markdown (.md) hoặc Text (.txt) với UTF-8
 */
export function parseTextFile(buffer: Buffer): string {
  return buffer.toString('utf-8').trim();
}

/**
 * Hàm điều phối trích xuất text theo loại file
 */
export async function parseByFileType(buffer: Buffer, fileType: string): Promise<string> {
  const normalizedType = fileType.toLowerCase().replace('.', '') as FileType;

  switch (normalizedType) {
    case 'pdf':
      return await parsePdf(buffer);
    case 'docx':
      return await parseDocx(buffer);
    case 'md':
    case 'txt':
      return parseTextFile(buffer);
    default:
      throw new Error(
        `Định dạng file không được hỗ trợ: ${fileType}. Chỉ hỗ trợ các định dạng: pdf, docx, md, txt.`
      );
  }
}

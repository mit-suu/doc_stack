import { ObjectId } from 'mongodb';

export type SourceType = 'file' | 'url';
export type FileType = 'pdf' | 'docx' | 'md' | 'txt';
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'embedded' | 'failed';

export interface Document {
  _id?: ObjectId;
  title: string;
  sourceType: SourceType;
  originalName?: string;      // tên file gốc, nếu sourceType = "file"
  fileType?: FileType;        // loại file: pdf, docx, md, txt
  sourceUrl?: string;         // URL gốc, nếu sourceType = "url"
  rawText: string;            // text thô đã extract
  status: DocumentStatus;     // trạng thái xử lý
  errorMessage?: string;      // thông báo lỗi nếu status = "failed"
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentSummary = Omit<Document, 'rawText'>;

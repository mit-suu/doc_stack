export type DocumentType = 'pdf' | 'docx' | 'code' | 'markdown';
export type DocumentStatus = 'ready' | 'syncing' | 'failed';

export interface IndexedDocument {
  id: string;
  name: string;
  type: DocumentType;
  pages?: string;
  vectorCount?: number;
  status: DocumentStatus;
  progressPercent?: number;
  size?: string;
}

export interface DocumentStats {
  totalCount: number;
  totalSize: string;
}

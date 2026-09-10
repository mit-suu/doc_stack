import { ObjectId } from 'mongodb';
import { SourceType } from './document.js';

export interface ChunkMetadata {
  title: string;
  sourceType: SourceType;
  sourceUrl?: string;
  originalName?: string;
}

export interface DocumentChunk {
  _id?: ObjectId;
  documentId: ObjectId;       // ref tới collection documents
  content: string;            // text của chunk
  embedding: number[];        // vector embedding
  chunkIndex: number;         // thứ tự chunk trong document
  metadata: ChunkMetadata;
  createdAt: Date;
}

export type DocumentChunkSummary = Omit<DocumentChunk, 'embedding'> & {
  embeddingLength: number;
};

export interface RetrievedChunk {
  content: string;
  metadata: ChunkMetadata;
  score: number;
  documentId: string;
  chunkIndex: number;
}


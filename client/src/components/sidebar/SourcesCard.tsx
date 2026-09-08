'use client';

import React from 'react';
import { Icon } from '../ui/Icon';
import { IndexedDocument, DocumentStats } from '../../types/document';
import { DocumentDropzone } from './DocumentDropzone';

interface SourcesCardProps {
  documents: IndexedDocument[];
  stats: DocumentStats;
  onSelectDocument?: (doc: IndexedDocument) => void;
  onFileSelect?: (files: FileList | null) => void;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
  documents,
  stats,
  onSelectDocument,
  onFileSelect,
}) => {
  const getDocumentIcon = (type: IndexedDocument['type']) => {
    switch (type) {
      case 'pdf':
        return { name: 'picture_as_pdf', color: 'text-primary' };
      case 'docx':
        return { name: 'description', color: 'text-secondary' };
      case 'code':
      default:
        return { name: 'code', color: 'text-tertiary' };
    }
  };

  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)] hover:border-black/[0.16] dark:hover:border-white/[0.14] transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-2">
          <Icon name="layers" className="text-secondary text-[20px]" />
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Tài liệu chỉ mục
          </span>
        </div>
        <span className="font-label-mono text-label-mono px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-outline">
          {stats.totalCount} tệp • {stats.totalSize}
        </span>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
        DocStack đang phân tích ngữ cảnh trực tiếp từ các tài liệu sau:
      </p>

      {/* Document List Pills */}
      <div className="space-y-2 mb-space-md">
        {documents.map((doc) => {
          const icon = getDocumentIcon(doc.type);
          const isSyncing = doc.status === 'syncing';

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDocument?.(doc)}
              className="group flex items-center justify-between p-2.5 rounded-xl bg-surface-container/70 hover:bg-surface-container-high border border-black/[0.05] dark:border-white/[0.05] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSyncing
                      ? 'bg-secondary shadow-[0_0_6px_rgba(123,208,255,0.8)] animate-pulse'
                      : 'bg-tertiary shadow-[0_0_6px_rgba(78,222,163,0.8)]'
                  }`}
                />
                <Icon name={icon.name} className={`text-[18px] ${icon.color}`} />
                <div className="truncate">
                  <p className="font-label-md text-label-md text-on-surface truncate">
                    {doc.name}
                  </p>
                  <p className="font-label-mono text-label-mono text-outline">
                    {isSyncing
                      ? `Đang đồng bộ ${doc.progressPercent ?? 0}%`
                      : `${doc.pages || 'Toàn bộ'} • ${doc.vectorCount ?? 0} vectors`}
                  </p>
                </div>
              </div>

              <Icon
                name={isSyncing ? 'sync' : 'visibility'}
                className={`text-outline group-hover:text-on-surface text-[16px] ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Minimalist Dropzone */}
      <DocumentDropzone onFileSelect={onFileSelect} />
    </div>
  );
};

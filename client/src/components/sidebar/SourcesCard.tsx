'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { IndexedDocument, DocumentStats } from '../../types/document';
import { DocumentDropzone } from './DocumentDropzone';

interface SourcesCardProps {
  documents: IndexedDocument[];
  stats: DocumentStats;
  selectedDocId?: string | null;
  onSelectDocument?: (doc: IndexedDocument) => void;
  onPreviewDocument?: (doc: IndexedDocument) => void;
  onFileSelect?: (files: FileList | null) => void;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
  documents,
  stats,
  selectedDocId = null,
  onSelectDocument,
  onPreviewDocument,
  onFileSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getDocumentIcon = (type: IndexedDocument['type']) => {
    switch (type) {
      case 'pdf':
        return { name: 'picture_as_pdf', color: 'text-red-400' };
      case 'docx':
        return { name: 'description', color: 'text-blue-400' };
      case 'markdown':
        return { name: 'article', color: 'text-emerald-400' };
      case 'code':
      default:
        return { name: 'code', color: 'text-violet-400' };
    }
  };

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all overflow-hidden">
      {/* Compact Header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon name="menu_book" className="text-secondary text-[16px]" />
          <span className="text-[13px] font-semibold text-on-surface tracking-tight">
            Nguồn tài liệu
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-outline tabular-nums">
            {stats.totalCount}
          </span>
          <Icon
            name={isExpanded ? 'expand_less' : 'expand_more'}
            className="text-[16px] text-outline"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-1.5 pb-2">
          {/* Notebook Document List */}
          <div className="max-h-[320px] overflow-y-auto px-1 space-y-px">
            {documents.map((doc) => {
              const icon = getDocumentIcon(doc.type);
              const isSyncing = doc.status === 'syncing';
              const isSelected = selectedDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument?.(doc)}
                  className={`group flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 dark:bg-primary/15'
                      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Selection indicator — notebook-style checkbox */}
                  <div
                    className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-black/20 dark:border-white/20 group-hover:border-primary/50'
                    }`}
                  >
                    {isSelected && (
                      <Icon name="check" className="text-[10px] text-white" />
                    )}
                  </div>

                  {/* Type icon */}
                  <Icon name={icon.name} className={`text-[14px] shrink-0 ${icon.color}`} />

                  {/* Document name — compact single line */}
                  <div className="truncate min-w-0 flex-1">
                    <p className={`text-[12px] leading-[16px] font-medium truncate ${
                      isSelected ? 'text-primary' : 'text-on-surface'
                    }`}>
                      {doc.name}
                    </p>
                  </div>

                  {/* Status dot */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isSyncing
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />

                  {/* Preview eye — visible on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewDocument?.(doc);
                    }}
                    className="p-0.5 rounded text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all cursor-pointer"
                    title="Xem trước"
                  >
                    <Icon
                      name={isSyncing ? 'sync' : 'visibility'}
                      className={`text-[13px] ${isSyncing ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Compact Dropzone */}
          <div className="px-1.5 pt-1.5">
            <DocumentDropzone onFileSelect={onFileSelect} />
          </div>
        </div>
      )}
    </div>
  );
};

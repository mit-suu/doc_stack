'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { IndexedDocument, DocumentStats } from '../../types/document';
import { DocumentDropzone } from './DocumentDropzone';

interface SourcesCardProps {
  documents: IndexedDocument[];
  stats: DocumentStats;
  selectedDocIds: string[];
  onToggleDocument?: (docId: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  onPreviewDocument?: (doc: IndexedDocument) => void;
  onDeleteDocument?: (doc: IndexedDocument) => void;
  onFileSelect?: (files: FileList | null) => void;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
  documents,
  stats,
  selectedDocIds = [],
  onToggleDocument,
  onSelectAll,
  onClearAll,
  onPreviewDocument,
  onDeleteDocument,
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

  const isAllSelected = documents.length > 0 && selectedDocIds.length === documents.length;
  const hasSelection = selectedDocIds.length > 0;

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all overflow-hidden">
      {/* Compact Header */}
      <div className="w-full flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04]">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
        >
          <Icon name="menu_book" className="text-secondary text-[16px]" />
          <span className="text-[13px] font-semibold text-on-surface tracking-tight">
            Nguồn tài liệu
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-outline tabular-nums">
            {stats.totalCount}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Multi-select Quick Toggle */}
          {documents.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isAllSelected) {
                  onClearAll?.();
                } else {
                  onSelectAll?.();
                }
              }}
              className="px-2 py-0.5 text-[11px] font-label-md rounded-md bg-black/[0.03] dark:bg-white/[0.06] hover:bg-primary/10 hover:text-primary text-outline transition-colors cursor-pointer"
              title={isAllSelected ? 'Bỏ chọn toàn bộ' : 'Chọn tất cả tài liệu'}
            >
              {isAllSelected ? 'Bỏ chọn' : hasSelection ? `${selectedDocIds.length} chọn` : 'Chọn hết'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <Icon
              name={isExpanded ? 'expand_less' : 'expand_more'}
              className="text-[16px]"
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-1.5 pb-2 pt-1">
          {/* Notebook Document List */}
          {documents.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-outline">
              Chưa có tài liệu nào. Kéo thả file vào bên dưới hoặc tải bộ tài liệu mẫu.
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto px-1 space-y-px">
              {documents.map((doc) => {
                const icon = getDocumentIcon(doc.type);
                const isSyncing = doc.status === 'syncing';
                const isSelected = selectedDocIds.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    onClick={() => onToggleDocument?.(doc.id)}
                    className={`group flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 dark:bg-primary/15'
                        : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Multi-select Checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDocument?.(doc.id);
                      }}
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
                      <p
                        className={`text-[12px] leading-[16px] font-medium truncate ${
                          isSelected ? 'text-primary font-semibold' : 'text-on-surface'
                        }`}
                        title={doc.name}
                      >
                        {doc.name}
                      </p>
                    </div>

                    {/* Status dot */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSyncing
                          ? 'bg-amber-400 animate-pulse'
                          : doc.status === 'failed'
                          ? 'bg-red-400'
                          : 'bg-emerald-400'
                      }`}
                      title={isSyncing ? 'Đang nhúng vector...' : doc.status === 'failed' ? 'Lỗi' : 'Sẵn sàng'}
                    />

                    {/* Action buttons on hover: Preview & Delete */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Preview eye */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewDocument?.(doc);
                        }}
                        className="p-1 rounded text-outline hover:text-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                        title="Xem trước tài liệu"
                      >
                        <Icon
                          name={isSyncing ? 'sync' : 'visibility'}
                          className={`text-[13px] ${isSyncing ? 'animate-spin' : ''}`}
                        />
                      </button>

                      {/* Delete trash */}
                      {onDeleteDocument && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDocument?.(doc);
                          }}
                          className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                          title="Xóa tài liệu này"
                        >
                          <Icon name="delete" className="text-[13px]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact Dropzone */}
          <div className="px-1.5 pt-1.5">
            <DocumentDropzone onFileSelect={onFileSelect} />
          </div>
        </div>
      )}
    </div>
  );
};

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
  onCrawlUrl?: (url: string) => Promise<void>;
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
  onCrawlUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [addMode, setAddMode] = useState<'file' | 'url'>('file');
  const [inputUrl, setInputUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  const getDocumentIcon = (type: IndexedDocument['type']) => {
    switch (type) {
      case 'url':
        return { name: 'language', color: 'text-cyan-400' };
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

  const handleCrawlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setCrawlError('URL phải bắt đầu bằng http:// hoặc https://');
        return;
      }
    } catch {
      setCrawlError('URL không đúng định dạng hợp lệ');
      return;
    }

    setIsCrawling(true);
    setCrawlError(null);
    try {
      if (onCrawlUrl) {
        await onCrawlUrl(trimmed);
      }
      setInputUrl('');
    } catch (err: any) {
      setCrawlError(err.message || 'Lỗi khi cào dữ liệu từ URL');
    } finally {
      setIsCrawling(false);
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
            Nguồn (Sources)
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-outline tabular-nums">
            {stats.totalCount}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Multi-select Quick Toggle */}
          {documents.length > 0 && (
            <div className="flex items-center gap-1">
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
                {isAllSelected ? 'Bỏ chọn' : 'Chọn hết'}
              </button>
              {!isAllSelected && hasSelection && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearAll?.();
                  }}
                  className="px-1.5 py-0.5 text-[11px] font-label-md rounded-md bg-black/[0.03] dark:bg-white/[0.06] hover:bg-red-500/10 hover:text-red-400 text-outline transition-colors cursor-pointer"
                  title="Bỏ chọn toàn bộ tài liệu"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
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
            <div className="max-h-[220px] overflow-y-auto px-1 space-y-px scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 pr-0.5">
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

                    {/* Action buttons on hover: Preview, Open URL & Delete */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Open original URL if web link */}
                      {doc.sourceUrl && (
                        <a
                          href={doc.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-outline hover:text-cyan-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                          title="Mở liên kết web gốc trong tab mới"
                        >
                          <Icon name="open_in_new" className="text-[13px]" />
                        </a>
                      )}

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

          {/* Bottom Add Section: File Upload or Web URL Crawler */}
          <div className="px-1.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04] mt-1">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 mb-1.5 p-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => {
                  setAddMode('file');
                  setCrawlError(null);
                }}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  addMode === 'file'
                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm font-semibold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <Icon name="upload_file" className="text-[13px]" />
                <span>Tệp tin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('url');
                  setCrawlError(null);
                }}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  addMode === 'url'
                    ? 'bg-white dark:bg-white/10 text-cyan-400 shadow-sm font-semibold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <Icon name="language" className="text-[13px]" />
                <span>Dán URL Web</span>
              </button>
            </div>

            {/* Mode 1: File Dropzone */}
            {addMode === 'file' && (
              <DocumentDropzone onFileSelect={onFileSelect} />
            )}

            {/* Mode 2: Web URL Crawler Form */}
            {addMode === 'url' && (
              <form onSubmit={handleCrawlSubmit} className="space-y-1.5">
                <div className="relative flex items-center">
                  <Icon name="link" className="absolute left-2.5 text-cyan-400/80 text-[14px] pointer-events-none" />
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      setCrawlError(null);
                    }}
                    placeholder="https://example.com/docs..."
                    disabled={isCrawling}
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                  />
                </div>

                {crawlError && (
                  <p className="text-[10px] text-red-400 px-1 leading-tight flex items-center gap-1">
                    <Icon name="error" className="text-[12px] shrink-0" />
                    <span>{crawlError}</span>
                  </p>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={isCrawling || !inputUrl.trim()}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    {isCrawling ? (
                      <>
                        <Icon name="sync" className="text-[13px] animate-spin" />
                        <span>Đang cào & nhúng vector...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="cloud_download" className="text-[13px]" />
                        <span>Crawl & Nhúng vào RAG</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

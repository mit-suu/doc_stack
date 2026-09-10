'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import {
  fetchDocumentDetail,
  fetchDocumentChunks,
  BackendDocumentDetail,
  BackendDocumentChunk,
} from '../../services/api';
import { IndexedDocument } from '../../types/document';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  documentId: string | null;
  onClose: () => void;
  onSelectAsContext?: (doc: IndexedDocument) => void;
  isSelectedContext?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  documentId,
  onClose,
  onSelectAsContext,
  isSelectedContext = false,
}) => {
  const [doc, setDoc] = useState<BackendDocumentDetail | null>(null);
  const [chunks, setChunks] = useState<BackendDocumentChunk[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'chunks' | 'metadata'>('content');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      setIsLoading(true);
      setError(null);
      setSearchQuery('');
      setActiveTab('content');

      Promise.all([
        fetchDocumentDetail(documentId),
        fetchDocumentChunks(documentId).catch(() => []),
      ])
        .then(([docDetail, chunksList]) => {
          setDoc(docDetail);
          setChunks(chunksList);
        })
        .catch((err) => {
          setError(err.message || 'Không thể tải thông tin xem trước tài liệu');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setDoc(null);
      setChunks([]);
    }
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!doc?.rawText) return;
    navigator.clipboard?.writeText(doc.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyChunk = (chunkContent: string) => {
    navigator.clipboard?.writeText(chunkContent);
  };

  const getDocTypeIcon = (fileType?: string, sourceType?: string) => {
    if (sourceType === 'url') return { name: 'language', color: 'text-secondary' };
    switch (fileType) {
      case 'pdf':
        return { name: 'picture_as_pdf', color: 'text-primary' };
      case 'docx':
        return { name: 'description', color: 'text-secondary' };
      case 'md':
        return { name: 'markdown', color: 'text-tertiary' };
      default:
        return { name: 'article', color: 'text-outline' };
    }
  };

  const iconInfo = getDocTypeIcon(doc?.fileType, doc?.sourceType);

  // Tính toán thống kê văn bản
  const rawText = doc?.rawText || '';
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;
  const lineCount = rawText ? rawText.split('\n').length : 0;

  // Lọc nội dung theo từ khóa tìm kiếm
  const filteredChunks = searchQuery.trim()
    ? chunks.filter((c) =>
        c.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : chunks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      {/* Nền mờ đóng modal khi click ra ngoài */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Khung xem trước chính */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-surface/95 dark:bg-surface-container/95 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.12] shadow-[0_24px_72px_rgba(0,0,0,0.45)] z-10 overflow-hidden">
        {/* Vùng phát sáng thẩm mỹ (Ambient Glow) */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between p-space-lg pb-space-sm border-b border-black/[0.06] dark:border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-primary-container/20 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(79,70,229,0.2)]">
              <Icon name={iconInfo.name} className={`${iconInfo.color} text-[22px]`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                  {doc?.title || doc?.originalName || 'Xem trước tài liệu'}
                </h3>
                {doc?.status && (
                  <span
                    className={`font-label-mono text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      doc.status === 'embedded' || doc.status === 'ready'
                        ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                        : doc.status === 'failed'
                        ? 'bg-error/15 text-error border border-error/30'
                        : 'bg-secondary/15 text-secondary border border-secondary/30 animate-pulse'
                    }`}
                  >
                    {doc.status === 'embedded' ? 'Đã Vectorize' : doc.status}
                  </span>
                )}
              </div>
              <p className="font-label-mono text-label-mono text-outline flex items-center gap-2 mt-0.5 truncate">
                <span>{doc?.sourceType === 'url' ? 'Nguồn Web URL' : (doc?.fileType?.toUpperCase() || 'FILE')}</span>
                <span>•</span>
                <span>{charCount.toLocaleString()} ký tự</span>
                <span>•</span>
                <span>{chunks.length} chunks</span>
                {doc?.sourceUrl && (
                  <>
                    <span>•</span>
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline flex items-center gap-0.5"
                    >
                      {doc.sourceUrl}
                      <Icon name="open_in_new" className="text-[12px]" />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={copied ? 'Đã sao chép' : 'Sao chép toàn bộ văn bản'}
            >
              <Icon name={copied ? 'check' : 'content_copy'} className="text-[18px]" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Đóng cửa sổ xem trước"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* --- TABS & SEARCH CONTROLS --- */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-space-lg py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.06] relative z-10">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-surface shadow-xs text-on-surface font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <Icon name="subject" className="text-[16px]" />
              <span>Nội dung văn bản</span>
            </button>

            <button
              onClick={() => setActiveTab('chunks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all cursor-pointer ${
                activeTab === 'chunks'
                  ? 'bg-surface shadow-xs text-on-surface font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <Icon name="segment" className="text-[16px]" />
              <span>Phân mảnh Vector ({chunks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('metadata')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all cursor-pointer ${
                activeTab === 'metadata'
                  ? 'bg-surface shadow-xs text-on-surface font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <Icon name="info" className="text-[16px]" />
              <span>Thông tin kỹ thuật</span>
            </button>
          </div>

          {/* Quick Filter / Search input */}
          <div className="relative flex items-center min-w-[220px]">
            <Icon
              name="search"
              className="absolute left-3 text-outline text-[16px] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm từ khóa..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-outline hover:text-on-surface"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            )}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-space-lg relative z-10 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-outline animate-pulse">
              <Icon name="sync" className="text-[32px] animate-spin text-primary" />
              <p className="font-body-md text-body-md">Đang nạp và trích xuất nội dung văn bản...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-error space-y-2">
              <Icon name="error" className="text-[36px]" />
              <p className="font-headline-sm">{error}</p>
            </div>
          ) : activeTab === 'content' ? (
            /* --- TAB 1: RAW TEXT PREVIEW --- */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-outline font-label-mono text-[11px] pb-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                <span>
                  {lineCount} dòng • {wordCount.toLocaleString()} từ • {charCount.toLocaleString()} ký tự
                </span>
                {searchQuery && (
                  <span className="text-secondary font-semibold">
                    Đang lọc theo: "{searchQuery}"
                  </span>
                )}
              </div>

              {rawText ? (
                <div className="p-space-md rounded-2xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] font-label-mono text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap select-text selection:bg-primary/20">
                  {rawText}
                </div>
              ) : (
                <div className="py-16 text-center text-outline">
                  <Icon name="description" className="text-[36px] mb-2" />
                  <p>Tài liệu này chưa có nội dung văn bản thô hoặc đang trong hàng đợi xử lý.</p>
                </div>
              )}
            </div>
          ) : activeTab === 'chunks' ? (
            /* --- TAB 2: CHUNKS LIST --- */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-outline font-label-mono text-[11px] pb-1">
                <span>
                  Hiển thị {filteredChunks.length} / {chunks.length} phân mảnh đã lưu trên Atlas
                </span>
              </div>

              {filteredChunks.length > 0 ? (
                filteredChunks.map((chunk) => (
                  <div
                    key={chunk._id || chunk.chunkIndex}
                    className="p-3.5 rounded-2xl bg-surface-container/60 hover:bg-surface-container border border-black/[0.06] dark:border-white/[0.06] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <span className="font-label-mono text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                        <span className="font-label-mono text-[11px] text-outline">
                          {chunk.content.length} ký tự
                        </span>
                        {chunk.embeddingLength && (
                          <span className="font-label-mono text-[11px] px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary">
                            {chunk.embeddingLength} dims
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyChunk(chunk.content)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-on-surface transition-opacity"
                        title="Sao chép chunk này"
                      >
                        <Icon name="content_copy" className="text-[14px]" />
                      </button>
                    </div>

                    <p className="font-body-sm text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap select-text">
                      {chunk.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-outline">
                  <Icon name="layers_clear" className="text-[36px] mb-2" />
                  <p>
                    {searchQuery
                      ? 'Không tìm thấy phân mảnh nào khớp với từ khóa.'
                      : 'Chưa có dữ liệu phân mảnh chunk cho tài liệu này.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* --- TAB 3: METADATA SPECS --- */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-surface-container/50 border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
                  Mã định danh (Document ID)
                </span>
                <p className="font-label-mono text-body-sm text-on-surface break-all">{doc?._id}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/50 border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
                  Loại nguồn (Source Type)
                </span>
                <p className="font-body-md text-on-surface capitalize">
                  {doc?.sourceType === 'url' ? 'Thu thập từ URL (Web Crawl)' : 'Tệp tải lên (File Upload)'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/50 border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
                  Định dạng tệp (Format)
                </span>
                <p className="font-label-mono text-body-md text-on-surface uppercase">
                  {doc?.fileType || 'HTML/Web'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/50 border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
                  Trạng thái xử lý (Status)
                </span>
                <p className="font-body-md text-on-surface capitalize">{doc?.status}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/50 border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
                  Thời gian tạo (Created At)
                </span>
                <p className="font-body-md text-on-surface">
                  {doc?.createdAt ? new Date(doc.createdAt).toLocaleString('vi-VN') : 'Không rõ'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/50 border border-black/[0.05] dark:border-white/[0.05] space-y-1">
                <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
                  Cập nhật lần cuối (Updated At)
                </span>
                <p className="font-body-md text-on-surface">
                  {doc?.updatedAt ? new Date(doc.updatedAt).toLocaleString('vi-VN') : 'Không rõ'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="flex items-center justify-between p-space-md sm:px-space-lg bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.06] dark:border-white/[0.06] relative z-10">
          <button
            onClick={() => {
              if (doc) {
                const indexedDoc: IndexedDocument = {
                  id: doc._id,
                  name: doc.title || doc.originalName || 'Tài liệu',
                  type: (doc.fileType === 'pdf' ? 'pdf' : doc.fileType === 'docx' ? 'docx' : 'markdown') as any,
                  status: (doc.status === 'embedded' ? 'ready' : 'syncing') as any,
                };
                onSelectAsContext?.(indexedDoc);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label-md text-label-md transition-all cursor-pointer ${
              isSelectedContext
                ? 'bg-secondary/15 text-secondary border border-secondary/30'
                : 'bg-primary-container hover:bg-primary text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
            }`}
          >
            <Icon name={isSelectedContext ? 'check_circle' : 'filter_center_focus'} className="text-[18px]" />
            <span>{isSelectedContext ? 'Đang dùng làm ngữ cảnh' : 'Chọn làm ngữ cảnh chat'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

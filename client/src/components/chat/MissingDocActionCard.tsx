'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { MissingDocSuggestion } from '../../types/chat';

interface MissingDocActionCardProps {
  suggestion: MissingDocSuggestion;
  onConfirmCrawl: (suggestion: MissingDocSuggestion) => Promise<void>;
  onDismiss?: () => void;
}

export const MissingDocActionCard: React.FC<MissingDocActionCardProps> = ({
  suggestion,
  onConfirmCrawl,
  onDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirmCrawl(suggestion);
    } catch (err) {
      console.error('[MissingDocActionCard] Lỗi khi xác nhận nạp tài liệu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/90 dark:bg-white/[0.04] border border-cyan-500/30 dark:border-cyan-400/25 shadow-[0_16px_40px_rgba(6,182,212,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all animate-fadeIn">
      {/* Ambient Glows */}
      <div className="absolute -right-8 -top-8 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Pill & Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-space-sm border-b border-black/[0.06] dark:border-white/[0.06] mb-space-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.5)]">
            <Icon name="language" className="text-white text-[18px]" />
          </div>
          <span className="font-label-mono text-label-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
            Đề xuất nạp tài liệu chính thức
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1">
            <Icon name="verified" className="text-[13px] text-cyan-500" />
            Chính chủ Verified
          </span>
        </div>

        {onDismiss && (
          <button
            onClick={() => {
              setIsDismissed(true);
              onDismiss();
            }}
            disabled={isLoading}
            className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Bỏ qua đề xuất này"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-3 mb-space-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
            <span>{suggestion.technology}</span>
            <span className="text-outline font-normal">•</span>
            <span className="text-primary">{suggestion.topic}</span>
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
            Sổ tay kiến thức của bạn hiện chưa có tài liệu về chủ đề này. Bạn có muốn nạp trang tài liệu chính thức dưới đây vào kho để tôi cào nội dung, nhúng vector và giải đáp chuẩn xác nhất không?
          </p>
        </div>

        {/* Source URL Preview Pill */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-cyan-500/[0.05] dark:bg-cyan-500/[0.08] border border-cyan-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="link" className="text-cyan-500 text-[18px] shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-on-surface truncate">
                {suggestion.title}
              </p>
              <p className="font-label-mono text-[11px] text-cyan-600 dark:text-cyan-400 truncate">
                {suggestion.url}
              </p>
            </div>
          </div>

          <a
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 text-[12px] font-medium shrink-0 transition-colors cursor-pointer"
            title="Mở trang web trong tab mới"
          >
            <span>Xem trang</span>
            <Icon name="open_in_new" className="text-[14px]" />
          </a>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-primary text-white font-label-md text-label-md font-semibold shadow-[0_4px_16px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Đang cào & nhúng vector vào Atlas (1-2s)...</span>
            </>
          ) : (
            <>
              <Icon name="cloud_download" className="text-[18px]" />
              <span>Nạp trang này vào Nguồn & Giải đáp</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsDismissed(true);
            onDismiss?.();
          }}
          disabled={isLoading}
          className="px-3.5 py-2.5 rounded-2xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-outline hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
};

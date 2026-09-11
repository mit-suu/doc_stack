'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { MetricStat } from '../../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AiResponseCardProps {
  title: string;
  vectorSimilarity: string;
  executiveSummary: string;
  stats: MetricStat[];
  isLoading?: boolean;
  isStreaming?: boolean;
  onCopy?: () => void;
  onPin?: () => void;
  onShare?: () => void;
}

export const AiResponseCard: React.FC<AiResponseCardProps> = ({
  title,
  vectorSimilarity,
  executiveSummary,
  stats,
  isLoading = false,
  isStreaming = false,
  onCopy,
  onPin,
  onShare,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(executiveSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-white/[0.04] border border-black/[0.1] dark:border-white/[0.1] shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Pill with Verified Vector Search Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-space-sm border-b border-black/[0.06] dark:border-white/[0.06] mb-space-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-primary-container/80 flex items-center justify-center shadow-[0_0_12px_rgba(79,70,229,0.5)]">
            <Icon name="auto_awesome" className="text-white dark:text-primary text-[18px]" />
          </div>
          <span className="font-headline-sm text-headline-sm text-on-surface">
            {title}
          </span>
          <span className="font-label-mono text-label-mono px-2 py-0.5 rounded-full bg-tertiary-container/30 dark:bg-tertiary-container/40 text-tertiary dark:text-tertiary-fixed border border-tertiary/20 font-semibold">
            Vector Similarity: {vectorSimilarity}
          </span>
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-outline hover:text-on-surface transition-colors cursor-pointer"
            title={copied ? 'Đã sao chép' : 'Sao chép Markdown'}
          >
            <Icon name={copied ? 'check' : 'content_copy'} className="text-[18px]" />
          </button>
          <button
            onClick={onPin}
            className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Ghim phản hồi"
          >
            <Icon name="push_pin" className="text-[18px]" />
          </button>
          <button
            onClick={onShare}
            className="p-1.5 rounded-lg hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Chia sẻ phân tích"
          >
            <Icon name="share" className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Key Takeaways Overview */}
      <div className="mb-space-md">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-label-mono text-label-mono text-primary uppercase tracking-widest">
            Phân tích kỹ thuật & Trả lời
          </h4>
          {isStreaming && (
            <span className="flex items-center gap-1.5 font-label-mono text-[11px] text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full border border-primary/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Đang sinh dữ liệu...
            </span>
          )}
        </div>
        {isLoading && !executiveSummary ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-4 bg-primary/20 rounded-full w-3/4"></div>
            <div className="h-4 bg-primary/10 rounded-full w-full"></div>
            <div className="h-4 bg-primary/10 rounded-full w-5/6"></div>
          </div>
        ) : (
          <div className="py-1">
            <MarkdownRenderer content={executiveSummary} isStreaming={isStreaming} />
          </div>
        )}
      </div>

      {/* Micro Stats Strip Apple Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {stats.map((stat, idx) => {
          const colorClass =
            stat.type === 'tertiary'
              ? 'text-tertiary font-bold'
              : stat.type === 'secondary'
              ? 'text-secondary font-bold'
              : 'text-on-surface font-semibold';

          return (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]"
            >
              <span className="font-label-mono text-label-mono text-outline">
                {stat.label}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`font-headline-sm text-headline-sm ${colorClass}`}>
                  {stat.value}
                </span>
                {stat.subtext && (
                  <span className="font-body-sm text-body-sm text-outline">
                    {stat.subtext}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

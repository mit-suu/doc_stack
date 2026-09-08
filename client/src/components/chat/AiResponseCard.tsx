'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { MetricStat } from '../../types/chat';

interface AiResponseCardProps {
  title: string;
  vectorSimilarity: string;
  executiveSummary: string;
  stats: MetricStat[];
  onCopy?: () => void;
  onPin?: () => void;
  onShare?: () => void;
}

export const AiResponseCard: React.FC<AiResponseCardProps> = ({
  title,
  vectorSimilarity,
  executiveSummary,
  stats,
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
        <h4 className="font-label-mono text-label-mono text-primary uppercase tracking-widest mb-1.5">
          Tóm lược kỹ thuật (Executive Summary)
        </h4>
        <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
          Theo tài liệu tài liệu chỉ mục trang 14–22, điểm khác biệt mang tính cách mạng của{' '}
          <span className="text-secondary font-semibold">React Server Components (RSC)</span> so với
          SSR truyền thống là:{' '}
          <strong>RSC không bao giờ chuyển code JavaScript của server components về phía client</strong>.
          Toàn bộ quá trình render component tree được mã hóa dưới dạng stream JSON-like payload (RSC wire
          format), giúp kích thước bundle client tiệm cận mức tối thiểu.
        </p>
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

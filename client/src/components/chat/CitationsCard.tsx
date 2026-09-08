import React from 'react';
import { Icon } from '../ui/Icon';
import { Citation } from '../../types/chat';

interface CitationsCardProps {
  citations: Citation[];
  onOpenCitation?: (citation: Citation) => void;
}

export const CitationsCard: React.FC<CitationsCardProps> = ({
  citations,
  onOpenCitation,
}) => {
  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-2">
          <Icon name="format_quote" className="text-secondary text-[20px]" />
          <h4 className="font-headline-sm text-headline-sm text-on-surface">
            Nguồn trích dẫn chính xác (Citations)
          </h4>
        </div>
        <span className="font-label-mono text-label-mono text-outline">
          {citations.length} Đoạn trích từ Vector DB
        </span>
      </div>

      {/* Citations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
        {citations.map((cite) => {
          const accentClass =
            cite.accentColor === 'tertiary' ? 'text-tertiary' : 'text-secondary';

          return (
            <div
              key={cite.id}
              onClick={() => onOpenCitation?.(cite)}
              className="p-space-sm rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`font-label-mono text-label-mono ${accentClass} font-semibold`}>
                  {cite.sourceFile} {cite.reference}
                </span>
                <Icon
                  name="open_in_new"
                  className={`text-outline group-hover:${accentClass} text-[16px] transition-colors`}
                />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant italic leading-relaxed">
                {cite.quote}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

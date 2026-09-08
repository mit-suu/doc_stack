'use client';

import React from 'react';
import { Icon } from '../ui/Icon';

interface FollowUpPillsProps {
  suggestions: string[];
  onSelectSuggestion?: (suggestion: string) => void;
}

export const FollowUpPills: React.FC<FollowUpPillsProps> = ({
  suggestions,
  onSelectSuggestion,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="font-label-mono text-label-mono text-outline uppercase tracking-wider mr-1">
        Gợi ý tiếp theo:
      </span>
      {suggestions.map((text, idx) => (
        <button
          key={idx}
          onClick={() => onSelectSuggestion?.(text)}
          className="px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] border border-black/[0.08] dark:border-white/[0.08] hover:border-primary/50 text-on-surface font-body-sm text-body-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>{text}</span>
          <Icon name="arrow_forward" className="text-[14px] text-primary" />
        </button>
      ))}
    </div>
  );
};

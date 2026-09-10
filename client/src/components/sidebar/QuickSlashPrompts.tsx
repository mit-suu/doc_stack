'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { SlashPrompt } from '../../types/workspace';

interface QuickSlashPromptsProps {
  prompts: SlashPrompt[];
  onSelectPrompt?: (prompt: SlashPrompt) => void;
}

export const QuickSlashPrompts: React.FC<QuickSlashPromptsProps> = ({
  prompts,
  onSelectPrompt,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon name="bolt" className="text-amber-500 text-[16px]" />
          <span className="text-[13px] font-semibold text-on-surface tracking-tight">
            Lệnh nhanh
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-outline">Gõ &apos;/&apos;</span>
          <Icon
            name={isExpanded ? 'expand_less' : 'expand_more'}
            className="text-[16px] text-outline"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-2 pb-2.5 grid grid-cols-2 gap-1.5">
          {prompts.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectPrompt?.(item)}
              className="flex items-center gap-2 px-2.5 py-[7px] rounded-lg bg-surface-container/60 hover:bg-surface-container-high border border-black/[0.05] dark:border-white/[0.05] text-left transition-all group cursor-pointer"
            >
              <Icon
                name={item.icon}
                className={`${item.accentColor} text-[14px] shrink-0 group-hover:scale-110 transition-transform`}
              />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-on-surface block truncate">
                  {item.command}
                </span>
                <span className="text-[10px] text-outline leading-tight block truncate">
                  {item.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

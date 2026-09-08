'use client';

import React from 'react';
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
  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-2">
          <Icon name="bolt" className="text-primary text-[20px]" />
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Lệnh nhanh
          </span>
        </div>
        <span className="font-label-mono text-label-mono text-outline">Gõ &apos;/&apos;</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {prompts.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectPrompt?.(item)}
            className="flex flex-col items-start p-3 rounded-2xl bg-surface-container/60 hover:bg-surface-container-high border border-black/[0.06] dark:border-white/[0.06] text-left transition-all group cursor-pointer"
          >
            <Icon
              name={item.icon}
              className={`${item.accentColor} text-[20px] mb-1 group-hover:scale-110 transition-transform`}
            />
            <span className="font-label-md text-label-md text-on-surface">
              {item.command}
            </span>
            <span className="font-body-sm text-body-sm text-outline text-[11px] leading-tight mt-0.5">
              {item.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

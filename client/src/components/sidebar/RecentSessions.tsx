'use client';

import React from 'react';
import { Icon } from '../ui/Icon';
import { RecentSession } from '../../types/workspace';

interface RecentSessionsProps {
  sessions: RecentSession[];
  onSelectSession?: (session: RecentSession) => void;
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({
  sessions,
  onSelectSession,
}) => {
  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-space-sm">
        <span className="font-headline-sm text-headline-sm text-on-surface">
          Phiên làm việc gần đây
        </span>
        <Icon name="history" className="text-outline text-[18px]" />
      </div>

      <div className="space-y-1.5">
        {sessions.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectSession?.(item)}
            className="block p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors truncate">
                {item.title}
              </span>
              <span className="font-label-mono text-label-mono text-outline text-[10px] shrink-0 ml-2">
                {item.timeAgo}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline truncate mt-0.5">
              {item.preview}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

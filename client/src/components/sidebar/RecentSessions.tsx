'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { RecentSession } from '../../types/workspace';

interface RecentSessionsProps {
  sessions: RecentSession[];
  activeSessionId?: string | null;
  onSelectSession?: (session: RecentSession) => void;
  onNewSession?: () => void;
  onDeleteSession?: (sessionId: string, e: React.MouseEvent) => void;
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Icon name="forum" className="text-violet-400 text-[16px]" />
          <span className="text-[13px] font-semibold text-on-surface tracking-tight">
            Phiên của bạn
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary tabular-nums font-semibold">
            {sessions.length}
          </span>
          <Icon
            name={isExpanded ? 'expand_less' : 'expand_more'}
            className="text-[16px] text-outline"
          />
        </button>

        <button
          onClick={onNewSession}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition-colors cursor-pointer"
          title="Phiên mới"
        >
          <Icon name="add" className="text-[13px]" />
          <span>Mới</span>
        </button>
      </div>

      {isExpanded && (
        <div className="px-1.5 pb-2">
          <div className="space-y-px max-h-[190px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 pr-0.5">
            {sessions.length === 0 ? (
              <div className="py-4 px-3 text-center">
                <p className="text-[11px] text-outline">
                  Chưa có phiên chat nào
                </p>
              </div>
            ) : (
              sessions.map((item) => {
                const isActive = activeSessionId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectSession?.(item)}
                    className={`group flex items-center justify-between gap-2 px-2.5 py-[7px] rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 dark:bg-primary/15'
                        : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] font-medium truncate leading-[16px] ${
                        isActive ? 'text-primary' : 'text-on-surface'
                      }`}>
                        {item.title}
                      </p>
                      <p className="text-[10px] text-outline truncate leading-[14px]">
                        {item.preview || 'Chưa có tin nhắn...'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-[9px] text-outline tabular-nums">
                        {item.timeAgo}
                      </span>

                      {onDeleteSession && (
                        <button
                          onClick={(e) => onDeleteSession(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/15 text-outline hover:text-red-500 transition-all cursor-pointer"
                          title="Xóa"
                        >
                          <Icon name="close" className="text-[12px]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

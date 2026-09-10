'use client';

import React from 'react';
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
  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-2">
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Phiên của bạn
          </span>
          <span className="font-label-mono text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
            {sessions.length}
          </span>
        </div>

        {/* Nút Tạo phiên chat mới */}
        <button
          onClick={onNewSession}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-label-md transition-colors cursor-pointer"
          title="Bắt đầu phiên trò chuyện mới"
        >
          <Icon name="add" className="text-[14px]" />
          <span>Phiên mới</span>
        </button>
      </div>

      <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="py-6 px-3 text-center rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-outline/20">
            <Icon name="chat_bubble_outline" className="text-outline text-[24px] mb-1.5 opacity-60" />
            <p className="text-body-sm text-outline text-[12px]">
              Chưa có phiên chat nào
            </p>
            <p className="text-[11px] text-outline/60 mt-0.5">
              Gửi câu hỏi để tạo phiên riêng của bạn
            </p>
          </div>
        ) : (
          sessions.map((item) => {
            const isActive = activeSessionId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectSession?.(item)}
                className={`group relative p-2.5 rounded-2xl transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-primary/10 dark:bg-primary/15 border-primary/40 shadow-[0_4px_16px_rgba(79,70,229,0.15)]'
                    : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`font-label-md text-label-md truncate ${
                      isActive
                        ? 'text-primary font-semibold'
                        : 'text-on-surface group-hover:text-primary transition-colors'
                    }`}
                  >
                    {item.title}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-label-mono text-label-mono text-outline text-[10px]">
                      {item.timeAgo}
                    </span>

                    {/* Nút xóa phiên */}
                    {onDeleteSession && (
                      <button
                        onClick={(e) => onDeleteSession(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-error/15 text-outline hover:text-error transition-all cursor-pointer"
                        title="Xóa phiên này"
                      >
                        <Icon name="delete" className="text-[13px]" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="font-body-sm text-body-sm text-outline truncate mt-0.5">
                  {item.preview || 'Chưa có tin nhắn...'}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';

interface TopSystemHeaderProps {
  workspaceId?: string;
  branchName?: string;
  onOpenSearch?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
}

export const TopSystemHeader: React.FC<TopSystemHeaderProps> = ({
  workspaceId = 'WORKSPACE_MAIN',
  branchName = 'v2.4 Technical Architecture',
  onOpenSearch,
  onToggleSidebar,
  onOpenSettings,
}) => {
  return (
    <header className="fixed top-0 right-0 h-14 bg-surface/80 backdrop-blur-xl z-30 flex items-center justify-between px-gutter-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)] left-0 border-b border-black/[0.06] dark:border-white/[0.04] transition-colors">
      {/* Workspace Indicator */}
      <div className="flex items-center gap-space-sm">
        <div className="flex items-center gap-space-2xs px-space-xs py-1 rounded bg-surface-container font-label-mono text-label-mono text-secondary">
          <Icon name="lock_open" className="text-[14px]" />
          <span>{workspaceId}</span>
        </div>
        <span className="text-outline text-body-sm font-body-sm">/</span>
        <span className="font-label-md text-label-md text-on-surface hidden sm:inline">
          {branchName}
        </span>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-space-sm">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-space-2xs px-space-xs py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-mono text-label-mono cursor-pointer"
        >
          <Icon name="keyboard_command_key" className="text-[14px]" />
          <span>K to search</span>
        </button>

        {/* Theme Toggle (Dark/Light) */}
        <ThemeToggle />

        {/* Settings Button (Color & Theme) */}
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          title="Cài đặt giao diện & màu nút bấm"
          aria-label="Open Appearance Settings"
        >
          <Icon name="palette" className="text-[18px]" />
        </button>

        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          title="Thu gọn / Mở thanh điều khiển"
        >
          <Icon name="dock_to_left" className="text-[18px]" />
        </button>

        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_var(--theme-accent-glow)]">
          <Icon name="person" className="text-on-primary text-[18px]" />
        </div>
      </div>
    </header>
  );
};

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

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
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || 'Kỹ sư hệ thống';
  const displayEmail = user?.email || 'engineer@docstack.io';
  const initial = displayName.charAt(0).toUpperCase();

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

        {/* User Profile Avatar & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_var(--theme-accent-glow)] overflow-hidden cursor-pointer border border-white/20 hover:scale-105 transition-transform"
            title={`Tài khoản: ${displayName}`}
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-on-primary font-bold text-xs">{initial}</span>
            )}
          </button>

          {/* User Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.1] shadow-2xl animate-fade-in z-50">
              <div className="px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
                  {displayName}
                </p>
                <p className="font-label-mono text-[11px] text-outline truncate mt-0.5">
                  {displayEmail}
                </p>
                <span className="inline-block font-label-mono text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 font-semibold uppercase mt-1.5">
                  Google OAuth
                </span>
              </div>

              <div className="pt-1.5">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left font-label-md text-body-sm text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="logout" className="text-[16px] text-error" />
                  <span>Đăng xuất (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

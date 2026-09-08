'use client';

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ACCENT_COLOR_PRESETS } from '../../types/theme';
import { Icon } from './Icon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, accentId, setAccentId, accentPreset } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-[560px] rounded-3xl bg-surface/95 dark:bg-surface-container/95 backdrop-blur-2xl border border-black/[0.1] dark:border-white/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.4)] p-space-lg z-10 overflow-hidden">
        {/* Ambient Glow in Modal */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: accentPreset.swatchHex }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-space-sm border-b border-black/[0.06] dark:border-white/[0.06] mb-space-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center">
              <Icon name="palette" className="text-primary text-[20px]" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Cài đặt Giao diện
              </h3>
              <p className="font-body-sm text-body-sm text-outline">
                Tùy biến màu sắc nút bấm và phong cách hiển thị
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Section 1: Accent Color Presets */}
        <div className="mb-space-lg">
          <div className="flex items-center justify-between mb-space-xs">
            <label className="font-label-md text-label-md text-on-surface">
              Màu sắc nút & điểm nhấn (Accent Theme)
            </label>
            <span className="font-label-mono text-label-mono text-primary font-medium">
              {accentPreset.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ACCENT_COLOR_PRESETS.map((preset) => {
              const isSelected = accentId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setAccentId(preset.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-primary-container/15 border-primary shadow-sm'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.06]'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full shrink-0 shadow-sm border border-white/20 flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: preset.swatchHex }}
                  >
                    {isSelected && (
                      <Icon name="check" className="text-white text-[14px] font-bold" />
                    )}
                  </span>
                  <div className="truncate min-w-0">
                    <p
                      className={`font-label-md text-label-md truncate ${
                        isSelected ? 'text-primary font-bold' : 'text-on-surface'
                      }`}
                    >
                      {preset.name.split(' ')[0]}
                    </p>
                    <p className="font-label-mono text-[10px] text-outline truncate">
                      {preset.swatchHex}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Live Preview */}
        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] mb-space-lg">
          <span className="font-label-mono text-label-mono text-outline uppercase tracking-wider block mb-2">
            Xem trước nút bấm (Live Preview)
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-container hover:bg-primary text-white font-label-md text-label-md shadow-[0_2px_12px_var(--theme-accent-glow)] transition-all">
              <Icon name="add" className="text-[16px]" />
              <span>Nạp Tài liệu</span>
            </button>

            <button className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center shadow-[0_0_16px_var(--theme-accent-glow)]">
              <Icon name="arrow_upward" className="text-[18px]" />
            </button>

            <span className="font-label-mono text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 text-primary border border-primary/30 tracking-widest font-semibold uppercase">
              PRO BADGE
            </span>

            <span className="text-primary font-label-md text-label-md flex items-center gap-1">
              <Icon name="auto_awesome" className="text-[16px]" />
              <span>AI Phân tích</span>
            </span>
          </div>
        </div>

        {/* Section 3: Theme Switcher */}
        <div className="mb-space-lg">
          <label className="font-label-md text-label-md text-on-surface block mb-space-xs">
            Chế độ hiển thị chính
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border font-label-md text-label-md transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-primary-container/15 border-primary text-primary font-bold'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-on-surface-variant'
              }`}
            >
              <Icon name="dark_mode" className="text-[16px]" />
              <span>Chế độ Tối (Dark)</span>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border font-label-md text-label-md transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-primary-container/15 border-primary text-primary font-bold'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] text-on-surface-variant'
              }`}
            >
              <Icon name="light_mode" className="text-[16px]" />
              <span>Chế độ Sáng (Light)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-space-xs">
          <span className="font-label-mono text-label-mono text-outline">
            Tự động lưu vào trình duyệt
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-primary-container hover:bg-primary text-white font-label-md text-label-md shadow-sm transition-all cursor-pointer"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};

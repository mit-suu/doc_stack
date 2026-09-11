'use client';

import React, { useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';

export interface SlashCommandOption {
  name: string;
  prefix: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  colorClass: string;
  tagClass: string;
}

export const SUPPORTED_SLASH_COMMANDS: SlashCommandOption[] = [
  {
    name: 'compare',
    prefix: '/compare',
    title: 'Đối chiếu & So sánh',
    description: 'Tự động phân tách 2 vế và sinh bảng so sánh Markdown trực quan giữa 2 công nghệ hoặc khái niệm.',
    icon: 'compare_arrows',
    badge: 'Markdown Table',
    colorClass: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    tagClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    name: 'deep',
    prefix: '/deep',
    title: 'Phân tích chuyên sâu',
    description: 'Đào sâu kiến trúc kỹ thuật, luồng dữ liệu, cơ chế hoạt động và trích dẫn nhiều dẫn chứng từ tài liệu.',
    icon: 'psychology',
    badge: 'Deep Dive',
    colorClass: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    tagClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    name: 'example',
    prefix: '/example',
    title: 'Ví dụ thực tế & Code mẫu',
    description: 'Tập trung sinh khối mã nguồn (code snippet) hoàn chỉnh, giải thích từng dòng và kịch bản thực tế.',
    icon: 'code',
    badge: 'Code Snippet',
    colorClass: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    tagClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    name: 'explain',
    prefix: '/explain',
    title: 'Giải thích chuẩn mực',
    description: 'Trình bày cân bằng, sáng tỏ các khái niệm cốt lõi theo cấu trúc Markdown rõ ràng, dễ tiếp thu.',
    icon: 'menu_book',
    badge: 'Standard',
    colorClass: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    tagClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    name: 'quiz',
    prefix: '/quiz',
    title: 'Trắc nghiệm kiểm tra',
    description: 'Tạo 3-5 câu trắc nghiệm 4 lựa chọn (A, B, C, D) kiểm tra mức độ hiểu tài liệu kèm lời giải chi tiết.',
    icon: 'quiz',
    badge: 'Quiz 4 Choices',
    colorClass: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    tagClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
  {
    name: 'simple',
    prefix: '/simple',
    title: 'Giải thích đơn giản (ELI5)',
    description: 'Dùng từ ngữ đời thường, mộc mạc, ví dụ trực quan, loại bỏ các thuật ngữ chuyên ngành phức tạp.',
    icon: 'sentiment_satisfied',
    badge: 'ELI5',
    colorClass: 'text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    tagClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  filterText: string;
  selectedIndex: number;
  onSelectCommand: (cmd: SlashCommandOption) => void;
  onHoverIndex: (index: number) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  filterText,
  selectedIndex,
  onSelectCommand,
  onHoverIndex,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Lọc danh sách commands theo filterText (bỏ dấu / ở đầu nếu có)
  const query = filterText.startsWith('/') ? filterText.slice(1).toLowerCase().trim() : filterText.toLowerCase().trim();

  const filteredCommands = SUPPORTED_SLASH_COMMANDS.filter((cmd) => {
    if (!query) return true;
    return (
      cmd.name.toLowerCase().includes(query) ||
      cmd.title.toLowerCase().includes(query) ||
      cmd.badge.toLowerCase().includes(query)
    );
  });

  // Tự động cuộn item đang chọn vào tầm nhìn
  useEffect(() => {
    if (activeItemRef.current && menuRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  if (!isOpen || filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 right-0 mb-3 z-50 rounded-2xl backdrop-blur-2xl bg-white/95 dark:bg-[#161922]/95 border border-black/[0.12] dark:border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-outline font-label-md">
            Lệnh phân tích tài liệu DocStack ({filteredCommands.length})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-outline font-label-mono">
          <span className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">↑↓ Di chuyển</span>
          <span className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">↵ Chọn</span>
          <span className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08]">Esc Đóng</span>
        </div>
      </div>

      {/* List items */}
      <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;

          return (
            <div
              key={cmd.name}
              ref={isSelected ? activeItemRef : null}
              onMouseEnter={() => onHoverIndex(idx)}
              onClick={() => onSelectCommand(cmd)}
              className={`group flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-primary/10 dark:bg-primary/15 border border-primary/30 shadow-sm'
                  : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {/* Icon avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${cmd.colorClass}`}
              >
                <Icon name={cmd.icon} className="text-[18px]" />
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-bold text-primary group-hover:text-primary">
                    {cmd.prefix}
                  </span>
                  <span className="text-[13px] font-semibold text-on-surface">
                    {cmd.title}
                  </span>
                  <span
                    className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium uppercase tracking-tight shrink-0 ${cmd.tagClass}`}
                  >
                    {cmd.badge}
                  </span>
                </div>
                <p className="text-[12px] text-outline mt-0.5 line-clamp-1 leading-snug">
                  {cmd.description}
                </p>
              </div>

              {/* Enter action indicator */}
              {isSelected && (
                <div className="self-center pl-1 text-primary shrink-0 opacity-80">
                  <Icon name="keyboard_return" className="text-[16px]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

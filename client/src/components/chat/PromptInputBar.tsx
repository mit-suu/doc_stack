'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import {
  SlashCommandMenu,
  SUPPORTED_SLASH_COMMANDS,
  SlashCommandOption,
} from './SlashCommandMenu';

interface PromptInputBarProps {
  initialPrompt?: string;
  onSendPrompt?: (text: string) => void;
  onAttachFile?: () => void;
  className?: string;
  isLoading?: boolean;
}

export const PromptInputBar: React.FC<PromptInputBarProps> = ({
  initialPrompt = '',
  onSendPrompt,
  onAttachFile,
  className = '',
  isLoading = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeCommand, setActiveCommand] = useState<SlashCommandOption | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo nếu có initialPrompt
  useEffect(() => {
    if (initialPrompt) {
      const match = initialPrompt.trim().match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
      if (match) {
        const cmdName = match[1].toLowerCase();
        const rest = match[2] || '';
        const found = SUPPORTED_SLASH_COMMANDS.find((c) => c.name.toLowerCase() === cmdName);
        if (found) {
          setActiveCommand(found);
          setPrompt(rest);
          return;
        }
      }
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Điều kiện kích hoạt Slash Command Dropdown:
  // Khi chưa có activeCommand, prompt bắt đầu bằng '/' và chưa có dấu cách
  const isSlashActive = !activeCommand && !isDismissed && prompt.startsWith('/') && !prompt.includes(' ');

  const currentQuery = prompt.startsWith('/') ? prompt.slice(1).toLowerCase().trim() : '';
  const filteredCommands = SUPPORTED_SLASH_COMMANDS.filter((cmd) => {
    if (!currentQuery) return true;
    return (
      cmd.name.toLowerCase().includes(currentQuery) ||
      cmd.title.toLowerCase().includes(currentQuery) ||
      cmd.badge.toLowerCase().includes(currentQuery)
    );
  });

  // Reset selected index về 0 mỗi khi người dùng gõ thêm ký tự
  useEffect(() => {
    setSelectedIndex(0);
  }, [prompt]);

  // Đóng menu khi click ra ngoài container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDismissed(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCommand = (cmd: SlashCommandOption) => {
    setActiveCommand(cmd);
    setPrompt('');
    setIsDismissed(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRemoveActiveCommand = () => {
    setActiveCommand(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = prompt.trim();
    if (!query && !activeCommand) return;

    const fullPrompt = activeCommand ? `${activeCommand.prefix} ${query}`.trim() : query;
    if (!fullPrompt) return;

    onSendPrompt?.(fullPrompt);
    setPrompt('');
    setActiveCommand(null);
    setIsDismissed(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Nếu đang có active command và ô nhập trống, nhấn Backspace sẽ hủy badge và trả lại text /command
    if (e.key === 'Backspace' && !prompt && activeCommand) {
      e.preventDefault();
      setPrompt(`${activeCommand.prefix}`);
      setActiveCommand(null);
      setIsDismissed(false);
      return;
    }

    // Điều hướng trong Slash Command Dropdown
    if (isSlashActive && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          handleSelectCommand(selected);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsDismissed(true);
        return;
      }
    }

    // Submit prompt thông thường
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Tự động nhận diện nếu user gõ hoặc dán /command theo sau bởi dấu cách
    if (!activeCommand) {
      const match = val.match(/^\/([a-zA-Z0-9_-]+)\s(.*)$/);
      if (match) {
        const cmdName = match[1].toLowerCase();
        const rest = match[2];
        const matched = SUPPORTED_SLASH_COMMANDS.find((c) => c.name.toLowerCase() === cmdName);
        if (matched) {
          setActiveCommand(matched);
          setPrompt(rest);
          setIsDismissed(true);
          return;
        }
      }
    }

    setPrompt(val);
    setIsDismissed(false);
  };

  // Placeholder động theo trạng thái lệnh đang active
  const getPlaceholder = () => {
    if (activeCommand) {
      switch (activeCommand.name) {
        case 'compare':
          return 'Nhập 2 đối tượng cần so sánh (vd: Next.js vs Remix, SSR vs CSR)...';
        case 'deep':
          return 'Nhập câu hỏi phân tích chuyên sâu cơ chế hoặc kiến trúc kỹ thuật...';
        case 'example':
          return 'Yêu cầu viết mã nguồn hoàn chỉnh hoặc kịch bản thực tế...';
        case 'explain':
          return 'Nhập khái niệm cần giải thích chuẩn mực...';
        case 'quiz':
          return 'Nhập chủ đề cần tạo câu hỏi trắc nghiệm kiểm tra...';
        case 'simple':
          return 'Nhập câu hỏi cần giải thích đơn giản, dễ hiểu (ELI5)...';
        default:
          return `Nhập câu hỏi với chế độ ${activeCommand.prefix}...`;
      }
    }
    return "Hỏi bất kỳ điều gì từ tài liệu của bạn... (Gõ '/' để mở lệnh nhanh)";
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Floating Slash Command Autocomplete Menu */}
      <SlashCommandMenu
        isOpen={isSlashActive}
        filterText={prompt}
        selectedIndex={selectedIndex}
        onSelectCommand={handleSelectCommand}
        onHoverIndex={(idx) => setSelectedIndex(idx)}
      />

      <form
        onSubmit={handleSubmit}
        className="relative rounded-3xl sm:rounded-full backdrop-blur-2xl bg-white/90 dark:bg-surface-container-high/90 border border-black/[0.12] dark:border-white/[0.14] shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 sm:p-2.5 transition-all focus-within:border-primary/60 focus-within:shadow-[0_20px_60px_rgba(79,70,229,0.25)] w-full"
      >
        <div className="flex items-center gap-2 w-full">
          {/* Quick Slash Commands Trigger Button (khi chưa có lệnh active) */}
          {!activeCommand && (
            <button
              type="button"
              onClick={() => {
                if (prompt.startsWith('/')) {
                  setIsDismissed(false);
                } else {
                  setPrompt('/');
                  setIsDismissed(false);
                }
                inputRef.current?.focus();
              }}
              className={`px-2.5 py-1.5 rounded-full flex items-center gap-1 font-mono text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                isSlashActive
                  ? 'bg-primary text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]'
                  : 'text-outline hover:text-primary hover:bg-primary/10 bg-black/[0.04] dark:bg-white/[0.06]'
              }`}
              title="Mở danh sách Slash Command"
            >
              <span className="text-[13px] leading-none">/</span>
              <span className="hidden sm:inline font-sans font-semibold text-[11px]">Lệnh</span>
            </button>
          )}

          {/* Attach Document Button */}
          <button
            type="button"
            onClick={onAttachFile}
            className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors shrink-0 cursor-pointer"
            title="Đính kèm tệp tài liệu"
          >
            <Icon name="add_circle" className="text-[20px]" />
          </button>

          {/* Active Command Badge (Hiển thị nổi bật, khác biệt với text thường) */}
          {activeCommand && (
            <div
              className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border text-[12px] font-mono font-semibold shrink-0 select-none transition-all duration-150 animate-in fade-in zoom-in-95 shadow-sm ${activeCommand.tagClass}`}
            >
              <Icon name={activeCommand.icon} className="text-[14px]" />
              <span>{activeCommand.prefix}</span>
              <button
                type="button"
                onClick={handleRemoveActiveCommand}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-0.5 cursor-pointer text-inherit opacity-70 hover:opacity-100"
                title="Hủy lệnh này (hoặc nhấn Backspace)"
              >
                <Icon name="close" className="text-[12px]" />
              </button>
            </div>
          )}

          {/* Input Textbox */}
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-outline/70 focus:outline-none font-body-md text-body-md py-1 px-2"
            placeholder={getPlaceholder()}
          />

          {/* Shortcut Indicator */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] text-outline font-label-mono text-[10px] shrink-0 select-none">
            <span>⌘</span>
            <span>ENTER</span>
          </div>

          {/* Voice or Audio Prompt */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`w-9 h-9 rounded-full hidden sm:flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isRecording
                ? 'bg-error/20 text-error animate-pulse'
                : 'text-outline hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
            title={isRecording ? 'Đang ghi âm...' : 'Nhập liệu bằng giọng nói'}
          >
            <Icon name={isRecording ? 'mic_active' : 'mic'} className="text-[19px]" />
          </button>

          {/* Send Button with Glow */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_16px_rgba(79,70,229,0.5)] transition-all transform active:scale-95 shrink-0 cursor-pointer ${
              isLoading
                ? 'bg-primary/50 text-white cursor-not-allowed'
                : 'bg-primary-container hover:bg-primary text-white'
            }`}
            title={isLoading ? 'AI đang sinh phản hồi...' : 'Gửi câu hỏi'}
          >
            <Icon
              name={isLoading ? 'sync' : 'arrow_upward'}
              className={`text-[18px] ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </form>
    </div>
  );
};

'use client';

import React, { useState, useRef } from 'react';
import { Icon } from '../ui/Icon';

interface PromptInputBarProps {
  initialPrompt?: string;
  activeContextDoc?: string | null;
  onSendPrompt?: (text: string) => void;
  onAttachFile?: () => void;
  onRemoveContext?: () => void;
  className?: string;
}

export const PromptInputBar: React.FC<PromptInputBarProps> = ({
  initialPrompt = '',
  activeContextDoc = null,
  onSendPrompt,
  onAttachFile,
  onRemoveContext,
  className = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contextDoc, setContextDoc] = useState<string | null>(activeContextDoc);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setContextDoc(activeContextDoc ?? null);
  }, [activeContextDoc]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;
    onSendPrompt?.(prompt.trim());
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="relative rounded-3xl sm:rounded-full backdrop-blur-2xl bg-white/90 dark:bg-surface-container-high/90 border border-black/[0.12] dark:border-white/[0.14] shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2 sm:p-2.5 transition-all focus-within:border-primary/60 focus-within:shadow-[0_20px_60px_rgba(79,70,229,0.25)] w-full"
      >
        <div className="flex items-center gap-2 w-full">
          {/* Attach Document Button */}
          <button
            type="button"
            onClick={onAttachFile}
            className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors shrink-0 cursor-pointer"
            title="Đính kèm tệp tham chiếu"
          >
            <Icon name="add_circle" className="text-[20px]" />
          </button>

          {/* Dynamic Context Tag Pill */}
          {contextDoc && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] text-outline text-label-mono font-label-mono shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span className="text-on-surface-variant max-w-[120px] truncate">{contextDoc}</span>
              <button
                type="button"
                onClick={() => {
                  setContextDoc(null);
                  onRemoveContext?.();
                }}
                className="hover:text-on-surface cursor-pointer"
                title="Bỏ ngữ cảnh tệp này"
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
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-outline/70 focus:outline-none font-body-md text-body-md py-1 px-1"
            placeholder="Hỏi bất kỳ điều gì từ tài liệu của bạn... (Gõ '/' để mở lệnh nhanh)"
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
            className="w-10 h-10 rounded-full bg-primary-container hover:bg-primary text-white flex items-center justify-center shadow-[0_0_16px_rgba(79,70,229,0.5)] transition-all transform active:scale-95 shrink-0 cursor-pointer"
            title="Gửi câu hỏi"
          >
            <Icon name="arrow_upward" className="text-[18px]" />
          </button>
        </div>
      </form>
    </div>
  );
};

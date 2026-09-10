'use client';

import React, { useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

interface DocumentDropzoneProps {
  onFileSelect?: (files: FileList | null) => void;
}

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (onFileSelect) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-dashed rounded-lg px-3 py-2 text-center transition-all cursor-pointer group flex items-center justify-center gap-2 ${
        isDragOver
          ? 'border-primary bg-primary/10'
          : 'border-black/[0.12] dark:border-white/[0.12] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:border-primary/40'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.md,.txt"
        className="hidden"
        onChange={(e) => onFileSelect?.(e.target.files)}
      />
      <Icon
        name="add"
        className="text-outline-variant group-hover:text-primary transition-colors text-[16px]"
      />
      <span className="text-[11px] font-medium text-outline group-hover:text-on-surface-variant transition-colors">
        Thêm nguồn tài liệu
      </span>
    </div>
  );
};

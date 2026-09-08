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
      className={`border border-dashed rounded-2xl p-space-md text-center transition-all cursor-pointer group ${
        isDragOver
          ? 'border-primary bg-primary/10 scale-[1.01]'
          : 'border-black/[0.14] dark:border-white/[0.14] bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-black/[0.24] dark:hover:border-white/[0.24]'
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
        name="cloud_upload"
        className="text-outline-variant group-hover:text-primary transition-colors text-[24px]"
      />
      <p className="font-label-md text-label-md text-on-surface mt-1">
        Kéo thả tài liệu PDF, DOCX, MD
      </p>
      <p className="font-body-sm text-body-sm text-outline">
        hoặc nhấp để chọn tệp từ máy
      </p>
    </div>
  );
};

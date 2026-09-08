'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { WorkspaceContext } from '../../types/workspace';

interface FrostedWorkspaceBarProps {
  workspace: WorkspaceContext;
  onOpenRagSettings?: () => void;
  onUploadDocument?: () => void;
}

export const FrostedWorkspaceBar: React.FC<FrostedWorkspaceBarProps> = ({
  workspace,
  onOpenRagSettings,
  onUploadDocument,
}) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-20 mx-auto w-full px-space-lg py-space-sm flex items-center justify-between backdrop-blur-2xl bg-surface/75 dark:bg-surface/60 border-b border-black/[0.06] dark:border-white/[0.06] transition-colors">
      {/* Brand & Workspace Name */}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs">
          {!logoError ? (
            <img
              alt="DocStack Shark Logo"
              className="h-8 w-auto object-contain select-none"
              src="/shark_icon.png"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center shadow-[0_0_12px_rgba(79,70,229,0.5)]">
              <Icon name="diamond" className="text-white dark:text-primary text-[18px]" />
            </div>
          )}
          <span className="font-headline-sm text-headline-sm tracking-tight ml-1.5 hidden sm:inline select-none">
            <span className="text-slate-900 dark:text-white font-bold dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-colors">
              Doc
            </span>
            <span className="text-primary font-bold ml-[1px] transition-colors">
              Stack
            </span>
          </span>
          {workspace.isPro && (
            <span className="font-label-mono text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 dark:bg-primary-container/30 text-primary border border-primary/20 tracking-widest font-semibold uppercase">
              PRO
            </span>
          )}
        </div>

        <div className="h-4 w-[1px] bg-black/[0.12] dark:bg-white/[0.12] hidden md:block" />

        {/* Active Workspace Pill Context */}
        <div className="hidden md:flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-container-high/60 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.7)] animate-pulse" />
          <span className="font-label-md text-label-md text-on-surface">
            {workspace.name}
          </span>
          <span className="text-outline font-label-mono text-label-mono">·</span>
          <span className="font-label-mono text-label-mono text-secondary font-medium">
            {workspace.activeDocumentsCount} Tài liệu đồng bộ
          </span>
        </div>
      </div>

      {/* Actions & Profiles Apple Minimal Style */}
      <div className="flex items-center gap-space-xs">
        <button
          onClick={onOpenRagSettings}
          className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-on-surface-variant hover:text-on-surface border border-black/[0.08] dark:border-white/[0.08] transition-all text-body-sm font-body-sm backdrop-blur-md cursor-pointer"
        >
          <Icon name="tune" className="text-[16px]" />
          <span className="hidden sm:inline">Tham số RAG</span>
        </button>

        <button
          onClick={onUploadDocument}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container hover:bg-primary text-on-primary transition-all font-label-md text-label-md shadow-[0_2px_12px_rgba(79,70,229,0.35)] cursor-pointer"
        >
          <Icon name="add" className="text-[16px]" />
          <span className="hidden sm:inline">Nạp Tài liệu</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-container via-surface-container-highest to-secondary-container p-[1px] ml-1">
          <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
            <Icon name="terminal" className="text-primary text-[17px]" />
          </div>
        </div>
      </div>
    </header>
  );
};

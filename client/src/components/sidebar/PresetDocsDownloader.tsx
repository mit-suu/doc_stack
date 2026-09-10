'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { fetchDocPresets, importDocPreset, DocPresetSummary, PresetImportResult } from '../../services/api';

interface PresetDocsDownloaderProps {
  onDownloadComplete?: (result: PresetImportResult) => void;
  showToast?: (message: string) => void;
}

export const PresetDocsDownloader: React.FC<PresetDocsDownloaderProps> = ({
  onDownloadComplete,
  showToast,
}) => {
  const [presets, setPresets] = useState<DocPresetSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPresets() {
      try {
        const list = await fetchDocPresets();
        if (isMounted) {
          setPresets(list);
        }
      } catch (err) {
        console.error('Lỗi khi nạp danh sách bộ tài liệu:', err);
      } finally {
        if (isMounted) {
          setIsLoadingList(false);
        }
      }
    }
    loadPresets();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = async (preset: DocPresetSummary) => {
    if (downloadingId) return;

    setDownloadingId(preset.id);
    const progressMsg = `Đang tải ${preset.name} Docs...`;
    showToast?.(progressMsg);

    try {
      const result = await importDocPreset(preset.id);
      const successCount = result.succeeded.length;
      const total = result.totalUrls;

      showToast?.(`✅ Đã tải ${successCount}/${total} trang ${preset.name}`);
      onDownloadComplete?.(result);
    } catch (err: any) {
      showToast?.(`❌ Lỗi tải ${preset.name}: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all overflow-hidden">
      {/* Compact Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon name="download_for_offline" className="text-primary text-[16px]" />
          <span className="text-[13px] font-semibold text-on-surface tracking-tight">
            Tải Docs về
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary tabular-nums font-semibold">
            {presets.length} bộ
          </span>
          <Icon
            name={isExpanded ? 'expand_less' : 'expand_more'}
            className="text-[16px] text-outline"
          />
        </div>
      </button>

      {/* Downloading Banner */}
      {downloadingId && (
        <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 animate-pulse">
          <Icon name="sync" className="text-primary text-[14px] animate-spin shrink-0" />
          <span className="text-[11px] text-primary font-medium">
            Đang tải docs... (≈1 phút)
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="px-2 pb-2.5">
          {isLoadingList ? (
            <div className="grid grid-cols-2 gap-1.5 px-1">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 px-0.5">
              {presets.map((preset) => {
                const isDownloadingThis = downloadingId === preset.id;
                const isDisabled = !!downloadingId && !isDownloadingThis;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isDisabled || isDownloadingThis}
                    onClick={() => handleDownload(preset)}
                    className={`flex items-center justify-between px-2.5 py-[6px] rounded-lg border text-left transition-all cursor-pointer ${
                      isDownloadingThis
                        ? 'bg-primary/15 border-primary text-primary'
                        : isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-black/[0.02] dark:bg-white/[0.02] border-transparent'
                        : 'bg-surface-container/60 hover:bg-surface-container-high border-black/[0.06] dark:border-white/[0.06] hover:border-primary/40'
                    }`}
                    title={`Tải ${preset.name} Docs (${preset.urlCount} trang)`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Icon
                        name={isDownloadingThis ? 'sync' : 'cloud_download'}
                        className={`text-[13px] shrink-0 ${
                          isDownloadingThis ? 'animate-spin text-primary' : 'text-outline'
                        }`}
                      />
                      <span className="text-[11px] font-medium text-on-surface truncate">
                        {preset.name}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-outline shrink-0 ml-1 tabular-nums">
                      {preset.urlCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

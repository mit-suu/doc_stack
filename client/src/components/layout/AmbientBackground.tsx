import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* VisionOS ambient glow overlays - adapted for light and dark */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-primary/20 via-secondary/10 to-transparent blur-3xl opacity-50 dark:opacity-60 transition-opacity" />
      <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] bg-tertiary-container/15 dark:bg-tertiary-container/10 blur-3xl opacity-30 dark:opacity-40 transition-opacity" />
    </div>
  );
};

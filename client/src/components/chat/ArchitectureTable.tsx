import React from 'react';
import { Icon } from '../ui/Icon';
import { ComparisonCriterion } from '../../types/chat';

interface ArchitectureTableProps {
  title: string;
  subtitle: string;
  badge: string;
  rows: ComparisonCriterion[];
}

export const ArchitectureTable: React.FC<ArchitectureTableProps> = ({
  title,
  subtitle,
  badge,
  rows,
}) => {
  return (
    <div className="p-space-lg rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-space-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            {title}
          </h3>
          <p className="font-body-sm text-body-sm text-outline mt-0.5">
            {subtitle}
          </p>
        </div>
        <span className="font-label-mono text-label-mono px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-black/[0.06] dark:border-white/[0.05]">
          {badge}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/[0.08] dark:border-white/[0.08] text-outline font-label-mono text-label-mono">
              <th className="pb-3 pr-4">TIÊU CHÍ KỸ THUẬT</th>
              <th className="pb-3 px-4 text-secondary">
                REACT SERVER COMPONENTS (RSC)
              </th>
              <th className="pb-3 pl-4 text-on-surface-variant">
                TRADITIONAL SSR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] font-body-sm text-body-sm">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 pr-4 font-medium text-on-surface">
                  {row.criteria}
                </td>
                <td className="py-3.5 px-4 text-on-surface">
                  <div className="flex items-center gap-1.5">
                    {row.rscStatus === 'positive' && (
                      <Icon
                        name="check_circle"
                        className="text-[16px] text-tertiary shrink-0"
                      />
                    )}
                    {row.rscStatus === 'lock' && (
                      <Icon
                        name="lock"
                        className="text-[16px] text-tertiary shrink-0"
                      />
                    )}
                    <span
                      className={
                        row.rscStatus === 'positive' || row.rscStatus === 'lock'
                          ? 'text-tertiary font-medium'
                          : 'text-on-surface'
                      }
                    >
                      {row.rscDetail}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 pl-4 text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    {row.ssrStatus === 'negative' && (
                      <Icon
                        name="cancel"
                        className="text-[16px] text-error shrink-0"
                      />
                    )}
                    <span
                      className={
                        row.ssrStatus === 'negative'
                          ? 'text-error'
                          : 'text-on-surface-variant'
                      }
                    >
                      {row.ssrDetail}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

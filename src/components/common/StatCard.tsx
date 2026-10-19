import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emerald' | 'amber' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
}) => {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg p-4 space-y-2 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
          {value}
        </h3>
        {subtext && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

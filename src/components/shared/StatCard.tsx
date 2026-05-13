import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl transition-all duration-300 hover:border-neon-orange/20 hover:shadow-[0_0_20px_rgba(255,85,0,0.05)]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-neon-orange/10 p-2.5">
          <Icon size={20} className="text-neon-orange" />
        </div>
        {trend && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              trend.positive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="mt-4 font-orbitron text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

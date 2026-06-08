import type { ReactNode } from 'react';
import { StatsCard } from '../shared/StatsCard';

export interface UserInfoItem {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'accent' | 'warning';
  onClick?: () => void;
}

interface UserInfoGridProps {
  items: UserInfoItem[];
}

const toneClasses: Record<NonNullable<UserInfoItem['tone']>, string> = {
  default: '',
  accent: 'border-xo-cyan/25 bg-xo-cyan/10',
  warning: 'border-amber-400/30 bg-amber-500/10',
};

export function UserInfoGrid({ items }: UserInfoGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <StatsCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          onClick={item.onClick}
          className={toneClasses[item.tone ?? 'default']}
          valueClassName="text-xs sm:text-sm"
        />
      ))}
    </div>
  );
}

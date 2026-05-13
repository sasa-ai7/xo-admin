import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ResponsiveTabOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface ResponsiveTabsProps<T extends string> {
  tabs: Array<ResponsiveTabOption<T>>;
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
}

export function ResponsiveTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: ResponsiveTabsProps<T>) {
  return (
    <div className={cn('max-w-full min-w-0', className)}>
      <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === activeTab;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 sm:px-4',
                isActive
                  ? 'border-neon-orange bg-neon-orange text-black shadow-[0_0_15px_rgba(255,85,0,0.24)]'
                  : 'border-neon-orange/10 bg-black/30 text-gray-300 hover:border-neon-orange/25 hover:text-white'
              )}
            >
              {Icon ? <Icon size={13} className="shrink-0" /> : null}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

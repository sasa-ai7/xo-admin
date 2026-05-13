/* eslint-disable react-refresh/only-export-components -- shared presets + component */
import { useState } from 'react';
import {
  startOfDay,
  subDays,
  subMonths,
  subYears,
  startOfYesterday,
  endOfYesterday,
} from 'date-fns';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../i18n/LanguageContext';

export type DatePreset = 'today' | 'yesterday' | '7d' | '15d' | '30d' | '3mo' | '1yr' | 'all' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
  preset: DatePreset;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets: { key: DatePreset; labelKey: keyof ReturnType<typeof usePresetLabels> }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'today', labelKey: 'today' },
  { key: 'yesterday', labelKey: 'yesterday' },
  { key: '7d', labelKey: '7d' },
  { key: '15d', labelKey: '15d' },
  { key: '30d', labelKey: '30d' },
  { key: '3mo', labelKey: '3mo' },
  { key: '1yr', labelKey: '1yr' },
];

function usePresetLabels() {
  const { t } = useLanguage();
  return {
    all: t('allTime'),
    today: t('today'),
    yesterday: t('yesterday'),
    '7d': t('last7days'),
    '15d': t('last15days'),
    '30d': t('last30days'),
    '3mo': t('last3months'),
    '1yr': t('lastYear'),
    custom: t('customRange'),
  };
}

export function getDateRangeFromPreset(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: now };
    case 'yesterday':
      return { from: startOfYesterday(), to: endOfYesterday() };
    case '7d':
      return { from: subDays(now, 7), to: now };
    case '15d':
      return { from: subDays(now, 15), to: now };
    case '30d':
      return { from: subDays(now, 30), to: now };
    case '3mo':
      return { from: subMonths(now, 3), to: now };
    case '1yr':
      return { from: subYears(now, 1), to: now };
    case 'all':
      return { from: null, to: null };
    case 'custom':
      return { from: null, to: null };
  }
}

export function createDateRange(preset: DatePreset): DateRange {
  return { ...getDateRangeFromPreset(preset), preset };
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const labels = usePresetLabels();
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      onChange({ from: value.from, to: value.to, preset: 'custom' });
      return;
    }
    setShowCustom(false);
    onChange(createDateRange(preset));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => handlePreset(p.key)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            value.preset === p.key
              ? 'bg-neon-orange/15 text-neon-orange shadow-[0_0_8px_rgba(255,85,0,0.15)]'
              : 'text-gray-500 hover:bg-glass-hover hover:text-gray-300'
          )}
        >
          {labels[p.labelKey]}
        </button>
      ))}
      <button
        onClick={() => handlePreset('custom')}
        className={cn(
          'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
          value.preset === 'custom'
            ? 'bg-neon-orange/15 text-neon-orange'
            : 'text-gray-500 hover:bg-glass-hover hover:text-gray-300'
        )}
      >
        {labels.custom}
      </button>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-lg border border-glass-border bg-black/50 px-2 py-1 text-xs text-gray-300 outline-none focus:border-neon-orange/50"
            value={value.from ? value.from.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const from = e.target.value ? new Date(e.target.value) : null;
              onChange({ from, to: value.to, preset: 'custom' });
            }}
          />
          <span className="text-xs text-gray-600">–</span>
          <input
            type="date"
            className="rounded-lg border border-glass-border bg-black/50 px-2 py-1 text-xs text-gray-300 outline-none focus:border-neon-orange/50"
            value={value.to ? value.to.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const to = e.target.value ? new Date(e.target.value) : null;
              onChange({ from: value.from, to, preset: 'custom' });
            }}
          />
        </div>
      )}
    </div>
  );
}

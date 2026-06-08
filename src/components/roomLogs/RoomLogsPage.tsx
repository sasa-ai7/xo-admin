import { useState, useMemo } from 'react';
import { ScrollText, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRoomHistory } from '../../hooks/useRoomHistory';
import { GlassCard } from '../shared/GlassCard';
import { SearchInput } from '../shared/SearchInput';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { NeonButton } from '../shared/NeonButton';
import { DateRangeFilter, createDateRange, type DateRange } from '../shared/DateRangeFilter';
import { MatchCard } from './MatchCard';
import { IconBadge } from '../shared/IconBadge';

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try { return (value as { toDate(): Date }).toDate().getTime(); } catch { return 0; }
  }
  return 0;
}

export function RoomLogsPage() {
  const { t } = useLanguage();
  const { data: matches, loading, error, loadingMore, hasMore, loadMore } = useRoomHistory({
    liveLimit: 100,
    pageSize: 50,
  });
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(createDateRange('all'));

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesCode = match.roomCode?.toLowerCase().includes(q) ?? false;
        const matchesId = match.id.toLowerCase().includes(q);
        const matchesPlayer = match.players?.some(
          (p) =>
            p.displayName?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.uid.toLowerCase().includes(q)
        ) ?? false;
        if (!matchesCode && !matchesId && !matchesPlayer) return false;
      }

      if (dateRange.from || dateRange.to) {
        const ms = toMs(match.createdAt);
        if (ms === 0) return false;
        if (dateRange.from && ms < dateRange.from.getTime()) return false;
        if (dateRange.to && ms > dateRange.to.getTime()) return false;
      }

      return true;
    });
  }, [matches, search, dateRange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={ScrollText} variant="logs" size="md" hex />
        <h1 className="font-orbitron text-lg font-bold text-xo-text sm:text-xl">
          {t('roomLogs')}
        </h1>
        {!loading && (
          <span className="rounded-full bg-xo-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-xo-cyan">
            {matches.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('searchByRoomCode')}
          className="sm:max-w-xs"
        />
      </div>

      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {error && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle size={16} />
            <span>Failed to load match history: {error.message}</span>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <EmptyState icon={ScrollText} message={t('noMatchesFound')} />
        ) : (
          <div>
            {filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </GlassCard>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <NeonButton
            onClick={loadMore}
            disabled={loadingMore}
            variant="blue"
          >
            {loadingMore ? (
              <LoadingSpinner size="sm" />
            ) : (
              t('loadOlderMatches')
            )}
          </NeonButton>
        </div>
      )}
    </div>
  );
}

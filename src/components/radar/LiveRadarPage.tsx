import { useMemo } from 'react';
import { useUserLogs } from '../../hooks/useUserLogs';
import { useUsers } from '../../hooks/useUsers';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import type { UserLog } from '../../types/userLog';

const eventColors: Record<string, string> = {
  login: 'text-green-400',
  app_open: 'text-gray-400',
  match_started: 'text-neon-cyan',
  match_ended: 'text-amber-400',
};

const platformBadge: Record<string, { bg: string; text: string }> = {
  android: { bg: 'bg-green-500/20', text: 'text-green-400' },
  ios: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  unknown: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
};

function LogEntry({ log, email }: { log: UserLog; email?: string }) {
  const color = eventColors[log.eventType || ''] || 'text-gray-400';
  const badge = platformBadge[log.platform || 'unknown'] || platformBadge.unknown;

  const detailStr = log.details
    ? Object.entries(log.details)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2.5 border-b border-glass-border/30 px-3 py-2.5 transition-colors hover:bg-glass-hover sm:flex-nowrap sm:px-4">
      <span className="shrink-0 text-xs text-gray-600">
        {formatDate(log.timestamp ?? log.createdAt)}
      </span>

      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}
      >
        {log.platform || '?'}
      </span>

      <span className={`shrink-0 font-mono text-xs font-bold ${color}`}>
        {log.eventType || 'unknown'}
      </span>

      <span className="shrink-0 font-mono text-xs text-neon-cyan/80" title={log.uid || ''}>
        {email || (log.uid ? log.uid.slice(0, 10) + '...' : '---')}
      </span>

      {detailStr && (
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-600">
          {detailStr}
        </span>
      )}
    </div>
  );
}

export function LiveRadarPage() {
  const { t } = useLanguage();
  const { data: logs, loading: feedLoading } = useUserLogs(true);
  const { data: users } = useUsers();

  const emailMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.id && u.Profile?.email) map.set(u.id, u.Profile.email);
    }
    return map;
  }, [users]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <h2 className="font-orbitron text-base font-bold text-white sm:text-lg">
            {t('liveRadar')}
          </h2>
          <span className="rounded-full bg-red-500/10 px-3 py-0.5 text-xs font-bold text-red-400">
            {t('live')}
          </span>
          <span className="text-xs text-gray-500">
            {logs.length} events
          </span>
        </div>
      </div>

      <GlassCard className="max-w-full overflow-hidden">
        {feedLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="max-h-[70dvh] overflow-y-auto bg-black/40 font-mono">
            {logs.length === 0 ? (
              <div className="flex h-32 items-center justify-center px-4 text-center text-gray-600">
                {t('noData')}
              </div>
            ) : (
              logs.map((log) => <LogEntry key={log.id} log={log} email={log.uid ? emailMap.get(log.uid) : undefined} />)
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

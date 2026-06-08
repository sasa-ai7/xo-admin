import { useMemo, useState } from 'react';
import { Activity, Radio, ScrollText } from 'lucide-react';
import { useUserLogs } from '../../hooks/useUserLogs';
import { useUsers } from '../../hooks/useUsers';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { SearchInput } from '../shared/SearchInput';
import { CopyButton } from '../shared/CopyButton';
import { DetailsDrawer } from '../shared/DetailsDrawer';
import { JsonViewer } from '../shared/JsonViewer';
import { UserAvatar } from '../shared/UserAvatar';
import { ErrorState } from '../shared/ErrorState';
import { formatDate } from '../../utils/formatters';
import { formatRelativeTime } from '../../utils/relativeTime';
import { shortUid, usersById } from '../../utils/avatar';
import { cn } from '../../utils/cn';
import type { UserLog } from '../../types/userLog';

type SourceFilter = 'all' | 'user' | 'audit';

const DAY = 24 * 60 * 60 * 1000;

const DATE_FILTERS: Array<{ value: number | 'all'; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 1, label: 'Last 24h' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
];

function isAuditLog(log: UserLog): boolean {
  return Boolean(log.id?.startsWith('audit:'));
}

export function LiveRadarPage() {
  const { t } = useLanguage();
  const { data: logs, loading: feedLoading, error } = useUserLogs(true);
  const { data: users } = useUsers();
  const usersMap = useMemo(() => usersById(users), [users]);

  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [dateFilter, setDateFilter] = useState<number | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<UserLog | null>(null);
  const [filterNow] = useState(() => Date.now());

  const distinctEvents = useMemo(() => {
    const s = new Set<string>();
    for (const log of logs) {
      const e = log.eventName ?? log.eventType;
      if (e) s.add(e);
    }
    return Array.from(s).sort();
  }, [logs]);

  const emailMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.id && u.Profile?.email) map.set(u.id, u.Profile.email);
    }
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = dateFilter === 'all' ? null : filterNow - dateFilter * DAY;
    return logs.filter((log) => {
      if (sourceFilter === 'audit' && !isAuditLog(log)) return false;
      if (sourceFilter === 'user' && isAuditLog(log)) return false;

      const evt = log.eventName ?? log.eventType ?? '';
      if (eventFilter !== 'all' && evt !== eventFilter) return false;

      if (cutoff != null) {
        const ts =
          typeof log.timestamp === 'number'
            ? log.timestamp
            : typeof log.createdAt === 'number'
              ? log.createdAt
              : 0;
        if (ts < cutoff) return false;
      }

      if (q) {
        if (evt.toLowerCase().includes(q)) return true;
        if (log.uid?.toLowerCase().includes(q)) return true;
        const email = log.uid ? emailMap.get(log.uid) : undefined;
        if (email?.toLowerCase().includes(q)) return true;
        if (log.platform?.toLowerCase().includes(q)) return true;
        return false;
      }
      return true;
    });
  }, [logs, search, eventFilter, sourceFilter, dateFilter, emailMap, filterNow]);

  const userCount = filtered.filter((l) => !isAuditLog(l)).length;
  const auditCount = filtered.length - userCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <h1 className="font-orbitron text-base font-bold text-white sm:text-lg">
            Live Activity & Audit Logs
          </h1>
          <span className="rounded-full bg-red-500/10 px-3 py-0.5 text-xs font-bold text-red-400">
            {t('live')}
          </span>
          <span className="text-xs text-gray-500">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Activity size={11} className="text-emerald-400" />
            {userCount} user
          </span>
          <span className="inline-flex items-center gap-1">
            <ScrollText size={11} className="text-neon-purple" />
            {auditCount} audit
          </span>
        </div>
      </div>

      {error && <ErrorState title="Failed to load activity" message={error.message} />}

      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search event, UID, email, platform…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterPill
                active={sourceFilter === 'all'}
                onClick={() => setSourceFilter('all')}
                label="All sources"
              />
              <FilterPill
                active={sourceFilter === 'user'}
                onClick={() => setSourceFilter('user')}
                label="User logs"
              />
              <FilterPill
                active={sourceFilter === 'audit'}
                onClick={() => setSourceFilter('audit')}
                label="Audit logs"
              />
            </div>
            <span className="hidden h-5 w-px bg-glass-border sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              {DATE_FILTERS.map((d) => (
                <FilterPill
                  key={String(d.value)}
                  active={dateFilter === d.value}
                  onClick={() => setDateFilter(d.value)}
                  label={d.label}
                  variant="cyan"
                />
              ))}
            </div>
          </div>
          {distinctEvents.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterPill
                active={eventFilter === 'all'}
                onClick={() => setEventFilter('all')}
                label="All events"
              />
              {distinctEvents.map((e) => (
                <FilterPill
                  key={e}
                  active={eventFilter === e}
                  onClick={() => setEventFilter(e)}
                  label={e}
                  size="xs"
                />
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard className="max-w-full overflow-hidden">
        {feedLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Radio} message="No matching activity yet" />
        ) : (
          <div className="max-h-[70dvh] overflow-y-auto">
            {filtered.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                email={log.uid ? emailMap.get(log.uid) : undefined}
                user={log.uid ? usersMap.get(log.uid) : undefined}
                onSelect={() => setSelectedLog(log)}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <DetailsDrawer
        open={selectedLog != null}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.eventName ?? selectedLog?.eventType ?? 'Log entry'}
        subtitle={
          selectedLog ? (
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  isAuditLog(selectedLog)
                    ? 'bg-neon-purple/15 text-neon-purple'
                    : 'bg-emerald-500/15 text-emerald-300'
                )}
              >
                {isAuditLog(selectedLog) ? 'Audit' : 'User'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(selectedLog.timestamp ?? selectedLog.createdAt)}
              </span>
            </span>
          ) : null
        }
        headerExtras={
          selectedLog?.uid ? (
            <CopyButton value={selectedLog.uid} label="UID" size="sm" stopPropagation={false} />
          ) : undefined
        }
      >
        {selectedLog && (
          <div className="space-y-4">
            <section className="rounded-xl border border-glass-border bg-black/30 p-3 text-xs">
              <KeyRow label="Event" value={<span className="font-mono">{selectedLog.eventName ?? selectedLog.eventType ?? '—'}</span>} />
              <KeyRow
                label="UID"
                value={
                  selectedLog.uid ? (
                    <span className="inline-flex items-center gap-2 font-mono">
                      {selectedLog.uid}
                      <CopyButton value={selectedLog.uid} label="UID" size="xs" stopPropagation={false} />
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <KeyRow
                label="Email"
                value={
                  selectedLog.uid && emailMap.get(selectedLog.uid)
                    ? emailMap.get(selectedLog.uid)
                    : '—'
                }
              />
              <KeyRow label="Platform" value={selectedLog.platform ?? '—'} />
              <KeyRow
                label="Source"
                value={isAuditLog(selectedLog) ? 'audit_logs' : 'user_logs'}
              />
              <KeyRow
                label="When"
                value={
                  <span>
                    {formatDate(selectedLog.timestamp ?? selectedLog.createdAt)} ·{' '}
                    {formatRelativeTime(selectedLog.timestamp ?? selectedLog.createdAt)}
                  </span>
                }
              />
            </section>
            <JsonViewer data={selectedLog} title="Full payload" defaultOpen />
          </div>
        )}
      </DetailsDrawer>
    </div>
  );
}

interface LogRowProps {
  log: UserLog;
  email?: string;
  user?: ReturnType<Map<string, import('../../types/user').AppUser>['get']>;
  onSelect: () => void;
}

function LogRow({ log, email, user, onSelect }: LogRowProps) {
  const isAudit = isAuditLog(log);
  const evt = log.eventName ?? log.eventType ?? 'unknown';
  const detailStr = log.details
    ? Object.entries(log.details)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .slice(0, 5)
        .join(' ')
    : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full min-w-0 flex-wrap items-center gap-2.5 border-b border-glass-border/30 px-3 py-2.5 text-start transition-colors hover:bg-glass-hover sm:flex-nowrap sm:px-4"
    >
      <span className="shrink-0 text-[11px] text-gray-600">
        {formatDate(log.timestamp ?? log.createdAt)}
      </span>
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
          isAudit ? 'bg-neon-purple/20 text-neon-purple' : 'bg-emerald-500/20 text-emerald-400'
        )}
      >
        {isAudit ? 'AUDIT' : 'USER'}
      </span>
      <span className="shrink-0 font-mono text-[11px] font-bold text-neon-cyan/90">{evt}</span>
      <div className="flex shrink-0 items-center gap-2">
        <UserAvatar
          photoURL={user?.Profile?.photoURL ?? null}
          displayName={user?.Profile?.displayName ?? email ?? log.uid ?? null}
          equippedAvatar={user?.Cosmetics?.equippedAvatar ?? null}
          size="xs"
        />
        <span className="font-mono text-[11px] text-gray-400" title={log.uid ?? ''}>
          {email ?? (log.uid ? shortUid(log.uid) : '—')}
        </span>
      </div>
      {detailStr && (
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-600">
          {detailStr}
        </span>
      )}
    </button>
  );
}

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  label: string;
  variant?: 'sky' | 'cyan';
  size?: 'xs' | 'sm';
}

function FilterPill({ active, onClick, label, variant = 'sky', size = 'sm' }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border font-semibold transition-all',
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs',
        active
          ? variant === 'cyan'
            ? 'border-xo-cyan bg-xo-cyan/20 text-xo-cyan'
            : 'border-xo-cyan bg-xo-cyan text-xo-bg-deep'
          : 'border-xo-border bg-xo-panel/60 text-xo-muted hover:border-xo-border-active hover:text-xo-text'
      )}
    >
      {label}
    </button>
  );
}

interface KeyRowProps {
  label: string;
  value: React.ReactNode;
}

function KeyRow({ label, value }: KeyRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="min-w-0 break-all text-end text-gray-200">{value}</span>
    </div>
  );
}

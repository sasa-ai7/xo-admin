import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { AlertCircle, Download, ExternalLink, ShieldOff, Trash2 } from 'lucide-react';
import { COLLECTIONS } from '../../firebase/collections';
import { db } from '../../firebase/config';
import { useDeletionFeedback } from '../../hooks/useDeletionFeedback';
import { useDeletionRequests } from '../../hooks/useDeletionRequests';
import { useDeletedAccounts } from '../../hooks/useDeletedAccounts';
import { useUsers } from '../../hooks/useUsers';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { UserAvatar } from '../shared/UserAvatar';
import { CopyButton } from '../shared/CopyButton';
import { formatDate, formatNumber } from '../../utils/formatters';
import { formatRelativeTime } from '../../utils/relativeTime';
import { shortUid, usersById } from '../../utils/avatar';
import { toMs } from '../../utils/userPresence';
import type { AppUser } from '../../types/user';
import { IconBadge } from '../shared/IconBadge';

type MergedSource = 'request' | 'feedback' | 'deleted';

interface MergedRecord {
  id: string;
  source: MergedSource;
  uid?: string;
  email?: string;
  displayName?: string;
  reason?: string;
  status?: string;
  finalBalance?: number;
  totalGames?: number;
  time: number;
  raw: Record<string, unknown>;
}

function bestName(record: MergedRecord, user?: AppUser): string {
  return (
    record.displayName ??
    user?.Profile?.displayName ??
    user?.Profile?.name ??
    record.email ??
    user?.Profile?.email ??
    record.uid ??
    record.id
  );
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DeletedAccountsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAuthenticated);
  const { data: feedback, loading: feedbackLoading, error: feedbackError } = useDeletionFeedback();
  const { data: requests, loading: requestsLoading, error: requestsError } = useDeletionRequests();
  const { data: deletedAccounts, loading: deletedLoading, error: deletedError } = useDeletedAccounts();
  const { data: users } = useUsers();
  const usersMap = useMemo(() => usersById(users), [users]);
  const [clearing, setClearing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<MergedSource | 'all'>('all');

  const merged = useMemo<MergedRecord[]>(() => {
    const byKey = new Map<string, MergedRecord>();
    const pick = (key: string, candidate: MergedRecord) => {
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, candidate);
        return;
      }
      // Prefer the freshest record but keep "request" source if we already saw one.
      if (candidate.time > existing.time) {
        byKey.set(key, {
          ...candidate,
          // Preserve request status so admins see the request lifecycle.
          source: existing.source === 'request' ? 'request' : candidate.source,
        });
      }
    };

    for (const r of requests) {
      const key = r.uid || r.email || r.id;
      pick(key, {
        id: r.id,
        source: 'request',
        uid: r.uid,
        email: r.email,
        displayName: r.displayName,
        reason: (r.reason ?? r.feedback) as string | undefined,
        status: r.status,
        time: toMs(r.createdAt ?? r.requestedAt ?? r.updatedAt),
        raw: r as unknown as Record<string, unknown>,
      });
    }
    for (const r of feedback) {
      const key = r.uid || r.email || r.id;
      pick(key, {
        id: r.id,
        source: 'feedback',
        uid: r.uid,
        email: r.email,
        reason: r.reason,
        finalBalance: r.finalBalance,
        totalGames: r.totalGames,
        time: toMs(r.deletionDate ?? r.createdAt),
        raw: r as unknown as Record<string, unknown>,
      });
    }
    for (const r of deletedAccounts) {
      const key = r.uid || r.email || r.id;
      pick(key, {
        id: r.id,
        source: 'deleted',
        uid: r.uid,
        email: r.email,
        displayName: r.displayName,
        reason: r.reason,
        status: r.status,
        finalBalance: r.finalBalance,
        totalGames: r.totalGames,
        time: toMs(r.deletedAt ?? r.createdAt),
        raw: r as unknown as Record<string, unknown>,
      });
    }
    return Array.from(byKey.values()).sort((a, b) => b.time - a.time);
  }, [feedback, requests, deletedAccounts]);

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return merged;
    return merged.filter((r) => r.source === sourceFilter);
  }, [merged, sourceFilter]);

  const totals = useMemo(
    () => ({
      finalBalance: merged.reduce((sum, item) => sum + Number(item.finalBalance ?? 0), 0),
      totalGames: merged.reduce((sum, item) => sum + Number(item.totalGames ?? 0), 0),
      requests: merged.filter((r) => r.source === 'request').length,
      feedback: merged.filter((r) => r.source === 'feedback').length,
      deleted: merged.filter((r) => r.source === 'deleted').length,
    }),
    [merged]
  );

  const loading = feedbackLoading && requestsLoading && deletedLoading && merged.length === 0;
  const anyError = feedbackError ?? requestsError ?? deletedError;

  const handleClearFeedbackLog = async () => {
    if (!isAdmin || clearing || feedback.length === 0) return;
    if (!window.confirm('Clear all deletion_feedback records? (does not touch deletion_requests or deleted_accounts)')) return;
    setClearing(true);
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.deletionFeedback));
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((docItem) => batch.delete(docItem.ref));
        await batch.commit();
      }
    } catch (err) {
      console.error('Clear feedback log error:', err);
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={Trash2} variant="deletion" size="md" hex />
          <div className="min-w-0">
            <h2 className="font-orbitron text-lg font-bold text-white">{t('deletedAccounts')}</h2>
            <p className="text-xs text-gray-500">
              Merged from deletion_requests, deletion_feedback, deleted_accounts
            </p>
          </div>
            <span className="rounded-full bg-xo-cyan/10 px-3 py-0.5 font-orbitron text-xs font-bold text-xo-cyan">
            {merged.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-[10px] font-medium text-amber-300"
            title="Hard delete requires a secure Cloud Function — not implemented in the admin UI."
          >
            <ShieldOff size={11} />
            Hard delete via Cloud Function only
          </span>
          <button
            onClick={handleClearFeedbackLog}
            disabled={!isAdmin || clearing || feedback.length === 0}
            className="rounded-full border border-xo-cyan/50 bg-xo-cyan/10 px-4 py-2 font-orbitron text-[11px] font-bold text-xo-cyan transition-all hover:border-xo-border-active hover:bg-xo-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {clearing ? 'Clearing…' : 'Clear feedback log'}
          </button>
        </div>
      </div>

      {anyError && (
        <GlassCard className="border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">Some deletion sources failed</p>
              <p className="mt-1 text-xs text-red-200/70">{anyError.message || 'Unknown error'}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <GlassCard className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total</p>
          <p className="mt-1 font-orbitron text-xl text-xo-cyan">{formatNumber(merged.length)}</p>
        </GlassCard>
        <GlassCard className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Requests</p>
          <p className="mt-1 font-orbitron text-xl text-amber-300">{formatNumber(totals.requests)}</p>
        </GlassCard>
        <GlassCard className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Feedback</p>
          <p className="mt-1 font-orbitron text-xl text-neon-cyan">{formatNumber(totals.feedback)}</p>
        </GlassCard>
        <GlassCard className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Deleted</p>
          <p className="mt-1 font-orbitron text-xl text-red-300">{formatNumber(totals.deleted)}</p>
        </GlassCard>
        <GlassCard className="p-3 sm:col-span-1 col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Σ Final Balance</p>
          <p className="mt-1 font-orbitron text-xl text-white">{formatNumber(totals.finalBalance)}</p>
        </GlassCard>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(['all', 'request', 'feedback', 'deleted'] as const).map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => setSourceFilter(src)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              sourceFilter === src
                ? 'border-xo-cyan bg-xo-cyan text-black'
                : 'border-glass-border bg-black/30 text-gray-400 hover:border-xo-cyan/30 hover:text-white'
            }`}
          >
            {src === 'all' ? 'All sources' : src.charAt(0).toUpperCase() + src.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <GlassCard>
          <EmptyState icon={Trash2} message="No deletion records yet" />
        </GlassCard>
      ) : (
        <GlassCard className="divide-y divide-glass-border/30">
          {filtered.map((record) => {
            const user = record.uid ? usersMap.get(record.uid) : undefined;
            const name = bestName(record, user);
            return (
              <div key={`${record.source}:${record.id}`} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <UserAvatar
                  photoURL={user?.Profile?.photoURL ?? null}
                  displayName={name}
                  equippedAvatar={user?.Cosmetics?.equippedAvatar ?? null}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-white">{name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        record.source === 'request'
                          ? 'bg-amber-500/10 text-amber-300'
                          : record.source === 'feedback'
                            ? 'bg-neon-cyan/10 text-neon-cyan'
                            : 'bg-red-500/10 text-red-300'
                      }`}
                    >
                      {record.source}
                    </span>
                    {record.status && (
                      <span className="rounded-full bg-glass-bg px-2 py-0.5 text-[10px] text-gray-300">
                        {record.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    {record.email && <span>{record.email}</span>}
                    {record.uid && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        {shortUid(record.uid)}
                        <CopyButton value={record.uid} label="UID" size="xs" stopPropagation={false} />
                      </span>
                    )}
                    {record.time > 0 && (
                      <span>
                        {formatDate(record.time)} · {formatRelativeTime(record.time)}
                      </span>
                    )}
                    {typeof record.finalBalance === 'number' && (
                      <span className="text-neon-cyan">
                        Final balance: {formatNumber(record.finalBalance)}
                      </span>
                    )}
                    {typeof record.totalGames === 'number' && (
                      <span>Games: {formatNumber(record.totalGames)}</span>
                    )}
                  </div>
                  {record.reason && (
                    <p className="mt-2 line-clamp-3 rounded-lg border border-glass-border bg-black/30 px-3 py-2 text-[11px] text-gray-300">
                      {record.reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {record.uid && (
                    <button
                      type="button"
                      onClick={() => navigate(`/users?uid=${encodeURIComponent(record.uid!)}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-glass-border bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-xo-cyan/40 hover:text-xo-cyan"
                    >
                      Open profile <ExternalLink size={10} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadJson(`${record.source}-${record.id}.json`, record.raw)}
                    className="inline-flex items-center gap-1 rounded-lg border border-glass-border bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition-colors hover:border-neon-cyan/40 hover:text-neon-cyan"
                  >
                    Export JSON <Download size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { AlertCircle, Trash2 } from 'lucide-react';
import { COLLECTIONS } from '../../firebase/collections';
import { db } from '../../firebase/config';
import { useDeletionFeedback } from '../../hooks/useDeletionFeedback';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { formatDate, formatNumber } from '../../utils/formatters';

export function DeletedAccountsPage() {
  const { t } = useLanguage();
  const isAdmin = useAuthStore((state) => state.isAuthenticated);
  const { data: records, loading, error } = useDeletionFeedback();
  const [clearing, setClearing] = useState(false);

  const totals = useMemo(
    () => ({
      finalBalance: records.reduce((sum, item) => sum + Number(item.finalBalance ?? 0), 0),
      totalGames: records.reduce((sum, item) => sum + Number(item.totalGames ?? 0), 0),
    }),
    [records]
  );

  const handleClearLog = async () => {
    if (!isAdmin || clearing || records.length === 0) return;
    if (!window.confirm('Are you sure you want to delete all deletion feedback records?')) return;

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
      console.error('Clear log error:', err);
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-orange/10">
            <Trash2 size={20} className="text-neon-orange" />
          </div>
          <div className="min-w-0">
            <h2 className="font-orbitron text-lg font-bold text-white">
              {t('deletedAccounts')}
            </h2>
            <p className="text-xs text-gray-500">{t('ghostDescription')}</p>
          </div>
          <span className="rounded-full bg-neon-orange/10 px-3 py-0.5 font-orbitron text-xs font-bold text-neon-orange">
            {records.length}
          </span>
        </div>

        <button
          onClick={handleClearLog}
          disabled={!isAdmin || clearing || records.length === 0}
          className="w-full rounded-full border border-neon-orange/50 bg-neon-orange/10 px-5 py-2 font-orbitron text-xs font-bold text-neon-orange transition-all hover:border-neon-orange/70 hover:bg-neon-orange/20 hover:shadow-[0_0_15px_rgba(255,85,0,0.3)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {clearing ? 'Clearing...' : t('clearLog')}
        </button>
      </div>

      {error ? (
        <GlassCard className="border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">Failed to load deletion feedback</p>
              <p className="mt-1 text-xs text-red-200/70">
                {error.message || 'Unknown Firestore error'}
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}

      {records.length === 0 ? (
        <GlassCard className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">{t('noData')}</p>
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <GlassCard className="p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Deleted Accounts</p>
              <p className="mt-2 font-orbitron text-xl text-neon-orange">
                {formatNumber(records.length)}
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Total Final Balance</p>
              <p className="mt-2 font-orbitron text-xl text-neon-cyan">
                {formatNumber(totals.finalBalance)}
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Total Games</p>
              <p className="mt-2 font-orbitron text-xl text-white">
                {formatNumber(totals.totalGames)}
              </p>
            </GlassCard>
          </div>

          <GlassCard className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[760px] w-full">
                <thead>
                  <tr className="border-b border-glass-border bg-black/30">
                    <th className="px-4 py-3 text-left font-orbitron text-[11px] uppercase tracking-wider text-gray-500">
                      {t('email')}
                    </th>
                    <th className="px-4 py-3 text-left font-orbitron text-[11px] uppercase tracking-wider text-gray-500">
                      {t('uid')}
                    </th>
                    <th className="px-4 py-3 text-left font-orbitron text-[11px] uppercase tracking-wider text-gray-500">
                      {t('finalBalance')}
                    </th>
                    <th className="px-4 py-3 text-left font-orbitron text-[11px] uppercase tracking-wider text-gray-500">
                      {t('totalGames')}
                    </th>
                    <th className="px-4 py-3 text-left font-orbitron text-[11px] uppercase tracking-wider text-gray-500">
                      {t('deletionDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const uid = record.uid || record.id;
                    const dateLabel = formatDate(record.deletionDate || record.createdAt);

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-glass-border/40 transition-colors hover:bg-neon-orange/5"
                      >
                        <td className="px-4 py-3 text-sm text-neon-orange">
                          <span className="block max-w-[220px] truncate">{record.email || '—'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-300">
                          <span className="block max-w-[220px] truncate" title={uid}>
                            {uid}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-orbitron text-sm text-neon-cyan">
                          {formatNumber(Number(record.finalBalance ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {formatNumber(Number(record.totalGames ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{dateLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {records.map((record) => {
                const uid = record.uid || record.id;
                const dateLabel = formatDate(record.deletionDate || record.createdAt);

                return (
                  <div
                    key={record.id}
                    className="rounded-2xl border border-glass-border bg-black/30 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neon-orange">
                        {record.email || '—'}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-gray-500">{uid}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">
                          {t('finalBalance')}
                        </p>
                        <p className="mt-1 font-orbitron text-sm text-neon-cyan">
                          {formatNumber(Number(record.finalBalance ?? 0))}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-600">
                          {t('totalGames')}
                        </p>
                        <p className="mt-1 text-sm text-white">
                          {formatNumber(Number(record.totalGames ?? 0))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-600">
                        {t('deletionDate')}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">{dateLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

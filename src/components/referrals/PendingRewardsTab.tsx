import { useMemo } from 'react';
import { Gift } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { usePendingReferralRewards } from '../../hooks/usePendingReferralRewards';
import { Badge } from '../shared/Badge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';

function formatTs(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try { return (value as { toDate(): Date }).toDate().toLocaleDateString(); } catch { return '—'; }
  }
  if (typeof value === 'number') return new Date(value).toLocaleDateString();
  if (typeof value === 'string') return new Date(value).toLocaleDateString();
  return '—';
}

const statusVariant: Record<string, 'amber' | 'green' | 'red' | 'gray'> = {
  pending: 'amber',
  claimed: 'green',
  expired: 'red',
};

export function PendingRewardsTab() {
  const { t } = useLanguage();
  const { data: rewards, loading, error } = usePendingReferralRewards();

  const sorted = useMemo(() => {
    return [...rewards].sort((a, b) => {
      const statusOrder: Record<string, number> = { pending: 0, claimed: 1, expired: 2 };
      return (statusOrder[a.status ?? ''] ?? 3) - (statusOrder[b.status ?? ''] ?? 3);
    });
  }, [rewards]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-sm text-red-400">Failed to load rewards: {error.message}</p>;
  }

  if (sorted.length === 0) {
    return <EmptyState icon={Gift} message={t('noPendingRewards')} />;
  }

  return (
    <div className="overflow-x-auto p-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-glass-border text-left text-gray-500">
            <th className="px-3 py-2 font-semibold">{t('email')}</th>
            <th className="px-3 py-2 font-semibold">{t('referralCode')}</th>
            <th className="px-3 py-2 font-semibold">{t('rewardType')}</th>
            <th className="px-3 py-2 font-semibold text-end">{t('rewardAmount')}</th>
            <th className="px-3 py-2 font-semibold text-center">{t('status')}</th>
            <th className="px-3 py-2 font-semibold">{t('dateTime')}</th>
            <th className="px-3 py-2 font-semibold">{t('expiresAt')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((reward) => (
            <tr
              key={reward.id}
              className="border-b border-glass-border/50 transition-colors hover:bg-glass-hover"
            >
              <td className="px-3 py-2.5 text-gray-300">
                {reward.email || reward.uid || '—'}
              </td>
              <td className="px-3 py-2.5 font-mono text-neon-cyan">
                {reward.referralCode || '—'}
              </td>
              <td className="px-3 py-2.5 text-gray-300">
                {reward.rewardType || '—'}
              </td>
              <td className="px-3 py-2.5 text-end font-semibold text-xo-cyan">
                {typeof reward.rewardAmount === 'number' ? reward.rewardAmount : '—'}
              </td>
              <td className="px-3 py-2.5 text-center">
                <Badge variant={statusVariant[reward.status ?? ''] ?? 'gray'}>
                  {reward.status ? t(reward.status as Parameters<typeof t>[0]) || reward.status : '—'}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {formatTs(reward.createdAt)}
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {formatTs(reward.expiresAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

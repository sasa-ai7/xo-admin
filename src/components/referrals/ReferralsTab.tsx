import { useState, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useReferrals } from '../../hooks/useReferrals';
import { SearchInput } from '../shared/SearchInput';
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

const statusVariant: Record<string, 'amber' | 'green' | 'cyan' | 'gray'> = {
  pending: 'amber',
  completed: 'green',
  rewarded: 'cyan',
};

export function ReferralsTab() {
  const { t } = useLanguage();
  const { data: referrals, loading, error } = useReferrals();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return referrals;
    const q = search.toLowerCase();
    return referrals.filter(
      (r) =>
        r.inviteeEmail?.toLowerCase().includes(q) ||
        r.referrerEmail?.toLowerCase().includes(q) ||
        r.inviteeUid?.toLowerCase().includes(q) ||
        r.referrerUid?.toLowerCase().includes(q) ||
        r.referralCode?.toLowerCase().includes(q)
    );
  }, [referrals, search]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-sm text-red-400">Failed to load referrals: {error.message}</p>;
  }

  return (
    <div className="space-y-3 p-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t('searchByCodeOrEmail')}
        className="max-w-xs"
      />

      {filtered.length === 0 ? (
        <EmptyState icon={UserPlus} message={t('noReferrals')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-glass-border text-left text-gray-500">
                <th className="px-3 py-2 font-semibold">{t('invitee')}</th>
                <th className="px-3 py-2 font-semibold">{t('referrer')}</th>
                <th className="px-3 py-2 font-semibold">{t('referralCode')}</th>
                <th className="px-3 py-2 font-semibold text-center">{t('status')}</th>
                <th className="px-3 py-2 font-semibold">{t('dateTime')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ref) => (
                <tr
                  key={ref.id}
                  className="border-b border-glass-border/50 transition-colors hover:bg-glass-hover"
                >
                  <td className="px-3 py-2.5 text-gray-300">
                    {ref.inviteeEmail || ref.inviteeUid || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-300">
                    {ref.referrerEmail || ref.referrerUid || '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-neon-cyan">
                    {ref.referralCode || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={statusVariant[ref.status ?? ''] ?? 'gray'}>
                      {ref.status ? t(ref.status as Parameters<typeof t>[0]) || ref.status : '—'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {formatTs(ref.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

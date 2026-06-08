import { useState, useMemo } from 'react';
import { Hash, ArrowDownUp } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useReferralCodes } from '../../hooks/useReferralCodes';
import { useUsers } from '../../hooks/useUsers';
import { SearchInput } from '../shared/SearchInput';
import { Badge } from '../shared/Badge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { CopyButton } from '../shared/CopyButton';
import { UserAvatar } from '../shared/UserAvatar';
import { cn } from '../../utils/cn';
import { shortUid } from '../../utils/avatar';
import { formatAbsoluteTime, formatRelativeTime, toMs } from '../../utils/relativeTime';
import type { ReferralCode } from '../../types/referral';
import type { AppUser } from '../../types/user';

type SortKey = 'newest' | 'oldest' | 'usage' | 'email';
type FilterKey = 'all' | 'active' | 'used' | 'unused' | 'missing';

interface ResolvedOwner {
  user: AppUser | null;
  name: string;
  email: string;
  photoURL?: string;
  uid: string;
  /** True when we have at least an email or a matched user record. */
  known: boolean;
}

export function ReferralCodesTab() {
  const { t } = useLanguage();
  const { data: codes, loading, error } = useReferralCodes();
  const { data: users } = useUsers();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');

  // Look up users by both Firestore doc id and auth uid, since a referral
  // code's ownerUid can reference either depending on how it was written.
  const userByKey = useMemo(() => {
    const map = new Map<string, AppUser>();
    for (const u of users) {
      if (u.id) map.set(u.id, u);
      if (u.uid) map.set(u.uid, u);
    }
    return map;
  }, [users]);

  const resolveOwner = useMemo(() => {
    return (code: ReferralCode): ResolvedOwner => {
      const u = code.ownerUid ? userByKey.get(code.ownerUid) ?? null : null;
      const email = u?.Profile?.email || code.ownerEmail || '';
      const name = u?.Profile?.name || u?.Profile?.displayName || '';
      return {
        user: u,
        name,
        email,
        photoURL: u?.Profile?.photoURL,
        uid: code.ownerUid || '',
        known: Boolean(u || code.ownerEmail),
      };
    };
  }, [userByKey]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = codes
      .map((code) => ({ code, owner: resolveOwner(code) }))
      .filter(({ code, owner }) => {
        if (filterKey === 'active' && code.active === false) return false;
        if (filterKey === 'used' && (code.usageCount ?? 0) <= 0) return false;
        if (filterKey === 'unused' && (code.usageCount ?? 0) > 0) return false;
        if (filterKey === 'missing' && owner.known) return false;
        if (!q) return true;
        return (
          (code.code ?? code.id).toLowerCase().includes(q) ||
          owner.email.toLowerCase().includes(q) ||
          owner.name.toLowerCase().includes(q) ||
          owner.uid.toLowerCase().includes(q)
        );
      });

    rows.sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return (toMs(a.code.createdAt) ?? 0) - (toMs(b.code.createdAt) ?? 0);
        case 'usage':
          return (b.code.usageCount ?? 0) - (a.code.usageCount ?? 0);
        case 'email':
          return (a.owner.email || '￿').localeCompare(b.owner.email || '￿');
        case 'newest':
        default:
          return (toMs(b.code.createdAt) ?? 0) - (toMs(a.code.createdAt) ?? 0);
      }
    });

    return rows;
  }, [codes, resolveOwner, search, sortKey, filterKey]);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'active', label: t('active') },
    { key: 'used', label: t('used') },
    { key: 'unused', label: t('neverUsed') },
    { key: 'missing', label: t('missingOwner') },
  ];

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-sm text-red-400">Failed to load referral codes: {error.message}</p>;
  }

  return (
    <div className="space-y-3 p-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('searchByCodeOrEmail')}
          className="w-full max-w-xs"
        />
        <div className="relative shrink-0">
          <ArrowDownUp size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xo-muted" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="min-h-10 appearance-none rounded-full border border-xo-border bg-xo-panel/80 py-2 ps-9 pe-8 text-sm text-xo-text outline-none transition-all focus:border-xo-border-active"
          >
            <option value="newest">{t('sortNewestFirst')}</option>
            <option value="oldest">{t('sortOldestFirst')}</option>
            <option value="usage">{t('sortUsageHigh')}</option>
            <option value="email">{t('sortOwnerAZ')}</option>
          </select>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterKey(key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-semibold transition-all',
              filterKey === key
                ? 'border-xo-cyan/40 bg-xo-cyan/10 text-xo-cyan'
                : 'border-glass-border text-gray-400 hover:border-xo-cyan/20 hover:text-gray-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Hash} message={t('noReferralCodes')} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-xo-bg-deep/90 backdrop-blur">
                <tr className="border-b border-glass-border text-start text-gray-500">
                  <th className="px-3 py-2.5 text-start font-semibold">{t('referralCode')}</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('owner')}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{t('usageCount')}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{t('maxUses')}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{t('status')}</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('dateTime')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ code, owner }) => (
                  <tr
                    key={code.id}
                    className="border-b border-glass-border/50 transition-colors hover:bg-glass-hover"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-neon-cyan">{code.code ?? code.id}</span>
                        <CopyButton value={code.code ?? code.id} label={t('copyCode')} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <OwnerCell owner={owner} unknownLabel={t('unknownOwner')} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-300">{code.usageCount ?? 0}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{code.maxUses ?? '∞'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant={code.active !== false ? 'green' : 'red'}>
                        {code.active !== false ? t('active') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500" title={formatAbsoluteTime(code.createdAt)}>
                      {code.createdAt ? formatRelativeTime(code.createdAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map(({ code, owner }) => (
              <div key={code.id} className="rounded-2xl border border-glass-border bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-neon-cyan">{code.code ?? code.id}</span>
                    <CopyButton value={code.code ?? code.id} label={t('copyCode')} />
                  </div>
                  <Badge variant={code.active !== false ? 'green' : 'red'}>
                    {code.active !== false ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <div className="mt-2.5">
                  <OwnerCell owner={owner} unknownLabel={t('unknownOwner')} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    {t('usageCount')}: <span className="text-gray-300">{code.usageCount ?? 0}</span>
                    {' / '}
                    {code.maxUses ?? '∞'}
                  </span>
                  <span title={formatAbsoluteTime(code.createdAt)}>
                    {code.createdAt ? formatRelativeTime(code.createdAt) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OwnerCell({ owner, unknownLabel }: { owner: ResolvedOwner; unknownLabel: string }) {
  const primary = owner.email || owner.name || unknownLabel;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar photoURL={owner.photoURL} displayName={owner.name || owner.email} size="sm" />
      <div className="min-w-0">
        <p className={cn('truncate text-xs font-medium', owner.known ? 'text-gray-200' : 'text-gray-500 italic')}>
          {primary}
        </p>
        {owner.uid ? (
          <div className="mt-0.5 flex items-center gap-1">
            <span className="truncate font-mono text-[10px] text-gray-600">{shortUid(owner.uid)}</span>
            <CopyButton value={owner.uid} label="UID" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

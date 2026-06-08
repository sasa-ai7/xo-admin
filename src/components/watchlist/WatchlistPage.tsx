import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Eye, FolderPlus, Folder, Trash2, Edit2, Users, Coins, DollarSign,
  RotateCcw, AlertTriangle, Search, FileSpreadsheet, FileText, FileJson, FileCode,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  useAdminWatchlists, createWatchlistFolder, renameWatchlistFolder, deleteWatchlistFolder,
} from '../../hooks/useAdminWatchlists';
import { useUsers } from '../../hooks/useUsers';
import { useDataStore } from '../../stores/dataStore';
import { useWatchlistOverrides } from '../../hooks/useWatchlistOverrides';
import { GlassCard } from '../shared/GlassCard';
import { StatCard } from '../shared/StatCard';
import { PageHeader } from '../shared/PageHeader';
import { FilterChip, ChipGroup } from '../shared/FilterChip';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorState } from '../shared/ErrorState';
import { AdminPasscodeConfirmModal } from '../shared/AdminPasscodeConfirmModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { computeUserCharge } from '../../utils/watchlistAnalytics';
import { exportWatchlist, type ExportFormat } from '../../utils/exporters';
import {
  applyWatchlistChargeReset, logWatchlistExport, logWatchlistAdminAction, type ChargeResetTarget,
} from '../../services/watchlistReset';
import { toMs } from '../../utils/relativeTime';
import { FOLDER_COLORS } from '../../types/watchlist';
import type { AdminWatchlistFolder } from '../../types/watchlist';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { AppUser } from '../../types/user';
import { cn } from '../../utils/cn';
import { IconBadge } from '../shared/IconBadge';

type FolderSort = 'newest' | 'oldest' | 'users' | 'revenue' | 'coins' | 'failed';

function CreateFolderModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(FOLDER_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setErr(t('folderName')); return; }
    setSaving(true);
    try {
      const id = await createWatchlistFolder(name, description, color);
      void logWatchlistAdminAction('folder_created', { folderId: id, folderName: name.trim() });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="xo-bezel relative z-10 w-full max-w-sm rounded-2xl p-6">
        <h2 className="mb-4 font-orbitron text-sm font-bold text-xo-text">{t('newFolder')}</h2>

        <label className="mb-1 block text-[11px] text-xo-muted">{t('folderName')} *</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-2 text-xs text-xo-text outline-none focus:border-xo-border-active" autoFocus />

        <label className="mb-1 block text-[11px] text-xo-muted">{t('folderDescription')}</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          className="mb-3 w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-2 text-xs text-xo-text outline-none focus:border-xo-border-active" />

        <label className="mb-1 block text-[11px] text-xo-muted">{t('colorLabel')}</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {FOLDER_COLORS.map((c) => (
            <button key={c.value} type="button" onClick={() => setColor(c.value)}
              className={cn('h-7 w-7 rounded-full border-2 transition-all', color === c.value ? 'scale-110 border-white' : 'border-transparent opacity-60 hover:opacity-100')}
              style={{ backgroundColor: c.value }} title={c.label} />
          ))}
        </div>

        {err && <p className="mb-3 text-[11px] text-rose-400">{err}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-xo-border py-2 text-xs text-xo-muted hover:text-xo-text">{t('cancel')}</button>
          <button type="button" onClick={() => void handleCreate()} disabled={saving}
            className="flex-1 rounded-xl bg-xo-cyan px-4 py-2 text-xs font-bold text-xo-bg-deep transition-all hover:brightness-110 disabled:opacity-60">
            {saving ? '…' : t('create')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FolderCardProps {
  folder: AdminWatchlistFolder;
  totalCoins: number;
  displayedUsd: number;
  failedCount: number;
  onRename: (folder: AdminWatchlistFolder) => void;
  onDelete: (folder: AdminWatchlistFolder) => void;
  onReset: (folder: AdminWatchlistFolder) => void;
  onClick: () => void;
}

function FolderCard({ folder, totalCoins, displayedUsd, failedCount, onRename, onDelete, onReset, onClick }: FolderCardProps) {
  const { t } = useLanguage();
  return (
    <GlassCard hover className="overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: folder.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-start">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: folder.color + '22', boxShadow: `0 0 16px ${folder.color}33` }}>
              <Folder size={16} style={{ color: folder.color }} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-orbitron text-sm font-bold text-xo-text">{folder.name}</p>
              {folder.description && <p className="truncate text-[10px] text-xo-muted">{folder.description}</p>}
            </div>
          </button>
          <div className="flex shrink-0 gap-0.5">
            <button type="button" onClick={(e) => { e.stopPropagation(); onRename(folder); }} className="rounded-lg p-1.5 text-xo-muted transition-colors hover:text-xo-text" title={t('renameFolder')}><Edit2 size={12} /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onReset(folder); }} className="rounded-lg p-1.5 text-xo-muted transition-colors hover:text-amber-400" title={t('resetFolderTotals')}><RotateCcw size={12} /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(folder); }} className="rounded-lg p-1.5 text-xo-muted transition-colors hover:text-rose-400" title={t('deleteFolder')}><Trash2 size={12} /></button>
          </div>
        </div>

        <button type="button" onClick={onClick} className="mt-3 w-full text-start">
          <div className="flex flex-wrap gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-xo-muted"><Users size={11} /> {folder.userIds.length}</span>
            <span className="flex items-center gap-1 text-coin"><Coins size={11} /> {totalCoins.toLocaleString()}</span>
            <span className="flex items-center gap-1 text-emerald-400"><DollarSign size={11} /> {formatCurrency(displayedUsd)}</span>
            {failedCount > 0 && <span className="flex items-center gap-1 text-rose-400"><AlertTriangle size={11} /> {failedCount}</span>}
          </div>
          <p className="mt-2 text-[10px] text-xo-muted/70">{folder.createdAt ? formatDate(folder.createdAt) : ''}</p>
        </button>
      </div>
    </GlassCard>
  );
}

export function WatchlistPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: folders, loading, error } = useAdminWatchlists();
  const { data: users } = useUsers();
  const purchaseOrders = useDataStore((s) => s.purchaseOrders);
  const { overrides } = useWatchlistOverrides();

  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<AdminWatchlistFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'deleteFolder' | 'resetFolder' | 'resetAll'; folder?: AdminWatchlistFolder } | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const ordersByUid = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    for (const o of purchaseOrders) {
      if (!o.uid) continue;
      if (!map.has(o.uid)) map.set(o.uid, []);
      map.get(o.uid)!.push(o);
    }
    return map;
  }, [purchaseOrders]);

  const usersById = useMemo(() => {
    const m = new Map<string, AppUser>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const ordersFor = (u: AppUser) => ordersByUid.get(u.uid ?? u.id) ?? ordersByUid.get(u.id) ?? [];
  const overrideFor = (u: AppUser) => overrides.get(u.uid ?? u.id) ?? overrides.get(u.id) ?? null;

  function folderStats(folder: AdminWatchlistFolder) {
    let totalCoins = 0, displayedUsd = 0, failedCount = 0;
    for (const uid of folder.userIds) {
      const u = usersById.get(uid);
      if (!u) continue;
      totalCoins += u.Wallet?.coins ?? 0;
      const charge = computeUserCharge(ordersFor(u), overrideFor(u));
      displayedUsd += charge.displayedUsd;
      failedCount += charge.failedCount;
    }
    return { totalCoins, displayedUsd, failedCount };
  }

  const [sort, setSort] = useState<FolderSort>('newest');
  const [search, setSearch] = useState('');

  const decoratedFolders = useMemo(() => {
    const rows = folders.map((f) => ({ folder: f, stats: folderStats(f) }));
    const q = search.toLowerCase().trim();
    const filtered = q ? rows.filter((r) => r.folder.name.toLowerCase().includes(q) || (r.folder.description ?? '').toLowerCase().includes(q)) : rows;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'oldest': return (toMs(a.folder.createdAt) ?? 0) - (toMs(b.folder.createdAt) ?? 0);
        case 'users': return b.folder.userIds.length - a.folder.userIds.length;
        case 'revenue': return b.stats.displayedUsd - a.stats.displayedUsd;
        case 'coins': return b.stats.totalCoins - a.stats.totalCoins;
        case 'failed': return b.stats.failedCount - a.stats.failedCount;
        case 'newest':
        default: return (toMs(b.folder.createdAt) ?? 0) - (toMs(a.folder.createdAt) ?? 0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, search, sort, ordersByUid, overrides, usersById]);

  // Aggregate stats across all folders (union of users)
  const summary = useMemo(() => {
    const union = new Set<string>();
    for (const f of folders) for (const uid of f.userIds) union.add(uid);
    let totalCoins = 0, displayedUsd = 0, failed = 0;
    for (const uid of union) {
      const u = usersById.get(uid);
      if (!u) continue;
      totalCoins += u.Wallet?.coins ?? 0;
      const c = computeUserCharge(ordersFor(u), overrideFor(u));
      displayedUsd += c.displayedUsd;
      failed += c.failedCount;
    }
    return { folders: folders.length, users: union.size, totalCoins, displayedUsd, failed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, usersById, ordersByUid, overrides]);

  function unionUsers(): AppUser[] {
    const union = new Set<string>();
    for (const f of folders) for (const uid of f.userIds) union.add(uid);
    return [...union].map((uid) => usersById.get(uid)).filter((u): u is AppUser => Boolean(u));
  }

  function handleExportAll(format: ExportFormat) {
    const us = unionUsers();
    const uidSet = new Set(us.map((u) => u.uid ?? u.id));
    const orders = purchaseOrders.filter((o) => o.uid && uidSet.has(o.uid));
    exportWatchlist(format, 'full', { folderName: 'all_watchlist', users: us, orders });
    void logWatchlistExport({ scope: 'full', format, folderId: null, folderName: 'all_watchlist', count: us.length });
  }

  async function handleRename() {
    if (!renaming || !renameValue.trim()) return;
    try {
      await renameWatchlistFolder(renaming.id, renameValue);
      void logWatchlistAdminAction('folder_renamed', { folderId: renaming.id, folderName: renameValue.trim() });
      setRenaming(null);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : String(e));
    }
  }

  function targetsForFolder(folder: AdminWatchlistFolder): ChargeResetTarget[] {
    return folder.userIds
      .map((uid) => usersById.get(uid))
      .filter((u): u is AppUser => Boolean(u))
      .map((u) => {
        const c = computeUserCharge(ordersFor(u), overrideFor(u));
        return { uid: u.uid ?? u.id, previousTotalUsd: c.displayedUsd, purchaseCount: c.realCount };
      });
  }

  async function handleConfirm(reason: string) {
    if (!confirm) return;
    if (confirm.kind === 'deleteFolder' && confirm.folder) {
      await deleteWatchlistFolder(confirm.folder.id);
      void logWatchlistAdminAction('folder_deleted', { folderId: confirm.folder.id, folderName: confirm.folder.name, reason });
    } else if (confirm.kind === 'resetFolder' && confirm.folder) {
      await applyWatchlistChargeReset('folder', targetsForFolder(confirm.folder), { folderId: confirm.folder.id, folderName: confirm.folder.name, reason });
    } else if (confirm.kind === 'resetAll') {
      const targets = unionUsers().map((u) => {
        const c = computeUserCharge(ordersFor(u), overrideFor(u));
        return { uid: u.uid ?? u.id, previousTotalUsd: c.displayedUsd, purchaseCount: c.realCount };
      });
      await applyWatchlistChargeReset('all_watchlist', targets, { reason });
    }
    setConfirm(null);
  }

  const exportButtons: { format: ExportFormat; label: string; icon: typeof FileSpreadsheet }[] = [
    { format: 'xlsx', label: t('exportExcel'), icon: FileSpreadsheet },
    { format: 'csv', label: 'CSV', icon: FileCode },
    { format: 'txt', label: 'TXT', icon: FileText },
    { format: 'json', label: 'JSON', icon: FileJson },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Eye}
        variant="watchlist"
        title={t('watchlist')}
        subtitle={t('watchlistSubtitle')}
        actions={
          <button type="button" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-2 text-xs font-bold text-xo-cyan transition-all hover:bg-xo-cyan/20">
            <FolderPlus size={14} /> {t('newFolder')}
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Folder} variant="watchlist" label={t('totalFolders')} value={summary.folders} hint={t('activeFoldersLabel')} />
        <StatCard icon={Users} variant="users" label={t('folderUsers')} value={summary.users} hint={t('acrossAllFolders')} />
        <StatCard icon={Coins} variant="coins" label={t('totalCoins')} value={summary.totalCoins} hint={t('totalValueMonitored')} />
        <StatCard icon={DollarSign} variant="revenue" label={t('displayedRevenue')} value={summary.displayedUsd} format={formatCurrency} />
        <StatCard icon={AlertTriangle} variant="failed" label={t('failedActions')} value={summary.failed} />
      </div>

      {error && <ErrorState title={t('errorTitle')} message={error.message} hint="firebase deploy --only firestore:rules" />}
      {actionErr && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
          {actionErr}
          <button type="button" onClick={() => setActionErr(null)} className="ms-2 underline">{t('close')}</button>
        </div>
      )}

      {/* Controls + export-all + reset-all */}
      {folders.length > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-xo-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
                className="w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 py-2 ps-8 pe-3 text-xs text-xo-text outline-none focus:border-xo-border-active" />
            </div>
            <ChipGroup>
              {([
                ['newest', t('sortNewestFirst')], ['oldest', t('sortOldestFirst')], ['users', t('folderUsers')],
                ['revenue', t('folderRevenue')], ['coins', t('totalCoins')], ['failed', t('failedActions')],
              ] as [FolderSort, string][]).map(([key, label]) => (
                <FilterChip key={key} active={sort === key} onClick={() => setSort(key)}>{label}</FilterChip>
              ))}
            </ChipGroup>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {exportButtons.map(({ format, label, icon: Icon }) => (
              <button key={format} type="button" onClick={() => handleExportAll(format)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-xo-border bg-xo-panel/60 px-2.5 py-1.5 text-[11px] font-semibold text-xo-muted transition-colors hover:border-xo-cyan/30 hover:text-xo-cyan">
                <Icon size={12} /> {label}
              </button>
            ))}
            <button type="button" onClick={() => setConfirm({ kind: 'resetAll' })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition-colors hover:bg-rose-500/20">
              <RotateCcw size={12} /> {t('resetAllWatchlist')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : folders.length === 0 ? (
        <GlassCard className="flex h-48 items-center justify-center">
          <div className="text-center">
            <IconBadge icon={Folder} variant="watchlist" size="lg" hex className="mx-auto mb-3" />
            <p className="text-xo-muted">{t('noFoldersYet')}</p>
            <button type="button" onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-xo-cyan/10 px-4 py-2 text-xs font-bold text-xo-cyan hover:bg-xo-cyan/20">
              <FolderPlus size={12} /> {t('newFolder')}
            </button>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decoratedFolders.map(({ folder, stats }) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              totalCoins={stats.totalCoins}
              displayedUsd={stats.displayedUsd}
              failedCount={stats.failedCount}
              onRename={(f) => { setRenaming(f); setRenameValue(f.name); }}
              onDelete={(f) => setConfirm({ kind: 'deleteFolder', folder: f })}
              onReset={(f) => setConfirm({ kind: 'resetFolder', folder: f })}
              onClick={() => navigate(`/watchlist/${folder.id}`)}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateFolderModal onClose={() => setShowCreate(false)} />}

      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRenaming(null)} />
          <div className="xo-bezel relative z-10 w-full max-w-sm rounded-2xl p-6">
            <h2 className="mb-3 font-orbitron text-sm font-bold text-xo-text">{t('renameFolder')}</h2>
            <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleRename(); }}
              className="mb-3 w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-2 text-xs text-xo-text outline-none focus:border-xo-border-active" autoFocus />
            <div className="flex gap-2">
              <button type="button" onClick={() => setRenaming(null)} className="flex-1 rounded-xl border border-xo-border py-2 text-xs text-xo-muted">{t('cancel')}</button>
              <button type="button" onClick={() => void handleRename()} className="flex-1 rounded-xl bg-xo-cyan py-2 text-xs font-bold text-xo-bg-deep">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <AdminPasscodeConfirmModal
          title={
            confirm.kind === 'deleteFolder' ? t('deleteFolder')
              : confirm.kind === 'resetAll' ? t('resetAllWatchlist') : t('resetFolderTotals')
          }
          message={confirm.kind === 'deleteFolder' ? t('confirmDeleteFolder') : t('resetChargeWarning')}
          confirmLabel={confirm.kind === 'deleteFolder' ? t('delete') : t('resetCharge')}
          requireKeyword={confirm.kind === 'deleteFolder' ? 'DELETE' : 'RESET'}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

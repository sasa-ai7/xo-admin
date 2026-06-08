import type { AppUser } from '../types/user';
import type { PurchaseOrder } from '../types/purchaseOrder';
import type { WalletLedgerEntry } from '../hooks/useWalletLedgerForUser';
import type { AdminWatchlistFolder } from '../types/watchlist';
import { purchaseOrderCoins, purchaseOrderNormalizedUsd } from '../types/purchaseOrder';

function esc(value: unknown): string {
  if (value == null) return '';
  const s = String(value).replace(/"/g, '""');
  return /[,"\n\r]/.test(s) ? `"${s}"` : s;
}

function fmtDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate(): Date }).toDate().toISOString();
    } catch {
      return '';
    }
  }
  if (typeof value === 'number' && value > 0) return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  return '';
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPurchaseOrdersCsv(orders: PurchaseOrder[]): void {
  const now = new Date().toISOString().slice(0, 10);
  const header = [
    'uid', 'email', 'displayName', 'productId', 'productType',
    'status', 'coinsGranted', 'normalizedUsd', 'googlePlayPriceLabel',
    'googlePlayCurrencyCode', 'orderId', 'purchaseTokenHash',
    'platform', 'balanceBefore', 'balanceAfter', 'createdAt',
  ];
  const rows: string[][] = [header];
  for (const o of orders) {
    rows.push([
      o.uid ?? '',
      o.email ?? o.userEmailSnapshot ?? '',
      o.displayName ?? o.userDisplayNameSnapshot ?? '',
      o.productId ?? '',
      o.productType ?? '',
      o.status ?? '',
      String(purchaseOrderCoins(o)),
      String(purchaseOrderNormalizedUsd(o).toFixed(4)),
      o.googlePlayPriceLabel ?? '',
      o.googlePlayCurrencyCode ?? o.currencyCode ?? '',
      o.orderId ?? '',
      o.purchaseTokenHash ?? '',
      o.platform ?? '',
      String(o.balanceBefore ?? ''),
      String(o.balanceAfter ?? ''),
      fmtDate(o.createdAt ?? o.purchasedAt),
    ]);
  }
  downloadCsv(`xo-purchase-orders-${now}.csv`, rows);
}

export function exportUserCsv(
  user: AppUser,
  purchases: PurchaseOrder[],
  ledger: WalletLedgerEntry[]
): void {
  const now = new Date().toISOString().slice(0, 10);
  const header = [
    'type', 'uid', 'email', 'productId', 'status',
    'coinsGranted', 'normalizedUsd', 'googlePlayPriceLabel',
    'orderId', 'balanceBefore', 'balanceAfter', 'date',
  ];
  const rows: string[][] = [header];
  for (const o of purchases) {
    rows.push([
      'purchase_order',
      user.id,
      user.Profile?.email ?? '',
      o.productId ?? '',
      o.status ?? '',
      String(purchaseOrderCoins(o)),
      String(purchaseOrderNormalizedUsd(o).toFixed(4)),
      o.googlePlayPriceLabel ?? '',
      o.orderId ?? '',
      String(o.balanceBefore ?? ''),
      String(o.balanceAfter ?? ''),
      fmtDate(o.createdAt ?? o.purchasedAt),
    ]);
  }
  for (const e of ledger) {
    rows.push([
      'wallet_ledger',
      user.id,
      user.Profile?.email ?? '',
      e.productId ?? '',
      e.source ?? e.status ?? '',
      String(typeof e.coinsAdded === 'number' ? e.coinsAdded : ''),
      '',
      '',
      e.orderId ?? '',
      String(e.balanceBefore ?? ''),
      String(e.balanceAfter ?? ''),
      fmtDate(e.createdAt),
    ]);
  }
  downloadCsv(`xo-user-${user.id.slice(0, 8)}-${now}.csv`, rows);
}

export function exportWatchlistFolderCsv(
  folder: AdminWatchlistFolder,
  users: AppUser[],
  purchases: PurchaseOrder[]
): void {
  const now = new Date().toISOString().slice(0, 10);
  const purchasesByUid = new Map<string, PurchaseOrder[]>();
  for (const p of purchases) {
    if (!p.uid) continue;
    if (!purchasesByUid.has(p.uid)) purchasesByUid.set(p.uid, []);
    purchasesByUid.get(p.uid)!.push(p);
  }

  const header = [
    'displayName', 'email', 'uid', 'status', 'coins',
    'gamesPlayed', 'gamesWon', 'realPurchases',
    'coinsBought', 'normalizedUsd', 'lastPurchase',
  ];
  const rows: string[][] = [header];
  for (const user of users) {
    const uid = user.id;
    const userPurchases = purchasesByUid.get(uid) ?? [];
    const realP = userPurchases.filter((p) =>
      ['grant_success', 'avatar_unlock_success', 'already_processed'].includes(p.status ?? '')
    );
    const uCoins = realP.reduce((s, p) => s + purchaseOrderCoins(p), 0);
    const uUsd = realP.reduce((s, p) => s + purchaseOrderNormalizedUsd(p), 0);
    const lastP = userPurchases[0] ? fmtDate(userPurchases[0].createdAt ?? userPurchases[0].purchasedAt) : '';
    rows.push([
      user.Profile?.displayName ?? user.Profile?.name ?? '',
      user.Profile?.email ?? '',
      uid,
      user.online ? 'Online' : 'Offline',
      String(user.Wallet?.coins ?? 0),
      String(user.Stats?.gamesPlayed ?? 0),
      String(user.Stats?.gamesWon ?? 0),
      String(realP.length),
      String(uCoins),
      uUsd.toFixed(4),
      lastP,
    ]);
  }
  downloadCsv(`xo-folder-${folder.name.replace(/\s+/g, '-')}-${now}.csv`, rows);
}

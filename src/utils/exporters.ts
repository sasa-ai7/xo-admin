import * as XLSX from 'xlsx';
import type { AppUser } from '../types/user';
import {
  type PurchaseOrder,
  purchaseOrderCoins,
  purchaseOrderNormalizedUsd,
  purchaseOrderDisplayTime,
  isRealPurchaseOrder,
  shouldCountForRevenue,
} from '../types/purchaseOrder';
import { getUserLastSeenValue, isUserOnline } from './userPresence';
import { toMs } from './relativeTime';

export type ExportFormat = 'xlsx' | 'csv' | 'txt' | 'json';
export type ExportScope = 'full' | 'users' | 'purchases' | 'transactions' | 'logs';

export interface WatchlistExportInput {
  folderName?: string;
  users: AppUser[];
  /** All purchase orders belonging to the exported users. */
  orders: PurchaseOrder[];
  /** Optional wallet-ledger / transaction entries. */
  ledger?: Record<string, unknown>[];
  /** Optional admin/account logs. */
  logs?: Record<string, unknown>[];
}

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(value: unknown): string {
  const ms = toMs(value);
  if (ms == null) return '';
  try {
    return new Date(ms).toISOString();
  } catch {
    return '';
  }
}

function uidKey(u: AppUser): string {
  return u.uid ?? u.id;
}

function groupOrdersByUid(orders: PurchaseOrder[]): Map<string, PurchaseOrder[]> {
  const map = new Map<string, PurchaseOrder[]>();
  for (const o of orders) {
    if (!o.uid) continue;
    if (!map.has(o.uid)) map.set(o.uid, []);
    map.get(o.uid)!.push(o);
  }
  return map;
}

function downloadBlob(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const BOM = String.fromCharCode(0xfeff); // UTF-8 BOM so Excel opens Arabic/special chars correctly.
  if (!rows.length) return BOM;
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  return `${BOM}${lines.join('\r\n')}`;
}

// ── row builders (never include raw purchaseToken) ───────────────────────────

function userRow(u: AppUser, orders: PurchaseOrder[]): Record<string, unknown> {
  const real = orders.filter(isRealPurchaseOrder);
  const totalUsd = real.reduce((s, o) => s + purchaseOrderNormalizedUsd(o), 0);
  const coinsBought = real.reduce((s, o) => s + purchaseOrderCoins(o), 0);
  const lastMs = orders.reduce((mx, o) => Math.max(mx, toMs(purchaseOrderDisplayTime(o)) ?? 0), 0);
  return {
    Name: u.Profile?.name ?? u.Profile?.displayName ?? 'No name',
    Email: u.Profile?.email ?? '',
    UID: u.uid ?? u.id,
    DocID: u.id,
    PhotoURL: u.Profile?.photoURL ?? '',
    Provider: u.Profile?.provider ?? '',
    Status: isUserOnline(u) ? 'online' : 'offline',
    LastSeen: fmtDate(getUserLastSeenValue(u)),
    Created: fmtDate(u.createdAt),
    Coins: u.Wallet?.coins ?? 0,
    Games: u.Stats?.gamesPlayed ?? 0,
    Wins: u.Stats?.gamesWon ?? 0,
    Losses: u.Stats?.gamesLost ?? 0,
    Draws: u.Stats?.gamesDrawn ?? 0,
    InviteCode: u.inviteCode ?? u.referralCode ?? '',
    Purchases: real.length,
    TotalChargedUSD: Number(totalUsd.toFixed(2)),
    CoinsBought: coinsBought,
    LastPurchase: lastMs ? fmtDate(lastMs) : '',
    Deleted: u.deleted ? 'yes' : 'no',
  };
}

function purchaseRow(o: PurchaseOrder): Record<string, unknown> {
  return {
    UID: o.uid ?? '',
    Email: o.email ?? o.userEmailSnapshot ?? '',
    OrderID: o.orderId ?? '',
    TransactionID: typeof o.transactionId === 'string' ? o.transactionId : '',
    ProductID: o.productId ?? '',
    ProductType: o.productType ?? '',
    Coins: purchaseOrderCoins(o),
    NormalizedUSD: Number(purchaseOrderNormalizedUsd(o).toFixed(2)),
    Platform: o.platform ?? '',
    Status: o.status ?? '',
    Verified: o.verified ? 'yes' : 'no',
    TrustedRevenue: o.trustedRevenue ? 'yes' : 'no',
    RevenueCounted: shouldCountForRevenue(o) ? 'yes' : 'no',
    PurchaseTokenHash: o.purchaseTokenHash ?? '',
    CreatedAt: fmtDate(o.createdAt),
    UpdatedAt: fmtDate(o.updatedAt),
    VerificationError: (o.error ?? o.errorCode ?? '') as string,
  };
}

function txRow(e: Record<string, unknown>): Record<string, unknown> {
  return {
    Type: (e.type ?? e.source ?? '') as string,
    CoinsDelta: (e.coinsAdded ?? e.coins ?? '') as number | string,
    Amount: (e.amount ?? '') as number | string,
    BalanceBefore: (e.balanceBefore ?? '') as number | string,
    BalanceAfter: (e.balanceAfter ?? '') as number | string,
    Source: (e.source ?? '') as string,
    TransactionID: (e.transactionId ?? e.orderId ?? e.id ?? '') as string,
    CreatedAt: fmtDate(e.createdAt),
    Note: (e.note ?? e.reason ?? '') as string,
  };
}

function logRow(e: Record<string, unknown>): Record<string, unknown> {
  return {
    Action: (e.action ?? e.eventType ?? e.eventName ?? '') as string,
    UID: (e.uid ?? e.targetUid ?? '') as string,
    Platform: (e.platform ?? '') as string,
    CreatedAt: fmtDate(e.createdAt ?? e.timestamp),
    Details: typeof e.details === 'object' && e.details ? JSON.stringify(e.details) : (e.reason ?? '') as string,
  };
}

function buildBaseName(folderName: string | undefined, scope: ExportScope): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = (folderName ?? 'all').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'all';
  return `watchlist_${slug}_${scope}_${stamp}`;
}

function buildTxtReport(
  input: WatchlistExportInput,
  userRows: Record<string, unknown>[],
  ordersByUid: Map<string, PurchaseOrder[]>
): string {
  const lines: string[] = [];
  const now = new Date();
  lines.push('═══════════════════════════════════════════════');
  lines.push('  XO ARENA — WATCHLIST ADMIN REPORT');
  lines.push('═══════════════════════════════════════════════');
  lines.push(`Folder:       ${input.folderName ?? 'All Watchlist'}`);
  lines.push(`Generated:    ${now.toISOString()}`);
  lines.push(`Total users:  ${input.users.length}`);
  const totalUsd = userRows.reduce((s, r) => s + Number(r.TotalChargedUSD ?? 0), 0);
  lines.push(`Total charged: $${totalUsd.toFixed(2)}`);
  lines.push('');

  for (const u of input.users) {
    const orders = ordersByUid.get(u.uid ?? u.id) ?? ordersByUid.get(u.id) ?? [];
    const real = orders.filter(isRealPurchaseOrder);
    lines.push('─────────────────────────────────────────────');
    lines.push(`Name:    ${u.Profile?.name ?? u.Profile?.displayName ?? 'No name'}`);
    lines.push(`Email:   ${u.Profile?.email ?? '(no email)'}`);
    lines.push(`UID:     ${u.uid ?? u.id}`);
    lines.push(`Status:  ${isUserOnline(u) ? 'online' : 'offline'}`);
    lines.push(`Coins:   ${(u.Wallet?.coins ?? 0).toLocaleString()}`);
    lines.push(`Games:   ${u.Stats?.gamesPlayed ?? 0}  (W ${u.Stats?.gamesWon ?? 0} / L ${u.Stats?.gamesLost ?? 0} / D ${u.Stats?.gamesDrawn ?? 0})`);
    lines.push(`Invite:  ${u.inviteCode ?? u.referralCode ?? '—'}`);
    lines.push(`Purchases: ${real.length}`);
    for (const o of real) {
      lines.push(
        `   • ${o.productId ?? '—'} | ${purchaseOrderCoins(o)} coins | $${purchaseOrderNormalizedUsd(o).toFixed(2)} | ${o.status ?? '—'} | order=${o.orderId ?? '—'}`
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

function stripTokens(o: PurchaseOrder): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'purchaseToken' || k === 'rawPurchaseToken') continue;
    safe[k] = v;
  }
  return safe;
}

// ── main export entry ────────────────────────────────────────────────────────

export function exportWatchlist(format: ExportFormat, scope: ExportScope, input: WatchlistExportInput): void {
  const ordersByUid = groupOrdersByUid(input.orders);
  const userRows = input.users.map((u) => userRow(u, ordersByUid.get(uidKey(u)) ?? ordersByUid.get(u.id) ?? []));
  const purchaseRows = input.orders.map(purchaseRow);
  const txRows = (input.ledger ?? []).map(txRow);
  const logRows = (input.logs ?? []).map(logRow);
  const base = buildBaseName(input.folderName, scope);
  const totalCharged = userRows.reduce((s, r) => s + Number(r.TotalChargedUSD ?? 0), 0);

  if (format === 'json') {
    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        folder: input.folderName ?? null,
        scope,
        totals: {
          users: input.users.length,
          purchases: input.orders.length,
          totalChargedUSD: Number(totalCharged.toFixed(2)),
        },
      },
      users: scope === 'full' || scope === 'users' ? userRows : [],
      purchases: scope === 'full' || scope === 'purchases' ? input.orders.map(stripTokens) : [],
      transactions: scope === 'full' || scope === 'transactions' ? txRows : [],
      logs: scope === 'full' || scope === 'logs' ? logRows : [],
    };
    downloadBlob(`${base}.json`, JSON.stringify(payload, null, 2), 'application/json');
    return;
  }

  if (format === 'csv') {
    const rows =
      scope === 'purchases' ? purchaseRows : scope === 'transactions' ? txRows : scope === 'logs' ? logRows : userRows;
    downloadBlob(`${base}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
    return;
  }

  if (format === 'txt') {
    downloadBlob(`${base}.txt`, buildTxtReport(input, userRows, ordersByUid), 'text/plain;charset=utf-8');
    return;
  }

  // xlsx — multi-sheet
  const wb = XLSX.utils.book_new();
  if (scope === 'full' || scope === 'users') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userRows.length ? userRows : [{}]), 'Users');
  }
  if (scope === 'full' || scope === 'purchases') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseRows.length ? purchaseRows : [{}]), 'Purchases');
  }
  if ((scope === 'full' || scope === 'transactions') && txRows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Transactions');
  }
  if ((scope === 'full' || scope === 'logs') && logRows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logRows), 'Logs');
  }
  const summary = [
    {
      GeneratedAt: new Date().toISOString(),
      Folder: input.folderName ?? 'All Watchlist',
      Users: input.users.length,
      Purchases: input.orders.length,
      TotalChargedUSD: Number(totalCharged.toFixed(2)),
    },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
  XLSX.writeFile(wb, `${base}.xlsx`);
}

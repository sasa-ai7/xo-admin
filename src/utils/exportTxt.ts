import type { AppUser } from '../types/user';
import type { PurchaseOrder } from '../types/purchaseOrder';
import type { WalletLedgerEntry } from '../hooks/useWalletLedgerForUser';
import type { AdminWatchlistFolder } from '../types/watchlist';
import { purchaseOrderCoins, purchaseOrderNormalizedUsd, COINS_PER_USD } from '../types/purchaseOrder';

function fmtDate(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate(): Date }).toDate().toISOString().slice(0, 10);
    } catch {
      return '—';
    }
  }
  if (typeof value === 'number' && value > 0) return new Date(value).toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return '—';
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function line(label: string, value: unknown): string {
  return `${label.padEnd(24)}: ${value ?? '—'}`;
}

function divider(): string {
  return '─'.repeat(60);
}

function downloadTxt(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportUserTxt(
  user: AppUser,
  purchases: PurchaseOrder[],
  ledger: WalletLedgerEntry[]
): void {
  const now = new Date().toISOString();
  const email = user.Profile?.email ?? '—';
  const displayName = user.Profile?.displayName ?? user.Profile?.name ?? '—';
  const uid = user.id;
  const coins = user.Wallet?.coins ?? 0;
  const gamesPlayed = user.Stats?.gamesPlayed ?? 0;
  const gamesWon = user.Stats?.gamesWon ?? 0;

  const realPurchases = purchases.filter((p) =>
    ['grant_success', 'avatar_unlock_success', 'already_processed'].includes(p.status ?? '')
  );
  const totalCoins = realPurchases.reduce((s, p) => s + purchaseOrderCoins(p), 0);
  const totalNormUsd = realPurchases.reduce((s, p) => s + purchaseOrderNormalizedUsd(p), 0);
  const lastPurchase = purchases[0] ? fmtDate(purchases[0].createdAt ?? purchases[0].purchasedAt) : '—';

  const lines: string[] = [
    'XO Arena Admin — User Export',
    `Generated: ${now}`,
    divider(),
    line('Display Name', displayName),
    line('Email', email),
    line('UID', uid),
    line('Status', user.online ? 'Online' : 'Offline'),
    line('Coins (current)', coins.toLocaleString()),
    line('Games Played', gamesPlayed),
    line('Games Won', gamesWon),
    '',
    line(`Accounting Rule`, `${COINS_PER_USD} coins = $1 USD`),
    line('Total Real Purchases', realPurchases.length),
    line('Total Coins Bought', totalCoins.toLocaleString()),
    line('Normalized USD', fmtUsd(totalNormUsd)),
    line('Last Purchase', lastPurchase),
    divider(),
  ];

  if (purchases.length > 0) {
    lines.push('PURCHASE HISTORY:');
    purchases.forEach((p, i) => {
      const coins = purchaseOrderCoins(p);
      const usd = purchaseOrderNormalizedUsd(p);
      const gp = p.googlePlayPriceLabel ? ` (GP: ${p.googlePlayPriceLabel})` : '';
      lines.push(
        `${String(i + 1).padStart(3)}. ${(p.status ?? '—').padEnd(25)} ${(p.productId ?? '—').padEnd(20)} ` +
          `+${coins} coins  ${fmtUsd(usd)}${gp}  ${fmtDate(p.createdAt ?? p.purchasedAt)}`
      );
    });
    lines.push(divider());
  }

  if (ledger.length > 0) {
    lines.push('WALLET LEDGER:');
    ledger.forEach((e, i) => {
      const coins = typeof e.coinsAdded === 'number' ? e.coinsAdded : 0;
      const src = e.source ?? e.status ?? '—';
      lines.push(
        `${String(i + 1).padStart(3)}. ${src.padEnd(25)} +${coins} coins  ` +
          `(${e.balanceBefore ?? '?'} → ${e.balanceAfter ?? '?'})  ${fmtDate(e.createdAt)}`
      );
    });
    lines.push(divider());
  }

  lines.push('');
  downloadTxt(`xo-user-${uid.slice(0, 8)}-${now.slice(0, 10)}.txt`, lines.join('\n'));
}

export function exportWatchlistFolderTxt(
  folder: AdminWatchlistFolder,
  users: AppUser[],
  purchases: PurchaseOrder[]
): void {
  const now = new Date().toISOString();
  const purchasesByUid = new Map<string, PurchaseOrder[]>();
  for (const p of purchases) {
    if (!p.uid) continue;
    if (!purchasesByUid.has(p.uid)) purchasesByUid.set(p.uid, []);
    purchasesByUid.get(p.uid)!.push(p);
  }

  let totalCoins = 0;
  let totalNormUsd = 0;
  let totalPurchases = 0;

  const lines: string[] = [
    `XO Arena Admin — Watchlist Folder: ${folder.name}`,
    `Generated: ${now}`,
    divider(),
    `Users: ${users.length}`,
    `Accounting: ${COINS_PER_USD} coins = $1 USD`,
    divider(),
  ];

  users.forEach((user, i) => {
    const uid = user.id;
    const userPurchases = purchasesByUid.get(uid) ?? [];
    const realP = userPurchases.filter((p) =>
      ['grant_success', 'avatar_unlock_success', 'already_processed'].includes(p.status ?? '')
    );
    const uCoins = realP.reduce((s, p) => s + purchaseOrderCoins(p), 0);
    const uUsd = realP.reduce((s, p) => s + purchaseOrderNormalizedUsd(p), 0);
    const lastP = userPurchases[0] ? fmtDate(userPurchases[0].createdAt ?? userPurchases[0].purchasedAt) : '—';

    totalCoins += user.Wallet?.coins ?? 0;
    totalNormUsd += uUsd;
    totalPurchases += realP.length;

    lines.push(
      `${String(i + 1).padStart(3)}. ${user.Profile?.displayName ?? user.Profile?.name ?? '—'}`,
      `     ${line('Email', user.Profile?.email ?? '—')}`,
      `     ${line('UID', uid)}`,
      `     ${line('Status', user.online ? 'Online' : 'Offline')}`,
      `     ${line('Coins (current)', (user.Wallet?.coins ?? 0).toLocaleString())}`,
      `     ${line('Games Played', user.Stats?.gamesPlayed ?? 0)}`,
      `     ${line('Real Purchases', realP.length)}`,
      `     ${line('Coins Bought', uCoins.toLocaleString())}`,
      `     ${line('Normalized USD', fmtUsd(uUsd))}`,
      `     ${line('Last Purchase', lastP)}`,
      ''
    );
  });

  lines.push(
    divider(),
    'TOTALS:',
    line('  Total Users', users.length),
    line('  Total Wallet Coins', totalCoins.toLocaleString()),
    line('  Total Purchases', totalPurchases),
    line('  Total Normalized USD', fmtUsd(totalNormUsd)),
    ''
  );

  downloadTxt(`xo-folder-${folder.name.replace(/\s+/g, '-')}-${now.slice(0, 10)}.txt`, lines.join('\n'));
}

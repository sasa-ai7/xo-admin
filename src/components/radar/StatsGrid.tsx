import { CircularProgress } from '../shared/CircularProgress';
import { useLanguage } from '../../i18n/LanguageContext';
import type { AppUser } from '../../types/user';

interface StatsGridProps {
  user: AppUser;
}

export function StatsGrid({ user }: StatsGridProps) {
  const { t } = useLanguage();

  const gamesPlayed = user.Stats?.gamesPlayed ?? 0;
  const gamesWon = user.Stats?.gamesWon ?? 0;
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const coins = user.Wallet?.coins ?? 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div className="flex w-full max-w-full min-w-0 flex-col items-center rounded-2xl border border-glass-border bg-glass-bg p-3 sm:p-4">
        <CircularProgress
          value={winRate}
          size={78}
          strokeWidth={6}
          color="#22C55E"
          label={`${winRate}%`}
          sublabel={t('winRate')}
        />
      </div>
      <div className="flex w-full max-w-full min-w-0 flex-col items-center rounded-2xl border border-glass-border bg-glass-bg p-3 sm:p-4">
        <CircularProgress
          value={Math.min(gamesPlayed, 100)}
          size={78}
          strokeWidth={6}
          color="#00A3FF"
          label={String(gamesPlayed)}
          sublabel={t('totalGames')}
        />
      </div>
      <div className="flex w-full max-w-full min-w-0 flex-col items-center rounded-2xl border border-glass-border bg-glass-bg p-3 sm:p-4">
        <CircularProgress
          value={Math.min(coins / 100, 100)}
          size={78}
          strokeWidth={6}
          color="#A855F7"
          label={String(coins)}
          sublabel={t('coinsBalance')}
        />
      </div>
    </div>
  );
}

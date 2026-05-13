import { Eye } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { useUsers } from '../../hooks/useUsers';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export function WatchlistPage() {
  const { t } = useLanguage();
  const { watchlist } = useWatchlistStore();
  const { data: allUsers, loading } = useUsers();

  const watchedUsers = allUsers.filter((u) => watchlist.includes(u.id));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-orange/10">
            <Eye size={20} className="text-neon-orange" />
          </div>
          <div>
            <h2 className="font-orbitron text-lg font-bold text-white">
              {t('watchlist')}
            </h2>
            <p className="text-xs text-gray-500">{t('watchedUsersCount')}</p>
          </div>
          <span className="rounded-full bg-neon-orange/10 px-3 py-0.5 text-xs font-bold text-neon-orange font-orbitron">
            {watchedUsers.length}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {watchedUsers.length === 0 ? (
        <GlassCard className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Eye size={40} className="mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">{t('noWatchlistUsers')}</p>
          </div>
        </GlassCard>
      ) : (
        /* Users Grid */
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
          {watchedUsers.map((user) => (
            <GlassCard
              key={user.id}
              className="overflow-hidden hover:border-neon-orange/30 transition-all duration-200"
              hover
            >
              <div className="flex items-center gap-3 justify-between p-4 sm:p-5 md:p-6">
                <div className="flex-1 min-w-0">
                  {/* User Email */}
                  <p className="truncate text-xs sm:text-sm font-medium text-neon-orange">
                    {user.Profile?.email || 'Unknown User'}
                  </p>
                  {/* User Name */}
                  <p className="truncate text-xs sm:text-sm text-gray-400 mt-1">
                    {user.Profile?.name || user.Profile?.displayName || 'No name'}
                  </p>
                  {/* Stats Row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-neon-cyan">
                      💰 {(user.Wallet?.coins ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-neon-cyan">
                      ✓ {user.Stats?.gamesWon ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                      🎮 {user.Stats?.gamesPlayed ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

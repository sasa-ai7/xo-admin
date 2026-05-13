import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { StatusDot } from '../shared/StatusDot';
import type { AppUser } from '../../types/user';
import { Users } from 'lucide-react';
import { isUserOnline } from '../../utils/userPresence';

interface UserListGridProps {
  users: AppUser[];
  selectedUid: string | null;
  onUserSelect: (user: AppUser) => void;
  loading: boolean;
}

export function UserListGrid({ users, selectedUid, onUserSelect, loading }: UserListGridProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <GlassCard className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Users size={40} className="mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400">No users found</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
      {users.map((user) => {
        const isSelected = user.id === selectedUid;
        const online = isUserOnline(user);
        return (
          <GlassCard
            key={user.id}
            className={`overflow-hidden transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'border-neon-orange/40 bg-neon-orange/[0.08]'
                : 'hover:border-neon-orange/30'
            }`}
            hover
          >
            <button
              onClick={() => onUserSelect(user)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5 md:p-6">
                <div className="flex-1 min-w-0">
                  {/* Email */}
                  <p className="truncate text-xs sm:text-sm font-medium text-neon-orange">
                    {user.Profile?.email || 'Unknown'}
                  </p>

                  {/* Name with Status */}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="truncate text-xs sm:text-sm text-gray-400">
                      {user.Profile?.name || user.Profile?.displayName || 'No name'}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StatusDot online={online} />
                      <span className={`text-[10px] font-medium whitespace-nowrap ${online ? 'text-green-400' : 'text-gray-500'}`}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-neon-cyan">
                      💰 {(user.Wallet?.coins ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-green-400">
                      ✓ {user.Stats?.gamesWon ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                      🎮 {user.Stats?.gamesPlayed ?? 0}
                    </span>
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon-orange">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-black"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          </GlassCard>
        );
      })}
    </div>
  );
}

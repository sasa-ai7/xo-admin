import { User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/formatters';
import { StatusDot } from '../shared/StatusDot';
import type { AppUser } from '../../types/user';
import { isUserOnline } from '../../utils/userPresence';

interface UserProfileHeaderProps {
  user: AppUser;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const { t } = useLanguage();
  const online = isUserOnline(user);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-glass-border bg-glass-bg sm:h-16 sm:w-16">
        {user.Profile?.photoURL ? (
          <img
            src={user.Profile.photoURL}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <User size={24} className="text-gray-500 sm:size-7" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-orbitron text-base font-bold text-white sm:text-lg">
            {user.Profile?.displayName || user.Profile?.email || 'Unknown User'}
          </h2>
          <StatusDot online={online} />
        </div>
        <p className="break-words text-xs text-gray-400 sm:text-sm">{user.Profile?.email}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 sm:gap-3">
          <span className="break-all">UID: {user.id}</span>
          <span>
            {t('memberSince')}: {formatDate(user.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

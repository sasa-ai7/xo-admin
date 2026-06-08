import { cn } from '../../utils/cn';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  photoURL?: string | null;
  equippedAvatar?: string | null;
  displayName?: string | null;
  size?: AvatarSize;
  className?: string;
  /** When true, shows a subtle online ring around the avatar. */
  online?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const framePad: Record<AvatarSize, string> = {
  xs: 'inset-[-2px]',
  sm: 'inset-[-3px]',
  md: 'inset-[-4px]',
  lg: 'inset-[-5px]',
  xl: 'inset-[-7px]',
};

const frameSize: Record<AvatarSize, string> = {
  xs: 'h-[calc(100%+4px)] w-[calc(100%+4px)]',
  sm: 'h-[calc(100%+6px)] w-[calc(100%+6px)]',
  md: 'h-[calc(100%+8px)] w-[calc(100%+8px)]',
  lg: 'h-[calc(100%+10px)] w-[calc(100%+10px)]',
  xl: 'h-[calc(100%+14px)] w-[calc(100%+14px)]',
};

const initialFontSize: Record<AvatarSize, string> = {
  xs: 'text-[8px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'font-orbitron text-2xl',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function UserAvatar({
  photoURL,
  equippedAvatar,
  displayName,
  size = 'sm',
  className,
  online,
}: UserAvatarProps) {
  const frameUrl = useAvatarUrl(equippedAvatar);
  const initials = getInitials(displayName);

  return (
    <div className={cn('relative shrink-0', sizeClasses[size], className)}>
      {frameUrl && (
        <img
          src={frameUrl}
          alt=""
          className={cn(
            'pointer-events-none absolute z-10 object-contain',
            framePad[size],
            frameSize[size]
          )}
        />
      )}
      {photoURL ? (
        <img
          src={photoURL}
          alt={displayName || ''}
          className={cn('rounded-full object-cover', sizeClasses[size])}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              const fallback = parent.querySelector('[data-fallback]') as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }
          }}
        />
      ) : null}
      <div
        data-fallback=""
        className={cn(
          'items-center justify-center rounded-full bg-xo-cyan/10 font-bold text-xo-cyan',
          sizeClasses[size],
          initialFontSize[size],
          photoURL ? 'hidden' : 'flex'
        )}
      >
        {initials}
      </div>
      {online && (
        <span
          className={cn(
            'absolute bottom-0 right-0 z-20 block rounded-full border-2 border-black bg-emerald-400',
            size === 'xs' || size === 'sm' ? 'h-2 w-2 border' : 'h-2.5 w-2.5'
          )}
          aria-label="Online"
        />
      )}
    </div>
  );
}

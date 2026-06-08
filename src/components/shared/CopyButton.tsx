import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconBadge } from './IconBadge';

interface CopyButtonProps {
  value: string | null | undefined;
  label?: string;
  size?: 'xs' | 'sm';
  className?: string;
  /** When true, stops the click from bubbling (use inside clickable rows). */
  stopPropagation?: boolean;
}

export function CopyButton({
  value,
  label,
  size = 'xs',
  className,
  stopPropagation = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const onClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (stopPropagation) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (!value) return;
      const text = String(value);
      const fallback = () => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
        } catch {
          /* noop */
        }
        document.body.removeChild(textarea);
      };

      const writeViaApi = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).catch(fallback);
        }
        fallback();
        return Promise.resolve();
      };

      writeViaApi().then(() => {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 1200);
      });
    },
    [value, stopPropagation]
  );

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!value}
      title={copied ? 'Copied' : label ? `Copy ${label}` : 'Copy'}
      aria-label={copied ? 'Copied' : label ? `Copy ${label}` : 'Copy'}
      className={cn('inline-flex shrink-0 items-center justify-center transition-all', !value && 'cursor-not-allowed opacity-40', className)}
    >
      <IconBadge icon={Icon} variant={copied ? 'finished' : 'audit'} size={size} glow={Boolean(value)} className="rounded-md" iconClassName={size === 'xs' ? 'scale-75' : undefined} />
    </button>
  );
}

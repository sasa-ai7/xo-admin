import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { cn } from '../../utils/cn';

interface JsonViewerProps {
  data: unknown;
  /** When true (default), renders inside a collapsible disclosure. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  title?: string;
  maxHeightClass?: string;
  className?: string;
}

/** JSON.stringify that survives circular refs and serialises common Firestore types. */
function safeStringify(value: unknown, space = 2): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_k, v) => {
      if (v && typeof v === 'object') {
        if (seen.has(v as object)) return '[Circular]';
        seen.add(v as object);
        const withToDate = v as { toDate?: () => Date };
        if (typeof withToDate.toDate === 'function') {
          try {
            return withToDate.toDate().toISOString();
          } catch {
            // fall through to default serialisation
          }
        }
      }
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'function') return '[Function]';
      return v;
    },
    space
  );
}

export function JsonViewer({
  data,
  collapsible = true,
  defaultOpen = false,
  title = 'Raw JSON',
  maxHeightClass = 'max-h-80',
  className,
}: JsonViewerProps) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const text = useMemo(() => safeStringify(data), [data]);

  const body = (
    <div className={cn('relative rounded-lg border border-glass-border bg-black/60', className)}>
      <div className="flex items-center justify-between border-b border-glass-border px-3 py-1.5">
        <span className="font-orbitron text-[10px] font-bold uppercase tracking-wider text-gray-500">
          JSON
        </span>
        <CopyButton value={text} label="JSON" size="xs" stopPropagation={false} />
      </div>
      <pre
        className={cn(
          'overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-300',
          maxHeightClass
        )}
      >
        {text}
      </pre>
    </div>
  );

  if (!collapsible) return body;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs text-gray-400 transition-colors hover:bg-glass-hover hover:text-white"
        aria-expanded={open}
      >
        <ChevronRight
          size={12}
          className={cn('transition-transform duration-200', open && 'rotate-90')}
        />
        <span className="font-orbitron text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </button>
      {open && <div className="mt-2">{body}</div>}
    </div>
  );
}

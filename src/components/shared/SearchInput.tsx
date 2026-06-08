import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-xo-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-full border border-xo-border bg-xo-panel/80 py-2 ps-9 pe-4 text-sm text-xo-text outline-none transition-all placeholder:text-xo-muted/60 focus:border-xo-border-active focus:bg-xo-panel-hover focus:shadow-[0_0_18px_rgba(85,214,255,0.14)]"
      />
    </div>
  );
}

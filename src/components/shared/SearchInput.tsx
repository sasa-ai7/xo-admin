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
      <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-neon-orange/15 bg-black/40 py-2 ps-9 pe-4 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-neon-orange/40 focus:shadow-[0_0_10px_rgba(255,85,0,0.08)]"
      />
    </div>
  );
}

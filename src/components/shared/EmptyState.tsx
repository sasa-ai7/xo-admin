import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon = Inbox, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="text-gray-700" />
      <p className="mt-3 text-sm text-gray-500">{message}</p>
    </div>
  );
}

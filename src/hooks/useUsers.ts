import type { AppUser } from '../types/user';
import { useDataStore } from '../stores/dataStore';

export function useUsers() {
  const data = useDataStore((state) => state.users) as AppUser[];
  const loading = useDataStore((state) => state.usersLoading);
  const error = useDataStore((state) => state.usersError);

  return { data, loading, error };
}

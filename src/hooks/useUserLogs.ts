import { useCallback } from 'react';
import { useDataStore } from '../stores/dataStore';
import type { UserLog } from '../types/userLog';

interface UseUserLogsOptions {
  enabled?: boolean;
  liveLimit?: number;
  pageSize?: number;
}

interface UseUserLogsResult {
  data: UserLog[];
  loading: boolean;
  error: Error | null;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useUserLogs(enabledOrOptions: boolean | UseUserLogsOptions = true): UseUserLogsResult {
  const enabled =
    typeof enabledOrOptions === 'boolean' ? enabledOrOptions : (enabledOrOptions.enabled ?? true);
  const data = useDataStore((state) => state.userLogs) as UserLog[];
  const loading = useDataStore((state) => state.userLogsLoading);
  const userLogsError = useDataStore((state) => state.userLogsError);
  const auditLogsError = useDataStore((state) => state.auditLogsError);
  const error = userLogsError ?? auditLogsError;
  const loadMore = useCallback(async () => {}, []);

  return {
    data: enabled ? data : [],
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    loadingMore: false,
    hasMore: false,
    loadMore,
  };
}

import { useCallback } from 'react';
import { useDataStore } from '../stores/dataStore';
import type { UserLog } from '../types/userLog';

interface UseAuditLogsResult {
  /** audit_logs entries merged into the shared log stream (prefix "audit:"). */
  data: UserLog[];
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
}

/**
 * Returns audit_logs entries from the shared merged log stream.
 * The dataStore reads both user_logs and audit_logs and merges them; this hook
 * filters out only the audit entries for callers that need them separately.
 */
export function useAuditLogs(): UseAuditLogsResult {
  const allLogs = useDataStore((state) => state.userLogs);
  const loading = useDataStore((state) => state.userLogsLoading);
  const error = useDataStore((state) => state.auditLogsError);
  const loadMore = useCallback(async () => {}, []);

  const data = allLogs.filter((log) => log.id.startsWith('audit:'));

  return { data, loading, error, loadMore };
}

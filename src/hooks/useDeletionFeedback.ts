import type { DeletionFeedback } from '../types/deletionFeedback';
import { useDataStore } from '../stores/dataStore';

export function useDeletionFeedback() {
  const data = useDataStore((state) => state.deletionFeedback) as DeletionFeedback[];
  const loading = useDataStore((state) => state.deletionFeedbackLoading);
  const error = useDataStore((state) => state.deletionFeedbackError);

  return { data, loading, error };
}

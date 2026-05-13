export interface DeletionFeedback {
  id: string;
  email?: string;
  uid?: string;
  finalBalance?: number;
  totalGames?: number;
  deletionDate?: unknown;
  createdAt?: unknown;
  reason?: string;
}

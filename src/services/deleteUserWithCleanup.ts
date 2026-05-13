import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase/config';

export interface DeleteUserWithCleanupResponse {
  ok: true;
  targetUserUid: string;
  deletedTransactions: number;
  deletedUser: true;
}

export interface DeleteUserWithCleanupOptions {
  /** When false, user_logs for this uid are not bulk-deleted (default true). */
  deleteUserLogs?: boolean;
  /** When true, also removes matching rows in deleted_accounts. */
  deleteDeletedAccountRecords?: boolean;
}

export function isAdminDeleteUserCloudConfigured(): boolean {
  return import.meta.env.VITE_ENABLE_ADMIN_DELETE_USER === 'true';
}

export async function deleteUserWithCleanup(
  targetUserUid: string,
  options?: DeleteUserWithCleanupOptions
): Promise<DeleteUserWithCleanupResponse> {
  if (!isAdminDeleteUserCloudConfigured()) {
    throw new Error(
      'User delete is disabled. Deploy the adminDeleteUserWithCleanup callable, then set VITE_ENABLE_ADMIN_DELETE_USER=true in your Vite env.'
    );
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Admin must be authenticated before deleting a user.');
  }

  const fn = httpsCallable(functions, 'adminDeleteUserWithCleanup');
  const result = await fn({
    targetUserUid,
    deleteUserLogs: options?.deleteUserLogs,
    deleteDeletedAccountRecords: options?.deleteDeletedAccountRecords,
  });

  const data = result.data as Partial<DeleteUserWithCleanupResponse> | undefined;
  if (!data?.ok) {
    throw new Error('Cloud Function returned an unsuccessful response.');
  }

  return data as DeleteUserWithCleanupResponse;
}

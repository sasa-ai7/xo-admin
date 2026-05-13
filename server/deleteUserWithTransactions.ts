import { adminDb } from './firebaseAdmin';

const USERS_COLLECTION = 'users';
const IAP_TRANSACTIONS_COLLECTION = 'iap_transactions';

export interface DeleteUserWithTransactionsResult {
  targetUserUid: string;
  deletedTransactions: number;
  deletedUser: true;
}

export async function deleteUserWithTransactions(
  targetUserUid: string
): Promise<DeleteUserWithTransactionsResult> {
  const uid = targetUserUid.trim();

  if (!uid) {
    throw new Error('targetUserUid is required');
  }

  const transactionsSnapshot = await adminDb
    .collection(IAP_TRANSACTIONS_COLLECTION)
    .where('uid', '==', uid)
    .get();

  let deletedTransactions = 0;

  for (let i = 0; i < transactionsSnapshot.docs.length; i += 500) {
    const batch = adminDb.batch();
    const chunk = transactionsSnapshot.docs.slice(i, i + 500);

    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    deletedTransactions += chunk.length;
  }

  await adminDb.collection(USERS_COLLECTION).doc(uid).delete();

  return {
    targetUserUid: uid,
    deletedTransactions,
    deletedUser: true,
  };
}

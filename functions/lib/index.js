"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteUserWithCleanup = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const authAdmin = (0, auth_1.getAuth)();
const COLLECTIONS = {
    users: 'users',
    iap_transactions: 'iap_transactions',
    user_logs: 'user_logs',
    deletion_feedback: 'deletion_feedback',
    deletion_requests: 'deletion_requests',
    deleted_accounts: 'deleted_accounts',
    audit_logs: 'audit_logs',
};
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').trim();
async function deleteQueryInChunks(baseQuery, batchSize) {
    let deleted = 0;
    while (true) {
        const snap = await baseQuery.limit(batchSize).get();
        if (snap.empty)
            break;
        const batch = db.batch();
        for (const doc of snap.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();
        deleted += snap.docs.length;
        if (snap.docs.length < batchSize)
            break;
    }
    return deleted;
}
async function deleteUserSubcollections(uid) {
    const userRef = db.collection(COLLECTIONS.users).doc(uid);
    const subcols = await userRef.listCollections();
    for (const col of subcols) {
        const snaps = await col.get();
        for (const d of snaps.docs) {
            await d.ref.delete();
        }
    }
}
exports.adminDeleteUserWithCleanup = (0, https_1.onCall)({
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    }
    const token = request.auth.token;
    const email = token.email?.trim();
    const isClaimAdmin = token.admin === true;
    const isEmailAdmin = Boolean(ADMIN_EMAIL && email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!isClaimAdmin && !isEmailAdmin) {
        throw new https_1.HttpsError('permission-denied', 'Not authorized for admin delete.');
    }
    const data = request.data;
    const targetUserUid = String(data.targetUserUid ?? '').trim();
    if (!targetUserUid) {
        throw new https_1.HttpsError('invalid-argument', 'targetUserUid is required');
    }
    const deleteUserLogs = data.deleteUserLogs !== false;
    const deleteDeletedAccountRecords = data.deleteDeletedAccountRecords === true;
    let deletedTransactions = 0;
    try {
        deletedTransactions += await deleteQueryInChunks(db.collection(COLLECTIONS.iap_transactions).where('uid', '==', targetUserUid), 400);
        if (deleteUserLogs) {
            await deleteQueryInChunks(db.collection(COLLECTIONS.user_logs).where('uid', '==', targetUserUid), 400);
        }
        await db.collection(COLLECTIONS.deletion_feedback).doc(targetUserUid).delete().catch(() => undefined);
        await db.collection(COLLECTIONS.deletion_requests).doc(targetUserUid).delete().catch(() => undefined);
        if (deleteDeletedAccountRecords) {
            await deleteQueryInChunks(db.collection(COLLECTIONS.deleted_accounts).where('uid', '==', targetUserUid), 400);
            await db.collection(COLLECTIONS.deleted_accounts).doc(targetUserUid).delete().catch(() => undefined);
        }
        await deleteUserSubcollections(targetUserUid);
        await db.collection(COLLECTIONS.users).doc(targetUserUid).delete().catch(() => undefined);
        try {
            await authAdmin.deleteUser(targetUserUid);
        }
        catch (e) {
            const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
            if (code !== 'auth/user-not-found') {
                throw e;
            }
        }
        await db.collection(COLLECTIONS.audit_logs).add({
            type: 'admin_delete_user',
            targetUid: targetUserUid,
            adminEmail: email ?? null,
            deleteUserLogs,
            deleteDeletedAccountRecords,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            ok: true,
            targetUserUid,
            deletedTransactions,
            deletedUser: true,
        };
    }
    catch (e) {
        logger.error('adminDeleteUserWithCleanup failed', e);
        if (e instanceof https_1.HttpsError)
            throw e;
        const message = e instanceof Error ? e.message : 'Delete failed';
        throw new https_1.HttpsError('internal', message);
    }
});
//# sourceMappingURL=index.js.map
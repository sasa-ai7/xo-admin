import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getDatabase } from 'firebase/database';

const env = import.meta.env;

/** Expected production Firebase project for this admin build (visibility checks). */
export const EXPECTED_FIREBASE_PROJECT_ID = 'xo-arenaneon-clash';

/**
 * The Realtime Database for XO Arena lives in the europe-west1 region.
 * Without this explicit URL the Firebase SDK falls back to the legacy
 * `firebaseio.com` host and throws the "Database lives in a different region"
 * warning while returning empty snapshots from /rooms. The env var still
 * wins if set, so deployments can override per environment.
 */
export const DEFAULT_RTDB_URL =
  'https://xo-arenaneon-clash-default-rtdb.europe-west1.firebasedatabase.app';

const envRtdbUrl = String(env.VITE_FIREBASE_DATABASE_URL ?? '').trim();
export const RTDB_DATABASE_URL: string = envRtdbUrl.length > 0 ? envRtdbUrl : DEFAULT_RTDB_URL;

export function readFirebaseProjectId(): string {
  return String(env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
}

/** Non-null when env project id is missing or does not match the expected Neon Clash project. */
export const firebaseSetupError: string | null = (() => {
  const pid = readFirebaseProjectId();
  if (!pid) {
    return 'Missing VITE_FIREBASE_PROJECT_ID. Copy .env.example to .env.local and set Firebase web config.';
  }
  if (pid !== EXPECTED_FIREBASE_PROJECT_ID) {
    return `Wrong Firebase project: expected "${EXPECTED_FIREBASE_PROJECT_ID}", got "${pid}".`;
  }
  return null;
})();

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export const REQUIRED_FIREBASE_ENV_KEYS = requiredKeys;

const missingFirebaseKeys = requiredKeys.filter(
  (k) => typeof env[k] !== 'string' || env[k].trim().length === 0
);
if (missingFirebaseKeys.length > 0) {
  const message = `[firebase/config] Missing Firebase env vars: ${missingFirebaseKeys.join(
    ', '
  )}. The app should show a setup screen if this loads before env is fixed.`;
  if (import.meta.env.DEV) {
    console.warn(message);
  } else {
    console.error(message);
  }
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: RTDB_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Session-scoped auth persistence: the admin must re-authenticate on a fresh
// browser session / new tab / after the browser is closed. A same-tab refresh
// keeps the session. This migrates any pre-existing local-persisted session to
// session scope on first load.
void setPersistence(auth, browserSessionPersistence).catch(() => {
  /* persistence is best-effort; sign-in still works without it */
});
export const functions = getFunctions(app, 'us-central1');
export const rtdb = getDatabase(app);
export default app;

if (import.meta.env.DEV) {
  console.info(`[Firebase] projectId=${readFirebaseProjectId() || '(missing)'}`);
  console.info(`[RTDB] databaseURL=${RTDB_DATABASE_URL}`);
  if (RTDB_DATABASE_URL.includes('firebaseio.com')) {
    console.warn(
      `[RTDB] Legacy region URL detected (firebaseio.com). ` +
        `XO Arena's RTDB lives in europe-west1 — set VITE_FIREBASE_DATABASE_URL=${DEFAULT_RTDB_URL}`
    );
  }
  let loggedSignIn = false;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (!loggedSignIn) {
        console.info(`[Auth] signed in uid=${user.uid} email=${user.email ?? '(no email)'}`);
        loggedSignIn = true;
      }
    } else if (loggedSignIn) {
      console.info('[Auth] signed out');
      loggedSignIn = false;
    }
  });
}

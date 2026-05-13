import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const env = import.meta.env;

/** Expected production Firebase project for this admin build (visibility checks). */
export const EXPECTED_FIREBASE_PROJECT_ID = 'xo-arenaneon-clash';

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
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');
export default app;

if (import.meta.env.DEV) {
  console.info(`[Firebase] connected projectId=${readFirebaseProjectId() || '(missing)'}`);
}

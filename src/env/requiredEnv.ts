/**
 * Variables required before the admin shell or Firebase client may load.
 * Checked in main.tsx before importing App / firebase/config.
 */
export const REQUIRED_VITE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_ADMIN_EMAIL',
  'VITE_ADMIN_PASSWORD',
] as const;

export type RequiredViteEnvKey = (typeof REQUIRED_VITE_ENV_KEYS)[number];

function isNonEmpty(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getMissingRequiredEnvVars(): string[] {
  const env = import.meta.env as Record<RequiredViteEnvKey, string | undefined>;
  return REQUIRED_VITE_ENV_KEYS.filter((key) => !isNonEmpty(env[key]));
}

export function logEnvDiagnostics(missing: string[]): void {
  if (!import.meta.env.DEV) return;
  if (missing.length > 0) {
    console.warn(`[ENV] Missing required env vars: ${missing.join(', ')}`);
  } else {
    console.info('[ENV] Firebase env loaded');
  }
}

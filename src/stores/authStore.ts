import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { verifyPin } from '../utils/pinHash';

// ---- Session gate (idle timeout) -------------------------------------------
// The admin access gate is tracked in sessionStorage so it clears when the tab
// or browser is closed. An inactivity timeout (configurable in Settings) signs
// the admin out automatically.
const SESSION_TIMEOUT_KEY = 'xo_session_timeout_min';
const DEFAULT_TIMEOUT_MIN = 30;

export function getSessionTimeoutMinutes(): number {
  const raw = parseInt(localStorage.getItem(SESSION_TIMEOUT_KEY) || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MIN;
}

export function setSessionTimeoutMinutes(min: number): void {
  if (Number.isFinite(min) && min > 0) localStorage.setItem(SESSION_TIMEOUT_KEY, String(min));
}

function getSessionTimeoutMs(): number {
  return getSessionTimeoutMinutes() * 60 * 1000;
}

/** Mark a fresh session start (called on successful auth / restored session). */
export function markSessionActive(): void {
  const now = String(Date.now());
  sessionStorage.setItem('xo_gate', '1');
  if (!sessionStorage.getItem('xo_session_start')) sessionStorage.setItem('xo_session_start', now);
  sessionStorage.setItem('xo_last_activity', now);
}

export function clearSessionGate(): void {
  sessionStorage.removeItem('xo_gate');
  sessionStorage.removeItem('xo_session_start');
  sessionStorage.removeItem('xo_last_activity');
}

/** Record user activity so the idle timer resets. No-op if the gate is closed. */
export function touchSessionActivity(): void {
  if (sessionStorage.getItem('xo_gate')) {
    sessionStorage.setItem('xo_last_activity', String(Date.now()));
  }
}

/** True when the session has been idle longer than the configured timeout. */
export function isSessionIdleExpired(): boolean {
  if (!sessionStorage.getItem('xo_gate')) return false;
  const last = parseInt(sessionStorage.getItem('xo_last_activity') || '0', 10);
  if (!last) return false;
  return Date.now() - last > getSessionTimeoutMs();
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  attempts: number;
  lockoutUntil: number | null;
  pinInput: string;
  error: string | null;
  appendDigit: (digit: string) => void;
  deleteDigit: () => void;
  clearPin: () => void;
  submitPin: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => () => void;
  isLockedOut: () => boolean;
  getRemainingLockoutTime: () => number;
}

const LOCKOUT_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
const MAX_PIN_LENGTH = 40;

function getStoredLockout(): number | null {
  const stored = localStorage.getItem('xo_lockout');
  if (!stored) return null;
  const time = parseInt(stored, 10);
  if (Date.now() >= time) {
    localStorage.removeItem('xo_lockout');
    return null;
  }
  return time;
}

function getStoredAttempts(): number {
  return parseInt(localStorage.getItem('xo_attempts') || '0', 10);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  attempts: getStoredAttempts(),
  lockoutUntil: getStoredLockout(),
  pinInput: '',
  error: null,

  appendDigit: (digit: string) => {
    const { pinInput, isLockedOut } = get();
    if (isLockedOut() || pinInput.length >= MAX_PIN_LENGTH) return;
    set({ pinInput: pinInput + digit, error: null });
  },

  deleteDigit: () => {
    const { pinInput } = get();
    set({ pinInput: pinInput.slice(0, -1), error: null });
  },

  clearPin: () => set({ pinInput: '', error: null }),

  submitPin: async () => {
    const { pinInput, attempts, isLockedOut } = get();
    if (isLockedOut()) return false;
    if (pinInput.length < 1) return false;

    const valid = await verifyPin(pinInput);

    if (valid) {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.trim();
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD?.trim();
      const allowPinFallback = import.meta.env.VITE_ALLOW_LOCAL_PIN_FALLBACK === 'true';

      if (!adminEmail || !adminPassword) {
        if (allowPinFallback) {
          markSessionActive();
          set({ isAuthenticated: true, attempts: 0, pinInput: '', error: null });
          localStorage.setItem('xo_attempts', '0');
          return true;
        }
        set({
          pinInput: '',
          error:
            'VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD must both be set before Firebase admin sign-in.',
        });
        return false;
      }

      try {
        await setPersistence(auth, browserSessionPersistence).catch(() => {});
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        markSessionActive();
        set({ isAuthenticated: true, attempts: 0, pinInput: '', error: null });
        localStorage.setItem('xo_attempts', '0');
        return true;
      } catch (err) {
        if (allowPinFallback) {
          markSessionActive();
          set({ isAuthenticated: true, attempts: 0, pinInput: '', error: null });
          localStorage.setItem('xo_attempts', '0');
          return true;
        }
        const message =
          err instanceof Error ? err.message : 'Firebase sign-in failed.';
        set({ pinInput: '', error: `Admin sign-in failed: ${message}` });
        return false;
      }
    } else {
      const newAttempts = attempts + 1;
      localStorage.setItem('xo_attempts', String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_DURATION;
        localStorage.setItem('xo_lockout', String(lockoutTime));
        set({
          attempts: newAttempts,
          lockoutUntil: lockoutTime,
          pinInput: '',
          error: 'Too many attempts. Locked for 10 minutes.',
        });
      } else {
        set({
          attempts: newAttempts,
          pinInput: '',
          error: `Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`,
        });
      }
      return false;
    }
  },

  logout: async () => {
    clearSessionGate();
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    set({ isAuthenticated: false, pinInput: '', error: null });
  },

  checkAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // A restored same-tab session counts as an active session for the idle
        // timer (a new tab / closed browser has no Firebase user → login).
        markSessionActive();
        if (import.meta.env.DEV) {
          console.info(
            `[AUTH] signed in uid=${user.uid} email=${user.email ?? '(no email)'}`
          );
          console.info(
            `[AUTH] admin email configured=${String(import.meta.env.VITE_ADMIN_EMAIL ?? '').trim()}`
          );
          console.info(
            `[AUTH] using projectId=${String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim()}`
          );
        }
        set({ isAuthenticated: true, isLoading: false });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    });

    return unsubscribe;
  },

  isLockedOut: () => {
    const { lockoutUntil } = get();
    if (!lockoutUntil) return false;
    if (Date.now() >= lockoutUntil) {
      set({ lockoutUntil: null, attempts: 0 });
      localStorage.removeItem('xo_lockout');
      localStorage.setItem('xo_attempts', '0');
      return false;
    }
    return true;
  },

  getRemainingLockoutTime: () => {
    const { lockoutUntil } = get();
    if (!lockoutUntil) return 0;
    return Math.max(0, lockoutUntil - Date.now());
  },
}));

import { useEffect } from 'react';
import {
  useAuthStore,
  touchSessionActivity,
  isSessionIdleExpired,
} from '../stores/authStore';

/**
 * Auto-locks the admin session after a configurable period of inactivity.
 * Activity (pointer/key/scroll) resets the idle timer; an interval and the
 * tab-visibility change both check for expiry and sign the admin out.
 * Mount once inside the authenticated shell.
 */
export function useSessionTimeout() {
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const onActivity = () => touchSessionActivity();
    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll'];
    activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    touchSessionActivity();

    const check = () => {
      if (isSessionIdleExpired()) void logout();
    };
    const intervalId = window.setInterval(check, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      activityEvents.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [logout]);
}

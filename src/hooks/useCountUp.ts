import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Animate a numeric value toward `target` with an ease-out curve.
 * Honors prefers-reduced-motion (snaps instantly) and only animates the
 * delta between the previous and new target, so live-updating values
 * tween smoothly rather than restarting from zero.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(() => (Number.isFinite(target) ? target : 0));
  const fromRef = useRef(Number.isFinite(target) ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Non-finite targets snap on the next frame (avoids sync setState in effect).
    if (!Number.isFinite(target)) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }

    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    // Reduced motion → duration 0 so the first frame snaps straight to target.
    const duration = prefersReducedMotion() ? 0 : durationMs;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

import { useCountUp } from '../../hooks/useCountUp';

interface AnimatedNumberProps {
  value: number;
  /** Custom formatter; defaults to rounded, locale-grouped integer. */
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({ value, format, durationMs, className }: AnimatedNumberProps) {
  const animated = useCountUp(value, durationMs);
  const display = format ? format(animated) : Math.round(animated).toLocaleString();
  return <span className={className}>{display}</span>;
}

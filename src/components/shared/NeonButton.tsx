import { cn } from '../../utils/cn';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'blue' | 'cyan' | 'purple' | 'red' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  // Filled gradient primary — the single high-emphasis action style.
  primary:
    'border-transparent bg-gradient-to-r from-xo-cyan via-xo-sky to-xo-blue text-xo-bg-deep font-semibold shadow-[0_0_20px_rgba(85,214,255,0.28)] hover:shadow-[0_0_28px_rgba(85,214,255,0.42)]',
  blue: 'border-xo-sky/50 text-xo-sky hover:bg-xo-sky/10 hover:shadow-[0_0_18px_rgba(56,189,248,0.28)]',
  cyan: 'border-xo-cyan/50 text-xo-cyan hover:bg-xo-cyan/10 hover:shadow-[0_0_18px_rgba(85,214,255,0.3)]',
  purple: 'border-xo-purple/50 text-xo-purple hover:bg-xo-purple/10 hover:shadow-[0_0_18px_rgba(167,139,250,0.24)]',
  red: 'border-xo-danger/50 text-xo-danger hover:bg-xo-danger/10 hover:shadow-[0_0_18px_rgba(251,113,133,0.24)]',
  ghost: 'border-transparent text-xo-muted hover:bg-white/5 hover:text-xo-text',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function NeonButton({
  children,
  variant = 'blue',
  size = 'md',
  className,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <button
      className={cn(
        'rounded-xl border bg-xo-panel/60 font-medium backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

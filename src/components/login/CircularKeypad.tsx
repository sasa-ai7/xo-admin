import { motion } from 'framer-motion';
import { Delete, LogIn } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PremiumKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  pinLength: number;
  disabled?: boolean;
}

const rows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

function KeyButton({
  label,
  onClick,
  disabled,
  variant = 'digit',
  glow = false,
}: {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'digit' | 'action' | 'submit';
  glow?: boolean;
}) {
  const base =
    'relative flex h-14 w-20 items-center justify-center rounded-xl font-orbitron text-lg font-bold transition-all duration-200 select-none overflow-hidden';

  const variants: Record<string, string> = {
    digit:
      'border border-xo-border bg-gradient-to-b from-white/[0.04] to-transparent text-xo-text hover:border-xo-border-active hover:bg-xo-cyan/10 hover:text-white hover:shadow-[0_0_18px_rgba(85,214,255,0.2)] active:scale-[0.92] active:bg-xo-cyan/15',
    action:
      'border border-red-500/15 bg-gradient-to-b from-white/[0.03] to-transparent text-gray-400 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 hover:shadow-[0_0_14px_rgba(255,60,60,0.15)] active:scale-[0.92]',
    submit: cn(
      'border bg-gradient-to-b text-xo-cyan active:scale-[0.92]',
      glow
        ? 'border-xo-cyan/50 from-xo-cyan/20 to-xo-blue/10 shadow-[0_0_24px_rgba(85,214,255,0.28)] hover:shadow-[0_0_32px_rgba(85,214,255,0.45)] hover:from-xo-cyan/30'
        : 'border-xo-border/50 from-white/[0.02] to-transparent opacity-30 pointer-events-none'
    ),
  };

  return (
    <motion.button
      className={cn(base, variants[variant], disabled && 'opacity-30 pointer-events-none')}
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
    >
      {/* Neon rim glow on top edge */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            variant === 'submit' && glow
              ? 'linear-gradient(90deg, transparent, rgba(85,214,255,0.6), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(85,214,255,0.15), transparent)',
        }}
      />
      {/* Glass reflection */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        }}
      />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

export function PremiumKeypad({
  onDigit,
  onDelete,
  onSubmit,
  pinLength,
  disabled,
}: PremiumKeypadProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Keypad housing / futuristic shell */}
      <div className="xo-bezel relative rounded-2xl p-5">
        {/* Corner accents */}
        <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-xo-cyan/25" />
        <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-xo-cyan/25" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-xo-cyan/25" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-xo-cyan/25" />

        {/* Rows 1-2-3, 4-5-6, 7-8-9 */}
        <div className="flex flex-col gap-3">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-3">
              {row.map((digit) => (
                <KeyButton
                  key={digit}
                  label={digit}
                  onClick={() => onDigit(digit)}
                  disabled={disabled}
                />
              ))}
            </div>
          ))}

          {/* Bottom row: Delete, 0, Submit */}
          <div className="flex gap-3">
            <KeyButton
              label={<Delete size={18} className="text-xo-danger/70" />}
              onClick={onDelete}
              disabled={disabled}
              variant="action"
            />
            <KeyButton
              label="0"
              onClick={() => onDigit('0')}
              disabled={disabled}
            />
            <KeyButton
              label={<LogIn size={18} className="text-xo-cyan" />}
              onClick={onSubmit}
              disabled={disabled || pinLength < 1}
              variant="submit"
              glow={pinLength >= 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep backward compat export
export { PremiumKeypad as CircularKeypad };

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLanguage } from '../../i18n/LanguageContext';
import { XOArenaLogo } from './PulsingLogo';
import { PremiumKeypad } from './CircularKeypad';
import { LockoutOverlay } from './LockoutOverlay';

export function LoginScreen() {
  const { t } = useLanguage();
  const {
    pinInput,
    error,
    appendDigit,
    deleteDigit,
    submitPin,
    isLockedOut,
  } = useAuthStore();

  const locked = isLockedOut();

  // ── Animated XO canvas background ──
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const SYMBOL_COUNT = 55;

    interface XOSymbol {
      x: number;
      y: number;
      size: number;
      speed: number;
      baseOpacity: number;
      rotation: number;
      rotationSpeed: number;
      type: 'X' | 'O';
      driftAmp: number;
      driftFreq: number;
      phaseOffset: number;
      pulseSpeed: number;
    }

    const symbols: XOSymbol[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initSymbols() {
      symbols.length = 0;
      for (let i = 0; i < SYMBOL_COUNT; i++) {
        symbols.push({
          x: Math.random() * (canvas?.width || 1920),
          y: Math.random() * (canvas?.height || 1080),
          size: Math.random() * 26 + 14,
          speed: Math.random() * 0.6 + 0.2,
          baseOpacity: Math.random() * 0.07 + 0.03,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.008,
          type: Math.random() > 0.5 ? 'X' : 'O',
          driftAmp: Math.random() * 30 + 10,
          driftFreq: Math.random() * 0.002 + 0.001,
          phaseOffset: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.003 + 0.001,
        });
      }
    }

    let time = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time++;

      for (const s of symbols) {
        const pulse = Math.sin(time * s.pulseSpeed + s.phaseOffset) * 0.3 + 0.7;
        const opacity = s.baseOpacity * pulse;
        const dx = Math.sin(time * s.driftFreq + s.phaseOffset) * s.driftAmp;

        ctx.save();
        ctx.translate(s.x + dx, s.y);
        ctx.rotate(s.rotation);

        if (s.type === 'X') {
          ctx.strokeStyle = `rgba(85, 214, 255, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.shadowColor = 'rgba(85, 214, 255, 0.3)';
          ctx.shadowBlur = 8;
          const half = s.size / 2;
          ctx.beginPath();
          ctx.moveTo(-half, -half);
          ctx.lineTo(half, half);
          ctx.moveTo(half, -half);
          ctx.lineTo(-half, half);
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();

        s.y -= s.speed;
        s.rotation += s.rotationSpeed;

        if (s.y < -s.size) {
          s.y = canvas.height + s.size;
          s.x = Math.random() * canvas.width;
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    initSymbols();
    draw();

    const handleResize = () => { resize(); initSymbols(); };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Block physical keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-gradient-to-br from-xo-bg-deep via-xo-bg to-xo-bg-soft">
      {/* ── Background layers ── */}
      {/* Floating XO symbols canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[1]"
      />
      {/* Radial cyan ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(85,214,255,0.14)_0%,transparent_70%)]" />
      {/* Bottom-left sky wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_90%,rgba(56,189,248,0.1)_0%,transparent_60%)]" />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
      {/* Subtle grid overlay for futuristic feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(85,214,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(85,214,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-8">
        {/* XO Arena logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <XOArenaLogo />
        </motion.div>

        {/* Access portal panel — elevated 2.5D glass */}
        <motion.div
          className="xo-bezel mt-8 flex w-full max-w-sm flex-col items-stretch rounded-[1.75rem] p-6 sm:p-7"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.6, ease: 'easeOut' }}
        >
          {/* Admin Access badge (2.5D) */}
          <div className="flex justify-center">
            <span className="xo-bezel inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-orbitron text-[10px] font-bold tracking-[0.32em] text-xo-cyan uppercase">
              <ShieldCheck size={12} className="text-xo-cyan" />
              {t('adminAccess')}
            </span>
          </div>

          {/* Divider line */}
          <motion.div
            className="mx-auto my-5 h-px w-40"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(85,214,255,0.55), transparent)',
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          />

        {/* Password field */}
        <motion.div
          className="relative mb-1 w-full max-w-sm px-1 sm:px-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div
            className="flex h-12 items-center rounded-xl border border-xo-border bg-xo-panel/70 px-4 backdrop-blur-md"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px rgba(85,214,255,0.08)',
            }}
          >
            <Lock size={16} className="me-3 text-xo-cyan/60" />
            <div className="flex flex-1 items-center gap-0.5 font-orbitron text-lg tracking-[0.35em] text-xo-text">
              {pinInput
                ? '\u25CF'.repeat(pinInput.length)
                : ''}
              {!pinInput && (
                <span className="text-sm tracking-[0.15em] text-gray-600">
                  {t('enterPin')}
                </span>
              )}
              {pinInput && (
                <motion.span
                  className="ml-0.5 inline-block h-5 w-[2px] bg-xo-cyan"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.p
            className="mt-2 text-xs font-medium text-red-400"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        {/* Keypad or Lockout */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {locked ? (
            <LockoutOverlay />
          ) : (
            <PremiumKeypad
              onDigit={appendDigit}
              onDelete={deleteDigit}
              onSubmit={submitPin}
              pinLength={pinInput.length}
            />
          )}
        </motion.div>
        </motion.div>

        {/* Secure portal tag */}
        <motion.p
          className="mt-5 inline-flex items-center gap-1.5 font-orbitron text-[9px] tracking-[0.3em] text-xo-muted/70 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <ShieldCheck size={10} className="text-xo-cyan/50" />
          {t('securePortal')} · XO ARENA
        </motion.p>
      </div>
    </div>
  );
}

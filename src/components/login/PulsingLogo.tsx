import { motion } from 'framer-motion';

export function XOArenaLogo() {
  return (
    <div className="flex flex-col items-center select-none">
      {/* ── Crown with glow animation ── */}
      <motion.div
        className="mb-3"
        initial={{ scale: 0.5, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.svg
          viewBox="0 0 120 70"
          className="h-20 w-24 sm:h-24 sm:w-28"
          fill="none"
          animate={{
            filter: [
              'drop-shadow(0 0 6px rgba(85,214,255,0.3)) drop-shadow(0 0 20px rgba(56,189,248,0.15))',
              'drop-shadow(0 0 14px rgba(85,214,255,0.6)) drop-shadow(0 0 40px rgba(56,189,248,0.3))',
              'drop-shadow(0 0 6px rgba(85,214,255,0.3)) drop-shadow(0 0 20px rgba(56,189,248,0.15))',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Main crown shape — 5 peaks for richer look */}
          <path
            d="M12 58L18 22L34 34L48 10L60 28L72 10L86 34L102 22L108 58H12Z"
            fill="url(#crownFill)"
            stroke="url(#crownEdge)"
            strokeWidth="1.2"
          />
          {/* Center jewel — diamond shape */}
          <motion.path
            d="M60 14L64 20L60 26L56 20Z"
            fill="#CFF6FF"
            stroke="rgba(85,214,255,0.55)"
            strokeWidth="0.5"
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Left peak jewel */}
          <motion.circle
            cx="48" cy="14" r="2.5"
             fill="#55D6FF"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          {/* Right peak jewel */}
          <motion.circle
            cx="72" cy="14" r="2.5"
             fill="#55D6FF"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />
          {/* Far left jewel */}
          <motion.circle
            cx="18" cy="24" r="2"
            fill="#38BDF8"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
          {/* Far right jewel */}
          <motion.circle
            cx="102" cy="24" r="2"
            fill="#38BDF8"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          {/* Crown band */}
          <rect x="14" y="52" width="92" height="6" rx="2" fill="url(#bandFill)" opacity="0.7" />
          {/* Band jewels */}
          <circle cx="40" cy="55" r="1.8" fill="#CFF6FF" opacity="0.8" />
          <circle cx="60" cy="55" r="2.2" fill="#55D6FF" opacity="0.9" />
          <circle cx="80" cy="55" r="1.8" fill="#CFF6FF" opacity="0.8" />
          {/* Metallic shimmer line across crown */}
          <motion.rect
            x="20" y="35" width="80" height="1" rx="0.5"
            fill="url(#shimmerLine)"
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="crownFill" x1="12" y1="10" x2="108" y2="58">
              <stop offset="0%" stopColor="#9EEBFF" />
              <stop offset="25%" stopColor="#55D6FF" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="75%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
            <linearGradient id="crownEdge" x1="12" y1="10" x2="108" y2="58">
              <stop offset="0%" stopColor="rgba(220,250,255,0.75)" />
              <stop offset="50%" stopColor="rgba(85,214,255,0.55)" />
              <stop offset="100%" stopColor="rgba(14,165,233,0.45)" />
            </linearGradient>
            <linearGradient id="bandFill" x1="14" y1="52" x2="106" y2="58">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="30%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#CFF6FF" />
              <stop offset="70%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
            <linearGradient id="shimmerLine" x1="20" y1="35" x2="100" y2="36">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="rgba(180,245,255,0.55)" />
              <stop offset="50%" stopColor="rgba(245,253,255,0.85)" />
              <stop offset="60%" stopColor="rgba(180,245,255,0.55)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>

      {/* ── XO text ── */}
      <motion.div
        className="relative font-orbitron text-8xl font-black tracking-[0.2em] sm:text-9xl"
        style={{
          color: '#55D6FF',
          textShadow:
            '0 0 25px rgba(85,214,255,0.7), 0 0 70px rgba(56,189,248,0.35), 0 0 120px rgba(56,189,248,0.15), 0 2px 4px rgba(0,0,0,0.8)',
          WebkitTextStroke: '1px rgba(180,245,255,0.18)',
        }}
        animate={{
          textShadow: [
            '0 0 25px rgba(85,214,255,0.7), 0 0 70px rgba(56,189,248,0.35), 0 0 120px rgba(56,189,248,0.15), 0 2px 4px rgba(0,0,0,0.8)',
            '0 0 40px rgba(85,214,255,0.9), 0 0 100px rgba(56,189,248,0.5), 0 0 160px rgba(56,189,248,0.25), 0 2px 4px rgba(0,0,0,0.8)',
            '0 0 25px rgba(85,214,255,0.7), 0 0 70px rgba(56,189,248,0.35), 0 0 120px rgba(56,189,248,0.15), 0 2px 4px rgba(0,0,0,0.8)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        XO
        {/* Metallic shine sweep */}
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(180,245,255,0.2) 45%, rgba(180,245,255,0.35) 50%, rgba(180,245,255,0.2) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mixBlendMode: 'overlay',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        />
      </motion.div>

      {/* ── ARENA text ── */}
      <motion.div
        className="mt-1 font-orbitron text-4xl font-bold tracking-[0.5em] sm:text-5xl"
        style={{
          background: 'linear-gradient(180deg, #F8FBFF 0%, #9EEBFF 30%, #55D6FF 60%, #0EA5E9 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 16px rgba(85,214,255,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        ARENA
      </motion.div>
      <motion.p
        className="mt-3 font-orbitron text-[10px] font-semibold tracking-[0.4em] text-xo-cyan/65 uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        Admin Control
      </motion.p>
    </div>
  );
}

// Keep alias for compatibility with any callers still importing PulsingLogo.
export { XOArenaLogo as PulsingLogo };

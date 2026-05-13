import { motion } from 'framer-motion';

export function XOKingsLogo() {
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
              'drop-shadow(0 0 6px rgba(255,140,26,0.3)) drop-shadow(0 0 20px rgba(255,85,0,0.15))',
              'drop-shadow(0 0 14px rgba(255,140,26,0.6)) drop-shadow(0 0 40px rgba(255,85,0,0.3))',
              'drop-shadow(0 0 6px rgba(255,140,26,0.3)) drop-shadow(0 0 20px rgba(255,85,0,0.15))',
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
            fill="#FFDD88"
            stroke="rgba(255,200,120,0.5)"
            strokeWidth="0.5"
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Left peak jewel */}
          <motion.circle
            cx="48" cy="14" r="2.5"
            fill="#FFB84D"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          {/* Right peak jewel */}
          <motion.circle
            cx="72" cy="14" r="2.5"
            fill="#FFB84D"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />
          {/* Far left jewel */}
          <motion.circle
            cx="18" cy="24" r="2"
            fill="#FFA033"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
          {/* Far right jewel */}
          <motion.circle
            cx="102" cy="24" r="2"
            fill="#FFA033"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          {/* Crown band */}
          <rect x="14" y="52" width="92" height="6" rx="2" fill="url(#bandFill)" opacity="0.7" />
          {/* Band jewels */}
          <circle cx="40" cy="55" r="1.8" fill="#FFE0A0" opacity="0.8" />
          <circle cx="60" cy="55" r="2.2" fill="#FFCC66" opacity="0.9" />
          <circle cx="80" cy="55" r="1.8" fill="#FFE0A0" opacity="0.8" />
          {/* Metallic shimmer line across crown */}
          <motion.rect
            x="20" y="35" width="80" height="1" rx="0.5"
            fill="url(#shimmerLine)"
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="crownFill" x1="12" y1="10" x2="108" y2="58">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="25%" stopColor="#FF8C1A" />
              <stop offset="50%" stopColor="#FFAA44" />
              <stop offset="75%" stopColor="#FF8C1A" />
              <stop offset="100%" stopColor="#CC5500" />
            </linearGradient>
            <linearGradient id="crownEdge" x1="12" y1="10" x2="108" y2="58">
              <stop offset="0%" stopColor="rgba(255,220,150,0.7)" />
              <stop offset="50%" stopColor="rgba(255,170,80,0.5)" />
              <stop offset="100%" stopColor="rgba(180,70,0,0.4)" />
            </linearGradient>
            <linearGradient id="bandFill" x1="14" y1="52" x2="106" y2="58">
              <stop offset="0%" stopColor="#AA6600" />
              <stop offset="30%" stopColor="#FFAA44" />
              <stop offset="50%" stopColor="#FFD080" />
              <stop offset="70%" stopColor="#FFAA44" />
              <stop offset="100%" stopColor="#AA6600" />
            </linearGradient>
            <linearGradient id="shimmerLine" x1="20" y1="35" x2="100" y2="36">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="rgba(255,220,160,0.5)" />
              <stop offset="50%" stopColor="rgba(255,240,200,0.8)" />
              <stop offset="60%" stopColor="rgba(255,220,160,0.5)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </motion.svg>
      </motion.div>

      {/* ── XO text ── */}
      <motion.div
        className="relative font-orbitron text-8xl font-black tracking-[0.2em] sm:text-9xl"
        style={{
          color: '#FF8C1A',
          textShadow:
            '0 0 25px rgba(255,120,30,0.7), 0 0 70px rgba(255,85,0,0.35), 0 0 120px rgba(255,85,0,0.15), 0 2px 4px rgba(0,0,0,0.8)',
          WebkitTextStroke: '1px rgba(255,160,80,0.15)',
        }}
        animate={{
          textShadow: [
            '0 0 25px rgba(255,120,30,0.7), 0 0 70px rgba(255,85,0,0.35), 0 0 120px rgba(255,85,0,0.15), 0 2px 4px rgba(0,0,0,0.8)',
            '0 0 40px rgba(255,120,30,0.9), 0 0 100px rgba(255,85,0,0.5), 0 0 160px rgba(255,85,0,0.25), 0 2px 4px rgba(0,0,0,0.8)',
            '0 0 25px rgba(255,120,30,0.7), 0 0 70px rgba(255,85,0,0.35), 0 0 120px rgba(255,85,0,0.15), 0 2px 4px rgba(0,0,0,0.8)',
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
              'linear-gradient(105deg, transparent 40%, rgba(255,220,180,0.2) 45%, rgba(255,220,180,0.35) 50%, rgba(255,220,180,0.2) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mixBlendMode: 'overlay',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        />
      </motion.div>

      {/* ── KINGS text ── */}
      <motion.div
        className="mt-1 font-orbitron text-4xl font-bold tracking-[0.5em] sm:text-5xl"
        style={{
          background: 'linear-gradient(180deg, #FFE0A0 0%, #FFAA44 30%, #FF8C1A 60%, #CC5500 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 16px rgba(255,120,30,0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        KINGS
      </motion.div>
    </div>
  );
}

// Keep backward compat
export { XOKingsLogo as PulsingLogo };

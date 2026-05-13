import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuthStore } from '../../stores/authStore';

export function LockoutOverlay() {
  const { t } = useLanguage();
  const getRemainingLockoutTime = useAuthStore((s) => s.getRemainingLockoutTime);
  const [remaining, setRemaining] = useState(getRemainingLockoutTime());

  useEffect(() => {
    const interval = setInterval(() => {
      const time = getRemainingLockoutTime();
      setRemaining(time);
    }, 1000);
    return () => clearInterval(interval);
  }, [getRemainingLockoutTime]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 rounded-2xl border border-red-500/15 bg-black/40 p-8 backdrop-blur-md"
      style={{
        boxShadow: '0 0 40px rgba(255,40,40,0.08), inset 0 1px 0 rgba(255,80,60,0.08)',
      }}
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ShieldOff size={56} className="text-red-500 drop-shadow-[0_0_12px_rgba(255,60,40,0.4)]" />
      </motion.div>

      <h2
        className="font-orbitron text-xl font-bold tracking-wider text-red-400"
        style={{ textShadow: '0 0 10px rgba(255,60,40,0.4)' }}
      >
        {t('locked')}
      </h2>

      <div
        className="font-orbitron text-5xl font-bold text-white"
        style={{ textShadow: '0 0 20px rgba(255,80,40,0.3)' }}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      <p className="text-xs text-gray-500">
        {t('lockedFor')} 10 {t('minutes')}
      </p>
    </motion.div>
  );
}

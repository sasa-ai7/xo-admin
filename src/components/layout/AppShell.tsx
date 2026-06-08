import { Outlet, useLocation } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AnimatedBackground } from './AnimatedBackground';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';

export function AppShell() {
  const location = useLocation();
  const reduce = useReducedMotion();
  useSessionTimeout();

  return (
    <div className="relative flex min-h-dvh w-full overflow-x-hidden bg-xo-bg-deep text-xo-text">
      <AnimatedBackground />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-4 md:px-6 md:pt-5">
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

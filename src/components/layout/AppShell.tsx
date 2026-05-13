import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AnimatedBackground } from './AnimatedBackground';

export function AppShell() {
  return (
    <div className="relative flex min-h-dvh w-full overflow-x-hidden bg-black">
      <AnimatedBackground />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-4 md:px-6 md:pt-4">
          <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

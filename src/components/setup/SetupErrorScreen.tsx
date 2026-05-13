import { REQUIRED_VITE_ENV_KEYS } from '../../env/requiredEnv';

interface SetupErrorScreenProps {
  missingKeys: string[];
}

export function SetupErrorScreen({ missingKeys }: SetupErrorScreenProps) {
  const missingSet = new Set(missingKeys);

  return (
    <div className="min-h-dvh bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-zinc-900/90 p-6 shadow-[0_0_40px_rgba(245,158,11,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
          Configuration required
        </p>
        <h1 className="mt-2 font-semibold text-xl text-white">Environment variables missing</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          The admin panel cannot start until all required variables are set. Create{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-200/90">.env.local</code> in the
          project root (Vite loads it automatically), copy from{' '}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-200/90">.env.example</code>, then fill
          in the missing values and restart <code className="text-amber-200/90">npm run dev</code>.
        </p>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Required variables</p>
          <ul className="mt-2 space-y-1.5 font-mono text-sm">
            {REQUIRED_VITE_ENV_KEYS.map((key) => {
              const ok = !missingSet.has(key);
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    ok ? 'bg-emerald-950/40 text-emerald-300/90' : 'bg-red-950/50 text-red-200'
                  }`}
                >
                  <span className="shrink-0 w-5 text-center">{ok ? '✓' : '✗'}</span>
                  <span className="min-w-0 break-all">{key}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {missingKeys.length > 0 && (
          <p className="mt-4 text-xs text-zinc-500">
            Missing: <span className="text-amber-200/80">{missingKeys.join(', ')}</span>
          </p>
        )}
      </div>
    </div>
  );
}

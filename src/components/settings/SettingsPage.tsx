import { useEffect, useState } from 'react';
import { Check, Languages, LogOut, Moon, Settings as SettingsIcon, Sun, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  useAuthStore,
  getSessionTimeoutMinutes,
  setSessionTimeoutMinutes,
} from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import {
  RTDB_DATABASE_URL,
  REQUIRED_FIREBASE_ENV_KEYS,
  auth,
  firebaseSetupError,
  readFirebaseProjectId,
} from '../../firebase/config';
import { GlassCard } from '../shared/GlassCard';
import { PageHeader } from '../shared/PageHeader';
import { FilterChip } from '../shared/FilterChip';
import { CopyButton } from '../shared/CopyButton';
import { formatAbsoluteTime, formatRelativeTime } from '../../utils/relativeTime';

interface AuthSnapshot {
  email: string | null;
  uid: string | null;
  provider: string | null;
  lastSignInTime: string | null;
  creationTime: string | null;
}

function captureAuthSnapshot(): AuthSnapshot {
  const u = auth.currentUser;
  return {
    email: u?.email ?? null,
    uid: u?.uid ?? null,
    provider: u?.providerData?.[0]?.providerId ?? null,
    lastSignInTime: u?.metadata?.lastSignInTime ?? null,
    creationTime: u?.metadata?.creationTime ?? null,
  };
}

/** Mask sensitive config so raw values are never shown openly in the UI. */
function maskValue(value: string | null | undefined, visible = 5): string {
  if (!value) return '—';
  const v = String(value).trim();
  if (!v) return '—';
  if (v.length <= visible) return '••••••';
  return `${v.slice(0, visible)}••••••`;
}

const TIMEOUT_OPTIONS = [15, 30, 60];

export function SettingsPage() {
  const { t, lang, toggleLang } = useLanguage();
  const logout = useAuthStore((s) => s.logout);
  const attempts = useAuthStore((s) => s.attempts);
  const isLockedOut = useAuthStore((s) => s.isLockedOut);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const debugSnapshotSizes = useDataStore((s) => s.debugSnapshotSizes);
  const usersError = useDataStore((s) => s.usersError);
  const txError = useDataStore((s) => s.transactionsError);
  const userLogsError = useDataStore((s) => s.userLogsError);
  const auditLogsError = useDataStore((s) => s.auditLogsError);
  const lastError =
    firebaseSetupError ??
    usersError?.message ??
    txError?.message ??
    userLogsError?.message ??
    auditLogsError?.message ??
    null;

  const [authState, setAuthState] = useState<AuthSnapshot>(() => captureAuthSnapshot());
  useEffect(() => auth.onAuthStateChanged(() => setAuthState(captureAuthSnapshot())), []);

  const [timeoutMin, setTimeoutMin] = useState(() => getSessionTimeoutMinutes());
  const changeTimeout = (m: number) => {
    setSessionTimeoutMinutes(m);
    setTimeoutMin(m);
  };

  const projectId = readFirebaseProjectId() || '(missing)';
  const env = import.meta.env as Record<string, string | undefined>;
  const locked = isLockedOut();

  return (
    <div className="space-y-5">
      <PageHeader icon={SettingsIcon} variant="settings" title={t('settings')} subtitle={t('settingsSubtitle')} />

      {/* Account & session */}
      <GlassCard className="p-5">
        <SectionTitle>{t('accountSession')}</SectionTitle>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label={t('signedInEmail')}>
            <span className="font-mono text-xo-text">{authState.email ?? '—'}</span>
            {authState.email && (
              <CopyButton value={authState.email} label="email" size="xs" stopPropagation={false} />
            )}
          </Row>
          <Row label={t('uid')}>
            <span className="font-mono text-[11px] text-xo-muted">{authState.uid ?? '—'}</span>
            {authState.uid && (
              <CopyButton value={authState.uid} label="UID" size="xs" stopPropagation={false} />
            )}
          </Row>
          <Row label={t('provider')}>
            <span className="font-mono text-xo-text/80">{authState.provider ?? '—'}</span>
          </Row>
          <Row label={t('lastSignIn')}>
            <span className="text-xo-text/80">
              {authState.lastSignInTime
                ? `${formatAbsoluteTime(authState.lastSignInTime)} · ${formatRelativeTime(authState.lastSignInTime)}`
                : '—'}
            </span>
          </Row>
          <Row label={t('accountCreated')}>
            <span className="text-xo-text/80">
              {authState.creationTime ? formatAbsoluteTime(authState.creationTime) : '—'}
            </span>
          </Row>
        </dl>
      </GlassCard>

      {/* Theme & Language */}
      <GlassCard className="p-5">
        <SectionTitle>{t('themeLanguage')}</SectionTitle>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label={t('appearance')}>
            <div className="flex gap-1.5">
              <FilterChip active={theme === 'dark'} icon={Moon} onClick={() => setTheme('dark')}>
                {t('darkMode')}
              </FilterChip>
              <FilterChip active={theme === 'light'} icon={Sun} onClick={() => setTheme('light')}>
                {t('lightMode')}
              </FilterChip>
            </div>
          </Row>
          <Row label={t('language')}>
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-2 rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-1.5 text-xs font-semibold text-xo-text/80 transition-colors hover:border-xo-border-active hover:text-xo-cyan"
            >
              <Languages size={13} />
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
          </Row>
        </dl>
      </GlassCard>

      {/* Security & Access */}
      <GlassCard className="p-5">
        <SectionTitle>{t('securityAccess')}</SectionTitle>
        <p className="mb-3 text-[11px] text-xo-muted">{t('reauthPolicyHint')}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label={t('sessionTimeout')}>
            <div className="flex gap-1.5">
              {TIMEOUT_OPTIONS.map((m) => (
                <FilterChip key={m} active={timeoutMin === m} onClick={() => changeTimeout(m)}>
                  {m} {t('minutes')}
                </FilterChip>
              ))}
            </div>
          </Row>
          <Row label={t('failedAttempts')}>
            {locked ? (
              <span className="font-semibold text-rose-400">{t('accountLocked')}</span>
            ) : (
              <span className="font-mono text-xo-text/80">{attempts}</span>
            )}
          </Row>
        </dl>
        <p className="mt-2 text-[10px] text-xo-muted/70">{t('sessionTimeoutHint')}</p>

        <div className="mt-5 flex justify-end border-t border-xo-border pt-4">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <LogOut size={13} />
            {t('signOut')}
          </button>
        </div>
      </GlassCard>

      {/* Firebase / Environment status — all sensitive values masked */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle className="mb-0">{t('environmentStatus')}</SectionTitle>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {firebaseSetupError ? t('errorTitle') : t('connected')}
          </span>
        </div>

        {firebaseSetupError && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            {firebaseSetupError}
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label={t('projectId')}>
            <span className="font-mono text-xo-text" title={t('hiddenForSecurity')}>{maskValue(projectId)}</span>
          </Row>
          <Row label={t('rtdbUrl')}>
            <span className="break-all font-mono text-[11px] text-xo-muted" title={t('hiddenForSecurity')}>
              {maskValue(RTDB_DATABASE_URL, 8)}
            </span>
          </Row>
          <Row label={t('authDomain')}>
            <span className="font-mono text-xo-muted" title={t('hiddenForSecurity')}>
              {maskValue(env.VITE_FIREBASE_AUTH_DOMAIN)}
            </span>
          </Row>
          <Row label={t('functionsRegion')}>
            <span className="font-mono text-xo-muted">us-central1</span>
          </Row>
        </dl>

        <div className="mt-5 border-t border-xo-border pt-4">
          <h3 className="mb-2 font-orbitron text-[10px] font-bold uppercase tracking-wider text-xo-muted">
            {t('environmentVariables')}
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {REQUIRED_FIREBASE_ENV_KEYS.map((key) => {
              const present = typeof env[key] === 'string' && (env[key] as string).trim().length > 0;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-[11px]"
                >
                  <span className="truncate font-mono text-xo-muted">{key}</span>
                  {present ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <Check size={12} /> {t('configured')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <X size={12} /> {t('missingLabel')}
                    </span>
                  )}
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-2 rounded-lg border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-[11px]">
              <span className="truncate font-mono text-xo-muted">VITE_FIREBASE_DATABASE_URL</span>
              {typeof env.VITE_FIREBASE_DATABASE_URL === 'string' &&
              env.VITE_FIREBASE_DATABASE_URL.trim().length > 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Check size={12} /> {t('configured')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400">{t('usingFallback')}</span>
              )}
            </li>
          </ul>
        </div>

        <div className="mt-5 border-t border-xo-border pt-4">
          <h3 className="mb-2 font-orbitron text-[10px] font-bold uppercase tracking-wider text-xo-muted">
            {t('liveSnapshotSizes')}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <SnapshotPill label={t('totalUsers')} value={debugSnapshotSizes.users} />
            <SnapshotPill label={t('transactions')} value={debugSnapshotSizes.transactions} />
            <SnapshotPill label="User logs" value={debugSnapshotSizes.userLogs} />
            <SnapshotPill label={t('auditLogs')} value={debugSnapshotSizes.auditLogs} />
            <SnapshotPill label={t('liveRadar')} value={debugSnapshotSizes.mergedRadarLogs} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-[11px]">
          <span className="font-orbitron text-[10px] uppercase tracking-wider text-xo-muted">
            {t('lastErrorLabel')}
          </span>
          <p className="mt-1 break-all font-mono text-[11px] text-xo-muted">{lastError ?? `(${t('none')})`}</p>
        </div>
      </GlassCard>
    </div>
  );
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mb-4 font-orbitron text-xs font-bold uppercase tracking-wider text-xo-muted ${className}`}>
      {children}
    </h2>
  );
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-xo-border bg-xo-bg-soft/50 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-xo-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-end">{children}</dd>
    </div>
  );
}

function SnapshotPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-center">
      <p className="font-orbitron text-lg font-bold text-xo-text">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wider text-xo-muted">{label}</p>
    </div>
  );
}

import { useLanguage } from '../../i18n/LanguageContext';
import { Badge } from './Badge';
import type { en } from '../../i18n/en';

type LabelKey = keyof typeof en;
type BadgeVariant = 'cyan' | 'green' | 'amber' | 'red' | 'gray' | 'purple';

const STATUS_MAP: Record<string, { variant: BadgeVariant; key: LabelKey }> = {
  grant_success: { variant: 'green', key: 'poCompleted' },
  avatar_unlock_success: { variant: 'green', key: 'poAvatarUnlocked' },
  coin_granted_client_fallback: { variant: 'amber', key: 'poClientFallback' },
  already_processed: { variant: 'amber', key: 'poDuplicatePrevented' },
  purchase_completed: { variant: 'cyan', key: 'poReported' },
  purchase_client_reported: { variant: 'cyan', key: 'poReported' },
  purchased_client_reported: { variant: 'cyan', key: 'poReported' },
  verification_failed: { variant: 'red', key: 'poVerificationFailed' },
  grant_failed: { variant: 'red', key: 'poGrantFailed' },
};

const NOISE_STATUSES = new Set(['started', 'canceled', 'pending', 'pre_purchase_error', 'open_store', 'tap_product']);

/** Canonical, translated status pill for a purchase order's primary status. */
export function PurchaseStatusBadge({ status, className }: { status?: string; className?: string }) {
  const { t } = useLanguage();
  const mapped = status ? STATUS_MAP[status] : undefined;

  if (mapped) {
    return (
      <Badge variant={mapped.variant} className={className}>
        {t(mapped.key)}
      </Badge>
    );
  }

  if (status && NOISE_STATUSES.has(status)) {
    return (
      <Badge variant="gray" className={className}>
        {t('poDebugNoise')}
      </Badge>
    );
  }

  // Unknown status — humanize the raw value so nothing breaks for new statuses.
  return (
    <Badge variant="gray" className={className}>
      {(status ?? 'unknown').replace(/_/g, ' ')}
    </Badge>
  );
}

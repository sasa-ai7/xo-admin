import { useState, useMemo } from 'react';
import { Share2, Hash, UserPlus, Gift } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useReferralCodes } from '../../hooks/useReferralCodes';
import { useReferrals } from '../../hooks/useReferrals';
import { usePendingReferralRewards } from '../../hooks/usePendingReferralRewards';
import { GlassCard } from '../shared/GlassCard';
import { StatCard } from '../shared/StatCard';
import { ResponsiveTabs, type ResponsiveTabOption } from '../activity/ResponsiveTabs';
import { ReferralCodesTab } from './ReferralCodesTab';
import { ReferralsTab } from './ReferralsTab';
import { PendingRewardsTab } from './PendingRewardsTab';
import { IconBadge } from '../shared/IconBadge';

type ReferralTab = 'codes' | 'referrals' | 'rewards';

export function ReferralsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ReferralTab>('codes');

  const { data: codes } = useReferralCodes();
  const { data: referrals } = useReferrals();
  const { data: rewards } = usePendingReferralRewards();

  const stats = useMemo(() => ({
    totalCodes: codes.length,
    totalReferrals: referrals.length,
    pendingRewards: rewards.filter((r) => r.status === 'pending').length,
    claimedRewards: rewards.filter((r) => r.status === 'claimed').length,
  }), [codes, referrals, rewards]);

  const tabOptions: ResponsiveTabOption<ReferralTab>[] = [
    { value: 'codes', label: t('referralCodes'), icon: Hash },
    { value: 'referrals', label: t('referrals'), icon: UserPlus },
    { value: 'rewards', label: t('pendingRewards'), icon: Gift },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={Share2} variant="referrals" size="md" hex />
        <h1 className="font-orbitron text-lg font-bold text-xo-text sm:text-xl">
          {t('referralCodes')}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Hash} label={t('totalCodes')} value={stats.totalCodes} variant="referrals" />
        <StatCard icon={UserPlus} label={t('totalReferrals')} value={stats.totalReferrals} variant="users" />
        <StatCard icon={Gift} label={t('pendingRewards')} value={stats.pendingRewards} variant="waiting" />
        <StatCard icon={Gift} label={t('claimedRewards')} value={stats.claimedRewards} variant="finished" />
      </div>

      <ResponsiveTabs tabs={tabOptions} activeTab={activeTab} onChange={setActiveTab} />

      <GlassCard>
        {activeTab === 'codes' && <ReferralCodesTab />}
        {activeTab === 'referrals' && <ReferralsTab />}
        {activeTab === 'rewards' && <PendingRewardsTab />}
      </GlassCard>
    </div>
  );
}

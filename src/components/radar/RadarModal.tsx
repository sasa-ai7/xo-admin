import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useFirestoreDoc } from '../../hooks/useFirestoreDoc';
import { useTransactions } from '../../hooks/useTransactions';
import { usePurchaseOrdersForUser } from '../../hooks/usePurchaseOrdersForUser';
import { useWalletLedgerForUser } from '../../hooks/useWalletLedgerForUser';
import { useLanguage } from '../../i18n/LanguageContext';
import { UserProfileHeader } from './UserProfileHeader';
import { StatsGrid } from './StatsGrid';
import { CoinHistory } from './CoinHistory';
import { AdminActions } from './AdminActions';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { AppUser } from '../../types/user';

export function RadarModal() {
  const { t } = useLanguage();
  const { radarModalOpen, selectedUserId, selectedUserEmail, closeRadarModal } =
    useUIStore();
  const { data: user, loading } = useFirestoreDoc<AppUser>('users', selectedUserId);
  const { data: userTransactions } = useTransactions(selectedUserEmail || undefined);
  const { data: purchaseOrders } = usePurchaseOrdersForUser(selectedUserId);
  const { data: walletLedger } = useWalletLedgerForUser(selectedUserId);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <AnimatePresence>
      {radarModalOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeRadarModal}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-glass-border bg-surface/95 backdrop-blur-xl"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Close button */}
            <button
              className="absolute end-4 top-4 z-20 rounded-lg p-2 text-gray-400 transition-colors hover:text-white"
              onClick={closeRadarModal}
            >
              <X size={20} />
            </button>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : user ? (
              <div className="space-y-6 p-6">
                <UserProfileHeader user={user} />
                <StatsGrid user={user} />

                {/* Coin History Toggle */}
                <div className="flex flex-wrap gap-3">
                  <button
                    className="rounded-xl border border-neon-blue/50 bg-neon-blue/10 px-5 py-2.5 font-orbitron text-xs font-bold text-neon-blue transition-all hover:bg-neon-blue/20 hover:shadow-[0_0_15px_rgba(0,163,255,0.3)]"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {t('viewCoinHistory')}
                  </button>
                </div>

                {showHistory && (
                  <CoinHistory
                    transactions={userTransactions}
                    purchaseOrders={purchaseOrders}
                    walletLedger={walletLedger}
                  />
                )}

                <AdminActions userId={selectedUserId!} currentCoins={user.Wallet?.coins ?? 0} />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                {t('noData')}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

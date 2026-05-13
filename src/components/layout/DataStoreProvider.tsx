import { useEffect, type ReactNode } from 'react';
import { useDataStore } from '../../stores/dataStore';

interface DataStoreProviderProps {
  children: ReactNode;
}

export function DataStoreProvider({ children }: DataStoreProviderProps) {
  const startListeners = useDataStore((state) => state.startListeners);
  const stopListeners = useDataStore((state) => state.stopListeners);
  const resetData = useDataStore((state) => state.resetData);

  useEffect(() => {
    startListeners();

    return () => {
      stopListeners();
      resetData();
    };
  }, [resetData, startListeners, stopListeners]);

  return <>{children}</>;
}
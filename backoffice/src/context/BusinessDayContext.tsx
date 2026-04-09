import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { businessDayApi, BusinessDay } from '../api/businessDay';

interface BusinessDayContextType {
  currentDay: BusinessDay | null;
  loading: boolean;
  refresh: () => Promise<void>;
  openDay: (notes?: string) => Promise<void>;
  closeDay: (notes?: string) => Promise<BusinessDay>;
}

const BusinessDayContext = createContext<BusinessDayContextType>({
  currentDay: null,
  loading: true,
  refresh: async () => { },
  openDay: async () => { },
  closeDay: async () => { return null as unknown as BusinessDay; },
});

export function BusinessDayProvider({ children }: { children: ReactNode }) {
  const [currentDay, setCurrentDay] = useState<BusinessDay | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Don't call API if there's no token (e.g. on login page)
    if (!localStorage.getItem('accessToken')) {
      setCurrentDay(null);
      setLoading(false);
      return;
    }
    try {
      const day = await businessDayApi.getCurrent();
      setCurrentDay(day);
    } catch {
      setCurrentDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Re-sync whenever the user switches back to this tab
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const openDay = async (notes?: string) => {
    try {
      const day = await businessDayApi.open(notes);
      setCurrentDay(day);
    } catch (e: any) {
      // If backend says already open, resync instead of throwing blindly
      if (e?.response?.status === 400) {
        await refresh();
      }
      throw e;
    }
  };

  const closeDay = async (notes?: string): Promise<BusinessDay> => {
    const closed = await businessDayApi.close(notes);
    setCurrentDay(null);
    return closed;
  };

  return (
    <BusinessDayContext.Provider value={{ currentDay, loading, refresh, openDay, closeDay }}>
      {children}
    </BusinessDayContext.Provider>
  );
}

export function useBusinessDay() {
  return useContext(BusinessDayContext);
}

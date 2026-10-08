import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { User } from '../api/types';
import { readDeviceCouponState } from './deviceStore';
import type { DevicePromotion, DeviceWallet } from './model';

/** This is a device-only preview store, not a server points balance or coupon API. */
export function useDeviceCoupons(user: User | null) {
  const [promotions, setPromotions] = useState<DevicePromotion[]>([]);
  const [wallet, setWallet] = useState<DeviceWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    if (!user) { setPromotions([]); setWallet(null); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const state = await readDeviceCouponState(user);
      if (version !== request.current) return;
      setPromotions(state.promotions); setWallet(state.wallet); setNow(Date.now());
    } catch {
      if (version === request.current) setError('포인트·쿠폰을 불러오지 못했어요. 다시 시도해 주세요.');
    } finally { if (version === request.current) setLoading(false); }
  }, [user?.id, user?.email, user?.role]);
  useEffect(() => {
    setPromotions([]); setWallet(null); void refresh();
    const app = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { request.current++; app.remove(); clearInterval(clock); };
  }, [refresh]);
  return { promotions, wallet, loading, error, now, refresh };
}

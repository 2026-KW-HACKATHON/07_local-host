import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { getBusinessHours } from '../customer/businessHours';
import { customerColors as c, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';

export function RestaurantBusinessHours({ openingTime, closingTime }: { openingTime?: string; closingTime?: string }) {
  const [hours, setHours] = useState(() => getBusinessHours(openingTime, closingTime));
  useEffect(() => {
    const update = () => {
      const next = getBusinessHours(openingTime, closingTime);
      setHours(previous => previous.state === next.state && previous.hoursLabel === next.hoursLabel ? previous : next);
    };
    update();
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [openingTime, closingTime]);
  return <View style={styles.group}>
    <Text style={[t.small, hours.state !== 'open' && styles.muted]}>{hours.statusLabel}</Text>
    <Text style={t.small}>{hours.hoursLabel}</Text>
    {hours.state !== 'unknown' && <Text style={[t.small, styles.muted]}>등록 영업시간 기준 · 휴무 정보 미반영</Text>}
  </View>;
}

const styles = StyleSheet.create({ group: { gap: px(2) }, muted: { color: c.muted } });

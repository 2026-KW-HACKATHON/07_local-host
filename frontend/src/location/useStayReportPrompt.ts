import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { getEligibleStayRestaurants, getStayStatus, setStayAppActive } from './stayService';

/** One foreground prompt per confirmed stay; background heads-up notifications are native. */
export function useStayReportPrompt(onOpen: () => void) {
  const callback = useRef(onOpen);
  callback.current = onOpen;
  const lastPrompt = useRef<string | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    let alertOpen = false;
    const check = () => {
      const active = AppState.currentState === 'active';
      setStayAppActive(active);
      if (!active || alertOpen) return;
      const status = getStayStatus();
      const candidates = getEligibleStayRestaurants(status);
      if (!candidates.length || status.recommendationId === lastPrompt.current) return;
      lastPrompt.current = status.recommendationId;
      // Returning from a native notification must not show the same alert again.
      if (status.notificationShown) return;
      alertOpen = true;
      const finish = () => { alertOpen = false; };
      Alert.alert('5분 동안 머무른 식당이 있나요?', '근처 식당이 확인됐어요. 방문한 식당의 혼잡도를 알려 주세요.', [
        { text: '나중에', style: 'cancel', onPress: finish },
        { text: '제보하러 가기', onPress: () => {
          finish();
          if (!alive) return;
          if (getEligibleStayRestaurants(getStayStatus()).length) callback.current();
          else Alert.alert('현재 위치를 다시 확인해 주세요', '이동했거나 위치 확인 시간이 지나서 식당을 다시 확인해야 해요.', [{ text: '확인' }]);
        } },
      ], { cancelable: true, onDismiss: finish });
    };
    check();
    const timer = setInterval(check, 2000);
    const subscription = AppState.addEventListener('change', state => {
      setStayAppActive(state === 'active');
      if (state === 'active') check();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      subscription.remove();
      setStayAppActive(false);
    };
  }, []);
}

import { useEffect } from 'react';
import { OnboardingBackdrop } from '../components/OnboardingBackdrop';

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return <OnboardingBackdrop onPress={onDone} />;
}

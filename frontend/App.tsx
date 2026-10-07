import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { colors } from './src/theme/tokens';
import { LoginScreen } from './src/screens/LoginScreen';
import {
  LocationPermissionScreen,
  NotificationPermissionScreen,
} from './src/screens/PermissionScreens';
import { RoleScreen, type UserRole } from './src/screens/RoleScreen';
import { SignupScreen, type PendingSignup } from './src/screens/SignupScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { TermsScreen } from './src/screens/TermsScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { RestaurantHomeScreen } from './src/screens/RestaurantHomeScreen';
import { CustomerScreen } from './src/screens/CustomerScreen';

type ScreenName =
  | 'splash'
  | 'location'
  | 'notification'
  | 'welcome'
  | 'login'
  | 'signup'
  | 'terms'
  | 'home'
  | 'role';

function BapjulFlow() {
  const { bootstrapping, login, signup, user } = useAuth();
  const [screen, setScreen] = useState<ScreenName>('splash');
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [signupOrigin, setSignupOrigin] = useState<'welcome' | 'login'>('welcome');
  const [navigationBusy, setNavigationBusy] = useState(false);

  const goBack = useCallback(() => {
    if (navigationBusy) return true;
    if (screen === 'role') { setScreen('terms'); return true; }
    if (screen === 'terms') { setScreen('signup'); return true; }
    if (screen === 'signup') { setPendingSignup(null); setScreen(signupOrigin); return true; }
    if (screen === 'login') { setPendingSignup(null); setScreen('welcome'); return true; }
    return false;
  }, [navigationBusy, screen, signupOrigin]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => subscription.remove();
  }, [goBack]);

  useEffect(() => {
    if (!bootstrapping && screen === 'home' && !user) setScreen('login');
  }, [bootstrapping, screen, user]);

  const finishSplash = useCallback(() => {
    setScreen(user ? 'home' : 'location');
  }, [user]);
  const finishLocation = useCallback(() => setScreen('notification'), []);
  const finishNotification = useCallback(() => setScreen('welcome'), []);

  if (bootstrapping) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.black} size="small" />
      </View>
    );
  }

  switch (screen) {
    case 'location':
      return <LocationPermissionScreen onDone={finishLocation} />;
    case 'notification':
      return <NotificationPermissionScreen onDone={finishNotification} />;
    case 'welcome':
      return (
        <WelcomeScreen
          onLogin={() => setScreen('login')}
          onSignup={() => { setSignupOrigin('welcome'); setScreen('signup'); }}
        />
      );
    case 'login':
      return (
        <LoginScreen
          onBack={goBack}
          onSignup={() => { setSignupOrigin('login'); setScreen('signup'); }}
          onLogin={async (email, password) => {
            setNavigationBusy(true);
            try { await login(email, password); setScreen('home'); }
            finally { setNavigationBusy(false); }
          }}
        />
      );
    case 'signup':
      return (
        <SignupScreen
          initialValues={pendingSignup}
          onBack={goBack}
          onContinue={(signup) => {
            setPendingSignup(signup);
            setScreen('terms');
          }}
        />
      );
    case 'home':
      return user?.role === 'CUSTOMER'
        ? <CustomerScreen onLogout={() => setScreen('login')} />
        : <RestaurantHomeScreen onLogout={() => setScreen('login')} />;
    case 'terms':
      return (
        <TermsScreen
          onBack={goBack}
          onContinue={() => {
            if (!pendingSignup) {
              setScreen('signup');
              return;
            }
            setScreen('role');
          }}
        />
      );
    case 'role':
      return (
        <RoleScreen
          onBack={goBack}
          allowedRole={pendingSignup ? undefined : user?.role}
          creatingAccount={Boolean(pendingSignup)}
          onSelect={async (role: UserRole) => {
            if (pendingSignup) {
              const account = { ...pendingSignup, role };
              setNavigationBusy(true);
              try { await signup(account); }
              finally { setNavigationBusy(false); }
              setPendingSignup(null);

              setScreen('login');
              Alert.alert(
                '회원가입이 완료됐어요',
                '가입한 이메일과 비밀번호로 로그인해 주세요.',
                [{ text: '확인' }],
              );
              return;
            }

            if (!user) {
              setScreen('welcome');
              return;
            }

            setScreen('home');
          }}
        />
      );
    default:
      return <SplashScreen onDone={finishSplash} />;
  }
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={styles.loading} />;
  }

  return (
    <AuthProvider>
      <StatusBar hidden />
      <NavigationBar hidden style="dark" />
      <BapjulFlow />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandYellow,
  },
});

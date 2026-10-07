import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';

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

type ScreenName =
  | 'splash'
  | 'location'
  | 'notification'
  | 'welcome'
  | 'login'
  | 'signup'
  | 'terms'
  | 'role';

function BapjulFlow() {
  const { bootstrapping, login, signup, user } = useAuth();
  const [screen, setScreen] = useState<ScreenName>('splash');
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);

  const finishSplash = useCallback(() => {
    setScreen(user ? 'role' : 'location');
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
          onSignup={() => setScreen('signup')}
        />
      );
    case 'login':
      return (
        <LoginScreen
          onLogin={async (email, password) => {
            await login(email, password);
            setScreen('role');
          }}
        />
      );
    case 'signup':
      return (
        <SignupScreen
          onContinue={(signup) => {
            setPendingSignup(signup);
            setScreen('terms');
          }}
        />
      );
    case 'terms':
      return (
        <TermsScreen
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
          allowedRole={pendingSignup ? undefined : user?.role}
          creatingAccount={Boolean(pendingSignup)}
          onSelect={async (role: UserRole) => {
            if (pendingSignup) {
              const account = { ...pendingSignup, role };
              await signup(account);
              setPendingSignup(null);

              let signedInUser;
              try {
                signedInUser = await login(account.email, account.password);
              } catch {
                setScreen('login');
                Alert.alert(
                  '계정이 만들어졌어요',
                  '자동 로그인만 완료되지 않았습니다. 만든 이메일과 비밀번호로 로그인해 주세요.',
                );
                return;
              }

              Alert.alert(
                '회원가입이 완료됐어요',
                `${signedInUser.nickname}님, ${role === 'OWNER' ? '점주' : '손님'} 버전으로 시작합니다.`,
              );
              return;
            }

            if (!user) {
              setScreen('welcome');
              return;
            }

            Alert.alert(
              role === 'OWNER' ? '점주 버전' : '손님 버전',
              '첫 줄 이후의 앱 화면은 다음 구현 단계에서 연결됩니다.',
            );
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

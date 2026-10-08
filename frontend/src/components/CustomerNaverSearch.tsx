import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { customerColors as c, customerMetrics as m, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';
import { naverSearchUrls } from '../customer/restaurantList';

/** Show Naver's own results without scraping them or giving the page app tokens/GPS. */
export function CustomerNaverSearch({ query, onClose }: { query: string; onClose: () => void }) {
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!loading || error) return;
    const timeout = setTimeout(() => { setLoading(false); setError('검색 연결이 지연되고 있어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'); }, 30000);
    return () => clearTimeout(timeout);
  }, [loading, error]);
  const url = naverSearchUrls(query)?.web;
  const currentUrl = useRef(url);
  const back = () => canGoBack && !error ? web.current?.goBack() : onClose();
  const allowed = (value: string) => {
    if (value === 'about:blank') return true;
    try {
      const target = new URL(value);
      return target.protocol === 'https:' && (target.hostname === 'naver.com' || target.hostname.endsWith('.naver.com'));
    } catch { return false; }
  };
  return <Modal visible animationType="slide" onRequestClose={back}>
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="검색 이전 화면" onPress={back} style={styles.action}><Text style={t.body}>‹ 뒤로</Text></Pressable>
        <Text numberOfLines={1} style={[t.body, styles.title]}>네이버 식당 검색</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="네이버 검색 닫기" onPress={onClose} style={styles.action}><Text style={t.small}>닫기</Text></Pressable>
      </View>
      <Text style={[t.small, styles.caption]}>네이버 지도 결과예요 · 밥줄 제보와 쿠폰은 홈에서 확인하세요</Text>
      {loading && !error && <ActivityIndicator accessibilityLabel="네이버 검색 결과 불러오는 중" style={styles.loading} color={c.black} />}
      {notice !== '' && <Text style={[t.small, styles.caption]}>{notice}</Text>}
      {error ? <View style={styles.failure}><Text style={t.body}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { setCanGoBack(false); setNotice(''); setError(''); setLoading(true); }} style={styles.action}><Text style={t.body}>다시 불러오기</Text></Pressable>
      </View> : url && <WebView ref={web} style={styles.web} source={{ uri: url }}
        originWhitelist={['*']} geolocationEnabled={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
        allowFileAccess={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never"
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={request => {
          const result = allowed(request.url);
          if (!result) setNotice('이 링크는 네이버 앱 전용 기능이에요. 식당 검색은 이 화면에서 계속할 수 있어요.');
          return result;
        }}
        onNavigationStateChange={state => { currentUrl.current = state.url; setCanGoBack(state.canGoBack); }}
        onLoadStart={() => { setLoading(true); setNotice(''); }} onLoadEnd={() => setLoading(false)}
        onError={() => { setError('검색 결과를 불러오지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.'); setLoading(false); }}
        onHttpError={event => { if (event.nativeEvent.url === currentUrl.current && event.nativeEvent.statusCode >= 400) { setError('네이버 검색이 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.'); setLoading(false); } }}
      />}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.white, paddingTop: m.headerTop, paddingBottom: px(16) },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(12), gap: px(8) },
  action: { minHeight: px(48), minWidth: px(44), justifyContent: 'center', alignItems: 'center', paddingHorizontal: px(8) },
  title: { flex: 1, textAlign: 'center' }, caption: { color: c.muted, paddingHorizontal: m.gutter, paddingVertical: px(8) },
  web: { flex: 1 }, loading: { padding: px(8) }, failure: { flex: 1, justifyContent: 'center', padding: m.gutter, gap: m.sectionGap },
});

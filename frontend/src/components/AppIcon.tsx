import { Image, StyleSheet, View } from 'react-native';
import { customerColors as c } from '../theme/customerTokens';
import { px } from '../theme/tokens';

const assets = {
  search: require('../../assets/icons/search.png'),
  point: require('../../assets/icons/point.png'),
  marketing: require('../../assets/icons/marketing.png'),
};
export type AppIconName = keyof typeof assets | 'home' | 'person';

// PNG는 원본 알파 채널과 비율을 유지한다. 단색 아이콘의 활성 색상만 런타임 tint로 적용한다.
export function AppIcon({ name, size = 28, color = c.black, cutoutColor = c.neutralButton }: {
  name: AppIconName; size?: number; color?: string; cutoutColor?: string;
}) {
  const side = px(size);
  if (name !== 'home' && name !== 'person') {
    return <Image accessible={false} source={assets[name]} resizeMode="contain" style={{ width: side, height: side, tintColor: color }} />;
  }
  return <View accessible={false} pointerEvents="none" style={[styles.shape, { width: side, height: side }]}>
    {name === 'person' ? <>
      <View style={{ width: side * 0.34, height: side * 0.34, borderRadius: side * 0.17, backgroundColor: color }} />
      <View style={{ width: side * 0.72, height: side * 0.43, borderTopLeftRadius: side * 0.36, borderTopRightRadius: side * 0.36, borderBottomLeftRadius: side * 0.08, borderBottomRightRadius: side * 0.08, backgroundColor: color, marginTop: side * 0.08 }} />
    </> : <>
      <View style={{ borderLeftWidth: side * 0.48, borderRightWidth: side * 0.48, borderBottomWidth: side * 0.4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
      <View style={{ width: side * 0.67, height: side * 0.43, backgroundColor: color, alignItems: 'center', justifyContent: 'flex-end', borderBottomLeftRadius: side * 0.05, borderBottomRightRadius: side * 0.05 }}>
        <View style={{ width: side * 0.18, height: side * 0.29, backgroundColor: cutoutColor, borderTopLeftRadius: side * 0.03, borderTopRightRadius: side * 0.03 }} />
      </View>
    </>}
  </View>;
}
const styles = StyleSheet.create({ shape: { alignItems: 'center', justifyContent: 'center' } });

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { customerColors as c, customerMetrics as m } from '../theme/customerTokens';
import { px } from '../theme/tokens';

/** The header collapses in normal Flex layout; the list owns its scroll gesture. */
export function CustomerRestaurantSheet({ header, children, title, refreshing, onRefresh, resetKey }: {
  header: ReactNode; children: ReactNode; title: ReactNode;
  refreshing: boolean; onRefresh: () => void; resetKey: string;
}) {
  const [headerHeight, setHeaderHeight] = useState(px(275));
  const [expanded, setExpanded] = useState(false);
  const height = useRef(new Animated.Value(headerHeight)).current;
  const current = useRef(headerHeight);
  const dragStart = useRef(headerHeight);
  const scroll = useRef<ScrollView>(null);
  const maxHeight = useRef(headerHeight);
  maxHeight.current = headerHeight;

  useEffect(() => {
    const id = height.addListener(({ value }) => { current.current = value; });
    return () => height.removeListener(id);
  }, [height]);
  useEffect(() => {
    height.setValue(expanded ? 0 : headerHeight);
  }, [headerHeight]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [resetKey]);

  const snap = (open: boolean) => {
    setExpanded(open);
    Animated.timing(height, { toValue: open ? 0 : maxHeight.current, duration: 220, useNativeDriver: false }).start();
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { height.stopAnimation(); dragStart.current = current.current; },
    onPanResponderMove: (_, gesture) => height.setValue(Math.max(0, Math.min(maxHeight.current, dragStart.current + gesture.dy))),
    onPanResponderRelease: (_, gesture) => snap(Math.abs(gesture.vy) > 0.25 ? gesture.vy < 0 : current.current < maxHeight.current / 2),
    onPanResponderTerminate: () => snap(current.current < maxHeight.current / 2),
  }), [height]);

  return <View style={styles.root}>
    <Animated.View style={{ height, overflow: 'hidden' }} accessibilityElementsHidden={expanded} importantForAccessibility={expanded ? 'no-hide-descendants' : 'auto'}>
      <View onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)} style={styles.header}>{header}</View>
    </Animated.View>
    <View style={styles.sheet}>
      <View {...pan.panHandlers}>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? '식당 목록 접기' : '식당 목록 펼치기'}
          accessibilityHint="위아래로 끌거나 두 번 눌러 목록 크기를 바꿉니다"
          accessibilityState={{ expanded }} onPress={() => snap(!expanded)} style={styles.handleArea}>
          <View style={styles.handle} />
        </Pressable>
      </View>
      {title}
      <ScrollView ref={scroll} style={styles.list} contentContainerStyle={styles.listContent} nestedScrollEnabled keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {children}
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { paddingBottom: m.sectionGap, flexShrink: 0 },
  sheet: { flex: 1, backgroundColor: c.panel, borderTopLeftRadius: m.panelRadius, borderTopRightRadius: m.panelRadius, overflow: 'hidden' },
  handleArea: { minHeight: px(48), justifyContent: 'center', alignItems: 'center', gap: px(4), paddingTop: px(8) },
  handle: { width: px(42), height: px(4), borderRadius: px(2), backgroundColor: c.divider },
  list: { flex: 1 }, listContent: { paddingBottom: m.sectionGap },
});

import { colors, fonts, px } from './tokens';

// Figma 412×917 원본: 검색창 350×69/r10, 목록 r26,
// 목록 배경 #AAE29F 15%, 하단 바 #D9D9D9/h89.
export const customerColors = {
  ...colors,
  panel: 'rgba(170, 226, 159, 0.15)',
  dialog: '#F5F5F5',
  searchText: 'rgba(0, 0, 0, 0.58)',
  divider: 'rgba(0, 0, 0, 0.35)',
  available: '#69EE30',
  fewSeats: '#FCD325',
  longWait: '#EF1616',
};

export const customerMetrics = {
  searchWidth: px(350),
  searchHeight: px(69),
  searchRadius: px(10),
  panelRadius: px(26),
  navigationHeight: px(89),
  // 아래 값은 Figma 구성을 유지하는 앱용 간격이다. 원본 실측값은 아니다.
  gutter: px(24),
  sectionGap: px(24),
  rowPadding: px(20),
  headerTop: px(20),
  headerGap: px(29),
  listTop: px(55),
  iconSlot: px(36),
};

export const customerType = {
  heading: { fontFamily: fonts.koreanMedium, fontSize: px(26), lineHeight: px(36), letterSpacing: -0.4 },
  body: { fontFamily: fonts.koreanMedium, fontSize: px(18), lineHeight: px(27), letterSpacing: -0.2 },
  small: { fontFamily: fonts.koreanMedium, fontSize: px(14), lineHeight: px(22), letterSpacing: 0 },
};

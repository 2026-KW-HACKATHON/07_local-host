import { PixelRatio } from 'react-native';

export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  brandYellow: '#FCD325',
  onboardingYellow: '#EED451',
  neutralButton: '#D9D9D9',
  field: '#E1E0E0',
  // Figma 로그인 입력창의 텍스트: #000000, 불투명도 55%.
  placeholder: 'rgba(0, 0, 0, 0.55)',
  google: '#52C1F1',
  naver: '#8AEB01',
  primary: '#0088FF',
  guest: '#FFEC9E',
  owner: '#D5EDFF',
  danger: '#D92D20',
  muted: '#666666',
} as const;

export const design = {
  width: 412,
  height: 917,
  targetWidth: 390,
  targetHeight: 844,
} as const;

// 원본 412px 너비를 기준 viewport의 390px 전체 너비에 맞춥니다.
// 화면 높이는 별도로 유지해 좌우에 축소 캔버스 여백이 생기지 않게 합니다.
export const designScale = design.targetWidth / design.width;

export function px(value: number) {
  return PixelRatio.roundToNearestPixel(value * designScale);
}

export const metrics = {
  canvasWidth: design.targetWidth,
  canvasHeight: design.targetHeight,
  contentWidth: px(381),
  controlHeight: px(62),
  controlRadius: px(16),
  permissionRadius: px(33),
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
  koreanMedium: 'NotoSansKR_500Medium',
  koreanBold: 'NotoSansKR_700Bold',
} as const;

export const typography = {
  title: {
    fontFamily: fonts.koreanBold,
    fontSize: px(36),
    lineHeight: px(48),
    letterSpacing: 0,
  },
  control: {
    fontFamily: fonts.koreanMedium,
    fontSize: px(22),
    lineHeight: px(32),
    letterSpacing: 0,
  },
  controlBold: {
    fontFamily: fonts.koreanBold,
    fontSize: px(22),
    lineHeight: px(32),
    letterSpacing: 0,
  },
  permission: {
    fontFamily: fonts.regular,
    fontSize: px(20),
    lineHeight: px(28),
    letterSpacing: 0,
  },
} as const;

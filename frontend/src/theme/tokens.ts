import { PixelRatio } from 'react-native';

export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  brandYellow: '#FCD325',
  neutralButton: '#D9D9D9',
  field: '#E1E0E0',
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

export const designScale = Math.min(
  design.targetWidth / design.width,
  design.targetHeight / design.height,
);

export function px(value: number) {
  return PixelRatio.roundToNearestPixel(value * designScale);
}

export const metrics = {
  canvasWidth: px(design.width),
  canvasHeight: px(design.height),
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
} as const;

export const typography = {
  title: {
    fontFamily: fonts.bold,
    fontSize: px(45),
    lineHeight: px(54),
    letterSpacing: 0,
  },
  control: {
    fontFamily: fonts.regular,
    fontSize: px(30),
    lineHeight: px(36),
    letterSpacing: 0,
  },
  controlBold: {
    fontFamily: fonts.bold,
    fontSize: px(30),
    lineHeight: px(36),
    letterSpacing: 0,
  },
  permission: {
    fontFamily: fonts.regular,
    fontSize: px(20),
    lineHeight: px(28),
    letterSpacing: 0,
  },
} as const;

import { colors, fonts, px } from './tokens';

// Figma 점주 프레임 412×917: 입력 381×62/r16, 하단 바 h89.
// 화면 이미지에서 확인한 색상. 작은 간격은 390×844 앱 화면에 맞춘 값이다.
export const ownerColors = { ...colors, edit: colors.brandYellow, row: '#EAEAEA', panel: colors.panelBackground,
  dialog: '#F5F5F5', border: '#888888', available: '#73FD46', few: colors.brandYellow, wait: '#EF1616' };
export const ownerSpace = { gutter: px(24), gap: px(20), radius: px(16), control: px(62), navigation: px(89) };
export const ownerType = {
  title: { fontFamily: fonts.koreanBold, fontSize: px(32), lineHeight: px(44), letterSpacing: -0.5 },
  heading: { fontFamily: fonts.koreanMedium, fontSize: px(26), lineHeight: px(36), letterSpacing: -0.4 },
  body: { fontFamily: fonts.koreanMedium, fontSize: px(18), lineHeight: px(27), letterSpacing: -0.2 },
  small: { fontFamily: fonts.koreanMedium, fontSize: px(14), lineHeight: px(22), letterSpacing: 0 },
};

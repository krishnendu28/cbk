/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Palette = {
  bg: '#FFF7ED',
  cream: '#FFF1DC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardSoft: '#FFF1DC',
  crimson: '#C21F2E',
  crimsonDark: '#9E1826',
  orange: '#EA580C',
  gold: '#F3B13B',
  text: '#3E1F12',
  textMuted: '#8A6A52',
  border: '#F0DFC6',
  borderStrong: '#E3CBA8',
  green: '#1DAE56',
  overlay: 'rgba(62,31,18,0.45)',
};

export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.bg,
    tint: Palette.crimson,
    icon: Palette.textMuted,
    tabIconDefault: '#B7A58F',
    tabIconSelected: Palette.crimson,
  },
  dark: {
    text: Palette.text,
    background: Palette.bg,
    tint: Palette.crimson,
    icon: Palette.textMuted,
    tabIconDefault: '#B7A58F',
    tabIconSelected: Palette.crimson,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

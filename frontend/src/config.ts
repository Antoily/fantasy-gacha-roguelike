export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

export const COLORS = {
  background: 0x0d0d1a,
  panel: 0x1a1a2e,
  panelBorder: 0x2d2d5e,
  accent: 0x7c4dff,
  accentLight: 0xb47cff,
  gold: 0xffd700,
  hp: 0x44dd88,
  hpLow: 0xff4444,
  text: 0xffffff,
  textDim: 0x9999bb,
  rarity: {
    common: 0xaaaaaa,
    rare: 0x4488ff,
    epic: 0xbb44ff,
    legendary: 0xffaa00,
  },
} as const;

export const FONTS = {
  title: { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#ffffff' },
  body: { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffffff' },
  small: { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9999bb' },
  gold: { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffd700' },
  button: { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff' },
} as const;

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

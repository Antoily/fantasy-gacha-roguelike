import type { Rarity } from '../data/gachaConfig';

// Seul fichier de couleurs et de polices du jeu (constitution VI). Thème provisoire :
// BD claire — papier crème, aplats francs, gros contours noirs.
// COLORS (nombres) sert à Phaser, CSS (chaînes) aux styles de texte : à garder synchrones.

const palette = {
  paper: 0xfff4dc,
  panel: 0xffffff,
  ink: 0x1d1a16,
  inkSoft: 0x6b6258,
  inkFaint: 0xa59c90,
  primary: 0xffc93c,
  secondary: 0x7ec8e3,
  danger: 0xff6b6b,
  neutral: 0xf0e6d2,
  disabled: 0xd9d2c5,
  success: 0x6fcf74,
  shard: 0x7fe0e8,
  sticker: 0xff5c8a,
} as const;

const rarity: Record<Rarity, number> = {
  common: 0xb8b2a7,
  uncommon: 0x6fcf74,
  rare: 0x4d9de0,
  legendary: 0xff9f1c,
  ultra: 0xd65db1,
};

const toCss = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export const COLORS = {
  background: palette.paper,
  panel: palette.panel,
  ink: palette.ink,
  coin: palette.primary,
  scrim: palette.paper,
  btn: {
    primary: palette.primary,
    secondary: palette.secondary,
    danger: palette.danger,
    neutral: palette.neutral,
    disabled: palette.disabled,
  },
  badgeNew: palette.success,
  // Éclats (002) : losange de l'en-tête et des coûts ; pastille « Garanti ! ».
  shard: palette.shard,
  badgePity: palette.sticker,
  rarity,
} as const;

export const CSS = {
  text: toCss(palette.ink),
  textDim: toCss(palette.inkSoft),
  textFaint: toCss(palette.inkFaint),
  textOnColor: toCss(palette.ink),
  // Contour du nom de la rareté révélée (004), lisible par-dessus les rayons.
  outline: toCss(palette.panel),
  // Bandes autour du canvas quand la fenêtre n'a pas le format portrait.
  letterbox: '#2b2620',
} as const;

export const SCRIM_ALPHA = 0.82;

// Révélation (004) : opacités des effets ; leurs couleurs sont celles des raretés.
export const REVEAL_FX = {
  rayAlpha: 0.9,
  waveAlpha: 0.9,
  flashAlpha: 0.65,
  // Dos des cartes du ×10 avant retournement.
  cardBack: palette.secondary,
  // Liseré de la carte vedette.
  starStroke: 6,
} as const;

export const STROKE = { thin: 2, base: 3, thick: 4 } as const;
export const SHADOW_OFFSET = 4;
export const RADIUS = 12;

export const FONT_FAMILY = '"Comic Neue", "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif';

export const FONT_SIZE = { title: 28, big: 22, button: 18, body: 14, small: 12, tiny: 11, micro: 10 } as const;
